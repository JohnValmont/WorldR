import http from 'http';
import app from './app';
import { checkDatabaseConnection, db, runMigrationsAndSeeds } from './config/database';
import { env } from './config/env';
import { checkRedisConnection, redis } from './config/redis';
import { logger } from './utils/logger';
import { WebSocketServer } from './api/ws/socket';
import { tickWorker } from './workers/tick.worker';
import { parameterService } from './services/parameter.service';
import { worldService } from './services/world.service';

const server = http.createServer(app);

// Reference to the automatic tick scheduler interval (for graceful shutdown)
let tickSchedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the automatic world tick scheduler.
 * Fires every TICK_INTERVAL_MS (default 8 real hours = 1 in-game month).
 * All nations are ticked simultaneously in a world tick batch.
 * Players cannot manually trigger ticks — this is fully server-controlled.
 */
function startTickScheduler() {
  const intervalMs = env.TICK_INTERVAL_MS;
  const intervalHours = (intervalMs / 3600000).toFixed(2);

  logger.info(`[TickScheduler] Automatic world tick scheduler starting.`);
  logger.info(`[TickScheduler] Tick interval: ${intervalMs}ms (${intervalHours} real hours = 1 in-game month).`);

  // Fire a catch-up tick on server start if the last tick was missed (e.g. server was down)
  worldService.getTickStatus(intervalMs).then(async (status) => {
    const now = Date.now();
    const missedTick = status.lastTickAt === null ||
      (status.nextTickAt !== null && now > status.nextTickAt);

    if (missedTick) {
      logger.info('[TickScheduler] Server restarted — firing catch-up world tick now...');
      try {
        const result = await worldService.scheduleWorldTick();
        await worldService.recordTickFired();
        const nextAt = new Date(Date.now() + intervalMs);
        logger.info(`[TickScheduler] Catch-up tick complete: ${result.nationCount} nations. Next tick at ${nextAt.toISOString()}`);
      } catch (err) {
        logger.error('[TickScheduler] Catch-up tick failed:', err);
      }
    } else {
      const nextAt = status.nextTickAt ? new Date(status.nextTickAt).toISOString() : 'unknown';
      logger.info(`[TickScheduler] No missed tick detected. Next scheduled tick at ${nextAt}`);
    }
  }).catch(err => {
    logger.warn('[TickScheduler] Could not check tick status on startup:', err);
  });

  // Set up the recurring interval
  tickSchedulerInterval = setInterval(async () => {
    logger.info('[TickScheduler] ⏰ Automatic world tick firing — advancing all nations by 1 in-game month...');
    try {
      const result = await worldService.scheduleWorldTick();
      await worldService.recordTickFired();
      const nextAt = new Date(Date.now() + intervalMs);
      logger.info(
        `[TickScheduler] ✓ World tick complete: ${result.nationCount} nations ticked. Next tick at ${nextAt.toISOString()}`
      );
    } catch (err) {
      logger.error('[TickScheduler] ✕ World tick failed:', err);
    }
  }, intervalMs);

  logger.info('[TickScheduler] Scheduler is active and running.');
}

async function startServer() {
  try {
    logger.info('Initializing server boot sequence...');

    // 1. Check PostgreSQL Database connection
    await checkDatabaseConnection();
    logger.info('Database connection established successfully.');

    // 1b. Run pending migrations & seed if database is blank
    await runMigrationsAndSeeds();

    // 2. Check Redis connection
    await checkRedisConnection();
    logger.info('Redis connection established successfully.');

    // 3. Preload global simulation parameters into Redis
    await parameterService.preloadAllParameters();

    // 4. Initialize WebSockets
    const wsServer = new WebSocketServer(server);
    logger.info('WebSocket system initialized and listening.');

    // 5. Initialize background tick worker
    logger.info(`Background worker registered: queue '${tickWorker.name}' is operational.`);

    // 6. Start listening
    const port = env.PORT;
    server.listen(port, () => {
      logger.info(`WORLDr simulation API server is online and listening on port ${port} [${env.NODE_ENV}]`);

      // 7. Start automatic world tick scheduler AFTER server is listening
      startTickScheduler();
    });

  } catch (error) {
    logger.error('❌ Server boot aborted due to initialization failure:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function handleShutdown(signal: string) {
  logger.warn(`Received ${signal}. Starting graceful shutdown sequence...`);

  // Stop the tick scheduler
  if (tickSchedulerInterval) {
    clearInterval(tickSchedulerInterval);
    tickSchedulerInterval = null;
    logger.info('Automatic tick scheduler stopped.');
  }

  // Close HTTP Server
  server.close(() => {
    logger.info('HTTP server closed.');

    // Close background tick worker
    tickWorker.close().then(() => {
      logger.info('BullMQ worker connection closed.');

      // Close Database Pool
      db.destroy(() => {
        logger.info('Postgres connection pool destroyed.');

        // Close Redis connection
        redis.quit(() => {
          logger.info('Redis connection quit.');
          logger.info('Graceful shutdown completed successfully. Exiting.');
          process.exit(0);
        });
      });
    }).catch((err: any) => {
      logger.error('Error closing worker connection:', err);
      process.exit(1);
    });
  });

  // Force shutdown if connections do not close within 10 seconds
  setTimeout(() => {
    logger.error('Force shutdown triggered: connections failed to close gracefully within 10 seconds.');
    process.exit(1);
  }, 10000);
}

// Listen for termination signals
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Catch unhandled promise rejections & exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

startServer();
