const Redis = require('ioredis');
const logger = require('../utils/logger');

const REDIS_URL = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'redis'}:${process.env.REDIS_PORT || 6379}`;

const redisOptions = {
  maxRetriesPerRequest: null,  // Set to null for BullMQ compatibility
  enableReadyCheck: false,  // Required by BullMQ
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

let redisClient = null;

const createRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(REDIS_URL, redisOptions);

  redisClient.on('connect', () => {
    logger.info('Successfully connected to Redis');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis connection error:', error);
  });

  return redisClient;
};

module.exports = {
  createRedisClient,
  redisOptions,
  REDIS_URL,
  redis: createRedisClient()
}; 