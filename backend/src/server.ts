import http from 'http';
import app from './app';
import { checkDatabaseConnection, db, runMigrationsAndSeeds } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startWorldTickScheduler } from './api/services/worldTick.service';
import { ManufacturingController } from './api/controllers/manufacturing.controller';

const server = http.createServer(app);

async function startServer() {
  try {
    logger.info('Initializing server boot sequence...');

    // 3. Start listening immediately so Render health checks pass
    const PORT = Number(process.env.PORT) || 10000;
    const HOST = '0.0.0.0';

    logger.info(`Starting WORLDr backend...`);
    logger.info(`PORT from env: ${process.env.PORT || 'not set, using fallback 10000'}`);

    server.listen(PORT, HOST, () => {
      logger.info(`Server listening on ${HOST}:${PORT}`);
    });

    // Run DB checks after server is listening
    try {
      await checkDatabaseConnection();
      logger.info('Database connection established successfully.');
      await runMigrationsAndSeeds();

      // Ensure unique_character_per_user_world is a partial index, fixing production DB
      try { await db.raw('ALTER TABLE "characters" DROP CONSTRAINT IF EXISTS "unique_character_per_user_world" CASCADE'); } catch(e) {}
      try { await db.raw('DROP INDEX IF EXISTS "unique_character_per_user_world"'); } catch(e) {}
      try {
        await db.raw('CREATE UNIQUE INDEX "unique_character_per_user_world" ON "characters" ("user_id", "world_instance_id") WHERE "status" != \'deleted\''); 
        logger.info('Manually ensured unique_character_per_user_world is a partial index on boot.');
      } catch (patchErr) {
        logger.error('Failed to patch character index on boot:', patchErr);
      }

      // One-time patch: fix vehicles created with falsy bug (shifted to Year 1)
      try {
        await db('manufacturing_vehicle_models').where({ created_at_world_year: 1 }).update({
          created_at_world_year: 0,
          development_started_at_year: 0,
          development_completes_at_year: 0,
          stage_engineering_completes_year: 0,
          stage_prototype_completes_year: 0,
          stage_testing_completes_year: 0
        });
        logger.info('Patched falsy Year 1 vehicles back to Year 0.');
      } catch (patchErr) { }

      try {
        const clock = await db('world_clock').first();
        if (clock) {
          const fixedCount = await ManufacturingController.forceUnstuckAllVehicles(db, clock);
          if (fixedCount > 0) logger.info(`Forced unstuck ${fixedCount} overdue vehicles.`);
        }
      } catch (e) {
        logger.error('Failed to force unstuck vehicles:', e);
      }

      // Start the world tick scheduler once the DB is ready
      startWorldTickScheduler();
      logger.info('World tick scheduler started (clock checked every 5s).');
    } catch (dbError) {
      logger.error('Database initialization failed, but server is still running:', dbError);
    }

  } catch (error) {
    logger.error('❌ Server boot aborted due to initialization failure:', error);
    process.exit(1);
  }
}

// Graceful shutdown handler
async function handleShutdown(signal: string) {
  logger.warn(`Received ${signal}. Starting graceful shutdown sequence...`);

  // Close HTTP Server
  server.close(() => {
    logger.info('HTTP server closed.');

    // Close Database Pool
    db.destroy(() => {
      logger.info('Postgres connection pool destroyed.');
      logger.info('Graceful shutdown completed successfully. Exiting.');
      process.exit(0);
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
