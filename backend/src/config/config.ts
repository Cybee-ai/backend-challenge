import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const NODE_ENVIRONMENTS = ["dev", "test", "production"] as const;

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  MONGO_URI: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY must be 32 bytes (64 hex characters)"),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.coerce.number().default(6379),
  NODE_ENV: z.enum(NODE_ENVIRONMENTS),
  QUEUE_CONCURRENCY: z.coerce.number().optional(),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsedConfig.error.format()
  );
  process.exit(1);
}

const config = {
  port: parsedConfig.data.PORT,
  mongoUri: parsedConfig.data.MONGO_URI,
  encryptionKey: parsedConfig.data.ENCRYPTION_KEY,
  redisHost: parsedConfig.data.REDIS_HOST,
  redisPort: parsedConfig.data.REDIS_PORT,
  NODE_ENV: parsedConfig.data.NODE_ENV,
  QUEUE_CONCURRENCY: parsedConfig.data.QUEUE_CONCURRENCY,
};

export default config;
