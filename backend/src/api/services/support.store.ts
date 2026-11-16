/**
 * Support — database helpers (docs/POLITICS_FLOOR.md). Every function takes a
 * knex transaction. Imports only pure rules, so any politics service can use it.
 */
import { SEGMENTS } from '../constants/politics';
import { clampSupport, supportEffort, supportTarget, toPlatform } from './support.rules';

const SEGMENT_KEYS = SEGMENTS.map(s => s.key);
const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

/** Make sure every party in the state has a support row per voter group (seeded at its natural level). */
export async function ensureSupport(trx: any, stateId: string, arc: number): Promise<void> {
  const parties = await trx('pol_parties').where({ state_id: stateId }).select('id', 'platform');
  if (!parties.length) return;
  const have = await trx('pol_support').whereIn('party_id', parties.map((p: any) => p.id)).select('party_id', 'segment_key');
  const seen = new Set(have.map((r: any) => `${r.party_id}|${r.segment_key}`));
  const rows: any[] = [];
  for (const p of parties) {
    const platform = toPlatform(p.platform);
    for (const key of SEGMENT_KEYS) {
      if (seen.has(`${p.id}|${key}`)) continue;
      rows.push({ party_id: p.id, segment_key: key, score: Number(supportTarget(platform, key).toFixed(2)), updated_arc: arc });
    }
  }
  if (rows.length) await trx('pol_support').insert(rows).onConflict(['party_id', 'segment_key']).ignore();
}

/** partyId -> voter group -> support. A party with no row yet reads as its natural level. */
export async function getSupportMap(trx: any, parties: { id: string; platform: any }[]): Promise<Record<string, Record<string, number>>> {
  const out: Record<string, Record<string, number>> = {};
  if (!parties.length) return out;
  const rows = await trx('pol_support').whereIn('party_id', parties.map(p => p.id));
  for (const p of parties) {
    const platform = toPlatform(p.platform);
    out[p.id] = {};
    for (const key of SEGMENT_KEYS) out[p.id][key] = supportTarget(platform, key);
  }
  for (const r of rows) if (out[r.party_id]) out[r.party_id][r.segment_key] = num(r.score, 50);
  return out;
}

/** Campaign effort the election engine adds for each party in each voter group. */
export async function supportEffortByParty(trx: any, stateId: string): Promise<Record<string, Record<string, number>>> {
  const parties = await trx('pol_parties').where({ state_id: stateId }).select('id', 'platform');
  const support = await getSupportMap(trx, parties);
  const out: Record<string, Record<string, number>> = {};
  for (const [pid, bySeg] of Object.entries(support)) {
    out[pid] = {};
    for (const [seg, score] of Object.entries(bySeg)) out[pid][seg] = supportEffort(score);
  }
  return out;
}

/** Add (or subtract) support for a party. Keys are voter groups, or 'all' for every group. */
export async function addSupport(trx: any, partyId: string, deltas: Record<string, number | undefined>, arc: number): Promise<void> {
  const party = await trx('pol_parties').where({ id: partyId }).select('id', 'platform').first();
  if (!party) return;
  const current = (await getSupportMap(trx, [party]))[partyId];
  for (const key of SEGMENT_KEYS) {
    const delta = num(deltas[key]) + num(deltas.all);
    if (!delta) continue;
    const score = Number(clampSupport(current[key] + delta).toFixed(2));
    await trx('pol_support')
      .insert({ party_id: partyId, segment_key: key, score, updated_arc: arc })
      .onConflict(['party_id', 'segment_key']).merge(['score', 'updated_arc']);
  }
}
