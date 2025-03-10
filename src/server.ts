import Fastify from "fastify";
import dbConnector from "./config/db";
import routes from "./routes";
import config from "./config/config";
import { initializeQueue } from "./queue";

const fastify = Fastify({ logger: true });

const start = async () => {
  try {
    await fastify.register(dbConnector);
    await fastify.register(routes, { prefix: "/api/v1" });

    initializeQueue(fastify);

    await fastify.listen({ port: config.port });
    console.log(`✅ Server running on PORT: ${config.port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
