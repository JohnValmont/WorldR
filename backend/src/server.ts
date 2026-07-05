import http from 'http';
import app from './app';
import { checkDatabaseConnection, db, runMigrationsAndSeeds } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startWorldTickScheduler } from './api/services/worldTick.service';

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

      // Start the world tick scheduler once the DB is ready
      startWorldTickScheduler();
      logger.info('World tick scheduler started (clock checked every 60s).');
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
