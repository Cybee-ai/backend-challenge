const axios = require('axios');
const logger = require('../utils/logger');

class LogFormatter {
  static formatLog(log) {
    if (!log || typeof log !== 'object') {
      throw new Error('Invalid log format');
    }

    if (log.message?.includes('No logs occurred')) {
      return log;
    }

    return {
      id: log.id?.uniqueQualifier || `log-${Date.now()}`,
      timestamp: log.id?.time || new Date().toISOString(),
      actor: {
        email: log.actor?.email || 'unknown',
        ipAddress: log.ipAddress || log.actor?.callerIp || 'unknown'
      },
      eventType: log.events?.[0]?.name || log.applicationName?.toUpperCase() || 'UNKNOWN',
      details: {
        status: log.events?.[0]?.type || 'UNKNOWN',
        application: log.id?.applicationName,
        ...(log.events?.[0]?.parameters?.reduce((acc, param) => {
          if (param?.name) {
            acc[param.name] = param.value;
          }
          return acc;
        }, {}))
      },
      raw: process.env.NODE_ENV === 'development' ? log : undefined
    };
  }
}

class CircuitBreaker {
  constructor(options = {}) {
    this.states = new Map();
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      resetTimeout: options.resetTimeout || 60000,
      halfOpenRetries: options.halfOpenRetries || 3,
      requestTimeout: options.requestTimeout || 5000,
      monitorInterval: options.monitorInterval || 30000
    };

    this.startMonitoring();
  }

  startMonitoring() {
    setInterval(() => {
      const now = Date.now();
      for (const [url, state] of this.states.entries()) {
        if (state.state === 'OPEN' && (now - state.lastFailure) >= this.options.resetTimeout) {
          this.transitionToHalfOpen(url);
        }
      }
    }, this.options.monitorInterval);
  }

  getState(url) {
    if (!this.states.has(url)) {
      this.states.set(url, {
        failures: 0,
        lastFailure: null,
        state: 'CLOSED',
        halfOpenSuccesses: 0
      });
    }
    return this.states.get(url);
  }

  transitionToOpen(url, error) {
    const state = this.getState(url);
    state.state = 'OPEN';
    state.lastFailure = Date.now();
    state.lastError = error;
    logger.warn(`Circuit breaker opened for ${url}:`, error.message);
  }

  transitionToHalfOpen(url) {
    const state = this.getState(url);
    state.state = 'HALF_OPEN';
    state.halfOpenSuccesses = 0;
    logger.info(`Circuit breaker half-open for ${url}`);
  }

  transitionToClosed(url) {
    const state = this.getState(url);
    state.state = 'CLOSED';
    state.failures = 0;
    state.lastFailure = null;
    state.lastError = null;
    logger.info(`Circuit breaker closed for ${url}`);
  }

  async execute(url, operation) {
    const state = this.getState(url);

    if (state.state === 'OPEN') {
      if ((Date.now() - state.lastFailure) < this.options.resetTimeout) {
        throw new Error(`Circuit breaker is open for ${url}`);
      }
      this.transitionToHalfOpen(url);
    }

    try {
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), this.options.requestTimeout)
        )
      ]);

      if (state.state === 'HALF_OPEN') {
        state.halfOpenSuccesses++;
        if (state.halfOpenSuccesses >= this.options.halfOpenRetries) {
          this.transitionToClosed(url);
        }
      }

      return result;
    } catch (error) {
      state.failures++;
      if (state.failures >= this.options.failureThreshold || state.state === 'HALF_OPEN') {
        this.transitionToOpen(url, error);
      }
      throw error;
    }
  }
}

class WebhookService {
  constructor() {
    this.circuitBreaker = new CircuitBreaker();
    this.axiosInstance = axios.create({
      timeout: 5000,
      maxRedirects: 3,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cybee-Webhook-Service/1.0'
      }
    });
  }

  async sendLogs(webhookUrl, logs) {
    if (!Array.isArray(logs)) {
      logs = [logs];
    }

    const formattedLogs = logs.map(log => LogFormatter.formatLog(log));
    
    try {
      await this.circuitBreaker.execute(webhookUrl, async () => {
        const response = await this.axiosInstance.post(webhookUrl, {
          timestamp: new Date().toISOString(),
          count: formattedLogs.length,
          logs: formattedLogs
        });

        logger.info(`Successfully sent ${formattedLogs.length} logs to ${webhookUrl}`);
        return response;
      });
    } catch (error) {
      logger.error('Failed to send logs to webhook:', {
        url: webhookUrl,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  getCircuitBreakerState(webhookUrl) {
    return this.circuitBreaker.getState(webhookUrl);
  }
}

const webhookService = new WebhookService();

module.exports = {
  sendLogs: (webhookUrl, logs) => webhookService.sendLogs(webhookUrl, logs),
  getCircuitBreakerState: (webhookUrl) => webhookService.getCircuitBreakerState(webhookUrl)
};
