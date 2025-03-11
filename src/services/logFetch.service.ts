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

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

export class LogFetchService {
  private logFetchQueue: Queue;
  private sourceService: SourceService;
  private logService: LogService;
  private isDev: boolean;

  constructor(fastify: FastifyInstance) {
    this.logFetchQueue = new Queue(JOB_QUEUE_NAME, { connection });
    this.sourceService = new SourceService(fastify);
    this.logService = new LogService(fastify);
    this.isDev = config.NODE_ENV === "dev";
  }

  private async fetchLogs(source: any): Promise<any[]> {
    try {
      throw { response: { status: 429 } };

      if (this.isDev) {
        console.log("🟢 Mock log fetching enabled (DEV mode).");

        return [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actor: { email: "test@example.com", ipAddress: "127.0.0.1" },
            eventType: "TEST_EVENT",
            details: { status: "SUCCESS" },
          },
        ];
      }
      console.log(`🔵 Fetching logs from Google Workspace...`);

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

      console.error(`❌ Error fetching logs for source ${source._id}:`, error);

      const statusCode = error.response?.status;

      if (statusCode === 401) {
        console.error(
          `🚨 Credentials expired for source ${source._id}. Updating status.`
        );
        await this.sourceService.markSourceAsExpired(source._id);
        throw new Error(ERROR_MESSAGES.CREDENTIALS_EXPIRED);
      }

      if (statusCode === 429) {
        console.warn(
          `⏳ Google API rate limit hit. Letting BullMQ handle the retry.`
        );
        throw new Error(ERROR_MESSAGES.RATE_LIMITED); // Let BullMQ retry
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

      await axios.post(source.callbackUrl, { logs: savedLogs });

      console.log(`✅ Logs sent successfully for source ${source._id}`);
    } catch (err: unknown) {
      const error = err as Error;

      let errorMessage = ERROR_MESSAGES.PROCESS_JOB_FAILED;
      if (error instanceof Error) {
        errorMessage += ` for source ${source._id}: ${error.message}`;
      }

      console.error(errorMessage);

      // ✅ If credentials expired, stop retries
      if (error.message.includes(ERROR_MESSAGES.CREDENTIALS_EXPIRED)) {
        console.log(
          `🚨 Stopping retries for source ${source._id} as credentials are expired.`
        );
        return; // ✅ Do not retry
      }

      // ✅ If it's a rate limit (`429`), let BullMQ retry
      if (error.message.includes(ERROR_MESSAGES.RATE_LIMITED)) {
        console.log(`🔄 Retrying in accordance with BullMQ's retry policy...`);
        throw error; // ✅ Throw error to let BullMQ retry
      }

      throw error; // ✅ Ensure BullMQ retries for other failures too
    }
  }

  public startWorker() {
    new Worker(
      JOB_QUEUE_NAME,
      async (job: Job) => {
        try {
          await this.processJob(job);
        } catch (error) {
          console.error(
            `❌ Job failed for source ${job.data.source._id}: ${error}`
          );

          if (job.attemptsMade >= 3) {
            console.error(
              `🚨 Job for source ${job.data.source._id} failed 3 times. No more retries.`
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

    console.log(`🚀 Worker started in ${this.isDev ? "DEV" : "PROD"} mode.`);
  }

  public async scheduleLogFetch(sourceId: string) {
    const source = await this.sourceService.getSourceById(sourceId);

    if (!source) {
      console.error(ERROR_MESSAGES.SOURCE_NOT_FOUND);
      return;
    }

    if (source.expired) {
      console.log(`⚠️ Source ${sourceId} is expired. Skipping job scheduling.`);
      return;
    }

    const existingJob = await this.logFetchQueue.getJob(
      `${JOB_PREFIX}${sourceId}`
    );

    if (existingJob) {
      console.log(`⚠️ Job for source ${sourceId} already exists. Skipping.`);
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

    console.log(
      `⏳ Scheduled log fetching for source ${source._id} every ${source.logFetchInterval} seconds.`
    );
  }
}
