import { FastifyInstance } from "fastify";
import sourceRoutes from "./source.routes";

export default async function routes(fastify: FastifyInstance) {
  fastify.register(sourceRoutes);
}
