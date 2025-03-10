import { FastifyInstance } from 'fastify';
import { Worker, ConnectionOptions } from 'bullmq';
import { QueueName, LogFetchJob, LogForwardJob } from '../queues';
import { LogFetcherService } from './logFetcher';
import { LogForwarderService } from './logForwarder';
import { EnvConfig } from '../config/env';
import { MetricsService } from './metricsService';

/**
 * Initialize workers for processing jobs
 */
export const initializeWorkers = (fastify: FastifyInstance, metricsService?: MetricsService): void => {
  const config = fastify.config as EnvConfig;
  const logger = fastify.log;
  
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
  
  // Create services
  const logFetcherService = new LogFetcherService(logger, metricsService);
  const logForwarderService = new LogForwarderService(logger, metricsService);
  
  // Create log fetch worker
  const logFetchWorker = new Worker<LogFetchJob>(
    QueueName.LOG_FETCH,
    async (job) => {
      logger.info(`Processing log fetch job ${job.id}`);
      
      try {
        const logIds = await logFetcherService.processLogFetch(job.data);
        
        // If logs were fetched, add a job to forward them
        if (logIds.length > 0) {
          await fastify.queues.logForward.add(
            `forward-${job.data.sourceId}-${Date.now()}`,
            {
              sourceId: job.data.sourceId,
              logIds,
            },
            {
              attempts: 5,
              backoff: {
                type: 'exponential',
                delay: 5000, // 5 seconds
              },
            }
          );
        }
        
        return { success: true, logCount: logIds.length };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Log fetch job ${job.id} failed: ${errorMessage}`);
        throw error;
      }
    },
    {
      connection: connectionOptions,
      prefix,
      concurrency: 5,
      limiter: {
        max: 10, // Maximum number of jobs processed
        duration: 1000, // per second
      },
    }
  );
  
  // Create log forward worker
  const logForwardWorker = new Worker<LogForwardJob>(
    QueueName.LOG_FORWARD,
    async (job) => {
      logger.info(`Processing log forward job ${job.id}`);
      
      try {
        const result = await logForwarderService.processLogForward(job.data);
        return { success: result };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Log forward job ${job.id} failed: ${errorMessage}`);
        throw error;
      }
    },
    {
      connection: connectionOptions,
      prefix,
      concurrency: 5,
      limiter: {
        max: 20, // Maximum number of jobs processed
        duration: 1000, // per second
      },
    }
  );
  
  // Handle worker events
  logFetchWorker.on('completed', (job) => {
    logger.info(`Log fetch job ${job.id} completed successfully`);
  });
  
  logFetchWorker.on('failed', (job, error) => {
    logger.error(`Log fetch job ${job?.id} failed: ${error}`);
  });
  
  logForwardWorker.on('completed', (job) => {
    logger.info(`Log forward job ${job.id} completed successfully`);
  });
  
  logForwardWorker.on('failed', (job, error) => {
    logger.error(`Log forward job ${job?.id} failed: ${error}`);
  });
  
  // Handle graceful shutdown
  fastify.addHook('onClose', async () => {
    await Promise.all([
      logFetchWorker.close(),
      logForwardWorker.close(),
    ]);
    logger.info('Workers closed');
  });
}; 