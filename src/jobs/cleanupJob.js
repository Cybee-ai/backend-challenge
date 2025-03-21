const { Queue, Worker } = require('bullmq');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');
const { redis } = require('../config/redis');

const QUEUE_NAME = 'dataCleanup';
const DEFAULT_RETENTION_DAYS = 30;
const INDICES = ['metrics', 'google_workspace_logs'];

const config = {
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://elasticsearch:9200'
  },
  retention: {
    days: parseInt(process.env.DATA_RETENTION_DAYS, 10) || DEFAULT_RETENTION_DAYS
  }
};

const elasticClient = new ElasticsearchClient(config.elasticsearch);

const deleteOldDataFromIndex = async (index, cutoffDate) => {
  try {
    const response = await elasticClient.deleteByQuery({
      index,
      body: {
        query: {
          range: {
            '@timestamp': {
              lt: cutoffDate.toISOString()
            }
          }
        }
      },
      refresh: true
    });

    logger.info(`Cleaned up ${response.deleted} documents from ${index}`);
    return response.deleted;
  } catch (error) {
    logger.error(`Failed to cleanup ${index}:`, error);
    throw error;
  }
};

const cleanupOldData = async () => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - config.retention.days);

  try {
    const results = await Promise.allSettled(
      INDICES.map(index => deleteOldDataFromIndex(index, cutoffDate))
    );

    const summary = results.reduce((acc, result, index) => {
      acc[INDICES[index]] = result.status === 'fulfilled' 
        ? { status: 'success', deleted: result.value }
        : { status: 'failed', error: result.reason.message };
      return acc;
    }, {});

    logger.info('Cleanup summary:', summary);
  } catch (error) {
    logger.error('Data cleanup failed:', error);
    throw error;
  }
};

let queue = null;
let worker = null;

const initializeCleanupJob = async () => {
  try {
    logger.info('Initializing cleanup job...');

    // Initialize queue with connection check
    queue = new Queue(QUEUE_NAME, { 
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: { count: 10 },
        removeOnFail: { age: 24 * 3600 }
      }
    });

    // Test queue connection
    await queue.waitUntilReady();
    logger.info('Cleanup queue initialized successfully');

    // Initialize worker with connection check
    worker = new Worker(QUEUE_NAME, async (job) => {
      logger.info(`Starting cleanup job ${job.id}`);
      await cleanupOldData();
    }, { 
      connection: redis,
      removeOnComplete: { count: 10 },
      removeOnFail: { age: 24 * 3600 }
    });

    // Set up worker event handlers
    worker.on('completed', (job) => {
      logger.info(`Cleanup job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Cleanup job ${job.id} failed:`, error);
    });

    // Wait for worker to be ready
    await worker.waitUntilReady();
    logger.info('Cleanup worker initialized successfully');

    // Schedule the cleanup job
    const job = await queue.add('cleanup', {}, {
      repeat: {
        pattern: '0 0 * * *' // Run at midnight every day
      }
    });

    logger.info(`Cleanup job scheduled successfully with ID: ${job.id}`);
    return true;
  } catch (error) {
    logger.error('Failed to initialize cleanup job:', error);
    if (worker) {
      await worker.close();
    }
    if (queue) {
      await queue.close();
    }
    throw error;
  }
};

const shutdown = async () => {
  try {
    if (worker) {
      await worker.close();
      logger.info('Cleanup worker closed');
    }
    if (queue) {
      await queue.close();
      logger.info('Cleanup queue closed');
    }
  } catch (error) {
    logger.error('Error during cleanup job shutdown:', error);
    throw error;
  }
};

process.on('SIGTERM', shutdown);

module.exports = {
  cleanupOldData,
  initializeCleanupJob,
  shutdown
}; 