
import { redisConnection } from '../config/redis-connection.js';
import { Queue, Worker } from 'bullmq';
import { CREDENTIAL_EXPIRATION_JOB_NAME } from '../jobs/credential-expiration-job.js';

export const SOURCE_JOBS_QUEUE_NAME = 'source-jobs-queue';

export const sourceJobsQueue = new Queue(SOURCE_JOBS_QUEUE_NAME, { connection: redisConnection });

(async () => {
    await sourceJobsQueue.add(
      CREDENTIAL_EXPIRATION_JOB_NAME,
      {},
      {
        repeat: { cron: '0 */6 * * *' } 
      }
    );
  })();