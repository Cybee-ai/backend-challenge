const { Queue, Worker, QueueScheduler } = require('bullmq');
const { decrypt } = require('../services/encryptionService');
const { validateCredentials, fetchLogs } = require('../services/googleWorkspaceService');
const { sendLogs } = require('../services/webhookService');
const { indexMetric } = require('../services/elasticsearchService');
const Source = require('../models/Source');
const logger = require('../utils/logger');
const { redis } = require('../config/redis');

const QUEUE_NAME = 'logFetcher';
const QUEUE_PREFIX = 'bull';

// Create queue scheduler first
const scheduler = new QueueScheduler(QUEUE_NAME, {
  connection: redis,
  prefix: QUEUE_PREFIX
});

const queue = new Queue(QUEUE_NAME, { 
  connection: redis,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    removeOnComplete: { count: 10 },
    removeOnFail: { age: 24 * 3600 }
  }
});

const getSourceIdFromJob = (job) => {
  if (job.id) {
    const parts = job.id.split(':');
    return parts.length > 1 ? parts[1] : null;
  } 
  if (job.key) {
    const parts = job.key.split(':');
    return parts.length > 2 ? parts[2] : null;
  }
  return null;
};

const cleanupOrphanedJobs = async () => {
  try {
    const [repeatableJobs, activeJobs, waitingJobs, delayedJobs] = await Promise.all([
      queue.getRepeatableJobs(),
      queue.getActive(),
      queue.getWaiting(),
      queue.getDelayed()
    ]);
    
    const allJobs = [...repeatableJobs, ...activeJobs, ...waitingJobs, ...delayedJobs];
    const sourceIds = new Set(allJobs.map(getSourceIdFromJob).filter(Boolean));

    for (const sourceId of sourceIds) {
      const source = await Source.findById(sourceId);
      if (!source) {
        logger.info(`Cleaning up jobs for non-existent source ${sourceId}`);
        
        const repeatableKeys = repeatableJobs
          .filter(job => job.key.split(':')[2] === sourceId)
          .map(job => job.key);
          
        await Promise.all([
          ...repeatableKeys.map(key => queue.removeRepeatableByKey(key)),
          ...activeJobs.filter(job => getSourceIdFromJob(job) === sourceId).map(job => job.remove()),
          ...waitingJobs.filter(job => getSourceIdFromJob(job) === sourceId).map(job => job.remove()),
          ...delayedJobs.filter(job => getSourceIdFromJob(job) === sourceId).map(job => job.remove())
        ]);
        
        logger.info(`Cleaned up ${repeatableKeys.length} jobs for source ${sourceId}`);
      }
    }
  } catch (error) {
    logger.error('Failed to cleanup orphaned jobs:', error);
  }
};

const processLogs = async (source, credentials, activities) => {
  if (!activities.length) {
    logger.info('No new activities to process');
    return;
  }

  try {
    await sendLogs(source.callbackUrl, activities);
    await Promise.all(activities.map(activity => 
      indexMetric({
        sourceId: source._id,
        timestamp: new Date(activity.id.time),
        activityType: activity.events[0]?.type || 'unknown',
        application: activity.id?.applicationName || 'unknown'
      })
    ));

    await Source.findByIdAndUpdate(source._id, { 
      lastFetchTime: new Date(activities[activities.length - 1].id.time),
      lastError: null
    });

    logger.info(`Successfully processed ${activities.length} activities for source ${source._id}`);
  } catch (error) {
    logger.error(`Failed to process activities for source ${source._id}:`, error);
    await Source.findByIdAndUpdate(source._id, { lastError: error.message });
    throw error;
  }
};

const worker = new Worker(QUEUE_NAME, async (job) => {
  const source = await Source.findById(job.data.sourceId);
  if (!source) {
    logger.error(`Source ${job.data.sourceId} not found`);
    return;
  }

  try {
    const credentials = JSON.parse(decrypt(source.credentials));
    const isValid = await validateCredentials(credentials);
    
    if (!isValid) {
      await Source.findByIdAndUpdate(source._id, { status: 'invalid_credentials' });
      logger.error(`Invalid credentials for source ${source._id}`);
      return;
    }

    const activities = await fetchLogs(credentials, source.lastFetchTime);
    await processLogs(source, credentials, activities);
    
    logger.info(`Fetched total of ${activities.length} activities across all applications`);
  } catch (error) {
    logger.error(`Job failed for source ${source._id}:`, error);
    await Source.findByIdAndUpdate(source._id, { 
      lastError: error.message,
      status: 'error'
    });
    throw error;
  }
}, { 
  connection: redis,
  prefix: QUEUE_PREFIX,
  lockDuration: 60000,
  concurrency: 1,
  settings: {
    stalledInterval: 60000,
    maxStalledCount: 2
  }
});

const scheduleLogFetcherJob = async (source) => {
  try {
    await queue.add(
      `fetch:${source._id}`,
      { sourceId: source._id },
      { 
        repeat: { 
          every: source.logFetchInterval * 1000
        },
        removeOnComplete: { count: 10 },
        removeOnFail: { age: 24 * 3600 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    );
    logger.info(`Scheduled recurring job for source ${source._id} (interval: ${source.logFetchInterval}s)`);
  } catch (error) {
    logger.error(`Failed to schedule job for source ${source._id}:`, error);
    throw error;
  }
};

const initializeJobs = async () => {
  try {
    // Wait for scheduler to be ready
    await scheduler.waitUntilReady();
    logger.info('Queue scheduler initialized successfully');

    // Wait for queue to be ready
    await queue.waitUntilReady();
    logger.info('Queue initialized successfully');

    // Wait for worker to be ready
    await worker.waitUntilReady();
    logger.info('Worker initialized successfully');
    
    // Get all active sources
    const sources = await Source.find({ status: 'active' });
    logger.info(`Found ${sources.length} active sources to schedule`);
    
    // Schedule jobs for each active source
    await Promise.all(sources.map(scheduleLogFetcherJob));
  } catch (error) {
    logger.error('Failed to initialize jobs:', error);
    throw error;
  }
};

worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed:`, error);
});

worker.on('ready', () => {
  logger.info('Worker is ready to process jobs');
});

worker.on('error', (error) => {
  logger.error('Worker encountered an error:', error);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await queue.close();
  await scheduler.close();
  await redis.quit();
});

module.exports = {
  queue,
  worker,
  scheduler,
  scheduleLogFetcherJob,
  initializeJobs
};
