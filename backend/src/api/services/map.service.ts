/**
 * The political map (docs/POLITICS_FLOOR.md, "Map"): every district of every
 * starter nation with last election's result, today's poll, who sits there
 * and what kind of voters live there. Public within the game: real
 * politicians know where their rivals are strong.
 */
import { db } from '../../config/database';
import { STARTER_NATIONS } from '../constants/nations';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { computeApproval, getGovernment, pollParties, projectElection, parsePlatform } from './statecraft.service';
import { safeParseJSON } from '../../utils/json';

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const CACHE_MS = 30_000;
let cache: { at: number; data: any } | null = null;

async function nationMap(spec: (typeof STARTER_NATIONS)[number]) {
  const state = await db('pol_states').where({ code: spec.polStateCode }).first();
  if (!state) return null;
  const gov = await getGovernment(db, state.id);
  const govSet = new Set<string>(gov.memberPartyIds);
  const partyRows = await db('pol_parties as p').leftJoin('pol_party_identities as i', 'i.party_id', 'p.id')
    .where('p.state_id', state.id).select('p.*', 'i.color', 'i.leader as npc_leader', 'i.motto');
  const leaderIds = partyRows.map((p: any) => p.leader_character_id).filter(Boolean);
  const leaders = leaderIds.length ? await db('characters').whereIn('id', leaderIds).select('id', 'name') : [];
  const leaderName = new Map<string, string>(leaders.map((c: any) => [c.id, c.name]));
  const districts = await db('pol_constituencies').where({ state_id: state.id, is_active: true });

  // Last election, district by district.
  const lastVotes: Record<string, Record<string, number>> = {};
  if (gov.sittingCycleId) {
    const rows = await db('pol_results').join('pol_candidates', 'pol_candidates.id', 'pol_results.candidate_id')
      .where('pol_results.cycle_id', gov.sittingCycleId)
      .select('pol_candidates.constituency_id', 'pol_candidates.party_id').sum({ votes: 'pol_results.votes' })
      .groupBy('pol_candidates.constituency_id', 'pol_candidates.party_id');
    for (const r of rows as any[]) (lastVotes[r.constituency_id] ??= {})[r.party_id] = num(r.votes);
  }
  const seatRows = gov.sittingCycleId
    ? await db('pol_council_seats as s').leftJoin('characters as c', 'c.id', 's.character_id')
      .where('s.cycle_id', gov.sittingCycleId).select('s.constituency_id', 's.party_id', 's.character_id', 'c.name')
    : [];
  const seatsBy: Record<string, Record<string, number>> = {};
  const playersBy: Record<string, { id: string; name: string; partyId: string }[]> = {};
  for (const r of seatRows as any[]) {
    const m = (seatsBy[r.constituency_id] ??= {});
    m[r.party_id] = (m[r.party_id] ?? 0) + 1;
    if (r.character_id) (playersBy[r.constituency_id] ??= []).push({ id: r.character_id, name: r.name, partyId: r.party_id });
  }

  // Today's poll, district by district (same inputs as the real election).
  const stats = readNationalStatsFromRow(state);
  const poll = districts.length && partyRows.length
    ? projectElection(await pollParties(db, state.id, partyRows), districts, stats, govSet, computeApproval(stats))
    : { shares: {}, seats: {}, districts: {} as Record<string, any> };

  const share = (m: Record<string, number> | undefined) => {
    const t = Object.values(m ?? {}).reduce((a, b) => a + b, 0) || 1;
    return Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, v / t]));
  };
  return {
    code: spec.polStateCode,
    countryId: spec.countryId,
    name: spec.shortName,
    officialName: spec.officialName,
    capital: spec.capital,
    government: spec.government,
    leaderTitle: spec.headOfGovernment.title,
    regions: spec.regions.map(r => ({ code: r.code, name: r.name, capital: r.capital, character: r.character })),
    parties: partyRows.map((p: any) => ({
      id: p.id, name: p.name, abbr: p.abbreviation, color: p.color ?? p.color_hex ?? '#7A8594', motto: p.motto ?? null,
      platform: parsePlatform(p.platform), seats: Object.values(seatsBy).reduce((a, m) => a + (m[p.id] ?? 0), 0),
      pollSeats: num((poll.seats as any)[p.id]), pollShare: num((poll.shares as any)[p.id]),
      governing: govSet.has(p.id), leadsGovernment: gov.leadPartyId === p.id,
      leader: p.leader_character_id ? leaderName.get(p.leader_character_id) ?? null : (p.npc_leader && p.npc_leader !== 'Various' ? p.npc_leader : null),
      leaderIsPlayer: !!p.leader_character_id,
    })),
    districts: districts.map((d: any) => ({
      id: d.id, name: d.name, region: d.region, seats: num(d.seats, 1), voters: num(d.registered_voters),
      groups: typeof d.segment_weights === 'string' ? safeParseJSON(d.segment_weights) : (d.segment_weights ?? {}),
      last: { shares: share(lastVotes[d.id]), seats: seatsBy[d.id] ?? {} },
      poll: { shares: poll.districts[d.id]?.shares ?? {}, seats: poll.districts[d.id]?.seats ?? {} },
      players: playersBy[d.id] ?? [],
    })),
  };
}

export async function getPoliticalMap() {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  const nations = [];
  for (const spec of STARTER_NATIONS) {
    const n = await nationMap(spec);
    if (n) nations.push(n);
  }
  const data = { nations };
  cache = { at: Date.now(), data };
  return data;
}
