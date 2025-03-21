const logger = require('../utils/logger');
const { client } = require('../config/elasticsearch');

const INDEX_NAME = 'google_workspace_logs';

async function indexLog(log) {
  try {
    await client.index({
      index: INDEX_NAME,
      document: {
        ...log,
        '@timestamp': new Date().toISOString()
      }
    });
    logger.debug('Successfully indexed log to Elasticsearch');
  } catch (error) {
    logger.error('Failed to index log to Elasticsearch:', error);
    throw error;
  }
}

async function getMetrics(timeRange) {
  try {
    const { start, end } = timeRange;
    
    const response = await client.search({
      index: INDEX_NAME,
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: start,
              lte: end
            }
          }
        },
        size: 0,
        aggs: {
          total_activities: { value_count: { field: '_id' } },
          event_types: {
            terms: { field: 'eventType.keyword' }
          }
        }
      }
    });

    return {
      totalActivities: response.aggregations.total_activities.value,
      eventTypes: response.aggregations.event_types.buckets.map(bucket => ({
        type: bucket.key,
        count: bucket.doc_count
      }))
    };
  } catch (error) {
    logger.error('Failed to fetch metrics from Elasticsearch:', error);
    throw error;
  }
}

async function checkHealth() {
  try {
    const health = await client.cluster.health();
    return {
      status: health.status,
      healthy: health.status !== 'red'
    };
  } catch (error) {
    logger.error('Failed to check Elasticsearch health:', error);
    return {
      status: 'error',
      healthy: false,
      error: error.message
    };
  }
}

module.exports = {
  indexLog,
  getMetrics,
  checkHealth
};
