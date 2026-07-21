import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { ManufacturingController } from '../controllers/manufacturing.controller';
import { processEconomyMonth } from './economyTick.service';
import { processExchangeMonth } from './ipoExchange.service';
import { processPoliticalArc } from './politics.service';



const SCHEDULER_INTERVAL_MS = 5_000; // check the clock every 5s
const MAX_CATCHUP_TICKS = 6; // max months processed per scheduler pass if the server was down

export interface WorldTickResult {
  status: 'ticked' | 'skipped';
  reason?: 'paused' | 'not_due' | 'no_clock' | 'tick_in_progress';
  processedYear?: number;
  processedMonth?: number;
  newYear?: number;
  newMonth?: number;
  processedCompanies?: number;
  processedCountries?: number;
  nextTickAt?: string | null;
  /** Subsystems (countries/economy/exchange/aging) that failed but were isolated. */
  failures?: string[];
}

// In-process re-entrancy guard (the world_clock row lock below guards across
// processes). Stored as a TIMESTAMP, not a bare boolean, so a tick that dies
// mid-run (e.g. the process is killed by a platform timeout, or a DB connection
// is severed) can never wedge the world forever. A lock older than
// TICK_LOCK_TIMEOUT_MS is treated as dead and reclaimed on the next attempt.
let inFlightSince: number | null = null;

// Backstop: how long a held lock may live before we assume the holder crashed
// and reclaim it.
const TICK_LOCK_TIMEOUT_MS = 120_000; // 2 minutes

// Hard per-statement timeout inside the tick transaction. Guarantees no single
// query can hang the tick indefinitely: Postgres aborts it, the transaction
// throws, and the `finally` releases the lock. A healthy month processes each
// statement in well under a second, so this never fires normally.
const TICK_STATEMENT_TIMEOUT_MS = 30_000; // 30 seconds

// Human-readable step of the current tick, exposed on skip responses for
// diagnostics (e.g. "Processing country: drennia - Step 3: Produce").
(global as any).tickProgress = 'Not started';

/**
 * Advance the world by exactly one game month if it is due (or forced).
 *
 * Pipeline per tick:
 *  1. Row-lock the world clock (SELECT ... FOR UPDATE) so concurrent
 *     schedulers / force-ticks can never double-process a month.
 *  2. For EVERY country with manufacturing companies: run NPC brains,
 *     production, pooled market sales, financial settlement, and the
 *     politics month hook (via ManufacturingController.processCountryMonth).
 *     Countries already processed for this month are skipped (idempotent).
 *  3. Age all active characters by 1 year at the end of month 12.
 *  4. Advance current_month / current_year and reschedule next_arc_close_at.
 */
