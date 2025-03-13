
import { redisConnection } from '../config/redis-connection.js';
import { Queue, Worker } from 'bullmq';

export const LOG_FETCHING_SCHEDULER_QUEUE_NAME = 'log-fetching-scheduler-queue';

export const logFetchingSchedulerQueue = new Queue(LOG_FETCHING_SCHEDULER_QUEUE_NAME, { connection: redisConnection });

(async () => {
    await logFetchingSchedulerQueue.upsertJobScheduler(
        'check-source-entries', 
        {
          every: 3000, 
        },
        {
          data: {},
          opts: {
            removeOnComplete: true
          }, 
        }
      );
  })();

