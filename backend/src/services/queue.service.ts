import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const TICK_QUEUE_NAME = 'tick-queue';

export class QueueService {
  private queue: Queue;

  constructor() {
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
  }

  /**
   * Enqueue a simulation tick for a single nation.
   * @returns BullMQ job ID
   */
  public async enqueueNationTick(nationId: string): Promise<string> {
    try {
      logger.info(`Enqueuing simulation tick job for nation: ${nationId}`);
      const job = await this.queue.add('execute-tick', { nationId });
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
   *
   * Uses BullMQ bulk job insertion for efficiency. All jobs are labelled
   * with `world_tick_batch` metadata for observability.
   *
   * @param nationIds - Array of nation IDs to tick
   * @returns Array of enqueued job IDs
   */
  public async enqueueWorldTick(nationIds: string[]): Promise<string[]> {
    if (nationIds.length === 0) return [];

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

    const addedJobs = await this.queue.addBulk(jobs);
    const jobIds = addedJobs.map(j => j.id || '');

    logger.info(`[QueueService] World tick batch enqueued: ${jobIds.length} jobs`);
    return jobIds;
  }
}

export const queueService = new QueueService();

