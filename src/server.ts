import Fastify from "fastify";
import dbConnector from "./config/db";
import dotenv from "dotenv";

dotenv.config();

const fastify = Fastify({ logger: true });

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Register DB Connector
fastify.register(dbConnector);

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
