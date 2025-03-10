import { FastifyInstance } from 'fastify';
import cron from 'node-cron';
import Source, { ISourceDocument } from '../models/Source';

/**
 * Service to schedule log fetch jobs based on source configurations
 */
export class SchedulerService {
  private fastify: FastifyInstance;
  private scheduledTasks: Map<string, cron.ScheduledTask>;
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.scheduledTasks = new Map();
  }
  
  /**
   * Initialize the scheduler
   */
  public async initialize(): Promise<void> {
    this.fastify.log.info('Initializing scheduler service');
    
    // Schedule a task to check for new or updated sources every minute
    cron.schedule('* * * * *', async () => {
      await this.updateSchedules();
    });
    
    // Initial scheduling
    await this.updateSchedules();
  }
  
  /**
   * Update schedules based on current sources
   */
  private async updateSchedules(): Promise<void> {
    try {
      // Get all active sources
      const sources = await Source.find({ isActive: true }) as ISourceDocument[];
      
      this.fastify.log.info(`Found ${sources.length} active sources to schedule`);
      
      // Track current source IDs
      const currentSourceIds = new Set<string>();
      
      // Update or create schedules for each source
      for (const source of sources) {
        // Ensure we have a valid ID
        if (!source._id) {
          this.fastify.log.warn(`Source without ID found, skipping`);
          continue;
        }
        
        const sourceId = source._id.toString();
        currentSourceIds.add(sourceId);
        
        // Calculate cron expression based on logFetchInterval
        // Convert seconds to cron expression (minimum 1 minute)
        const intervalMinutes = Math.max(1, Math.floor(source.logFetchInterval / 60));
        const cronExpression = `*/${intervalMinutes} * * * *`;
        
        // If source already has a schedule with the same interval, skip
        const existingTask = this.scheduledTasks.get(sourceId);
        // Check if task exists and has the same schedule
        if (existingTask) {
          // Since we can't directly access the cronExpression, we'll just replace all tasks
          // to ensure they're up to date
          existingTask.stop();
        }
        
        // Schedule new task
        this.fastify.log.info(`Scheduling log fetch for source ${sourceId} with interval ${intervalMinutes} minutes`);
        
        const task = cron.schedule(cronExpression, async () => {
          try {
            await this.fastify.queues.logFetch.add(
              `fetch-${sourceId}-${Date.now()}`,
              { sourceId },
              {
                attempts: 3,
                backoff: {
                  type: 'exponential',
                  delay: 5000, // 5 seconds
                },
                removeOnComplete: true,
                removeOnFail: 100, // Keep last 100 failed jobs
              }
            );
          } catch (error) {
            this.fastify.log.error(`Failed to schedule log fetch for source ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });
        
        // Store the task
        this.scheduledTasks.set(sourceId, task);
      }
      
      // Remove schedules for sources that are no longer active
      for (const [sourceId, task] of this.scheduledTasks.entries()) {
        if (!currentSourceIds.has(sourceId)) {
          this.fastify.log.info(`Removing schedule for inactive source ${sourceId}`);
          task.stop();
          this.scheduledTasks.delete(sourceId);
        }
      }
    } catch (error) {
      this.fastify.log.error(`Error updating schedules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Add or update a schedule for a specific source
   */
  public async scheduleSource(sourceId: string): Promise<void> {
    try {
      const source = await Source.findById(sourceId);
      
      if (!source || !source.isActive) {
        // If source doesn't exist or is inactive, remove any existing schedule
        const existingTask = this.scheduledTasks.get(sourceId);
        if (existingTask) {
          existingTask.stop();
          this.scheduledTasks.delete(sourceId);
        }
        return;
      }
      
      // Calculate cron expression
      const intervalMinutes = Math.max(1, Math.floor(source.logFetchInterval / 60));
      const cronExpression = `*/${intervalMinutes} * * * *`;
      
      // Stop existing task
      const existingTask = this.scheduledTasks.get(sourceId);
      if (existingTask) {
        existingTask.stop();
      }
      
      // Schedule new task
      this.fastify.log.info(`Scheduling log fetch for source ${sourceId} with interval ${intervalMinutes} minutes`);
      
      const task = cron.schedule(cronExpression, async () => {
        try {
          await this.fastify.queues.logFetch.add(
            `fetch-${sourceId}-${Date.now()}`,
            { sourceId },
            {
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 5000,
              },
              removeOnComplete: true,
              removeOnFail: 100,
            }
          );
        } catch (error) {
          this.fastify.log.error(`Failed to schedule log fetch for source ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      });
      
      // Store the task
      this.scheduledTasks.set(sourceId, task);
      
      // Also trigger an immediate fetch
      await this.fastify.queues.logFetch.add(
        `initial-fetch-${sourceId}-${Date.now()}`,
        { sourceId },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: 100,
        }
      );
    } catch (error) {
      this.fastify.log.error(`Error scheduling source ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Remove a schedule for a specific source
   */
  public removeSchedule(sourceId: string): void {
    const task = this.scheduledTasks.get(sourceId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(sourceId);
      this.fastify.log.info(`Removed schedule for source ${sourceId}`);
    }
  }
  
  /**
   * Stop all schedules
   */
  public stopAll(): void {
    for (const [sourceId, task] of this.scheduledTasks.entries()) {
      task.stop();
      this.fastify.log.info(`Stopped schedule for source ${sourceId}`);
    }
    this.scheduledTasks.clear();
  }
} 