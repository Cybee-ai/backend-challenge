import { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

/**
 * Service for collecting metrics and storing them in Elasticsearch
 */
export class MetricsService {
  private fastify: FastifyInstance;
  private enabled: boolean = true;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    // Check if elastic is available (might be mock)
    this.enabled = fastify.elastic && typeof fastify.elastic.index === 'function';
  }

  /**
   * Log a source added event
   */
  public async logSourceAdded(sourceId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.indexMetric('source_added', 1, { sourceId });
      await this.indexMetric('active_sources', await this.countActiveSources());
    } catch (error) {
      this.fastify.log.error(`Error logging source metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log a source removed event
   */
  public async logSourceRemoved(sourceId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.indexMetric('source_removed', 1, { sourceId });
      await this.indexMetric('active_sources', await this.countActiveSources());
    } catch (error) {
      this.fastify.log.error(`Error logging source metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log logs fetched event
   */
  public async logLogsFetched(sourceId: string, count: number, durationMs: number): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.indexMetric('logs_fetched', count, { sourceId });
      await this.indexMetric('fetch_duration_ms', durationMs, { sourceId });
    } catch (error) {
      this.fastify.log.error(`Error logging fetch metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log logs forwarded event
   */
  public async logLogsForwarded(sourceId: string, count: number, successCount: number): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.indexMetric('logs_forwarded', successCount, { sourceId });
      
      if (count !== successCount) {
        await this.indexMetric('logs_forward_failed', count - successCount, { sourceId });
      }
    } catch (error) {
      this.fastify.log.error(`Error logging forward metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log API request
   */
  public async logApiRequest(path: string, method: string, statusCode: number, responseTimeMs: number): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.indexMetric('api_request', 1, { path, method, statusCode });
      await this.indexMetric('api_response_time_ms', responseTimeMs, { path, method });
    } catch (error) {
      this.fastify.log.error(`Error logging API metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log system metrics
   */
  public async logSystemMetrics(): Promise<void> {
    if (!this.enabled) return;

    try {
      // Memory usage
      const memoryUsage = process.memoryUsage();
      await this.indexMetric('memory_heap_used', memoryUsage.heapUsed / 1024 / 1024);
      await this.indexMetric('memory_heap_total', memoryUsage.heapTotal / 1024 / 1024);
      await this.indexMetric('memory_rss', memoryUsage.rss / 1024 / 1024);

      // CPU usage
      const cpuUsage = process.cpuUsage();
      await this.indexMetric('cpu_user', cpuUsage.user / 1000);
      await this.indexMetric('cpu_system', cpuUsage.system / 1000);
    } catch (error) {
      this.fastify.log.error(`Error logging system metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Index a metric in Elasticsearch
   */
  private async indexMetric(metricType: string, value: number, tags: Record<string, any> = {}): Promise<void> {
    if (!this.enabled) return;

    try {
      const doc = {
        timestamp: new Date(),
        metricType,
        value,
        tags: Object.entries(tags).map(([key, value]) => `${key}:${value}`)
      };

      await this.fastify.elastic.index({
        index: 'system-metrics',
        body: doc
      });
    } catch (error) {
      this.fastify.log.error(`Error indexing metric ${metricType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count active sources
   */
  private async countActiveSources(): Promise<number> {
    try {
      const count = await mongoose.model('Source').countDocuments({ isActive: true });
      return count || 0;
    } catch (error) {
      this.fastify.log.error(`Error counting active sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }
} 