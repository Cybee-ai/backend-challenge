const { google } = require('googleapis');
const logger = require('../utils/logger');
const { encryptionService } = require('./encryptionService');
const redis = require('../config/redis');

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 100;
const PROCESSED_LOGS_KEY_PREFIX = 'processed_logs:';
const RATE_LIMIT_KEY_PREFIX = 'rate_limit:';

async function checkRateLimit(sourceId) {
  const key = `${RATE_LIMIT_KEY_PREFIX}${sourceId}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.pexpire(key, RATE_LIMIT_WINDOW);
  }
  
  return count <= MAX_REQUESTS_PER_WINDOW;
}

async function validateCredentials(credentials) {
  try {
    const auth = new google.auth.JWT(
      credentials.clientEmail,
      null,
      credentials.privateKey,
      credentials.scopes || ['https://www.googleapis.com/auth/admin.reports.audit.readonly'],
      credentials.subject
    );

    const admin = google.admin('reports_v1');
    await admin.activities.list({
      auth,
      applicationName: 'login',
      userKey: 'all',
      maxResults: 1
    });

    return true;
  } catch (error) {
    logger.error('Credential validation failed:', error);
    return false;
  }
}

async function isLogProcessed(sourceId, logId) {
  const key = `${PROCESSED_LOGS_KEY_PREFIX}${sourceId}`;
  const isProcessed = await redis.sismember(key, logId);
  
  if (!isProcessed) {
    await redis.sadd(key, logId);
    await redis.expire(key, 24 * 60 * 60);
  }
  
  return isProcessed;
}

async function fetchLogs(encryptedCredentials, lastFetchTime, sourceId) {
  if (!await checkRateLimit(sourceId)) {
    throw new Error('Rate limit exceeded');
  }

  const credentials = await encryptionService.decrypt(encryptedCredentials);
  const auth = new google.auth.JWT(
    credentials.clientEmail,
    null,
    credentials.privateKey,
    credentials.scopes || ['https://www.googleapis.com/auth/admin.reports.audit.readonly'],
    credentials.subject
  );

  const admin = google.admin('reports_v1');
  const startTime = new Date(lastFetchTime).toISOString();

  try {
    const response = await admin.activities.list({
      auth,
      applicationName: 'login',
      userKey: 'all',
      startTime,
      maxResults: 100
    });

    const logs = [];
    for (const item of response.data.items || []) {
      if (!await isLogProcessed(sourceId, item.id)) {
        logs.push({
          id: item.id,
          timestamp: item.id.time,
          actor: {
            email: item.actor.email,
            ipAddress: item.ipAddress
          },
          eventType: item.events[0]?.type || 'UNKNOWN',
          details: {
            name: item.events[0]?.name,
            parameters: item.events[0]?.parameters,
            type: item.events[0]?.type
          }
        });
      }
    }

    return logs;
  } catch (error) {
    logger.error('Failed to fetch logs:', error);
    throw error;
  }
}

module.exports = {
  validateCredentials,
  fetchLogs
};
