import { FastifyInstance } from 'fastify';
import { SourceController } from '../controllers/sourceController';
import { SchedulerService } from '../services/scheduler';
import { MetricsService } from '../services/metricsService';

/**
 * Source routes
 */
export default async function sourceRoutes(fastify: FastifyInstance, options: { prefix: string, metricsService?: MetricsService }): Promise<void> {
  // Create scheduler service
  const schedulerService = new SchedulerService(fastify);
  
  // Initialize scheduler
  await schedulerService.initialize();
  
  // Create controller
  const sourceController = new SourceController(schedulerService, options.metricsService);
  
  // Add source schema
  const addSourceSchema = {
    body: {
      type: 'object',
      required: ['sourceType', 'credentials', 'logFetchInterval', 'callbackUrl'],
      properties: {
        sourceType: {
          type: 'string',
          enum: ['google_workspace'],
        },
        credentials: {
          type: 'object',
          required: ['clientEmail', 'privateKey', 'scopes'],
          properties: {
            clientEmail: { type: 'string' },
            privateKey: { type: 'string' },
            scopes: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        logFetchInterval: {
          type: 'number',
          minimum: 60, // 1 minute minimum
        },
        callbackUrl: { type: 'string', format: 'uri' },
      },
    },
    response: {
      201: {
        type: 'object',
        properties: {
          statusCode: { type: 'number' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              sourceType: { type: 'string' },
              logFetchInterval: { type: 'number' },
              callbackUrl: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  };
  
  // Remove source schema
  const removeSourceSchema = {
    params: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          statusCode: { type: 'number' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
  };
  
  // Get sources schema
  const getSourcesSchema = {
    response: {
      200: {
        type: 'object',
        properties: {
          statusCode: { type: 'number' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                sourceType: { type: 'string' },
                logFetchInterval: { type: 'number' },
                callbackUrl: { type: 'string' },
                lastFetchTimestamp: { type: ['string', 'null'], format: 'date-time' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
  };
  
  // Register routes
  fastify.post('/add-source', { schema: addSourceSchema }, sourceController.addSource);
  fastify.delete('/remove-source/:id', { schema: removeSourceSchema }, sourceController.removeSource);
  fastify.get('/sources', { schema: getSourcesSchema }, sourceController.getSources);
} 