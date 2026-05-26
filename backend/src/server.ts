import http from 'http';
import app from './app';
import { checkDatabaseConnection, db, runMigrationsAndSeeds } from './config/database';
import { env } from './config/env';
import { checkRedisConnection, redis } from './config/redis';
import { logger } from './utils/logger';
import { WebSocketServer } from './api/ws/socket';
import { tickWorker } from './workers/tick.worker';
import { parameterService } from './services/parameter.service';

const server = http.createServer(app);

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
  // Force clean exit
  process.exit(1);
});

startServer();

