import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { createClient } from 'redis';

interface RedisPluginOptions {
  host?: string;
  port?: number;
  password?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    redis: any; // Using any type to avoid complex type issues
  }
}

/**
 * Fastify plugin for Redis connection
 */
const redisPlugin: FastifyPluginAsync<RedisPluginOptions> = async (fastify, options) => {
  const host = options.host || process.env.REDIS_HOST || 'localhost';
  const port = options.port || Number(process.env.REDIS_PORT) || 6379;
  const password = options.password || process.env.REDIS_PASSWORD || undefined;
  
  // Create Redis client
  const redisClient = createClient({
    url: `redis://${host}:${port}`,
    password: password,
  });
  
  // Handle Redis events
  redisClient.on('connect', () => {
    fastify.log.info('Redis connection established');
  });
  
  redisClient.on('error', (err) => {
    fastify.log.error(`Redis connection error: ${err}`);
  });
  
  redisClient.on('end', () => {
    fastify.log.info('Redis connection closed');
  });
  
  // Connect to Redis
  try {
    await redisClient.connect();
    
    // Add Redis client to fastify
    fastify.decorate('redis', redisClient);
    
    // Handle fastify close event
    fastify.addHook('onClose', async () => {
      if (redisClient.isOpen) {
        await redisClient.quit();
        fastify.log.info('Redis connection closed');
      }
    });
  } catch (err) {
    fastify.log.error(`Error connecting to Redis: ${err}`);
    process.exit(1);
  }
};

export default fp(redisPlugin, {
  name: 'redis',
  fastify: '5.x',
}); 