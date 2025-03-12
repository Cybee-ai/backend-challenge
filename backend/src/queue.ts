import { FastifyInstance } from "fastify";
import { LogFetchService } from "./services/logFetch.service";

export function initializeQueue(fastify: FastifyInstance) {
  if (!fastify.mongo || !fastify.mongo.db) {
    console.error("❌ MongoDB is not initialized. Queue cannot be started.");
    return;
  }

  console.log("✅ MongoDB is ready. Initializing queue system...");

  const logFetchService = new LogFetchService(fastify);
  logFetchService.startWorker();
}
