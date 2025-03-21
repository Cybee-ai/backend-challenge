const logger = require('../utils/logger');
const Source = require('../models/Source');
const elasticsearchService = require('./elasticsearchService');
const { webhookService } = require('./webhookService');

const NOTIFICATION_TYPES = {
  CREDENTIAL_EXPIRATION: 'CREDENTIAL_EXPIRATION',
  CREDENTIAL_VALIDATION_FAILED: 'CREDENTIAL_VALIDATION_FAILED'
};

class NotificationService {
  createNotification(type, details) {
    if (!NOTIFICATION_TYPES[type]) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    return {
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: NOTIFICATION_TYPES[type],
      details
    };
  }

  async notifyCredentialExpiration(sourceId) {
    const source = await Source.findById(sourceId);
    if (!source) {
      logger.error(`Cannot notify about expired credentials - source ${sourceId} not found`);
      return;
    }

    try {
      await source.updateStatus('invalid_credentials', 'Credentials have expired');

      const notification = this.createNotification(
        'CREDENTIAL_EXPIRATION',
        {
          message: 'Your Google Workspace credentials have expired. Please update your credentials.',
          sourceId
        }
      );

      await this.deliverNotification(source, notification);
    } catch (error) {
      logger.error('Failed to process credential expiration:', error);
      throw error;
    }
  }

  async notifyValidationFailure(sourceId, error) {
    const source = await Source.findById(sourceId);
    if (!source) {
      logger.error(`Cannot notify about validation failure - source ${sourceId} not found`);
      return;
    }

    try {
      await source.updateStatus('setup_failed', error.message);

      const notification = this.createNotification(
        'CREDENTIAL_VALIDATION_FAILED',
        {
          message: 'Google Workspace credential validation failed',
          sourceId,
          error: error.message
        }
      );

      await this.deliverNotification(source, notification);
    } catch (error) {
      logger.error('Failed to process validation failure:', error);
      throw error;
    }
  }

  async deliverNotification(source, notification) {
    try {
      await Promise.all([
        elasticsearchService.indexLog({
          sourceId: source._id,
          ...notification
        }),
        webhookService.sendLogs(source.callbackUrl, notification)
      ]);

      logger.info('Successfully delivered notification:', {
        sourceId: source._id,
        type: notification.type
      });
    } catch (error) {
      logger.error('Failed to deliver notification:', {
        sourceId: source._id,
        type: notification.type,
        error: error.message
      });
      throw error;
    }
  }
}

const notificationService = new NotificationService();

module.exports = {
  notificationService,
  NOTIFICATION_TYPES
}; 