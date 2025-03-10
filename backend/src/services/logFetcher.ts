import mongoose from 'mongoose';
import { FastifyLoggerInstance } from 'fastify';
import Source, { ISourceDocument } from '../models/Source';
import Log from '../models/Log';
import { createGoogleClient, fetchGoogleWorkspaceLogs, transformGoogleWorkspaceLogs } from '../utils/googleWorkspace';
import { LogFetchJob } from '../queues';
import { MetricsService } from './metricsService';

/**
 * Service to fetch logs from Google Workspace Admin SDK
 */
export class LogFetcherService {
  private logger: FastifyLoggerInstance;
  private metricsService?: MetricsService;
  
  constructor(logger: FastifyLoggerInstance, metricsService?: MetricsService) {
    this.logger = logger;
    this.metricsService = metricsService;
  }
  
  /**
   * Process a log fetch job
   */
  public async processLogFetch(job: LogFetchJob): Promise<string[]> {
    const { sourceId } = job;
    const startTime = Date.now();
    
    this.logger.info(`Processing log fetch for source: ${sourceId}`);
    
    try {
      // Find the source
      const source = await Source.findById(sourceId);
      
      if (!source) {
        throw new Error(`Source ${sourceId} not found`);
      }
      
      if (!source.isActive) {
        throw new Error(`Source ${sourceId} is inactive`);
      }
      
      // Determine time range to fetch
      const endTime = new Date();
      const startTimeDate = source.lastFetchTimestamp || new Date(endTime.getTime() - 3600000); // 1 hour ago if no previous fetch
      
      // Don't fetch if the time range is too small (less than 1 minute)
      if (endTime.getTime() - startTimeDate.getTime() < 60000) {
        this.logger.info(`Skipping fetch for source ${sourceId} - time range too small`);
        return [];
      }
      
      // Get decrypted credentials
      const credentials = source.getDecryptedCredentials();
      
      // Authenticate with Google
      const auth = await createGoogleClient(credentials);
      
      // Fetch logs
      this.logger.info(`Fetching logs for source ${sourceId} from ${startTimeDate.toISOString()} to ${endTime.toISOString()}`);
      const logs = await fetchGoogleWorkspaceLogs(auth, startTimeDate, endTime);
      
      this.logger.info(`Fetched ${logs.length} logs for source ${sourceId}`);
      
      if (logs.length === 0) {
        // Update last fetch timestamp even if no logs
        await Source.findByIdAndUpdate(sourceId, { lastFetchTimestamp: endTime });
        
        // Log metrics
        if (this.metricsService) {
          await this.metricsService.logLogsFetched(sourceId, 0, Date.now() - startTime);
        }
        
        return [];
      }
      
      // Transform logs to our format
      const transformedLogs = transformGoogleWorkspaceLogs(logs, sourceId);
      
      // Store logs in database
      const logIds = await this.storeLogs(transformedLogs, source);
      
      // Update source's last fetch timestamp
      await Source.findByIdAndUpdate(sourceId, { lastFetchTimestamp: endTime });
      
      // Log metrics
      if (this.metricsService) {
        await this.metricsService.logLogsFetched(sourceId, logIds.length, Date.now() - startTime);
      }
      
      return logIds;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching logs for source ${sourceId}: ${errorMessage}`);
      
      // If there's a credential error, mark the source as inactive
      if (errorMessage.includes('Authorization error')) {
        this.logger.warn(`Marking source ${sourceId} as inactive due to credential issues`);
        await Source.findByIdAndUpdate(sourceId, { isActive: false });
      }
      
      throw error;
    }
  }
  
  /**
   * Store logs in the database with deduplication
   */
  private async storeLogs(
    logs: Array<{
      id: string;
      timestamp: string;
      actor: { email: string; ipAddress: string };
      eventType: string;
      details: { status: string; [key: string]: any };
      sourceId: string;
    }>,
    source: ISourceDocument
  ): Promise<string[]> {
    const storedLogIds: string[] = [];
    const sourceObjectId = source._id 
      ? new mongoose.Types.ObjectId(source._id.toString()) 
      : new mongoose.Types.ObjectId();
    
    // Use bulk operations for better performance
    const bulkOps = logs.map((log) => {
      return {
        updateOne: {
          filter: {
            sourceId: sourceObjectId,
            externalId: log.id,
          },
          update: {
            $setOnInsert: {
              sourceId: sourceObjectId,
              externalId: log.id,
              timestamp: new Date(log.timestamp),
              actorEmail: log.actor.email,
              actorIpAddress: log.actor.ipAddress,
              eventType: log.eventType,
              status: log.details.status,
              details: log.details,
              processedAt: new Date(),
              sentToCallback: false,
              callbackAttempts: 0,
              lastCallbackAttempt: null,
            },
          },
          upsert: true,
        },
      };
    });
    
    if (bulkOps.length > 0) {
      try {
        const result = await Log.bulkWrite(bulkOps);
        
        this.logger.info(`Stored ${result.upsertedCount} new logs for source ${source._id}`);
        
        // Get IDs of inserted logs for callback processing
        if (result.upsertedIds) {
          for (const key in result.upsertedIds) {
            if (Object.prototype.hasOwnProperty.call(result.upsertedIds, key)) {
              const id = result.upsertedIds[key];
              if (id) {
                storedLogIds.push(id.toString());
              }
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error storing logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }
    
    return storedLogIds;
  }
} 