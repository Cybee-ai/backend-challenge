const { Client } = require('@elastic/elasticsearch');
const logger = require('../utils/logger');

const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200';

const client = new Client({
  node: ELASTICSEARCH_URL,
  maxRetries: 5,
  requestTimeout: 60000,
  ssl: {
    rejectUnauthorized: false
  },
  diagnostics: {
    request: (err, result) => {
      if (err) {
        logger.error('Elasticsearch request failed:', err);
      }
    }
  }
});

module.exports = {
  client,
  ELASTICSEARCH_URL
}; 