import { FastifyInstance } from "fastify";
import { SourceController } from "../controllers/source.controller";
import { createSourceSchema, deleteSourceSchema } from "../schemas/source";

export default async function sourceRoutes(fastify: FastifyInstance) {
  const sourceController = new SourceController(fastify);

  fastify.post("/sources", {
    schema: {
      ...createSourceSchema,
      description: "Create a new Google Workspace source",
      tags: ["sources"],
      summary: "Create a new source for Google Workspace integration",
      response: {
        201: {
          description: "Successful response",
          type: "object",
          properties: {
            success: { type: "boolean" },
            id: { type: "string" },
          },
        },
      },
    },
    handler: sourceController.createSource,
  });

  fastify.delete("/sources/:id", {
    schema: {
      ...deleteSourceSchema,
      description: "Delete a Google Workspace source",
      tags: ["sources"],
      summary: "Delete an existing source by ID",
      response: {
        200: {
          description: "Successful response",
          type: "object",
          properties: {
            success: { type: "boolean" },
          },
        },
        404: {
          description: "Source not found",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: sourceController.deleteSource,
  });

  fastify.get("/sources", {
    schema: {
      description: "Get all Google Workspace sources",
      tags: ["sources"],
      summary: "Retrieve all configured sources",
      response: {
        200: {
          description: "List of sources",
          type: "array",
          items: {
            type: "object",
            properties: {
              _id: { type: "string" },
              sourceType: { type: "string" },
              credentials: {
                type: "object",
                properties: {
                  clientEmail: { type: "string" },
                  scopes: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
              logFetchInterval: { type: "number" },
              callbackUrl: { type: "string" },
              expired: { type: "boolean" },
              lastChecked: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
    handler: sourceController.getSources,
  });

  fastify.get("/sources/:id/status", {
    schema: {
      description: "Get status of a Google Workspace source",
      tags: ["sources"],
      summary: "Check if a source is active and when it was last checked",
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", description: "Source ID" },
        },
      },
      response: {
        200: {
          description: "Source status",
          type: "object",
          properties: {
            sourceId: { type: "string" },
            expired: { type: "boolean" },
            lastChecked: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
          },
        },
        404: {
          description: "Source not found",
          type: "object",
          properties: {
            error: { type: "string" },
          },
        },
      },
    },
    handler: sourceController.getSourceStatus,
  });
}
