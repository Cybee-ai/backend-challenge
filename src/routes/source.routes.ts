import { FastifyInstance } from "fastify";
import { SourceController } from "../controllers/source.controller";
import { createSourceSchema, deleteSourceSchema } from "../schemas/source";

export default async function sourceRoutes(fastify: FastifyInstance) {
  const sourceController = new SourceController(fastify);

  fastify.post("/sources", {
    schema: createSourceSchema, // Apply JSON schema validation
    handler: sourceController.createSource,
  });

  fastify.delete("/sources/:id", {
    schema: deleteSourceSchema, // Apply validation for delete
    handler: sourceController.deleteSource,
  });

  fastify.get("/sources", sourceController.getSources);
}
