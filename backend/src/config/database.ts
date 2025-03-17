import mongoose from 'mongoose';
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

interface DatabasePluginOptions {
  uri?: string;
}

/**
 * Fastify plugin for MongoDB connection
 */
const databasePlugin: FastifyPluginAsync<DatabasePluginOptions> = async (fastify, options) => {
  const uri = options.uri || process.env.MONGO_URI || 'mongodb://localhost:27017/google-workspace-logs';
  
  // Configure mongoose
  mongoose.set('strictQuery', false);
  
  // Handle connection events
  mongoose.connection.on('connected', () => {
    fastify.log.info('MongoDB connection established');
  });
  
  mongoose.connection.on('error', (err) => {
    fastify.log.error(`MongoDB connection error: ${err}`);
    process.exit(1);
  });
  
  mongoose.connection.on('disconnected', () => {
    fastify.log.info('MongoDB connection disconnected');
  });
  
  // Handle process termination
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    fastify.log.info('MongoDB connection closed due to app termination');
    process.exit(0);
  });
  
  // Connect to MongoDB
  try {
    await mongoose.connect(uri);
    
    // Add mongoose instance to fastify
    fastify.decorate('mongoose', mongoose);
  } catch (err) {
    fastify.log.error(`Error connecting to MongoDB: ${err}`);
    process.exit(1);
  }
};

export default fp(databasePlugin, {
  name: 'database',
  fastify: '5.x',
}); 