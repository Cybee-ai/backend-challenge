import { FastifyInstance } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { FastifyReply, FastifyRequest } from "fastify";

// Since we can't import the modules directly due to TypeScript errors,
// we'll use dynamic imports
export async function registerSwagger(fastify: FastifyInstance): Promise<void> {
  // Import the swagger plugins dynamically
  const swagger = await import("@fastify/swagger");
  const swaggerUi = await import("@fastify/swagger-ui");

  await fastify.register(swagger.default, {
    swagger: {
      info: {
        title: "Google Workspace Event Integration API",
        description:
          "API for integrating with Google Workspace events and logs",
        version: "1.0.0",
      },
      externalDocs: {
        url: "https://swagger.io",
        description: "Find more info here",
      },
      host: "localhost:3000",
      schemes: ["http", "https"],
      consumes: ["application/json"],
      produces: ["application/json"],
      tags: [{ name: "sources", description: "Source management endpoints" }],
      securityDefinitions: {
        apiKey: {
          type: "apiKey",
          name: "apiKey",
          in: "header",
        },
      },
    },
  });

  await fastify.register(swaggerUi.default, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (
        request: FastifyRequest,
        reply: FastifyReply,
        next: () => void
      ) {
        next();
      },
      preHandler: function (
        request: FastifyRequest,
        reply: FastifyReply,
        next: () => void
      ) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header: string) => header,
  });
}
