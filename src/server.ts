import Fastify from "fastify";
import dbConnector from "./config/db";
import dotenv from "dotenv";
import routes from "./routes";
import config from "./config/config";

dotenv.config();

const fastify = Fastify({ logger: true });

const PORT = config.port;

// Register DB Connector
fastify.register(dbConnector);
fastify.register(routes, { prefix: "/api/v1" });

// Sample Route
fastify.get("/", async (request, reply) => {
  return { message: "Fastify + TypeScript + MongoDB!" };
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: PORT });
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
