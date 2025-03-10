import Fastify, { FastifyInstance } from 'fastify';
import { initializeWorkers } from './services/workers';
import envPlugin from './config/env';
import databasePlugin from './config/database';
import redisPlugin from './config/redis';
import swaggerPlugin from './config/swagger';
import queuesPlugin from './queues';
import sourceRoutes from './routes/sourceRoutes';
import healthRoutes from './routes/healthRoutes';
import elasticsearchPlugin from './config/elasticsearch';
import metricsMiddleware from './middlewares/metricsMiddleware';
import { MetricsService } from './services/metricsService';

// Create Fastify instance
const fastify: FastifyInstance = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
async function setupServer(): Promise<void> {
  try {
    // Register environment variables
    await fastify.register(envPlugin);
    
    // Register database connection
    await fastify.register(databasePlugin);
    
    // Register Redis connection
    await fastify.register(redisPlugin);
    
    // Register Elasticsearch connection
    await fastify.register(elasticsearchPlugin, {
      node: fastify.config.ELASTIC_NODE || 'http://localhost:9200',
      username: fastify.config.ELASTIC_USERNAME,
      password: fastify.config.ELASTIC_PASSWORD
    });
    
    // Create metrics service instance
    const metricsService = new MetricsService(fastify);
    
    // Register metrics middleware
    await fastify.register(metricsMiddleware, { metricsService });
    
    // Register Swagger documentation
    await fastify.register(swaggerPlugin);
    
    // Register queues
    await fastify.register(queuesPlugin);
    
    // Register routes
    await fastify.register(sourceRoutes, { prefix: '/api', metricsService });
    await fastify.register(healthRoutes, { prefix: '/api' });
    
    // Initialize workers with metrics service
    initializeWorkers(fastify, metricsService);
    
    // Set up system metrics logging
    let metricsInterval: NodeJS.Timeout;
    
    // Set up cleanup on server close
    fastify.addHook('onClose', () => {
      if (metricsInterval) {
        clearInterval(metricsInterval);
      }
    });
    
    // Start server
    const port = fastify.config.PORT || 3000;
    await fastify.listen({ 
      port, 
      host: '0.0.0.0',
      listenTextResolver: () => {
        return `Server listening on port ${port}`;
      }
    });
    
    // Start logging system metrics periodically after server is started
    metricsInterval = setInterval(() => {
      metricsService.logSystemMetrics()
        .catch(err => fastify.log.error(`Error logging system metrics: ${err instanceof Error ? err.message : 'Unknown error'}`));
    }, 60000); // Log every minute
  } catch (error) {
    fastify.log.error(`Error starting server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  fastify.log.error(`Unhandled rejection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Start server
setupServer(); 