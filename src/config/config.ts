import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables
dotenv.config();

// Define schema for validation
const configSchema = z.object({
  PORT: z.string().default("3000"),
  MONGO_URI: z.string().url(),
  ENCRYPTION_KEY: z
    .string()
    .length(64, "ENCRYPTION_KEY must be 32 bytes (64 hex characters)"),
});

// Validate environment variables
const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsedConfig.error.format()
  );
  process.exit(1); // Exit if validation fails
}

const config = {
  port: parseInt(parsedConfig.data.PORT, 10),
  mongoUri: parsedConfig.data.MONGO_URI,
  encryptionKey: parsedConfig.data.ENCRYPTION_KEY,
};

export default config;
