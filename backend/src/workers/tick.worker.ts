import { Worker, Job } from 'bullmq';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { TickEngine } from '../simulation/tick.engine';
import { logger } from '../utils/logger';

const TICK_QUEUE_NAME = 'tick-queue';

export const tickWorker = new Worker(
  TICK_QUEUE_NAME,
  async (job: Job<{ nationId: string }>) => {
    const { nationId } = job.data;
    const lockKey = `lock:tick:nation:${nationId}`;

    logger.info(`Starting tick processing for nation ${nationId} (Job ID: ${job.id})`);

    // 1. Acquire Redis distributed lock (PX = milliseconds, NX = Set if not exists)
    const acquiredLock = await redis.set(lockKey, 'locked', 'PX', 30000, 'NX');
    if (!acquiredLock) {
      logger.warn(`Tick for nation ${nationId} is already running elsewhere. Skipping.`);
      return;
    }

    try {
      // 2. Execute simulation tick inside database transaction
      await db.transaction(async (trx) => {
        const tickEngine = new TickEngine(trx, nationId);
        await tickEngine.executeTick();
      });

      logger.info(`Successfully completed tick for nation ${nationId}`);

      // 3. Publish update event to Redis Pub/Sub for WebSocket triggers
      await redis.publish('tick:completed', JSON.stringify({ nationId }));

    } catch (error) {
      logger.error(`Tick failed for nation ${nationId}:`, error);
      throw error; // Fail job to trigger retry/fail logic
    } finally {
      // 4. Release Redis lock
      await redis.del(lockKey);
    }
  },
  {
    connection: redis,
    concurrency: 5
  }
);