export async function runWorldTick(opts: { force?: boolean } = {}): Promise<WorldTickResult> {
  if (inFlightSince !== null) {
    const heldFor = Date.now() - inFlightSince;
    if (heldFor < TICK_LOCK_TIMEOUT_MS) {
      // A tick is genuinely still running — refuse to double-process, but
      // surface the current step so admins can see where it is.
      return {
        status: 'skipped',
        reason: 'tick_in_progress',
        step: (global as any).tickProgress,
      } as any;
    }
    // Lock is stale: the previous tick almost certainly died without releasing
    // it. Reclaim it so the world can advance again. (The world_clock row lock
    // below still guarantees correctness even if the old run were somehow alive.)
    logger.warn(`[world-tick] Reclaiming stale tick lock held for ${Math.round(heldFor / 1000)}s (was at: ${(global as any).tickProgress})`);
  }
  inFlightSince = Date.now();
  (global as any).tickProgress = 'Starting transaction...';
  try {
    return await db.transaction(async (trx) => {
      // Guarantee no single query can hang the tick indefinitely.
      await trx.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);

      const activeInstance = await trx('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) return { status: 'skipped', reason: 'no_clock' } as WorldTickResult;

      const clock = await trx('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .forUpdate()
        .first();
      if (!clock) return { status: 'skipped', reason: 'no_clock' } as WorldTickResult;

      if (clock.status === 'paused' && !opts.force) {
        return { status: 'skipped', reason: 'paused', nextTickAt: null } as WorldTickResult;
      }

      const now = Date.now();
      const nextClose = clock.next_arc_close_at ? new Date(clock.next_arc_close_at).getTime() : 0;
      if (!opts.force && now < nextClose) {
        return {
          status: 'skipped',
          reason: 'not_due',
          nextTickAt: new Date(nextClose).toISOString(),
        } as WorldTickResult;
      }

      const year = clock.current_year;
      const month = clock.current_month;

      // 2. Full world processing — every country with manufacturing companies
      (global as any).tickProgress = 'Fetching manufacturing countries...';
      const countryIds: string[] = await trx('companies')
        .where({ industry_id: 'manufacturing' })
        .distinct('country_id')
        .pluck('country_id');

      // Each subsystem below runs inside its OWN savepoint (nested transaction).
      // This is the key resilience guarantee: if a single country, the economy,
      // or the exchange throws (a data edge case, a null, a constraint), only
      // that savepoint rolls back — the error is logged and skipped, and the
      // world clock STILL advances at the end. Previously any single failure
      // rolled back the entire month, so the clock never advanced and the world
      // froze permanently for every player ("NEXT MONTH IN 0s" stuck forever).
      let processedCompanies = 0;
      const failures: string[] = [];

      for (const countryId of countryIds) {
        (global as any).tickProgress = `Processing country: ${countryId}`;
        try {
          await trx.transaction(async (sp) => {
            await sp.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);
            const result = await ManufacturingController.processCountryMonth(sp, countryId, clock);
            processedCompanies += result.processedCompanies;
          });
        } catch (err) {
          failures.push(`country:${countryId}`);
          logger.error(`[world-tick] Country ${countryId} failed for Y${year} M${month}; skipping so the world can still advance.`, err);
        }
      }

      // 2b. Player economy — loan payments, dividends, structure compliance costs
      (global as any).tickProgress = 'processEconomyMonth';
      try {
        await trx.transaction(async (sp) => {
          await sp.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);
          await processEconomyMonth(sp, year, month);
        });
      } catch (err) {
        failures.push('economy');
        logger.error(`[world-tick] Economy step failed for Y${year} M${month}; skipping.`, err);
      }

      // 2c. Capital markets — advance IPO pipeline, clear/list IPOs, write monthly
      //     OHLC bars, update the DRX index, refresh NPC market-maker quotes, and
      //     expire founder lockups. Isolated in its own savepoint.
      (global as any).tickProgress = 'processExchangeMonth';
      try {
        await trx.transaction(async (sp) => {
          await sp.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);
          await processExchangeMonth(sp, year, month);
        });
      } catch (err) {
        failures.push('exchange');
        logger.error(`[world-tick] Exchange step failed for Y${year} M${month}; skipping.`, err);
      }

      // 3. Character aging — once per year, at the end of month 12
      (global as any).tickProgress = 'Character aging...';
      if (month === 12) {
        try {
          await trx.transaction(async (sp) => {
            await sp.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);
            await sp('characters')
              .where({ world_instance_id: activeInstance.id, status: 'active' })
              .increment('age', 1);
          });
        } catch (err) {
          failures.push('aging');
          logger.error(`[world-tick] Character aging failed for Y${year} M${month}; skipping.`, err);
        }
      }

      // 4. Advance the clock
      const newMonth = month === 12 ? 1 : month + 1;
      const newYear = month === 12 ? year + 1 : year;
      const intervalMs = (clock.real_seconds_per_month || 28800) * 1000;
      // Drift-free schedule: allow catching up to MAX_CATCHUP_TICKS before resetting the anchor
      const maxCatchupMs = MAX_CATCHUP_TICKS * intervalMs;
      const anchor = !opts.force && nextClose > 0 && now - nextClose < maxCatchupMs ? nextClose : now;
      const monthStartedAt = new Date(anchor);
      const nextArcCloseAt = new Date(anchor + intervalMs);

      // Always advance the clock, even if some subsystems failed above. Freezing
      // the entire world because one country has a data bug is far worse than
      // advancing with a logged, isolated failure that can be investigated.
      if (failures.length > 0) {
        logger.warn(`[world-tick] Advancing Y${year} M${month} with ${failures.length} isolated failure(s): ${failures.join(', ')}`);
      }

      (global as any).tickProgress = 'Advancing clock...';
      await trx('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .update({
          current_month: newMonth,
          current_year: newYear,
          month_started_at: monthStartedAt.toISOString(),
          next_arc_close_at: nextArcCloseAt.toISOString(),
          updated_at: trx.fn.now(),
        });

      (global as any).tickProgress = 'Done!';
      return {
        status: 'ticked',
        processedYear: year,
        processedMonth: month,
        newYear,
        newMonth,
        processedCompanies,
        processedCountries: countryIds.length,
        nextTickAt: nextArcCloseAt.toISOString(),
        failures: failures.length > 0 ? failures : undefined,
      } as WorldTickResult;
    });
  } finally {
    inFlightSince = null;
  }
}

/**
 * Background scheduler: checks the clock every minute and advances the
 * world when a month is due. Catches up (bounded) if the server was down.
 */

