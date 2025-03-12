import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export const setupSwagger = async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Fastify API',
        description: 'API documentation',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'Enter your API Key to authenticate requests.',
          },
        },
      },
      security: [{ ApiKeyAuth: [] }], 
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/swagger',
    exposeRoute: true,
  });
};
