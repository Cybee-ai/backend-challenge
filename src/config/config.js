require('dotenv').config();

const validateConfig = (config) => {
  const requiredEnvVars = ['ENCRYPTION_KEY'];
  const missingVars = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  if (config.encryptionKey === 'defaultEncryptionKey') {
    throw new Error('Production encryption key must be set in environment variables');
  }

  return config;
};

const config = {
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || 'development',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS, 10) || 30
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cybee',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    maxReconnectAttempts: 10
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
    maxRetries: 3,
    requestTimeout: 30000,
    sniffOnStart: true
  },
  security: {
    encryptionKey: process.env.ENCRYPTION_KEY || 'defaultEncryptionKey',
    saltRounds: 10
  },
  jobs: {
    cleanup: {
      schedule: '0 0 * * *',
      batchSize: 1000
    },
    logFetcher: {
      maxRetries: 3,
      backoffDelay: 1000,
      maxConcurrent: 5
    }
  },
  api: {
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    },
    timeout: 30000
  }
};

if (process.env.NODE_ENV === 'production') {
  validateConfig(config);
}

module.exports = config;
