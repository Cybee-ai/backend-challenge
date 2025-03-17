import { FastifyInstance } from 'fastify';

/**
 * Health check routes
 */
export default async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check schema
  const healthCheckSchema = {
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number' },
          version: { type: 'string' },
          environment: { type: 'string' },
        },
      },
    },
  };
  
  // Register routes
  fastify.get('/health', { schema: healthCheckSchema }, async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  });
} 