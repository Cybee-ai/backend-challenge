import { Queue, Worker, Job, BackoffOptions } from "bullmq";
import axios from "axios";
import { FastifyInstance } from "fastify";
import { google } from "googleapis";
import config from "../config/config";
import {
  ERROR_MESSAGES,
  GOOGLE_SCOPES,
  JOB_QUEUE_NAME,
  JOB_PREFIX,
  REDIS_HOST,
  REDIS_PORT,
  RETRY_LIMIT,
  QUEUE_CONCURRENCY,
} from "../config/constants";
import { SourceService } from "./source.services";
import { LogService } from "./logsService.service";
import { Logger } from "../utils/logger";

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

export class LogFetchService {
  private logFetchQueue: Queue;
  private sourceService: SourceService;
  private logService: LogService;
  private isDev: boolean;
  private logger: Logger;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private worker: Worker | null = null;

  constructor(fastify: FastifyInstance) {
    this.logFetchQueue = new Queue(JOB_QUEUE_NAME, { connection });
    this.sourceService = new SourceService(fastify);
    this.logService = new LogService(fastify);
    this.isDev = config.NODE_ENV === "dev";
    this.logger = new Logger("LogFetchService");

    // Set up graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  private async fetchLogs(source: any): Promise<any[]> {
    try {
      if (this.isDev) {
        this.logger.info("Mock log fetching enabled (DEV mode)");

        // Generate a random number of mock logs (1-5)
        const mockLogCount = Math.floor(Math.random() * 5) + 1;
        const mockLogs = [];

        // Common event types for Google Workspace
        const eventTypes = [
          "LOGIN",
          "LOGOUT",
          "ACCESS_SETTINGS",
          "CHANGE_USER_PASSWORD",
          "CREATE_USER",
          "DELETE_USER",
          "SUSPEND_USER",
          "ADD_GROUP_MEMBER",
          "REMOVE_GROUP_MEMBER",
          "CREATE_GROUP",
          "DELETE_GROUP",
          "CHANGE_DOCUMENT_ACCESS_SCOPE",
          "CHANGE_DOCUMENT_VISIBILITY",
        ];

        // Common status values
        const statuses = ["SUCCESS", "FAILURE", "DENIED"];

        // Generate mock logs with realistic data
        for (let i = 0; i < mockLogCount; i++) {
          const eventType =
            eventTypes[Math.floor(Math.random() * eventTypes.length)];
          const status = statuses[Math.floor(Math.random() * statuses.length)];

          // Create a timestamp within the last hour
          const timestamp = new Date(
            Date.now() - Math.floor(Math.random() * 60 * 60 * 1000)
          );

          mockLogs.push({
            id: `log-${Date.now()}-${i}`,
            timestamp: timestamp.toISOString(),
            actor: {
              email: `user${Math.floor(Math.random() * 10)}@example.com`,
              ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
            },
            eventType,
            details: {
              status,
              applicationName: "admin",
              parameters: {
                orgUnitName: eventType.includes("USER") ? "Users" : "All Users",
                groupEmail: eventType.includes("GROUP")
                  ? "group@example.com"
                  : undefined,
                docId: eventType.includes("DOCUMENT")
                  ? `doc-${Math.floor(Math.random() * 1000)}`
                  : undefined,
              },
            },
          });
        }

        return mockLogs;
      }

      this.logger.info(
        `Fetching logs from Google Workspace for source ${source._id}`
      );

      const auth = new google.auth.JWT(
        source.credentials.clientEmail,
        undefined,
        source.credentials.privateKey.replace(/\\n/g, "\n"),
        GOOGLE_SCOPES
      );

      const reports = google.admin({ version: "reports_v1", auth });

      const response = await reports.activities.list({
        userKey: "all",
        applicationName: "admin",
      });

      return response.data.items || [];
    } catch (err: unknown) {
      const error = err as {
        response?: { status?: number; headers?: Record<string, string> };
      };

      // Create a sanitized error object without sensitive data
      const sanitizedError = {
        status: error.response?.status,
        message: error instanceof Error ? error.message : "Unknown error",
      };

      this.logger.error(
        `Error fetching logs for source ${source._id}`,
        sanitizedError
      );

      const statusCode = error.response?.status;

      if (statusCode === 401) {
        this.logger.error(
          `Credentials expired for source ${source._id}. Updating status.`
        );
        await this.sourceService.markSourceAsExpired(source._id);
        throw new Error(ERROR_MESSAGES.CREDENTIALS_EXPIRED);
      }

      if (statusCode === 429) {
        this.logger.warn(
          `Google API rate limit hit. Letting BullMQ handle the retry.`
        );
        throw new Error(ERROR_MESSAGES.RATE_LIMITED); // Let BullMQ retry
      }

      if (statusCode === 403) {
        this.logger.error(
          `Permission denied for source ${source._id}. Check scopes.`
        );
        throw new Error(ERROR_MESSAGES.PERMISSION_DENIED);
      }

      if (statusCode === 400) {
        this.logger.error(
          `Bad request for source ${source._id}. Check API parameters.`
        );
        throw new Error(`${ERROR_MESSAGES.FETCH_FAILED}: Bad request`);
      }

      if (statusCode === 500) {
        this.logger.error(
          `Google API server error for source ${source._id}. Will retry.`
        );
        throw new Error(`${ERROR_MESSAGES.FETCH_FAILED}: Server error`);
      }

      throw new Error(ERROR_MESSAGES.FETCH_FAILED);
    }
  }

