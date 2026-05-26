import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppError } from './utils/errors';
import { logger } from './utils/logger';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

import apiRouter from './api/routes';

app.use('/api/v1', apiRouter);
app.use('/', apiRouter);

// Catch-all route (404)
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
});

// Global Error Handler Middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(`API Warning: ${err.message} (${err.errorCode})`);
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.errorCode,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error('Unhandled Server Exception:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_SERVER_ERROR',
  });
});

export default app;
