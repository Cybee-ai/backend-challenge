
import { redisConnection } from '../config/redis-connection.js';
import { Queue, Worker } from 'bullmq';

export const LOG_FETCHING_QUEUE_NAME = 'log-fetching-queue';

export const logFetchingQueue = new Queue(LOG_FETCHING_QUEUE_NAME, { connection: redisConnection });