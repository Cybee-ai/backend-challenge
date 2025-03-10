import { Queue, Worker, Job } from "bullmq";
import axios from "axios";
import { FastifyInstance } from "fastify";
import { google } from "googleapis";
import {
  ERROR_MESSAGES,
  GOOGLE_SCOPES,
  JOB_QUEUE_NAME,
  JOB_PREFIX,
  REDIS_HOST,
  REDIS_PORT,
  RETRY_LIMIT,
} from "../config/constants";
import { SourceService } from "./source.services";

const connection = {
  host: REDIS_HOST,
  port: REDIS_PORT,
};

export class LogFetchService {
  private logFetchQueue: Queue;
  private sourceService: SourceService;

  constructor(fastify: FastifyInstance) {
    this.logFetchQueue = new Queue(JOB_QUEUE_NAME, { connection });
    this.sourceService = new SourceService(fastify);
  }

  private async fetchLogs(source: any, retries = RETRY_LIMIT): Promise<any[]> {
    try {
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
    } catch (error) {
      let errorMessage = ERROR_MESSAGES.FETCH_FAILED;
      if (error instanceof Error) {
        errorMessage = `${ERROR_MESSAGES.FETCH_FAILED}: ${error.message}`;
      }

      console.error(errorMessage);

      if (retries > 0) {
        console.log(`${ERROR_MESSAGES.RETRYING} (${retries} retries left)`);
        return this.fetchLogs(source, retries - 1);
      } else {
        throw new Error(ERROR_MESSAGES.MAX_RETRIES_REACHED);
      }
    }
  }

  private async processJob(job: Job) {
    const { source } = job.data;

    try {
      const logs = await this.fetchLogs(source);
      await axios.post(source.callbackUrl, { logs });
      console.log(`✅ Logs sent successfully for source ${source.id}`);
    } catch (error) {
      let errorMessage = ERROR_MESSAGES.PROCESS_JOB_FAILED;
      if (error instanceof Error) {
        errorMessage += ` for source ${source.id}: ${error.message}`;
      }
      console.error(errorMessage);
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
            `❌ Error processing logs for source ${job.data.source.id}:`,
            error
          );
        }
      },
      { connection }
    );
  }

  public async scheduleLogFetch(sourceId: string) {
    const source = await this.sourceService.getSourceById(sourceId);

    if (!source) {
      console.error(ERROR_MESSAGES.SOURCE_NOT_FOUND);
      return;
    }

    await this.logFetchQueue.add(
      `${JOB_PREFIX}${sourceId}`,
      { source },
      { repeat: { every: source.logFetchInterval * 1000 } }
    );

    console.log(
      `⏳ Scheduled log fetching for source ${source.id} every ${source.logFetchInterval} seconds.`
    );
  }
}
