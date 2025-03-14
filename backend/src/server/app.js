import Fastify from 'fastify';
import { setupSwagger } from './swagger.js';
import AutoLoad from '@fastify/autoload';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiKeyPreHandler from './middlewares/apiKey.preHandler.js';
import connectDB from '../data/models/db.js';
import seedDb from './seed.js';
import { logger, initLogger, streamToElastic } from './utils/logging/logger.js';

import './background-processing/bullmq.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var childLogger = logger.child({source:'node-api'});

const app = Fastify({ loggerInstance: childLogger });

await initLogger();
await connectDB();
await seedDb();

await setupSwagger(app);

await app.after(); 


app.addHook('preHandler', apiKeyPreHandler);

app.register(AutoLoad, {
  dir: join(__dirname, 'routes'), 
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  const status = error.statusCode || 500;
  
  const problemDetails = {
    type: error.type || 'https://httpstatuses.com/' + status,
    title: error.title || 'An error occurred',
    status,
    detail: error.message || 'Internal Server Error',
    instance: request.url
  };

  reply
    .status(status)
    .header('Content-Type', 'application/problem+json')
    .send(problemDetails);
});


// Capture errors like unable to connect Elasticsearch instance.
 streamToElastic.on('error', (error) => {
  console.error('Elasticsearch client error:', error);
})
// Capture errors returned from Elasticsearch, "it will be called every time a document can't be indexed".
streamToElastic.on('insertError', (error) => {
  console.error('Elasticsearch server error:', error);
})


export default app;

