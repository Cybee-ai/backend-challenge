import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

const swaggerPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Google Workspace Event Integration API',
        description: 'API for integrating with Google Workspace Admin SDK logs',
        version: '1.0.0',
      },
      externalDocs: {
        url: 'https://developers.google.com/admin-sdk/reports/reference/rest',
        description: 'Google Workspace Admin SDK Reports API Documentation',
      },
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'sources', description: 'Source management endpoints' },
        { name: 'logs', description: 'Log management endpoints' },
        { name: 'health', description: 'Health check endpoints' },
      ],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
};

export default fp(swaggerPlugin, {
  name: 'swagger',
  fastify: '5.x',
}); 