  private async processJob(job: Job) {
    const { source } = job.data;

    try {
      const logs = await this.fetchLogs(source);

      const savedLogs = await this.logService.saveLogs(
        source._id.toString(),
        logs
      );

      // Skip webhook if no new logs
      if (!savedLogs) {
        this.logger.info(`No new logs to send for source ${source._id}`);
        return;
      }

      // Add webhook delivery with retries
      await this.sendLogsToWebhook(source, savedLogs);

      this.logger.success(`Logs sent successfully for source ${source._id}`);
    } catch (err: unknown) {
      const error = err as Error;

      let errorMessage = ERROR_MESSAGES.PROCESS_JOB_FAILED;
      if (error instanceof Error) {
        errorMessage += ` for source ${source._id}: ${error.message}`;
      }

      this.logger.error(errorMessage);

      // ✅ If credentials expired, stop retries
      if (error.message.includes(ERROR_MESSAGES.CREDENTIALS_EXPIRED)) {
        this.logger.info(
          `Stopping retries for source ${source._id} as credentials are expired.`
        );
        return; // ✅ Do not retry
      }

      // ✅ If it's a rate limit (`429`), let BullMQ retry
      if (error.message.includes(ERROR_MESSAGES.RATE_LIMITED)) {
        this.logger.info(
          `Retrying in accordance with BullMQ's retry policy...`
        );
        throw error; // ✅ Throw error to let BullMQ retry
      }

      throw error; // ✅ Ensure BullMQ retries for other failures too
    }
  }

