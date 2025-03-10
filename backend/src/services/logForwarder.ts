import { FastifyLoggerInstance } from 'fastify';
import mongoose from 'mongoose';
import Source from '../models/Source';
import Log, { ILogDocument } from '../models/Log';
import { sendToCallback } from '../utils/httpClient';
import { LogForwardJob } from '../queues';
import { LogBatch } from '../types/common';
import { MetricsService } from './metricsService';

/**
 * Service to forward logs to callback URLs
 */
export class LogForwarderService {
  private logger: FastifyLoggerInstance;
  private metricsService?: MetricsService;
  
  constructor(logger: FastifyLoggerInstance, metricsService?: MetricsService) {
    this.logger = logger;
    this.metricsService = metricsService;
  }
  
  /**
   * Process a log forward job
   */
  public async processLogForward(job: LogForwardJob): Promise<boolean> {
    const { sourceId, logIds } = job;
    
    this.logger.info(`Processing log forward for source: ${sourceId}, logs: ${logIds.length}`);
    
    try {
      // Find the source
      const source = await Source.findById(sourceId);
      
      if (!source) {
        throw new Error(`Source ${sourceId} not found`);
      }
      
      if (!source.isActive) {
        throw new Error(`Source ${sourceId} is inactive`);
      }
      
      // Find logs to forward
      const logs = await Log.find({
        _id: { $in: logIds.map(id => new mongoose.Types.ObjectId(id)) },
        sourceId: new mongoose.Types.ObjectId(sourceId),
        sentToCallback: false,
      });
      
      if (logs.length === 0) {
        this.logger.info(`No logs to forward for source ${sourceId}`);
        
        // Log metrics
        if (this.metricsService) {
          await this.metricsService.logLogsForwarded(sourceId, logIds.length, 0);
        }
        
        return true;
      }
      
      // Transform logs to the expected format
      const transformedLogs = this.transformLogsForCallback(logs, sourceId);
      
      // Send logs to callback URL
      await sendToCallback(source.callbackUrl, transformedLogs);
      
      // Update logs as sent
      const logObjectIds = logs.map(log => log._id);
      await Log.updateMany(
        { _id: { $in: logObjectIds } },
        {
          $set: {
            sentToCallback: true,
            lastCallbackAttempt: new Date(),
          },
          $inc: { callbackAttempts: 1 },
        }
      );
      
      this.logger.info(`Successfully forwarded ${logs.length} logs to ${source.callbackUrl}`);
      
      // Log metrics
      if (this.metricsService) {
        await this.metricsService.logLogsForwarded(sourceId, logIds.length, logs.length);
      }
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error forwarding logs for source ${sourceId}: ${errorMessage}`);
      
      // Update callback attempts
      if (logIds.length > 0) {
        try {
          await Log.updateMany(
            {
              _id: { $in: logIds.map(id => new mongoose.Types.ObjectId(id)) },
              sourceId: new mongoose.Types.ObjectId(sourceId),
            },
            {
              $set: { lastCallbackAttempt: new Date() },
              $inc: { callbackAttempts: 1 },
            }
          );
        } catch (updateError) {
          this.logger.error(`Failed to update callback attempts: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`);
        }
      }
      
      // Log metrics
      if (this.metricsService) {
        await this.metricsService.logLogsForwarded(sourceId, logIds.length, 0);
      }
      
      throw error;
    }
  }
  
  /**
   * Transform logs to the format expected by the callback
   */
  private transformLogsForCallback(logs: ILogDocument[], sourceId: string): LogBatch {
    return {
      sourceId,
      logs: logs.map(log => ({
        id: log.externalId,
        timestamp: log.timestamp.toISOString(),
        actor: {
          email: log.actorEmail,
          ipAddress: log.actorIpAddress,
        },
        eventType: log.eventType,
        details: {
          status: log.status,
          ...log.details,
        },
        sourceId,
      })),
    };
  }
} 