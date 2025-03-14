import pino from 'pino';
import ecsFormat from '@elastic/ecs-pino-format';
import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Initialize Elasticsearch Client
const esClient = new Client({ node: process.env.ELASTIC_SEARCH_NODE });

// Define Indexes
const INDEXES = {
    application: 'app-logs'
  };

  async function ensureIndexes() {
    for (const index of Object.values(INDEXES)) {
      try {
        const { body: exists } = await esClient.indices.exists({ index });
  
        if (!exists) {
          console.log(`Creating index: ${index}`);
          await esClient.indices.create({
            index,
            body: {
              settings: { number_of_shards: 1, number_of_replicas: 1 },
            },
          });
        }
      } catch (error) {
        console.error(`Error checking/creating index "${index}":`, error.message);
      }
    }
  }
  

console.log(process.env.ELASTIC_SEARCH_NODE)

// Create Elasticsearch Transport
const streamToElastic = pino.transport({
    target: 'pino-elasticsearch',
    options: {
      node: process.env.ELASTIC_SEARCH_NODE,
      esVersion: 7,
      flushBytes: 1000,
      index: INDEXES.application,
    },
  })

  // Console transport
  const consoleTransport = pino.transport({
    target: 'pino-pretty',
    options: { colorize: true },
  });

  // global logger
  const logger = pino(
    { level: LOG_LEVEL },
    pino.multistream([
      { stream: consoleTransport },
      ...(streamToElastic ? [{ stream: streamToElastic, formatter: ecsFormat }] : []),
    ])
  );
  

  async function initLogger() {
    await ensureIndexes();
    console.log('Indexes ensured and logger initialized.');
  }

export { logger, initLogger, streamToElastic };
