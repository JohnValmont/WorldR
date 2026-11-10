/**
 * Error tracking (Sentry).
 *
 * Off unless SENTRY_DSN is set, so local development and unconfigured deploys
 * behave exactly as before. When on, unhandled server errors, crashes and
 * failed world ticks are reported with enough context to debug them without
 * logging into the production database.
 */
import * as Sentry from '@sentry/node';
import { env } from '../config/env';
import { logger } from './logger';

let enabled = false;

export function initErrorTracking(): void {
  if (enabled || !env.SENTRY_DSN) return;
  try {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      // Errors only — performance tracing costs quota and isn't needed yet.
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    enabled = true;
    logger.info('[error-tracking] Sentry enabled.');
  } catch (err) {
    logger.error('[error-tracking] Failed to initialise Sentry:', err);
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } catch {
    // Reporting must never break the request or tick that failed.
  }
}

export async function flushErrorTracking(timeoutMs: number): Promise<void> {
  if (!enabled) return;
  try {
    await Sentry.flush(timeoutMs);
  } catch {
    // ignore
  }
}
