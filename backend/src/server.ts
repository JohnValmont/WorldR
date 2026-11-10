import http from 'http';
import app from './app';
import { checkDatabaseConnection, db, runMigrationsAndSeeds } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startWorldTickScheduler } from './api/services/worldTick.service';
import { ManufacturingController } from './api/controllers/manufacturing.controller';
import { processDrenniaTick } from './api/controllers/drennia.controller';
import { initErrorTracking, captureException, flushErrorTracking } from './utils/errorTracking';

initErrorTracking();

/**
 * Admin rights live in users.role. ADMIN_EMAILS (comma-separated) lets the
 * owner grant them without editing code: listed accounts are promoted on boot.
 * Accounts are never demoted here, so removing an email does not revoke access —
 * do that with an explicit UPDATE.
 */
async function promoteConfiguredAdmins(): Promise<void> {
  const emails = (env.ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length === 0) return;
  try {
    const promoted = await db('users')
      .whereRaw('LOWER(email) = ANY(?)', [emails])
      .whereNot({ role: 'admin' })
      .update({ role: 'admin', updated_at: db.fn.now() });
    if (promoted > 0) logger.info(`[admin] Promoted ${promoted} account(s) listed in ADMIN_EMAILS to admin.`);
  } catch (err) {
    logger.error('[admin] Failed to apply ADMIN_EMAILS:', err);
  }
}

// ── Section 4: Internal tick endpoint (protected by X-Tick-Secret) ─────────────
// This is registered directly on `app` (outside /api/v1) so it is never
// accidentally exposed via the standard auth middleware chain.
// Called every 8 hours by GitHub Actions (.github/workflows/drennia-tick.yml).
import express from 'express';
app.post('/internal/drennia-tick', express.json(), processDrenniaTick);



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
      // Schema and one-off data fixes live in database/migrations (see 0091).
      // Never add one-time patches here — they re-run on every restart.
      await runMigrationsAndSeeds();

      await promoteConfiguredAdmins();

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
  captureException(reason, { source: 'unhandledRejection' });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  captureException(error, { source: 'uncaughtException' });
  // Give the error reporter up to 2s to send the crash before exiting.
  flushErrorTracking(2000).finally(() => process.exit(1));
});

startServer();
