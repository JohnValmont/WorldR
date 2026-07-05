import { db } from '../../config/database';
import { logger } from '../../utils/logger';
import { ManufacturingController } from '../controllers/manufacturing.controller';
import { processEconomyMonth } from './economyTick.service';

const WORLD_INSTANCE_ID = 'pre-alpha-world-1';
const SCHEDULER_INTERVAL_MS = 60_000; // check the clock every 60s
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
}

// In-process re-entrancy guard (row lock below guards across processes)
let inFlight = false;

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
  if (inFlight) return { status: 'skipped', reason: 'tick_in_progress' };
  inFlight = true;
  try {
    return await db.transaction(async (trx) => {
      const clock = await trx('world_clock')
        .where({ world_instance_id: WORLD_INSTANCE_ID })
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
      const countryIds: string[] = await trx('companies')
        .where({ industry_id: 'manufacturing' })
        .distinct('country_id')
        .pluck('country_id');

      let processedCompanies = 0;
      for (const countryId of countryIds) {
        const result = await ManufacturingController.processCountryMonth(trx, countryId, clock);
        processedCompanies += result.processedCompanies;
      }

      // 3. Character aging — once per year, at the end of month 12
      if (month === 12) {
        await trx('characters')
          .where({ world_instance_id: WORLD_INSTANCE_ID, status: 'active' })
          .increment('age', 1);
      }

      // 4. Advance the clock
      const newMonth = month === 12 ? 1 : month + 1;
      const newYear = month === 12 ? year + 1 : year;
      const intervalMs = (clock.real_seconds_per_month || 28800) * 1000;
      // Drift-free schedule: anchor to the previous deadline unless forced or badly behind
      const anchor = !opts.force && nextClose > 0 && now - nextClose < intervalMs ? nextClose : now;
      const monthStartedAt = new Date(anchor);
      const nextArcCloseAt = new Date(anchor + intervalMs);

      await trx('world_clock')
        .where({ world_instance_id: WORLD_INSTANCE_ID })
        .update({
          current_month: newMonth,
          current_year: newYear,
          month_started_at: monthStartedAt.toISOString(),
          next_arc_close_at: nextArcCloseAt.toISOString(),
          updated_at: trx.fn.now(),
        });

      return {
        status: 'ticked',
        processedYear: year,
        processedMonth: month,
        newYear,
        newMonth,
        processedCompanies,
        processedCountries: countryIds.length,
        nextTickAt: nextArcCloseAt.toISOString(),
      } as WorldTickResult;
    });
  } finally {
    inFlight = false;
  }
}

/**
 * Background scheduler: checks the clock every minute and advances the
 * world when a month is due. Catches up (bounded) if the server was down.
 */
export function startWorldTickScheduler(): NodeJS.Timeout {
  const tickPass = async () => {
    for (let i = 0; i < MAX_CATCHUP_TICKS; i++) {
      const result = await runWorldTick();
      if (result.status === 'ticked') {
        logger.info(
          `[world-tick] Processed Y${result.processedYear} M${result.processedMonth} -> now Y${result.newYear} M${result.newMonth} ` +
          `(${result.processedCompanies} companies across ${result.processedCountries} countries). Next tick: ${result.nextTickAt}`
        );
      } else {
        break; // not due / paused / in progress — stop the catch-up loop
      }
    }
  };

  // Run once shortly after boot (catch up on downtime), then every minute
  setTimeout(() => { tickPass().catch(err => logger.error('[world-tick] error:', err)); }, 5_000);
  const timer = setInterval(() => {
    tickPass().catch(err => logger.error('[world-tick] error:', err));
  }, SCHEDULER_INTERVAL_MS);
  timer.unref();
  return timer;
}
