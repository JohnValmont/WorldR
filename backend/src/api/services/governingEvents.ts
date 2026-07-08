/**
 * governingEvents.ts
 *
 * Fires one deterministic governing-phase event per month.
 * Seed: (stateId.charCodeAt(0) + currentMonth) % GOVERNING_EVENT_TEMPLATES.length
 * Idempotent: checks pol_ledger_events for the month before inserting.
 *
 * Effects only touch: characters.credibility / .influence, pol_parties.treasury
 * No locked systems touched. All magnitudes live in politics.ts constants.
 */

import {
  GOVERNING_EVENTS_ENABLED,
  GOVERNING_EVENT_TEMPLATES,
  POL_CRISIS_THRESHOLDS,
  POL_CRISIS_CREDIBILITY_HIT,
  POL_CRISIS_TREASURY_HIT,
} from '../constants/politics';
import { readConditionsFromRow, detectCrises } from './conditions';

/** Resolves which character holds the Premier seat for a state. Returns null if none. */
async function resolvePremierCharacter(trx: any, stateId: string): Promise<any | null> {
  const premierSeat = await trx('pol_offices')
    .where({ state_id: stateId, office: 'premier' })
    .first();
  if (!premierSeat?.party_id) return null;

  const premierParty = await trx('pol_parties').where({ id: premierSeat.party_id }).first();
  if (!premierParty?.leader_character_id) return null;

  return trx('characters').where({ id: premierParty.leader_character_id }).first();
}

/** Resolves the governing party record (party with the premier seat). */
async function resolveGoverningParty(trx: any, stateId: string): Promise<any | null> {
  const premierSeat = await trx('pol_offices')
    .where({ state_id: stateId, office: 'premier' })
    .first();
  if (!premierSeat?.party_id) return null;
  return trx('pol_parties').where({ id: premierSeat.party_id }).first();
}

/** Resolves the largest non-governing party's leader character. */
async function resolveOppositionLeaderCharacter(trx: any, stateId: string): Promise<any | null> {
  const premierSeat = await trx('pol_offices')
    .where({ state_id: stateId, office: 'premier' })
    .first();
  const governingPartyId = premierSeat?.party_id || null;

  // Largest opposition party by seat count
  const seats = await trx('pol_council_seats')
    .where({ state_id: stateId })
    .select('party_id', trx.raw('count(*) as seat_count'))
    .groupBy('party_id')
    .orderBy('seat_count', 'desc');

  const oppPartyRecord = seats.find((s: any) => s.party_id !== governingPartyId);
  if (!oppPartyRecord) return null;

  const oppParty = await trx('pol_parties').where({ id: oppPartyRecord.party_id }).first();
  if (!oppParty?.leader_character_id) return null;

  return trx('characters').where({ id: oppParty.leader_character_id }).first();
}

/** Apply factor deltas to a character row, clamped to [0, 100]. */
async function applyCharacterDelta(
  trx: any,
  character: any,
  delta: Record<string, number>
): Promise<void> {
  if (!character) return;
  const update: Record<string, number> = {};
  for (const [k, v] of Object.entries(delta)) {
    const current = Number(character[k]) || 0;
    update[k] = Math.max(0, Math.min(100, current + v));
  }
  if (Object.keys(update).length > 0) {
    await trx('characters').where({ id: character.id }).update(update);
  }
}

/**
 * Main export — call once per governing month from processPoliticalArc.
 * Deterministic and idempotent.
 */
export async function fireGoverningEvent(
  trx: any,
  stateId: string,
  currentMonth: number
): Promise<void> {
  if (!GOVERNING_EVENTS_ENABLED) return;

  // Idempotency guard: only one governing event per (state, month)
  const alreadyFired = await trx('pol_ledger_events')
    .where({ state_id: stateId, arc: currentMonth })
    .where('kind', 'like', 'gov_%')
    .first();
  if (alreadyFired) return;

  // Deterministic selection: no RNG, same month always produces the same template
  const seed = (stateId.charCodeAt(0) + currentMonth) % GOVERNING_EVENT_TEMPLATES.length;
  const template = GOVERNING_EVENT_TEMPLATES[seed];

  // ── Resolve affected entities ───────────────────────────────────────────────
  let targetCharacter: any = null;

  if (template.target === 'premier') {
    targetCharacter = await resolvePremierCharacter(trx, stateId);
  } else if (template.target === 'opposition_leader') {
    targetCharacter = await resolveOppositionLeaderCharacter(trx, stateId);
  }

  // Apply character factor delta
  if (template.characterDelta && targetCharacter) {
    await applyCharacterDelta(trx, targetCharacter, template.characterDelta);
  }

  // Apply party treasury delta
  if (template.partyTreasuryDelta !== 0) {
    const governingParty = await resolveGoverningParty(trx, stateId);
    if (governingParty) {
      await trx('pol_parties')
        .where({ id: governingParty.id })
        .increment('treasury', template.partyTreasuryDelta);
    }
  }

  // ── Write ledger event ──────────────────────────────────────────────────────
  await trx('pol_ledger_events').insert({
    state_id: stateId,
    arc: currentMonth,
    kind: template.kind,
    headline: template.headline,
    body: template.body,
  });
}

/**
 * Fire crisis events driven by Jurisdiction Conditions (GDD §11). A condition
 * at/below its threshold triggers the crisis deterministically from real state —
 * no RNG, no scripting. Idempotent per (state, month, crisis kind). Each crisis
 * dings the governing party's leader credibility and party treasury only; the
 * tuned election math is never touched.
 */
export async function fireConditionCrises(
  trx: any,
  stateId: string,
  currentMonth: number
): Promise<void> {
  const state = await trx('pol_states').where({ id: stateId }).first();
  if (!state) return;

  const conditions = readConditionsFromRow(state);
  const active = detectCrises(conditions);
  if (active.length === 0) return;

  for (const kind of active) {
    const spec = POL_CRISIS_THRESHOLDS[kind];

    // Idempotency guard: one event per (state, month, crisis kind).
    const already = await trx('pol_ledger_events')
      .where({ state_id: stateId, arc: currentMonth, kind })
      .first();
    if (already) continue;

    // Ding the governing party: leader credibility + party treasury.
    const premier = await resolvePremierCharacter(trx, stateId);
    if (premier) {
      await applyCharacterDelta(trx, premier, { credibility: -POL_CRISIS_CREDIBILITY_HIT });
    }
    const governingParty = await resolveGoverningParty(trx, stateId);
    if (governingParty) {
      await trx('pol_parties').where({ id: governingParty.id }).decrement('treasury', POL_CRISIS_TREASURY_HIT);
    }

    await trx('pol_ledger_events').insert({
      state_id: stateId,
      arc: currentMonth,
      kind,
      headline: spec.headline,
      body: spec.body,
    });
  }
}
