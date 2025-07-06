import Bull, { Queue, Job, JobOptions } from 'bull';
import config from '@/config';
import logger, { logError, logServiceEvent } from '@/config/logger';
import { metricsService } from './metrics.service';

export interface QueueJobData {
  id: string;
  type: string;
  payload: any;
  userId?: string;
  conversationId?: string;
  agentId?: string;
  priority?: number;
  timestamp: Date;
}

export interface QueueJobResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  timestamp: Date;
}

export class QueueService {
  private queues: Map<string, Queue> = new Map();
  private processors: Map<string, Map<string, Function>> = new Map();

  constructor() {
    this.initializeQueues();
  }

  /**
   * Initialize default queues
   */
  private initializeQueues(): void {
    // AI Processing Queue - High priority for AI tasks
    this.createQueue('ai-processing', {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    // Agent Orchestration Queue - For agent coordination tasks
    this.createQueue('agent-orchestration', {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 25,
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 2000,
        },
      },
    });

    // Memory Context Queue - For context processing
    this.createQueue('memory-context', {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: 200,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
      },
    });

    // Notifications Queue - Low priority for notifications
    this.createQueue('notifications', {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 10,
        attempts: 1,
        delay: 1000,
      },
    });

    logServiceEvent('queues_initialized', {
      queueCount: this.queues.size,
      queueNames: Array.from(this.queues.keys()),
    });
  }

  /**
   * Create a new queue
   */
  private createQueue(name: string, options: any): Queue {
    const queue = new Bull(name, options);

    // Set up queue event listeners
    this.setupQueueEventListeners(queue, name);

    this.queues.set(name, queue);
    this.processors.set(name, new Map());

    logger.info(`Queue created: ${name}`);
    return queue;
  }

  /**
   * Set up event listeners for a queue
   */
  private setupQueueEventListeners(queue: Queue, queueName: string): void {
    // Job lifecycle events
    queue.on('active', (job: Job) => {
      metricsService.setActiveQueueJobs(queueName, queue.waiting() + queue.active());
      logger.debug(`Job ${job.id} started in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.data.type,
        queueName,
      });
    });

    queue.on('completed', (job: Job, result: any) => {
      const duration = (Date.now() - job.timestamp) / 1000;
      metricsService.recordQueueJob(queueName, job.data.type, 'completed', duration);
      metricsService.setActiveQueueJobs(queueName, queue.waiting() + queue.active());
      
      logger.info(`Job ${job.id} completed in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.data.type,
        duration,
        queueName,
      });
    });

    queue.on('failed', (job: Job, error: Error) => {
      const duration = (Date.now() - job.timestamp) / 1000;
      metricsService.recordQueueJob(queueName, job.data.type, 'failed', duration);
      metricsService.setActiveQueueJobs(queueName, queue.waiting() + queue.active());
      
      logError(error, {
        jobId: job.id,
        jobType: job.data.type,
        queueName,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts,
      });
    });

    queue.on('stalled', (job: Job) => {
      logger.warn(`Job ${job.id} stalled in queue ${queueName}`, {
        jobId: job.id,
        jobType: job.data.type,
        queueName,
      });
    });

    queue.on('error', (error: Error) => {
      logError(error, { queueName });
    });
  }

  /**
   * Add a job to a queue
   */
  async addJob(
    queueName: string,
    jobData: QueueJobData,
    options?: JobOptions
  ): Promise<Job<QueueJobData>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue '${queueName}' not found`);
      }

      const job = await queue.add(jobData.type, jobData, options);

      logger.debug(`Job added to queue ${queueName}`, {
        jobId: job.id,
        jobType: jobData.type,
        queueName,
        priority: options?.priority || 0,
      });

      return job;
    } catch (error) {
      logError(error as Error, { operation: 'add_job', queueName, jobData });
      throw error;
    }
  }

  /**
   * Register a job processor
   */
  registerProcessor(
    queueName: string,
    jobType: string,
    processor: (job: Job<QueueJobData>) => Promise<QueueJobResult>,
    concurrency?: number
  ): void {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    // Wrap processor with metrics and error handling
    const wrappedProcessor = async (job: Job<QueueJobData>): Promise<QueueJobResult> => {
      const startTime = Date.now();
      
      try {
        metricsService.setActiveQueueJobs(queueName, await queue.waiting() + await queue.active());
        
        const result = await processor(job);
        
        logger.info(`Job processed successfully`, {
          jobId: job.id,
          jobType,
          queueName,
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logError(error as Error, {
          jobId: job.id,
          jobType,
          queueName,
          jobData: job.data,
        });

        return {
          success: false,
          error: (error as Error).message,
          duration: Date.now() - startTime,
          timestamp: new Date(),
        };
      }
    };

    // Register processor with Bull
    queue.process(jobType, concurrency || 1, wrappedProcessor);

    // Store processor reference
    if (!this.processors.has(queueName)) {
      this.processors.set(queueName, new Map());
    }
    this.processors.get(queueName)!.set(jobType, processor);

    logger.info(`Processor registered for ${jobType} in queue ${queueName}`, {
      queueName,
      jobType,
      concurrency: concurrency || 1,
    });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.waiting(),
      queue.active(),
      queue.completed(),
      queue.failed(),
      queue.delayed(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: await queue.isPaused(),
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [queueName] of this.queues) {
      try {
        stats[queueName] = await this.getQueueStats(queueName);
      } catch (error) {
        stats[queueName] = { error: (error as Error).message };
      }
    }

    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.pause();
    logServiceEvent('queue_paused', { queueName });
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.resume();
    logServiceEvent('queue_resumed', { queueName });
  }

  /**
   * Clear a queue
   */
  async clearQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    await queue.empty();
    logServiceEvent('queue_cleared', { queueName });
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job<QueueJobData> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    return queue.getJob(jobId);
  }

  /**
   * Remove job by ID
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
      logger.info(`Job ${jobId} removed from queue ${queueName}`);
    }
  }

  /**
   * Retry failed jobs
   */
  async retryFailedJobs(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const failedJobs = await queue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }

    logServiceEvent('failed_jobs_retried', {
      queueName,
      jobCount: failedJobs.length,
    });
  }

  /**
   * Get queue health status
   */
  async getQueueHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    queueStats: Record<string, any>;
  }> {
    const issues: string[] = [];
    const queueStats = await this.getAllQueueStats();

    // Check for issues
    for (const [queueName, stats] of Object.entries(queueStats)) {
      if (stats.error) {
        issues.push(`Queue ${queueName}: ${stats.error}`);
        continue;
      }

      if (stats.failed > 100) {
        issues.push(`Queue ${queueName}: High number of failed jobs (${stats.failed})`);
      }

      if (stats.waiting > 1000) {
        issues.push(`Queue ${queueName}: High number of waiting jobs (${stats.waiting})`);
      }

      if (stats.paused) {
        issues.push(`Queue ${queueName}: Queue is paused`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      queueStats,
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Starting queue service shutdown...');

    for (const [queueName, queue] of this.queues) {
      try {
        await queue.close();
        logger.info(`Queue ${queueName} closed`);
      } catch (error) {
        logError(error as Error, { queueName, operation: 'queue_shutdown' });
      }
    }

    this.queues.clear();
    this.processors.clear();

    logServiceEvent('queue_service_shutdown');
    logger.info('Queue service shutdown completed');
  }
}

// Singleton instance
export const queueService = new QueueService();