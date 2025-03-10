import fastifyPlugin from "fastify-plugin";
import fastifyMongo from "@fastify/mongodb";
import config from "./config";

export default fastifyPlugin(async (fastify) => {
  try {
    await fastify.register(fastifyMongo, {
      forceClose: true,
      url: config.mongoUri,
    });

    if (!fastify.mongo.db) {
      throw new Error("MongoDB connection failed! `db` is undefined.");
    }

    fastify.log.info("✅ MongoDB connected successfully!");
  } catch (error) {
    fastify.log.error("❌ MongoDB connection error:", error);
    process.exit(1); // Exit the process if connection fails
  }
});
