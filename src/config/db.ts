import fastifyPlugin from "fastify-plugin";
import fastifyMongo from "@fastify/mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/defaultdb";

export default fastifyPlugin(async (fastify) => {
  fastify.register(fastifyMongo, {
    forceClose: true,
    url: MONGO_URI,
  });

  fastify.log.info("MongoDB connected successfully!");
});
