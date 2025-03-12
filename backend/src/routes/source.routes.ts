import { FastifyInstance } from "fastify";
import { SourceController } from "../controllers/source.controller";
import { createSourceSchema, deleteSourceSchema } from "../schemas/source";

export default async function sourceRoutes(fastify: FastifyInstance) {
  const sourceController = new SourceController(fastify);

  fastify.post("/sources", {
    schema: createSourceSchema,
    handler: sourceController.createSource,
  });

  fastify.delete("/sources/:id", {
    schema: deleteSourceSchema,
    handler: sourceController.deleteSource,
  });

  fastify.get("/sources", sourceController.getSources);

  fastify.get("/sources/:id/status", sourceController.getSourceStatus);
}
