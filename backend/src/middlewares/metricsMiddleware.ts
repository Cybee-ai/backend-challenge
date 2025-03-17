import { FastifyInstance, FastifyReply, FastifyRequest, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { MetricsService } from '../services/metricsService';

interface MetricsMiddlewareOptions {
  metricsService: MetricsService;
}

/**
 * Middleware to track API request metrics
 */
const metricsMiddleware: FastifyPluginAsync<MetricsMiddlewareOptions> = async (fastify, options) => {
  const { metricsService } = options;
  
  // Add start time to request
  fastify.addHook('onRequest', (request: FastifyRequest, reply: FastifyReply, done) => {
    request.startTime = Date.now();
    done();
  });

  // Log metrics on response
  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    const responseTime = Date.now() - (request.startTime || Date.now());
    
    // Get the path in a simpler way
    const path = request.url;
    const method = request.method;
    const statusCode = reply.statusCode;

    // Log the request metrics
    metricsService.logApiRequest(path, method, statusCode, responseTime)
      .catch(err => fastify.log.error(`Error logging API metrics: ${err instanceof Error ? err.message : 'Unknown error'}`));

    done();
  });
};

// Extend FastifyRequest to add startTime property
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export default fp(metricsMiddleware, {
  name: 'metricsMiddleware',
  fastify: '5.x',
}); 