export function startWorldTickScheduler(): NodeJS.Timeout {
  const tickPass = async () => {
    // Catch-up Business
    for (let i = 0; i < MAX_CATCHUP_TICKS; i++) {
      const result = await runWorldTick();
      if (result.status === 'ticked') {
        logger.info(`[world-tick] Processed Business Y${result.processedYear} M${result.processedMonth} -> now Y${result.newYear} M${result.newMonth}`);
      } else {
        break;
      }
    }
    // Catch-up Politics
    for (let i = 0; i < MAX_CATCHUP_TICKS; i++) {
      const result = await runPoliticsTick();
      if (result.status === 'ticked') {
        logger.info(`[world-tick] Processed Politics Y${result.processedYear} M${result.processedMonth} -> now Y${result.newYear} M${result.newMonth}`);
      } else {
        break;
      }
    }
  };

  setTimeout(() => { tickPass().catch(err => logger.error('[world-tick] error:', err)); }, 5_000);
  const timer = setInterval(() => {
    tickPass().catch(err => logger.error('[world-tick] error:', err));
  }, SCHEDULER_INTERVAL_MS);
  timer.unref();
  return timer;
}

export async function runPoliticsTick(opts: { force?: boolean } = {}): Promise<WorldTickResult> {
  if (inFlightSince !== null) {
    const heldFor = Date.now() - inFlightSince;
    if (heldFor < TICK_LOCK_TIMEOUT_MS) {
      return { status: 'skipped', reason: 'tick_in_progress', step: (global as any).tickProgress } as any;
    }
  }
  inFlightSince = Date.now();
  (global as any).tickProgress = 'Starting politics transaction...';
  try {
    return await db.transaction(async (trx) => {
      await trx.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);

      const activeInstance = await trx('world_instances').where({ status: 'active' }).first();
      if (!activeInstance) return { status: 'skipped', reason: 'no_clock' } as WorldTickResult;

      const clock = await trx('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .forUpdate()
        .first();
      if (!clock) return { status: 'skipped', reason: 'no_clock' } as WorldTickResult;

      if (clock.status === 'paused' && !opts.force) {
        return { status: 'skipped', reason: 'paused', nextTickAt: null } as WorldTickResult;
      }

      const now = Date.now();
      const nextClose = clock.pol_next_arc_close_at ? new Date(clock.pol_next_arc_close_at).getTime() : 0;
      if (!opts.force && now < nextClose) {
        return { status: 'skipped', reason: 'not_due', nextTickAt: new Date(nextClose).toISOString() } as WorldTickResult;
      }

      const year = clock.pol_current_year ?? 0;
      const month = clock.pol_current_month ?? 1;

      (global as any).tickProgress = 'Fetching states...';
      const states = await trx('pol_states').where({ is_active: true });

      const failures: string[] = [];

      for (const state of states) {
        (global as any).tickProgress = `Processing state politics: ${state.id}`;
        try {
          await trx.transaction(async (sp) => {
            await sp.raw(`SET LOCAL statement_timeout = ${TICK_STATEMENT_TIMEOUT_MS}`);
            await processPoliticalArc(sp, state.id, month);
          });
        } catch (err) {
          failures.push(`state:${state.id}`);
          logger.error(`[world-tick] Politics state ${state.id} failed for Y${year} M${month}; skipping.`, err);
        }
      }

      const newMonth = month === 12 ? 1 : month + 1;
      const newYear = month === 12 ? year + 1 : year;
      const intervalMs = (clock.pol_real_seconds_per_month || 86400) * 1000;
      const maxCatchupMs = MAX_CATCHUP_TICKS * intervalMs;
      const anchor = !opts.force && nextClose > 0 && now - nextClose < maxCatchupMs ? nextClose : now;
      const monthStartedAt = new Date(anchor);
      const nextArcCloseAt = new Date(anchor + intervalMs);

      if (failures.length > 0) {
        logger.warn(`[world-tick] Advancing Politics Y${year} M${month} with ${failures.length} isolated failure(s)`);
      }

      (global as any).tickProgress = 'Advancing politics clock...';
      await trx('world_clock')
        .where({ world_instance_id: activeInstance.id })
        .update({
          pol_current_month: newMonth,
          pol_current_year: newYear,
          pol_month_started_at: monthStartedAt.toISOString(),
          pol_next_arc_close_at: nextArcCloseAt.toISOString(),
          updated_at: trx.fn.now(),
        });

      (global as any).tickProgress = 'Done politics!';
      return {
        status: 'ticked',
        processedYear: year,
        processedMonth: month,
        newYear,
        newMonth,
        processedCompanies: 0,
        processedCountries: states.length,
        nextTickAt: nextArcCloseAt.toISOString(),
        failures: failures.length > 0 ? failures : undefined,
      } as WorldTickResult;
    });
  } finally {
    inFlightSince = null;
  }
}
