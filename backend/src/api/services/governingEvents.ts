/**
 * governingEvents.ts
 *
 * Fires one deterministic governing-phase event per arc.
 * Seed: (stateId.charCodeAt(0) + currentArc) % GOVERNING_EVENT_TEMPLATES.length
 * Idempotent: checks pol_ledger_events for the arc before inserting.
 *
 * Effects only touch: characters.credibility / .influence, pol_parties.treasury
 * No locked systems touched. All magnitudes live in politics.ts constants.
 */

import {
  GOVERNING_EVENTS_ENABLED,
  GOVERNING_EVENT_TEMPLATES,
} from '../constants/politics';

/** Resolves which character holds the Premier seat for a state. Returns null if none. */
async function resolvePremierCharacter(trx: any, stateId: string): Promise<any | null> {
  const premierSeat = await trx('pol_council_seats')
    .where({ state_id: stateId, role: 'premier' })
    .first();
  if (!premierSeat?.party_id) return null;

  const premierParty = await trx('pol_parties').where({ id: premierSeat.party_id }).first();
  if (!premierParty?.leader_character_id) return null;

  return trx('characters').where({ id: premierParty.leader_character_id }).first();
}

/** Resolves the governing party record (party with the premier seat). */
async function resolveGoverningParty(trx: any, stateId: string): Promise<any | null> {
  const premierSeat = await trx('pol_council_seats')
    .where({ state_id: stateId, role: 'premier' })
    .first();
  if (!premierSeat?.party_id) return null;
  return trx('pol_parties').where({ id: premierSeat.party_id }).first();
}

/** Resolves the largest non-governing party's leader character. */
async function resolveOppositionLeaderCharacter(trx: any, stateId: string): Promise<any | null> {
  const premierSeat = await trx('pol_council_seats')
    .where({ state_id: stateId, role: 'premier' })
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
 * Main export — call once per governing arc from processPoliticalArc.
 * Deterministic and idempotent.
 */
export async function fireGoverningEvent(
  trx: any,
  stateId: string,
  currentArc: number
): Promise<void> {
  if (!GOVERNING_EVENTS_ENABLED) return;

  // Idempotency guard: only one governing event per (state, arc)
  const alreadyFired = await trx('pol_ledger_events')
    .where({ state_id: stateId, arc: currentArc })
    .where('kind', 'like', 'gov_%')
    .first();
  if (alreadyFired) return;

  // Deterministic selection: no RNG, same arc always produces the same template
  const seed = (stateId.charCodeAt(0) + currentArc) % GOVERNING_EVENT_TEMPLATES.length;
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
    arc: currentArc,
    kind: template.kind,
    headline: template.headline,
    body: template.body,
  });
}
