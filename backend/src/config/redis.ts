import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.REDIS_URL, {
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

redis.on('connect', () => {
  // Connection initiated
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

export async function checkRedisConnection(): Promise<void> {
  try {
    await redis.ping();
  } catch (error) {
    console.error('❌ Redis server is unreachable:');
    throw error;
  }
}
