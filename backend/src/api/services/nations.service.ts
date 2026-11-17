/**
 * Nations — who lives where, and how the starter nations compare
 * (docs/POLITICS_FLOOR.md). Read-only except for nothing: it never writes.
 */
import { AppError } from '../../utils/errors';
import {
  DEFENCE_STRENGTH, NATION_ACTIVE_DAYS, NATION_OVERFLOW_WHEN_ALL_FULL, NATION_PLAYER_CAP, NATIONS_BY_COUNTRY,
  POWER_ECONOMY_WEIGHTS, STARTER_NATIONS,
} from '../constants/nations';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { computeApproval, getGovernment, getLawsInForce } from './statecraft.service';

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/** Pure: the three comparison scores (0-100) from a nation's statistics and defence law. */
export function nationPower(stats: Record<string, number>, defenceLaw: string | undefined) {
  const economy = Math.round(POWER_ECONOMY_WEIGHTS.prosperity * num(stats.prosperity, 50) + POWER_ECONOMY_WEIGHTS.fiscal_health * num(stats.fiscal_health, 50));
  const military = DEFENCE_STRENGTH[defenceLaw ?? 'moderate'] ?? DEFENCE_STRENGTH.moderate;
  const influence = Math.round(num(stats.global_standing, 50));
  return { economy, military, influence, overall: Math.round((economy + military + influence) / 3) };
}

/** Pure: where a new player goes. `counts` = active players per nation id. */
export function chooseNation(requested: string | null | undefined, counts: Record<string, number>, cap: number, overflow: boolean): { countryId: string } | { error: string } {
  const ids = STARTER_NATIONS.map(n => n.countryId);
  const open = ids.filter(id => (counts[id] || 0) < cap);
  const name = (id: string) => NATIONS_BY_COUNTRY[id]?.shortName ?? id;
  if (requested && !ids.includes(requested)) return { error: `${requested} is not open to citizens yet. Choose ${ids.map(name).join(', ')}.` };
  if (requested && open.includes(requested)) return { countryId: requested };
  if (open.length > 0) {
    if (requested) return { error: `${name(requested)} is full (${cap} of ${cap} citizens). ${open.map(name).join(' and ')} ${open.length === 1 ? 'has' : 'have'} room.` };
    // No preference: fill the fullest nation that still has room, so nations fill one at a time.
    return { countryId: [...open].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || ids.indexOf(a) - ids.indexOf(b))[0] };
  }
  if (!overflow) return { error: 'Every nation is full. Please try again when a place opens.' };
  return { countryId: [...ids].sort((a, b) => (counts[a] || 0) - (counts[b] || 0) || ids.indexOf(a) - ids.indexOf(b))[0] };
}

/** Active human players per nation (seen within NATION_ACTIVE_DAYS). */
export async function nationRoster(conn: any): Promise<Record<string, number>> {
  const rows = await conn('characters')
    .join('users', 'users.id', 'characters.user_id')
    .where('characters.status', 'active')
    .whereRaw(`users.last_seen_at > NOW() - (? || ' days')::interval`, [NATION_ACTIVE_DAYS])
    .select('characters.motherland_country_id as id')
    .count('* as n')
    .groupBy('characters.motherland_country_id');
  const out: Record<string, number> = {};
  for (const n of STARTER_NATIONS) out[n.countryId] = 0;
  for (const r of rows as any[]) if (r.id in out) out[r.id] = num(r.n);
  return out;
}

export async function assignNation(conn: any, requested: string | null | undefined): Promise<string> {
  const pick = chooseNation(requested, await nationRoster(conn), NATION_PLAYER_CAP, NATION_OVERFLOW_WHEN_ALL_FULL);
  if ('error' in pick) throw new AppError(pick.error, 409, 'NATION_FULL');
  return pick.countryId;
}

/** One row per starter nation: who governs, how it is doing, how many players live there. */
export async function worldNations(conn: any, arc?: number) {
  const roster = await nationRoster(conn);
  if (arc == null) {
    const clock = await conn('world_clock').first();
    if (clock) arc = num(clock.pol_current_year) * 12 + (num(clock.pol_current_month, 1) - 1);
  }
  const out = [];
  for (const spec of STARTER_NATIONS) {
    const state = await conn('pol_states').where({ code: spec.polStateCode }).first();
    if (!state) continue;
    const stats = readNationalStatsFromRow(state) as any;
    const gov = await getGovernment(conn, state.id);
    const laws = await getLawsInForce(conn, state.id);
    const office = await conn('pol_offices').where({ state_id: state.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
    const holder = office?.holder_character_id ? await conn('characters').where({ id: office.holder_character_id }).select('name').first() : null;
    const lead = gov.leadPartyId ? await conn('pol_parties').where({ id: gov.leadPartyId }).first() : null;
    const ident = lead ? await conn('pol_party_identities').where({ party_id: lead.id }).first() : null;
    const cycle = await conn('pol_cycles').where({ state_id: state.id, status: 'open' }).first();
    out.push({
      countryId: spec.countryId,
      polStateCode: spec.polStateCode,
      name: spec.shortName,
      officialName: spec.officialName,
      capital: spec.capital,
      government: spec.government,
      leaderTitle: spec.headOfGovernment.title,
      headOfState: spec.headOfState,
      legislatureName: spec.legislature.name,
      termYears: Math.round(spec.legislature.termMonths / 12),
      culture: spec.culture ?? null,
      traits: spec.traits ?? [],
      motto: spec.motto,
      flag: spec.flag,
      premier: holder?.name ?? (lead ? ident?.leader ?? null : null),
      premierIsPlayer: !!holder,
      leadParty: lead ? { name: lead.name, color: ident?.color ?? lead.color_hex ?? '#7A8594' } : null,
      governmentSeats: gov.memberPartyIds.reduce((a, id) => a + (gov.seatsByParty[id] || 0), 0),
      seats: spec.legislature.seats,
      approval: computeApproval(stats),
      power: nationPower(stats, laws.defense),
      monthsToElection: cycle && arc != null ? Math.max(0, num(cycle.polling_arc) - arc) : null,
      players: roster[spec.countryId] || 0,
      cap: NATION_PLAYER_CAP,
    });
  }
  return out;
}
