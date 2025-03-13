import Fastify from 'fastify';
import { setupSwagger } from './swagger.js';
import AutoLoad from '@fastify/autoload';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import apiKeyPreHandler from './middlewares/apiKey.preHandler.js';
import connectDB from '../data/models/db.js';
import seedDb from './seed.js';

import './background-processing/bullmq.js'


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envToLogger = {
  DEVELOPMENT: {
    transport: {
      targets: [
          {
              level: 'info',
              target: 'pino-pretty',
              options: {}
          }
      ],
    },
  },
  production: true,
  test: false,
}

const app = Fastify({ logger: envToLogger[process.env.NODE_ENV] ?? true });

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


export default app;

