import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { AppError } from './utils/errors';
import { logger } from './utils/logger';
import { env } from './config/env';
import { db } from './config/database';
import { captureException } from './utils/errorTracking';

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────
// With CORS_ORIGINS set, only those browser origins may call the API.
// Without it we keep the old permissive behaviour (and warn), so an unconfigured
// deploy doesn't suddenly break the live frontend. Requests with no Origin
// header (server-to-server, the Vercel proxy, curl, GitHub Actions) are always allowed.
const allowedOrigins = (env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  logger.warn('[cors] CORS_ORIGINS is not set — allowing every origin. Set it in production (e.g. https://your-frontend.vercel.app).');
}

// Middlewares
app.use(helmet());
app.use(cors({
  origin: allowedOrigins.length === 0
    ? true
    : (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
  credentials: true,
}));
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Liveness check — "is the process up?". Kept trivially cheap and always 200 so
// the host (Render) never restarts the server just because a tick is late.
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'worldr-backend' });
});

// World-clock check — "is the game actually advancing?". Returns 503 when the
// business or politics clock is more than TICK_OVERDUE_GRACE_MINUTES past its
// scheduled tick, or the database is unreachable. Polled by
// .github/workflows/tick-health.yml, which fails (and emails you) on 503.
app.get('/health/ticks', async (req: Request, res: Response) => {
  try {
    const instance = await db('world_instances').where({ status: 'active' }).first();
    const clock = instance ? await db('world_clock').where({ world_instance_id: instance.id }).first() : null;
    if (!clock) return res.status(503).json({ status: 'no_clock' });

    const now = Date.now();
    const graceMs = env.TICK_OVERDUE_GRACE_MINUTES * 60_000;
    const check = (nextAt: string | Date | null) => {
      if (!nextAt) return { next_tick_at: null, minutes_late: 0, overdue: false };
      const lateMs = now - new Date(nextAt).getTime();
      return {
        next_tick_at: new Date(nextAt).toISOString(),
        minutes_late: Math.max(0, Math.round(lateMs / 60_000)),
        overdue: lateMs > graceMs,
      };
    };

    const paused = clock.status === 'paused';
    const business = check(clock.next_arc_close_at);
    const politics = check(clock.pol_next_arc_close_at);
    const overdue = !paused && (business.overdue || politics.overdue);

    res.status(overdue ? 503 : 200).json({
      status: paused ? 'paused' : overdue ? 'overdue' : 'ok',
      grace_minutes: env.TICK_OVERDUE_GRACE_MINUTES,
      business: { year: clock.current_year, month: clock.current_month, ...business },
      politics: { year: clock.pol_current_year, month: clock.pol_current_month, ...politics },
      tick_in_progress: (global as any).tickProgress ?? null,
    });
  } catch (err) {
    logger.error('[health/ticks] check failed:', err);
    res.status(503).json({ status: 'db_unreachable' });
  }
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
  captureException(err, { method: req.method, url: req.originalUrl });

  // Never send stack traces or raw internal messages to players in production —
  // they leak table names, file paths and SQL. Full details stay in the server log.
  const isProduction = env.NODE_ENV === 'production';
  res.status(500).json({
    error: isProduction ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    ...(isProduction ? {} : { stack: err.stack }),
    code: 'INTERNAL_SERVER_ERROR',
  });
});

export default app;
