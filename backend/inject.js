const fs = require('fs');
let code = fs.readFileSync('src/api/services/worldTick.service.ts', 'utf8');

code = code.replace(/export function startWorldTickScheduler[\s\S]*$/, `
export function startWorldTickScheduler(): NodeJS.Timeout {
  const tickPass = async () => {
    // Catch-up Business
    for (let i = 0; i < MAX_CATCHUP_TICKS; i++) {
      const result = await runWorldTick();
      if (result.status === 'ticked') {
        logger.info(\`[world-tick] Processed Business Y\${result.processedYear} M\${result.processedMonth} -> now Y\${result.newYear} M\${result.newMonth}\`);
      } else {
        break;
      }
    }
    // Catch-up Politics
    for (let i = 0; i < MAX_CATCHUP_TICKS; i++) {
      const result = await runPoliticsTick();
      if (result.status === 'ticked') {
        logger.info(\`[world-tick] Processed Politics Y\${result.processedYear} M\${result.processedMonth} -> now Y\${result.newYear} M\${result.newMonth}\`);
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
      await trx.raw(\`SET LOCAL statement_timeout = \${TICK_STATEMENT_TIMEOUT_MS}\`);

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
        (global as any).tickProgress = \`Processing state politics: \${state.id}\`;
        try {
          await trx.transaction(async (sp) => {
            await sp.raw(\`SET LOCAL statement_timeout = \${TICK_STATEMENT_TIMEOUT_MS}\`);
            await processPoliticalArc(sp, state.id, month);
          });
        } catch (err) {
          failures.push(\`state:\${state.id}\`);
          logger.error(\`[world-tick] Politics state \${state.id} failed for Y\${year} M\${month}; skipping.\`, err);
        }
      }

      const newMonth = month === 12 ? 1 : month + 1;
      const newYear = month === 12 ? year + 1 : year;
      const intervalMs = (clock.pol_real_seconds_per_month || 86400) * 1000;
      const anchor = !opts.force && nextClose > 0 && now - nextClose < intervalMs ? nextClose : now;
      const monthStartedAt = new Date(anchor);
      const nextArcCloseAt = new Date(anchor + intervalMs);

      if (failures.length > 0) {
        logger.warn(\`[world-tick] Advancing Politics Y\${year} M\${month} with \${failures.length} isolated failure(s)\`);
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
`);

// Also add the import:
code = code.replace(/import \{ processExchangeMonth \}.*;/, 'import { processExchangeMonth } from \'./ipoExchange.service\';\nimport { processPoliticalArc } from \'./politics.service\';\n');

fs.writeFileSync('src/api/services/worldTick.service.ts', code);
