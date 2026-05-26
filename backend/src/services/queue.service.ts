import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { db } from '../config/database';

const TICK_QUEUE_NAME = 'tick-queue';

export class QueueService {
  private queue: Queue | null = null;

  constructor() {
    if (env.REDIS_ENABLED && env.REDIS_URL) {
      this.queue = new Queue(TICK_QUEUE_NAME, {
        connection: redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
    } else {
      logger.info('[QueueService] Redis/BullMQ queue is disabled; using synchronous/in-memory task dispatcher.');
    }
  }

  /**
   * Enqueue a simulation tick for a single nation.
   * @returns job ID (mocked if Redis is disabled)
   */
  public async enqueueNationTick(nationId: string): Promise<string> {
    if (!env.REDIS_ENABLED || !env.REDIS_URL) {
      logger.info(`[QueueService] [InMemory] Triggering simulation tick synchronously for nation: ${nationId}`);
      // Execute in setImmediate to emulate asynchronous job execution and concurrency
      setImmediate(async () => {
        try {
          await db.transaction(async (trx) => {
            const { TickEngine } = require('../simulation/tick.engine');
            const tickEngine = new TickEngine(trx, nationId);
            await tickEngine.executeTick();
          });
          logger.info(`[QueueService] [InMemory] Successfully completed tick for nation ${nationId}`);
          await redis.publish('tick:completed', JSON.stringify({ nationId }));
        } catch (error) {
          logger.error(`[QueueService] [InMemory] Tick failed for nation ${nationId}:`, error);
        }
      });
      return `in-memory-job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    try {
      logger.info(`Enqueuing simulation tick job for nation: ${nationId}`);
      const job = await this.queue!.add('execute-tick', { nationId });
      logger.info(`Enqueued job: ${job.id}`);
      return job.id || '';
    } catch (error) {
      logger.error(`Failed to enqueue tick job for nation ${nationId}:`, error);
      throw error;
    }
  }

  /**
   * Alias for backwards compatibility.
   */
  public async triggerTick(nationId: string): Promise<string> {
    return this.enqueueNationTick(nationId);
  }

  /**
   * Enqueue simulation ticks for ALL nations in a world tick batch.
   * @param nationIds - Array of nation IDs to tick
   * @returns Array of enqueued job IDs
   */
  public async enqueueWorldTick(nationIds: string[]): Promise<string[]> {
    if (nationIds.length === 0) return [];

    if (!env.REDIS_ENABLED || !env.REDIS_URL) {
      logger.info(`[QueueService] [InMemory] Enqueuing in-memory world tick batch for ${nationIds.length} nations`);
      const jobIds: string[] = [];
      for (const nationId of nationIds) {
        const jobId = await this.enqueueNationTick(nationId);
        jobIds.push(jobId);
      }
      return jobIds;
    }

    logger.info(`[QueueService] Enqueuing world tick batch for ${nationIds.length} nations`);

    const jobs = nationIds.map(nationId => ({
      name: 'execute-tick',
      data: { nationId, worldTickBatch: true },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false
      }
    }));

    const addedJobs = await this.queue!.addBulk(jobs);
    const jobIds = addedJobs.map(j => j.id || '');

    logger.info(`[QueueService] World tick batch enqueued: ${jobIds.length} jobs`);
    return jobIds;
  }
}

export const queueService = new QueueService();
