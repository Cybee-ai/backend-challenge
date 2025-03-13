import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis-connection.js';
import { LOG_FETCHING_QUEUE_NAME } from '../queues/log-fetching-queue.js';
import { handleLogFetch } from '../jobs/callback-api-handler-job.js';

export const worker1 = new Worker(LOG_FETCHING_QUEUE_NAME,async job => {
    if (job.name.startsWith('process-source-logs-')) {
            await handleLogFetch(job);
            return;
    }
},{ connection: redisConnection, concurrency: 3 });

