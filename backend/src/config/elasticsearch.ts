import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { Client } from '@elastic/elasticsearch';
import { 
  CountResponse, 
  SearchResponse, 
  WriteResponseBase
} from '@elastic/elasticsearch/lib/api/types';

interface ElasticsearchPluginOptions {
  node?: string;
  username?: string;
  password?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    elastic: Client;
  }
}

const elasticsearchPlugin: FastifyPluginAsync<ElasticsearchPluginOptions> = async (fastify, options) => {
  const { node, username, password } = options;
  
  try {
    const client = new Client({
      node: node || 'http://localhost:9200',
      auth: username && password ? {
        username,
        password,
      } : undefined,
    });
    
    const info = await client.info();
    fastify.log.info(`Connected to Elasticsearch ${info.version.number}`);
    
    await createIndices(client, fastify);
    
    fastify.decorate('elastic', client);
    
    fastify.addHook('onClose', async () => {
      await client.close();
      fastify.log.info('Elasticsearch connection closed');
    });
  } catch (error) {
    fastify.log.error(`Error connecting to Elasticsearch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    const dummyClient = {
      index: async (): Promise<WriteResponseBase> => ({ 
        _id: 'dummy-id',
        _index: 'dummy-index',
        _version: 1,
        result: 'created',
        _shards: {
          total: 1,
          successful: 1,
          failed: 0
        },
        _seq_no: 0,
        _primary_term: 1
      }),
      search: async (): Promise<SearchResponse<any, any>> => ({ 
        took: 0,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0
        },
        hits: { 
          total: { value: 0, relation: 'eq' },
          max_score: 0,
          hits: [] 
        }
      }),
      count: async (): Promise<CountResponse> => ({ 
        count: 0,
        _shards: {
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0
        }
      }),
      close: async () => {},
    } as unknown as Client;
    
    fastify.decorate('elastic', dummyClient);
  }
};

async function createIndices(client: Client, fastify: any): Promise<void> {
  const indices = [
    'google-workspace-metrics-logs',
    'google-workspace-metrics-api',
    'google-workspace-metrics-system'
  ];
  
  for (const indexName of indices) {
    try {
      const exists = await client.indices.exists({ index: indexName });
      
      if (!exists) {
        await client.indices.create({
          index: indexName
        });
        fastify.log.info(`Created Elasticsearch index: ${indexName}`);
      }
    } catch (error) {
      fastify.log.error(`Error creating Elasticsearch index ${indexName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default fp(elasticsearchPlugin, {
  name: 'elasticsearch',
  fastify: '5.x',
}); 