const fastify = require('fastify')();
const mongoose = require('mongoose');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const sourceRoutes = require('./routes/sourceRoutes');
const { initializeJobs } = require('./jobs/queueProcessor');
const { initializeCleanupJob } = require('./jobs/cleanupJob');
const logger = require('./utils/logger');
const { redis } = require('./config/redis');

const initializeMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://mongodb:27017/cybee');
    logger.info('MongoDB connected');
    return mongoose;
  } catch (err) {
    logger.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

const initializeElasticsearch = () => {
  return new Promise((resolve, reject) => {
    const client = new ElasticsearchClient({
      node: process.env.ELASTICSEARCH_NODE || 'http://elasticsearch:9200',
      tls: { rejectUnauthorized: false },
      maxRetries: 5,
      requestTimeout: 10000,
      sniffOnStart: true,
      sniffInterval: 60000
    });

    client.ping()
      .then(() => {
        logger.info('Elasticsearch connected');
        resolve(client);
      })
      .catch((err) => {
        logger.error('Elasticsearch connection error:', err.message);
        reject(err);
      });
  });
};

const setupErrorHandler = (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    logger.error('Request error:', {
      error: error.message,
      path: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
      body: request.body
    });

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: error.message
      });
    }

    return reply.status(error.statusCode || 500).send({
      statusCode: error.statusCode || 500,
      error: error.name || 'Internal Server Error',
      message: error.message || 'An internal server error occurred'
    });
  });
};

const checkServiceHealth = async (service, checkFn) => {
  try {
    await checkFn();
    return 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
};

const setupHealthEndpoint = (fastify) => {
  fastify.get('/health', async (request, reply) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {}
    };

    const checks = [
      ['elasticsearch', () => fastify.elasticsearch.ping()]
    ];

    let hasUnhealthyService = false;

    for (const [service, checkFn] of checks) {
      try {
        await checkFn();
        health.services[service] = 'healthy';
      } catch (error) {
        logger.error(`Health check failed for ${service}:`, error.message);
        health.services[service] = 'unhealthy';
        hasUnhealthyService = true;
      }
    }

    health.status = hasUnhealthyService ? 'degraded' : 'ok';
    const statusCode = hasUnhealthyService ? 503 : 200;
    return reply.code(statusCode).send(health);
  });
};

const setupGracefulShutdown = (fastify, mongoose, redis) => {
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await Promise.all([
      fastify.close(),
      mongoose.connection.close(),
      redis.quit()
    ]);
    process.exit(0);
  });
};

const start = async () => {
  try {
    // Register plugins
    await fastify.register(require('@fastify/cors'));
    await fastify.register(require('@fastify/sensible'));

    const mongoose = await initializeMongoDB();
    const elasticsearch = await initializeElasticsearch();

    fastify.decorate('mongoose', mongoose);
    fastify.decorate('redis', redis);
    fastify.decorate('elasticsearch', elasticsearch);

    setupErrorHandler(fastify);
    setupHealthEndpoint(fastify);
    fastify.register(sourceRoutes);

    await initializeJobs();
    // await initializeCleanupJob();  // Temporarily disabled - can be replaced with Elasticsearch ILM
    
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    setupGracefulShutdown(fastify, mongoose, redis);
  } catch (err) {
    logger.error('Server startup error:', err.message);
    process.exit(1);
  }
};

start();
