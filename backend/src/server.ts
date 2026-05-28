import http from 'http';
import app from './app';
import { checkDatabaseConnection, db, runMigrationsAndSeeds } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

const server = http.createServer(app);

async function startServer() {
  try {
    logger.info('Initializing server boot sequence...');

    // 1. Check PostgreSQL Database connection
    await checkDatabaseConnection();
    logger.info('Database connection established successfully.');

    // 2. Run pending migrations
    await runMigrationsAndSeeds();

    // 3. Start listening
    const port = env.PORT;
    server.listen(port, () => {
      logger.info(`WORLDr auth API server is online and listening on port ${port} [${env.NODE_ENV}]`);
    });

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
