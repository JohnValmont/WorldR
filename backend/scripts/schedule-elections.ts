/**
 * Hold the election in EVERY nation at the next politics tick, and make that
 * tick happen in N real minutes (default 8).
 *
 *   npx tsx scripts/schedule-elections.ts            # dry run: shows what would change
 *   npx tsx scripts/schedule-elections.ts --apply    # does it
 *   npx tsx scripts/schedule-elections.ts --apply --minutes=8
 *
 * How it works (no new election rules):
 *  - An election is resolved by processPoliticalArc when the politics arc reaches
 *    the open cycle's polling_arc (politics.service.ts). So each open cycle gets
 *    polling_arc = the arc the next tick will process, and formation_end_arc
 *    keeps its normal gap after it.
 *  - The politics clock only ticks every 8 real hours, so pol_next_arc_close_at
 *    is moved to now + N minutes. The running server's scheduler picks it up.
 *
 * Side effects you should know about:
 *  - Filing and campaign windows are skipped (the election lands straight after
 *    this tick). Candidates are whoever already stands; NPC parties still run.
 *  - After the election tick, the next politics tick is a normal 8 hours later.
 *  - Cycles whose election already has results are left alone.
 *
 * Uses DATABASE_URL from backend/.env.
 */
import { db } from '../src/config/database';
import { POL_FORMATION_WINDOW_MONTHS } from '../src/api/constants/politics';

async function main() {
  const apply = process.argv.includes('--apply');
  const minArg = process.argv.find((a) => a.startsWith('--minutes='));
  const minutes = minArg ? Number(minArg.split('=')[1]) : 8;
  if (!Number.isFinite(minutes) || minutes < 1) {
    console.error('--minutes must be a number >= 1');
    process.exit(1);
  }

  await db.transaction(async (trx) => {
    const instance = await trx('world_instances').where({ status: 'active' }).first();
    if (!instance) throw new Error('No active world instance.');
    const clock = await trx('world_clock').where({ world_instance_id: instance.id }).forUpdate().first();
    if (!clock) throw new Error('No world clock row.');

    const arc = (clock.pol_current_year ?? 1) * 12 + ((clock.pol_current_month ?? 1) - 1);
    const dueAt = new Date(Date.now() + minutes * 60_000);

    console.log(`Politics clock: Y${clock.pol_current_year} M${clock.pol_current_month} (arc ${arc}), status=${clock.status}`);
    console.log(`Next politics tick currently: ${clock.pol_next_arc_close_at}`);
    console.log(`Will be set to:               ${dueAt.toISOString()}  (${minutes} min from now)`);
    if (clock.status === 'paused') console.log('WARNING: the clock is PAUSED, so no tick will fire until it is resumed.');

    const rows = await trx('pol_cycles as c')
      .join('pol_states as s', 's.id', 'c.state_id')
      .where('c.status', 'open')
      .where('s.is_active', true)
      .select('c.id', 'c.state_id', 's.code', 'c.polling_arc', 'c.formation_end_arc');

    for (const c of rows) {
      const seated = await trx('pol_council_seats').where({ cycle_id: c.id }).first();
      if (seated) {
        console.log(`  ${c.code}: election already resolved for this cycle, skipped`);
        continue;
      }
      console.log(`  ${c.code}: polling_arc ${c.polling_arc} -> ${arc}  (${c.polling_arc - arc} months early)`);
      if (apply) {
        await trx('pol_cycles').where({ id: c.id }).update({
          polling_arc: arc,
          formation_end_arc: arc + POL_FORMATION_WINDOW_MONTHS,
        });
      }
    }

    if (apply) {
      await trx('world_clock').where({ world_instance_id: instance.id }).update({
        pol_next_arc_close_at: dueAt.toISOString(),
        updated_at: trx.fn.now(),
      });
      console.log('\nApplied.');
    } else {
      console.log('\nDry run only. Re-run with --apply to make the change.');
    }
  });

  await db.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
