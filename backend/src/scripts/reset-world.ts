import { db } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

async function resetWorld() {
  logger.info('[ResetWorld] Starting WORLDr world state reset...');

  const trx = await db.transaction();
  try {
    // 1. Delete all notifications and audit logs (events/history)
    logger.info('[ResetWorld] Deleting notifications and audit logs...');
    await trx('notifications').del();
    await trx('audit_logs').del();

    // 2. Delete all nations (this will cascade delete sectors, population groups, taxes,
    // budget items, laws, historical snapshots, overrides, prices, voter blocs, affinities,
    // elections, results, parties, memberships, staff, campaigns, parliament sessions and votes)
    logger.info('[ResetWorld] Deleting all nations (and cascading tables)...');
    await trx('nations').del();

    // 3. Delete all continents
    logger.info('[ResetWorld] Deleting all continents...');
    await trx('continents').del();

    await trx.commit();
    logger.info('[ResetWorld] Database reset completed successfully.');
  } catch (error) {
    await trx.rollback();
    logger.error('[ResetWorld] Failed to reset database:', error);
    throw error;
  }

  // 4. Clear Redis cache
  try {
    logger.info('[ResetWorld] Clearing Redis cache...');
    await redis.flushall();
    logger.info('[ResetWorld] Redis cache cleared successfully.');
  } catch (error) {
    logger.error('[ResetWorld] Failed to clear Redis cache:', error);
  }

  logger.info('[ResetWorld] WORLDr world state reset completed.');
  process.exit(0);
}

resetWorld().catch((err) => {
  logger.error('[ResetWorld] Fatal error in resetWorld:', err);
  process.exit(1);
});
