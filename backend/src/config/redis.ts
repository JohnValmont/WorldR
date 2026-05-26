import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';
import { MockRedis } from './mock-redis';

export function createRedisClient(): any {
  if (!env.REDIS_ENABLED || !env.REDIS_URL) {
    logger.info('Redis disabled; using in-memory alpha fallback.');
    return new MockRedis();
  }
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: true,
    reconnectOnError: (err) => {
      const targetError = 'READONLY';
      if (err.message.slice(0, targetError.length) === targetError) {
        return true;
      }
      return false;
    },
  });
}

export const redis = createRedisClient();

export async function checkRedisConnection(): Promise<void> {
  if (!env.REDIS_ENABLED || !env.REDIS_URL) {
    logger.info('Redis disabled; skipping connection check.');
    return;
  }
  try {
    await redis.ping();
  } catch (error) {
    console.error('❌ Redis server is unreachable:');
    throw error;
  }
}
