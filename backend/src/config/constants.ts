import config from "./config";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/admin.reports.audit.readonly",
];

export const JOB_QUEUE_NAME = "logFetchQueue";
export const JOB_PREFIX = "fetch-logs-";

export const REDIS_HOST = config.redisHost;
export const REDIS_PORT = config.redisPort;

export const RETRY_LIMIT = 3;
export const QUEUE_CONCURRENCY = config.QUEUE_CONCURRENCY ?? 3;

export const ERROR_MESSAGES = {
  FETCH_FAILED: "❌ Error fetching logs from Google Workspace",
  RETRYING: "🔄 Retrying...",
  MAX_RETRIES_REACHED: "❌ Max retries reached.",
  AUTH_FAILED: "❌ Google Authentication Failed.",
  MONGO_UNDEFINED: "❌ MongoDB connection is undefined.",
  PROCESS_JOB_FAILED: "❌ Failed to process logs",
  SOURCE_NOT_FOUND: "❌ Source not found.",
  CREDENTIALS_EXPIRED: "❌ Google credentials have expired",
  PERMISSION_DENIED: "❌ Permission denied",
  RATE_LIMITED: "❌ Rate limit hit",
};