  // New method for webhook delivery with retries
  private async sendLogsToWebhook(
    source: any,
    logs: any,
    retryCount = 0
  ): Promise<void> {
    const maxRetries = 3;
    const retryDelay = (attempt: number) => Math.pow(2, attempt) * 1000; // Exponential backoff

    try {
      await axios.post(source.callbackUrl, { logs });
    } catch (error) {
      this.logger.error(
        `Failed to deliver logs to webhook ${source.callbackUrl}:`,
        error
      );

      if (retryCount < maxRetries) {
        const delay = retryDelay(retryCount);
        this.logger.info(
          `Retrying webhook delivery in ${delay}ms (attempt ${
            retryCount + 1
          }/${maxRetries})...`
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendLogsToWebhook(source, logs, retryCount + 1);
      } else {
        this.logger.error(
          `Max webhook delivery retries reached for source ${source._id}`
        );
        throw new Error(
          `Failed to deliver logs to webhook after ${maxRetries} attempts`
        );
      }
    }
  }

  public startWorker() {
    this.worker = new Worker(
      JOB_QUEUE_NAME,
      async (job: Job) => {
        try {
          await this.processJob(job);
        } catch (error) {
          this.logger.error(
            `Job failed for source ${job.data.source._id}: ${error}`
          );

          if (job.attemptsMade >= 3) {
            this.logger.error(
              `Job for source ${job.data.source._id} failed 3 times. No more retries.`
            );
          }

          throw error;
        }
      },
      {
        connection,
        concurrency: QUEUE_CONCURRENCY,
      }
    );

    this.logger.success(
      `Worker started in ${this.isDev ? "DEV" : "PROD"} mode.`
    );

    // Set up periodic job cleanup
    this.setupJobCleanup();
  }

  // New method to clean up old failed jobs
  private async setupJobCleanup() {
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours
    const maxJobAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    this.cleanupInterval = setInterval(async () => {
      try {
        this.logger.info("Starting cleanup of old failed jobs");

        // Get all failed jobs
        const failedJobs = await this.logFetchQueue.getFailed();

        let cleanedCount = 0;
        const now = Date.now();

        for (const job of failedJobs) {
          // Check if the job is older than maxJobAge
          if (job.finishedOn && now - job.finishedOn > maxJobAge) {
            await job.remove();
            cleanedCount++;
          }
        }

        this.logger.success(`Cleaned up ${cleanedCount} old failed jobs`);
      } catch (error) {
        this.logger.error("Failed to clean up old jobs", error);
      }
    }, cleanupInterval);

    this.logger.info(
      `Job cleanup scheduled every ${cleanupInterval / (60 * 60 * 1000)} hours`
    );
  }

  public async scheduleLogFetch(sourceId: string) {
    const source = await this.sourceService.getSourceById(sourceId);

    if (!source) {
      this.logger.error(ERROR_MESSAGES.SOURCE_NOT_FOUND);
      return;
    }

    if (source.expired) {
      this.logger.info(
        `Source ${sourceId} is expired. Skipping job scheduling.`
      );
      return;
    }

    const existingJob = await this.logFetchQueue.getJob(
      `${JOB_PREFIX}${sourceId}`
    );

    if (existingJob) {
      this.logger.info(`Job for source ${sourceId} already exists. Skipping.`);
      return;
    }

    await this.logFetchQueue.add(
      `${JOB_PREFIX}${sourceId}`,
      { source },
      {
        repeat: { every: source.logFetchInterval * 1000 },
        removeOnComplete: true, // ✅ Cleanup completed jobs
        removeOnFail: false, // ✅ Keep failed jobs for debugging
        attempts: 3, // ✅ Max 3 retries per failed job
        backoff: {
          type: "exponential",
          delay: 5000, // ✅ Starts with 5s, then increases exponentially
        },
      }
    );

    this.logger.info(
      `Scheduled log fetching for source ${source._id} every ${source.logFetchInterval} seconds.`
    );
  }

  // Enhanced shutdown method with proper worker cleanup
  public async shutdown() {
    this.logger.info("Graceful shutdown initiated for LogFetchService");

    // Track shutdown steps for better debugging
    const shutdownSteps: { step: string; success: boolean }[] = [];

    try {
      // Step 1: Close the worker if it exists
      if (this.worker) {
        this.logger.info("Closing worker...");
        await this.worker.close();
        this.worker = null;
        shutdownSteps.push({ step: "Worker closed", success: true });
      }

      // Step 2: Clear the cleanup interval if it exists
      if (this.cleanupInterval) {
        this.logger.info("Clearing cleanup interval...");
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
        shutdownSteps.push({ step: "Cleanup interval cleared", success: true });
      }

      // Step 3: Close the queue
      this.logger.info("Closing queue...");
      await this.logFetchQueue.close();
      shutdownSteps.push({ step: "Queue closed", success: true });

      this.logger.success("LogFetchService shutdown completed successfully");
      return { success: true, steps: shutdownSteps };
    } catch (error) {
      this.logger.error("Error during LogFetchService shutdown", error);
      shutdownSteps.push({ step: "Shutdown error", success: false });
      return { success: false, steps: shutdownSteps, error };
    }
  }

  // Setup graceful shutdown handlers for the process
  private setupGracefulShutdown() {
    const handleShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal} signal, starting graceful shutdown`);

      try {
        await this.shutdown();
        this.logger.info("Graceful shutdown completed, exiting process");

        // Exit with success code
        process.exit(0);
      } catch (error) {
        this.logger.error("Failed to shutdown gracefully", error);

        // Exit with error code
        process.exit(1);
      }
    };

    // Listen for termination signals
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));

    this.logger.info("Graceful shutdown handlers registered");
  }

  // Add a new method to generate test logs for specific scenarios
  public generateTestLogs(
    scenario: string = "default",
    count: number = 3
  ): any[] {
    this.logger.info(`Generating test logs for scenario: ${scenario}`);

    const mockLogs = [];

    switch (scenario) {
      case "login_failures":
        // Generate login failure logs
        for (let i = 0; i < count; i++) {
          mockLogs.push({
            id: `log-${Date.now()}-${i}`,
            timestamp: new Date(Date.now() - i * 10000).toISOString(),
            actor: {
              email: `user${i}@example.com`,
              ipAddress: `192.168.1.${100 + i}`,
            },
            eventType: "LOGIN",
            details: {
              status: "FAILURE",
              applicationName: "admin",
              failureReason:
                i % 2 === 0 ? "INVALID_PASSWORD" : "ACCOUNT_DISABLED",
              parameters: {
                loginType: "PASSWORD",
                attemptCount: Math.floor(Math.random() * 5) + 1,
              },
            },
          });
        }
        break;

      case "permission_changes":
        // Generate permission change logs
        for (let i = 0; i < count; i++) {
          const actions = ["GRANT", "REVOKE", "CHANGE"];
          const action = actions[i % actions.length];

          mockLogs.push({
            id: `log-${Date.now()}-${i}`,
            timestamp: new Date(Date.now() - i * 10000).toISOString(),
            actor: {
              email: `admin${i % 3}@example.com`,
              ipAddress: `192.168.1.${10 + i}`,
            },
            eventType: "CHANGE_DOCUMENT_ACCESS_SCOPE",
            details: {
              status: "SUCCESS",
              applicationName: "drive",
              parameters: {
                docId: `doc-${1000 + i}`,
                action: action,
                targetUser: `user${i}@example.com`,
                permission:
                  action === "REVOKE"
                    ? "NONE"
                    : action === "GRANT"
                    ? "EDIT"
                    : "VIEW",
              },
            },
          });
        }
        break;

      case "user_management":
        // Generate user management logs
        const actions = [
          "CREATE_USER",
          "DELETE_USER",
          "SUSPEND_USER",
          "CHANGE_USER_PASSWORD",
        ];

        for (let i = 0; i < count; i++) {
          const action = actions[i % actions.length];

          mockLogs.push({
            id: `log-${Date.now()}-${i}`,
            timestamp: new Date(Date.now() - i * 10000).toISOString(),
            actor: {
              email: `admin@example.com`,
              ipAddress: `192.168.1.1`,
            },
            eventType: action,
            details: {
              status: "SUCCESS",
              applicationName: "admin",
              parameters: {
                targetUser: `user${i}@example.com`,
                orgUnitName: "Users",
                reason:
                  action === "SUSPEND_USER"
                    ? "SECURITY_POLICY_VIOLATION"
                    : undefined,
              },
            },
          });
        }
        break;

      default:
        // Generate mixed logs
        const eventTypes = [
          "LOGIN",
          "LOGOUT",
          "ACCESS_SETTINGS",
          "CHANGE_USER_PASSWORD",
          "CREATE_USER",
          "DELETE_USER",
          "SUSPEND_USER",
          "ADD_GROUP_MEMBER",
          "REMOVE_GROUP_MEMBER",
          "CREATE_GROUP",
          "DELETE_GROUP",
        ];

        for (let i = 0; i < count; i++) {
          const eventType =
            eventTypes[Math.floor(Math.random() * eventTypes.length)];

          mockLogs.push({
            id: `log-${Date.now()}-${i}`,
            timestamp: new Date(Date.now() - i * 10000).toISOString(),
            actor: {
              email: `user${i % 5}@example.com`,
              ipAddress: `192.168.1.${i % 255}`,
            },
            eventType,
            details: {
              status: Math.random() > 0.2 ? "SUCCESS" : "FAILURE",
              applicationName: "admin",
              parameters: {
                orgUnitName: eventType.includes("USER") ? "Users" : "All Users",
                groupEmail: eventType.includes("GROUP")
                  ? "group@example.com"
                  : undefined,
              },
            },
          });
        }
    }

    return mockLogs;
  }
}
