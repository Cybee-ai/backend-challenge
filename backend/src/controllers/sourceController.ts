import { FastifyRequest, FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import Source from '../models/Source';
import { SourceType, GoogleWorkspaceCredentials } from '../types/common';
import { createGoogleClient } from '../utils/googleWorkspace';
import { SchedulerService } from '../services/scheduler';
import { MetricsService } from '../services/metricsService';

interface AddSourceRequest {
  Body: {
    sourceType: SourceType;
    credentials: GoogleWorkspaceCredentials;
    logFetchInterval: number;
    callbackUrl: string;
  };
}

interface RemoveSourceRequest {
  Params: {
    id: string;
  };
}

/**
 * Controller for source management
 */
export class SourceController {
  private schedulerService: SchedulerService;
  private metricsService?: MetricsService;
  
  constructor(schedulerService: SchedulerService, metricsService?: MetricsService) {
    this.schedulerService = schedulerService;
    this.metricsService = metricsService;
  }
  
  /**
   * Add a new source
   */
  public addSource = async (request: FastifyRequest<AddSourceRequest>, reply: FastifyReply): Promise<void> => {
    try {
      const { sourceType, credentials, logFetchInterval, callbackUrl } = request.body;
      
      // Validate source type
      if (sourceType !== SourceType.GOOGLE_WORKSPACE) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Unsupported source type: ${sourceType}`,
        });
      }
      
      // Validate credentials by attempting to authenticate
      try {
        await createGoogleClient(credentials);
      } catch (error) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Invalid credentials: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
      
      // Create new source
      const source = new Source({
        sourceType,
        credentialsClientEmail: credentials.clientEmail,
        credentialsPrivateKey: credentials.privateKey,
        credentialsScopes: credentials.scopes,
        logFetchInterval,
        callbackUrl,
        lastFetchTimestamp: null,
        isActive: true,
      });
      
      // Save source
      await source.save();
      
      // Schedule log fetching for the new source
      await this.schedulerService.scheduleSource(source._id ? source._id.toString() : '');
      
      // Log metrics
      if (this.metricsService) {
        await this.metricsService.logSourceAdded(source._id ? source._id.toString() : '');
      }
      
      // Return success
      return reply.status(201).send({
        statusCode: 201,
        data: {
          id: source._id,
          sourceType: source.sourceType,
          logFetchInterval: source.logFetchInterval,
          callbackUrl: source.callbackUrl,
          isActive: source.isActive,
          createdAt: source.createdAt,
        },
      });
    } catch (error) {
      request.log.error(`Error adding source: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to add source',
      });
    }
  };
  
  /**
   * Remove a source
   */
  public removeSource = async (request: FastifyRequest<RemoveSourceRequest>, reply: FastifyReply): Promise<void> => {
    try {
      const { id } = request.params;
      
      // Find and remove source
      const source = await Source.findByIdAndDelete(id);
      
      if (!source) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Source with ID ${id} not found`,
        });
      }
      
      // Remove schedule
      this.schedulerService.removeSchedule(id);
      
      // Log metrics
      if (this.metricsService) {
        await this.metricsService.logSourceRemoved(id);
      }
      
      // Return success
      return reply.status(200).send({
        statusCode: 200,
        data: {
          id,
          message: 'Source removed successfully',
        },
      });
    } catch (error) {
      request.log.error(`Error removing source: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to remove source',
      });
    }
  };
  
  /**
   * Get all sources
   */
  public getSources = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    try {
      // Find all sources
      const sources = await Source.find();
      
      // Transform sources to remove sensitive data
      const transformedSources = sources.map(source => ({
        id: source._id,
        sourceType: source.sourceType,
        logFetchInterval: source.logFetchInterval,
        callbackUrl: source.callbackUrl,
        lastFetchTimestamp: source.lastFetchTimestamp,
        isActive: source.isActive,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      }));
      
      // Return sources
      return reply.status(200).send({
        statusCode: 200,
        data: transformedSources,
      });
    } catch (error) {
      request.log.error(`Error getting sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Failed to get sources',
      });
    }
  };
} 