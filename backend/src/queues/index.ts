import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Queue, Worker, QueueEvents, ConnectionOptions } from 'bullmq';
import { EnvConfig } from '../config/env';

// Queue names
export enum QueueName {
  LOG_FETCH = 'log-fetch',
  LOG_FORWARD = 'log-forward',
}

// Define job types
export interface LogFetchJob {
  sourceId: string;
}

export interface LogForwardJob {
  sourceId: string;
  logIds: string[];
}

// Define queue interface for type safety
export interface Queues {
  logFetch: Queue<LogFetchJob>;
  logForward: Queue<LogForwardJob>;
}

declare module 'fastify' {
  interface FastifyInstance {
    queues: Queues;
  }
}

const queuesPlugin: FastifyPluginAsync = async (fastify) => {
  const config = fastify.config as EnvConfig;

  // Redis connection options
  const connectionOptions: ConnectionOptions = {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
  };

  if (config.REDIS_PASSWORD) {
    Object.assign(connectionOptions, { password: config.REDIS_PASSWORD });
  }

  // Prefix for all queues
  const prefix = config.BULL_PREFIX || 'google_workspace';

  // Create queues
  const logFetchQueue = new Queue<LogFetchJob>(QueueName.LOG_FETCH, {
    connection: connectionOptions,
    prefix,
  });

  const logForwardQueue = new Queue<LogForwardJob>(QueueName.LOG_FORWARD, {
    connection: connectionOptions,
    prefix,
  });

  // Add queue event listeners
  const logFetchEvents = new QueueEvents(QueueName.LOG_FETCH, {
    connection: connectionOptions,
    prefix,
  });

  const logForwardEvents = new QueueEvents(QueueName.LOG_FORWARD, {
    connection: connectionOptions,
    prefix,
  });

  // Setup event listeners
  logFetchEvents.on('completed', ({ jobId }) => {
    fastify.log.info(`Log fetch job ${jobId} completed`);
  });

  logFetchEvents.on('failed', ({ jobId, failedReason }) => {
    fastify.log.error(`Log fetch job ${jobId} failed: ${failedReason}`);
  });

  logForwardEvents.on('completed', ({ jobId }) => {
    fastify.log.info(`Log forward job ${jobId} completed`);
  });

  logForwardEvents.on('failed', ({ jobId, failedReason }) => {
    fastify.log.error(`Log forward job ${jobId} failed: ${failedReason}`);
  });

  // Add queues to fastify instance
  fastify.decorate('queues', {
    logFetch: logFetchQueue,
    logForward: logForwardQueue,
  });

  // Handle graceful shutdown
  fastify.addHook('onClose', async () => {
    await Promise.all([
      logFetchQueue.close(),
      logForwardQueue.close(),
      logFetchEvents.close(),
      logForwardEvents.close(),
    ]);
    fastify.log.info('BullMQ queues closed');
  });
};

export default fp(queuesPlugin, {
  name: 'queues',
  fastify: '5.x',
  dependencies: ['env', 'redis'],
}); 