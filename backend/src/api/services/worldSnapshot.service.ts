/**
 * World snapshot — a small, public, REAL summary of what is happening in the
 * world right now. Powers the Chronicle "Drennia this month" panel and the
 * landing-page HUD, replacing hard-coded placeholder numbers.
 *
 * Rule: every number here comes from the simulation's own tables. If a number
 * isn't available it is returned as null, and the UI shows nothing — never a
 * made-up value.
 */
import { db } from '../../config/database';
import {
  ACTIVE_PLAYER_WINDOW_DAYS,
  NO_LOGIN_PASSWORD_HASH,
  NPC_EMAIL_DOMAIN_SUFFIX,
  SYSTEM_NPC_EMAIL,
  WORLD_SNAPSHOT_CACHE_MS,
} from '../constants/world';

export interface WorldSnapshot {
  generated_at: string;
  clock: {
    status: string;
    business: { year: number; month: number; next_tick_at: string | null };
    politics: { year: number | null; month: number | null; next_tick_at: string | null };
  } | null;
  market: {
    period: { year: number; month: number } | null;
    units_sold: number;
    revenue: number;
    previous_units_sold: number | null;
    previous_revenue: number | null;
    models_selling: number;
  };
  companies: { active: number; player_owned: number; npc: number };
  players: { citizens: number; active_recently: number | null; active_window_days: number };
  politics: { parties: number; player_led_parties: number };
}

let cache: { at: number; value: WorldSnapshot } | null = null;

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** SQL fragment: users that are real people, not seeded NPC/system accounts. */
function whereRealUser(qb: any) {
  qb.whereNot('u.password_hash', NO_LOGIN_PASSWORD_HASH)
    .whereNot('u.email', SYSTEM_NPC_EMAIL)
    .whereRaw('LOWER(u.email) NOT LIKE ?', [`%${NPC_EMAIL_DOMAIN_SUFFIX}`]);
}

async function build(): Promise<WorldSnapshot> {
  const instance = await db('world_instances').where({ status: 'active' }).first();
  const instanceId: string | null = instance?.id ?? null;
  const clock = instanceId ? await db('world_clock').where({ world_instance_id: instanceId }).first() : null;
  const currentYear = clock ? n(clock.current_year) : 0;

  // Latest month that actually has sales (ticks can be skipped), capped at the
  // current year to ignore rows corrupted by an old arc/year mix-up.
  const latest = instanceId
    ? await db('manufacturing_sales_results')
        .where({ world_instance_id: instanceId })
        .where('world_year', '<=', currentYear)
        .orderBy([{ column: 'world_year', order: 'desc' }, { column: 'world_month', order: 'desc' }])
        .select('world_year', 'world_month')
        .first()
    : null;

  const salesFor = async (year: number, month: number) => {
    const row = await db('manufacturing_sales_results')
      .where({ world_instance_id: instanceId, world_year: year, world_month: month })
      .sum({ units: 'units_sold' })
      .sum({ revenue: 'revenue' })
      .countDistinct({ models: 'vehicle_model_id' })
      .first();
    return { units: n(row?.units), revenue: n(row?.revenue), models: n(row?.models) };
  };

  let market: WorldSnapshot['market'] = {
    period: null, units_sold: 0, revenue: 0, previous_units_sold: null, previous_revenue: null, models_selling: 0,
  };
  if (latest) {
    const y = n(latest.world_year);
    const m = n(latest.world_month);
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;
    const [cur, prev] = await Promise.all([salesFor(y, m), salesFor(prevY, prevM)]);
    market = {
      period: { year: y, month: m },
      units_sold: cur.units,
      revenue: cur.revenue,
      previous_units_sold: prev.units || prev.revenue ? prev.units : null,
      previous_revenue: prev.units || prev.revenue ? prev.revenue : null,
      models_selling: cur.models,
    };
  }

  const companyRow = instanceId
    ? await db('companies')
        .where({ world_instance_id: instanceId, status: 'active' })
        .count({ total: '*' })
        .select(db.raw('COUNT(*) FILTER (WHERE is_npc = true) AS npc'))
        .first()
    : null;
  const totalCompanies = n(companyRow?.total);
  const npcCompanies = n((companyRow as any)?.npc);

  const playerRow = instanceId
    ? await db('characters as c')
        .join('users as u', 'u.id', 'c.user_id')
        .where('c.world_instance_id', instanceId)
        .whereNot('c.status', 'deleted')
        .modify(whereRealUser)
        .count({ citizens: '*' })
        .select(db.raw(
          `COUNT(*) FILTER (WHERE u.last_seen_at > NOW() - (? || ' days')::interval) AS active`,
          [String(ACTIVE_PLAYER_WINDOW_DAYS)],
        ))
        .first()
    : null;

  // last_seen_at only exists after migration 0092; until it has any data, say "unknown".
  const anySeen = await db('users').whereNotNull('last_seen_at').first('id').catch(() => null);

  const partyRow = await db('pol_parties')
    .count({ total: '*' })
    .select(db.raw('COUNT(*) FILTER (WHERE is_npc = false) AS player_led'))
    .first()
    .catch(() => null);

  return {
    generated_at: new Date().toISOString(),
    clock: clock
      ? {
          status: clock.status,
          business: {
            year: n(clock.current_year),
            month: n(clock.current_month),
            next_tick_at: clock.next_arc_close_at ? new Date(clock.next_arc_close_at).toISOString() : null,
          },
          politics: {
            year: clock.pol_current_year ?? null,
            month: clock.pol_current_month ?? null,
            next_tick_at: clock.pol_next_arc_close_at ? new Date(clock.pol_next_arc_close_at).toISOString() : null,
          },
        }
      : null,
    market,
    companies: { active: totalCompanies, player_owned: totalCompanies - npcCompanies, npc: npcCompanies },
    players: {
      citizens: n(playerRow?.citizens),
      active_recently: anySeen ? n((playerRow as any)?.active) : null,
      active_window_days: ACTIVE_PLAYER_WINDOW_DAYS,
    },
    politics: { parties: n(partyRow?.total), player_led_parties: n((partyRow as any)?.player_led) },
  };
}

export async function getWorldSnapshot(): Promise<WorldSnapshot> {
  if (cache && Date.now() - cache.at < WORLD_SNAPSHOT_CACHE_MS) return cache.value;
  const value = await build();
  cache = { at: Date.now(), value };
  return value;
}
