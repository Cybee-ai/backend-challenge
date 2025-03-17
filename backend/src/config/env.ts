import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyEnv from '@fastify/env';

export interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  LOG_LEVEL: string;
  MONGO_URI: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  ELASTIC_NODE?: string;
  ELASTIC_USERNAME?: string;
  ELASTIC_PASSWORD?: string;
  ENCRYPTION_KEY: string;
  GOOGLE_API_SCOPES: string;
  BULL_PREFIX: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: EnvConfig;
  }
}

const envSchema = {
  type: 'object',
  required: ['PORT', 'NODE_ENV', 'MONGO_URI', 'ENCRYPTION_KEY'],
  properties: {
    PORT: {
      type: 'number',
      default: 3000,
    },
    NODE_ENV: {
      type: 'string',
      default: 'development',
    },
    LOG_LEVEL: {
      type: 'string',
      default: 'info',
    },
    MONGO_URI: {
      type: 'string',
      default: 'mongodb://localhost:27017/google-workspace-logs',
    },
    REDIS_HOST: {
      type: 'string',
      default: 'localhost',
    },
    REDIS_PORT: {
      type: 'number',
      default: 6379,
    },
    REDIS_PASSWORD: {
      type: 'string',
      default: '',
    },
    ELASTIC_NODE: {
      type: 'string',
      default: 'http://localhost:9200',
    },
    ELASTIC_USERNAME: {
      type: 'string',
      default: '',
    },
    ELASTIC_PASSWORD: {
      type: 'string',
      default: '',
    },
    ENCRYPTION_KEY: {
      type: 'string',
    },
    GOOGLE_API_SCOPES: {
      type: 'string',
      default: 'https://www.googleapis.com/auth/admin.reports.audit.readonly',
    },
    BULL_PREFIX: {
      type: 'string',
      default: 'google_workspace',
    },
  },
};

const envPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });
};

export default fp(envPlugin, {
  name: 'env',
  fastify: '5.x',
}); 