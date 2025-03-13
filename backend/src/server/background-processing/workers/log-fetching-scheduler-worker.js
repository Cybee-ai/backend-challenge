import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis-connection.js';
import { LOG_FETCHING_SCHEDULER_QUEUE_NAME } from '../queues/log-fetching-scheduler-queue.js';
import { scheduleLogFetchingJobs } from '../jobs/log-fetching-scheduler-job.js';

export const worker = new Worker(LOG_FETCHING_SCHEDULER_QUEUE_NAME,async job => await scheduleLogFetchingJobs(job),{ connection: redisConnection });