import Fastify from "fastify";
import config from "./config/config";
import dbConnector from "./config/db";
import routes from "./routes";
import { initializeQueue } from "./queue";
import { registerSwagger } from "./config/swagger";

const fastify = Fastify({ logger: true });

const start = async () => {
  try {
    // Register Swagger documentation
    await registerSwagger(fastify);

    await fastify.register(dbConnector);
    await fastify.register(routes, { prefix: "/api/v1" });

    initializeQueue(fastify);

    await fastify.listen({ port: config.port });
    console.log(`✅ Server running on PORT: ${config.port}`);
    console.log(
      `📚 Swagger documentation available at: http://localhost:${config.port}/documentation`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
