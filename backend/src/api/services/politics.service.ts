import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import {
  POL_FILING_WINDOW_MONTHS,
  POL_CAMPAIGN_WINDOW_MONTHS,
  POL_FORMATION_WINDOW_MONTHS,
  POL_FIRST_CYCLE_MONTHS,
  getSeatsForState,
  getMajorityForState,
  getTermMonthsForState,
  getElectionOffsetMonths,
  CAMPAIGN_ACTIONS,
  POL_FUNDRAISER_BASE,
  POL_FUNDRAISER_CHARISMA_MULT,
  POL_ENDORSEMENT_INFLUENCE_COST,
  POL_NPC_MAX_SPEND_FRAC,
  POL_NPC_TRAILING_SHARE,
  POL_TENDER_INFLUENCE_TIEBREAK,
  SEGMENTS,
  AXES,
  Platform,
  POL_COALITION_MAX_DISTANCE,
  POL_FACTOR_DELTAS,
  AP_MONTHLY_GRANT,
  ROSTER_CAP_BANDS,
  RECRUIT_COST_CASH,
  RECRUIT_PLATFORM_DRIFT,
  POL_POLICY_CONDITION_EFFECTS,
  PC_ARC_REGEN,
  PC_CAP_BASE,
  PC_CAP_PREMIER,
  PC_CAP_OPPOSITION,
  PC_SPEND_COSTS,
  PC_SPEND_ACTIONS,
  PcSpendAction,
  DOCTRINE_FACTIONS,
  DoctrineId,
  FACTION_LOYALTY_WARNING,
  FACTION_DRIFT_PER_ARC,
  FACTION_RALLY_RESTORE,
  SCANDAL_BASE_PROB,
  SCANDAL_SEVERITY_WEIGHTS,
  SCANDAL_PHASE_DURATION,
  SCANDAL_PHASE_DAMAGE,
  SCANDAL_NATURAL_CLEAR_PROB,
  SCANDAL_NPC_PROB_MULT,
  CAMPAIGN_STRATEGY_PARAMS,
  CAMPAIGN_GGS_PER_EFFORT,
  CAMPAIGN_GGS_CAP,
  CAMPAIGN_MOMENTUM_DECAY,
  CAMPAIGN_MOMENTUM_GAIN_ACTION,
  CAMPAIGN_EVENTS,
  IG_ENDORSEMENT_THRESHOLDS,
  IG_ALIGNMENT_SCORE_SCALE,
  IG_ALIGNMENT_DECAY,
  IG_PASSIVE_DECAY_PER_ARC,
  IG_OUTREACH_BASE_GAIN,
  IG_OUTREACH_AP_COST,
  IG_OUTREACH_COOLDOWN_ARCS,
  IG_RALLY_GAIN,
  IG_RALLY_MOMENTUM_GAIN,
  IG_RALLY_PC_COST,
  IG_COMMITMENT_DEADLINE_ARCS,
  IG_COMMITMENT_HONOR_BONUS,
  IG_COMMITMENT_BREAK_PENALTY,
  MEDIA_STANCE_THRESHOLDS,
  MEDIA_BIAS_AXIS,
  MEDIA_ALIGNMENT_THRESHOLD,
  MEDIA_STORY_WEIGHTS,
  MEDIA_POP_SCALE,
  MEDIA_STANCE_TONE_MOD,
  MEDIA_PASSIVE_DECAY,
  MEDIA_PRESS_CONFERENCE_AP_COST,
  MEDIA_EXCLUSIVE_AP_COST,
  MEDIA_EXCLUSIVE_GAIN,
  MEDIA_PRESS_CONF_GAIN,
  MEDIA_CONTACT_COOLDOWN_ARCS,
  MEDIA_TOP_STORIES_PER_ARC,
  LEGACY_EVENT_SCORES,
  LEGACY_BENEFITS,
  LEGACY_LONGEVITY_RANKS,
  type LegacyDimension,
  type CoverageStance,
  type OutletBias,
  type EndorsementStatus,
  type CampaignStrategyType,
  type ScandalType,
  type ScandalPhase,
  type ScandalResolution,
} from '../constants/politics';
import { EngineCandidate, runElection } from './electionEngine';
import { fireGoverningEvent, fireConditionCrises } from './governingEvents';
import { NationalStats, readNationalStatsFromRow, calculateNationalEconomy, enactPolicy } from './nationalEconomy.service';
import { safeParseJSON } from '../../utils/json';

/**
 * Convert a world_clock row into a MONOTONIC absolute month ("arc").
 *
 * world_clock.current_month is the CALENDAR month (1-12) and resets every year,
 * so on its own it is NOT monotonic. Politics scheduling (cycle *_arc columns,
 * AP monthly refresh, staggered terms) needs a strictly increasing counter, so
 * we fold in current_year: arc = year*12 + (month-1). GDD $3.
 */
export function worldClockToArc(
  clock: { current_year?: number; current_month?: number } | null | undefined
): number {
  const year = clock?.current_year ?? 1;
  const month = clock?.current_month ?? 1;
  return year * 12 + (month - 1);
}

export async function getCurrentWorldArc(): Promise<number> {
  const clock = await db('world_clock').first();
  return worldClockToArc(clock);
}

// ── AP (Action Point) Helpers ─────────────────────────────────────────────

/** Pure function: maps popularity (0-100) to roster cap using tunable bands. */
export function getRosterCap(popularity: number): number {
  for (const band of ROSTER_CAP_BANDS) {
    if (popularity >= band.minPop) return band.cap;
  }
  return 2; // safety fallback
}

/**
 * Compute the AP cap for a character.
 *
 * GDD v0.5 $7 (refined): AP refreshes to a flat monthly grant and does not
 * accumulate, so the effective cap is simply AP_MONTHLY_GRANT. Offices now grant
 * Mandate actions (future work), not AP-cap bonuses. Signature kept stable for
 * existing callers.
 */
export async function computeApCap(_trx: any, _characterId: string): Promise<number> {
  return AP_MONTHLY_GRANT;
}

/** Fetch (or lazily create) the pol_character_ap row for a character. */
export async function getOrCreateCharacterAp(trx: any, characterId: string) {
  let row = await trx('pol_character_ap').where({ character_id: characterId }).first();
  if (!row) {
    const cap = await computeApCap(trx, characterId); // AP_MONTHLY_GRANT
    const currentArc = await getCurrentWorldArc();
    [row] = await trx('pol_character_ap').insert({
      character_id: characterId,
      // Start with a full monthly grant; AP refreshes to this each month (no accumulation).
      current_ap: AP_MONTHLY_GRANT,
      ap_cap: cap,
      last_regen_arc: currentArc,
    }).returning('*');
  }
  return row;
}

/**
 * Atomically spend `cost` AP. Throws AppError if insufficient.
 */
export async function spendAp(trx: any, characterId: string, cost: number): Promise<void> {
  if (cost <= 0) return; // free actions (e.g. vote)
  const row = await getOrCreateCharacterAp(trx, characterId);
  if (row.current_ap < cost) {
    throw new AppError(
      `Insufficient AP: need ${cost}, have ${row.current_ap}.`,
      400, 'INSUFFICIENT_AP'
    );
  }
  await trx('pol_character_ap')
    .where({ character_id: characterId })
    .decrement('current_ap', cost);
}

/**
 * Refresh monthly AP: RESET current_ap to AP_MONTHLY_GRANT each in-game month.
 * AP does NOT accumulate — leftover AP is discarded and replaced with a fresh
 * full grant (e.g. 6 left → 12 next month, not 18). Called once per month tick
 * inside processPoliticalArc; the last_regen_arc guard enforces one refresh/arc.
 */
export async function regenApForCharacter(trx: any, characterId: string, currentArc: number): Promise<void> {
  const row = await trx('pol_character_ap').where({ character_id: characterId }).first();
  if (!row) return; // not yet initialised — skip silently
  if (row.last_regen_arc >= currentArc) return; // already refreshed this arc

  await trx('pol_character_ap')
    .where({ character_id: characterId })
    .update({ current_ap: AP_MONTHLY_GRANT, last_regen_arc: currentArc }); // reset, do not add
}

/**
 * Recalculate and persist the AP cap for a character.
 * Call whenever the character's offices change.
 */
export async function refreshApCap(trx: any, characterId: string): Promise<void> {
  const cap = await computeApCap(trx, characterId); // AP_MONTHLY_GRANT
  const existing = await trx('pol_character_ap').where({ character_id: characterId }).first();
  if (!existing) return; // not yet initialised
  // Effective cap is the monthly grant; current_ap is managed by the monthly reset,
  // so we only persist the cap here.
  await trx('pol_character_ap')
    .where({ character_id: characterId })
    .update({ ap_cap: cap });
}

// ── Political Capital (PC) Helpers ───────────────────────────────────────────

/** Compute the PC cap for a character based on their current office(s). */
export async function computePcCap(trx: any, characterId: string): Promise<number> {
  // Premier gets a higher cap; Official Opposition leader gets a medium cap.
  const officeRow = await trx('pol_offices').where({ holder_character_id: characterId }).first();
  if (officeRow) return PC_CAP_PREMIER;
  // Check if character leads a party that is the largest non-government party
  const membership = await trx('pol_party_members')
    .where({ character_id: characterId, role: 'leader' }).first();
  if (membership) {
    // Simple proxy: if party has seats but is not in government, they are opposition
    const seat = await trx('pol_council_seats').where({ party_id: membership.party_id }).first();
    if (seat) return PC_CAP_OPPOSITION;
  }
  return PC_CAP_BASE;
}

/** Fetch (or lazily create) the PC row for a character. Creates it with 0 PC. */
export async function getOrCreateCharacterPc(trx: any, characterId: string) {
  let row = await trx('pol_character_ap').where({ character_id: characterId }).first();
  if (!row) {
    // Initialise the whole AP row (PC columns included) via existing function
    row = await getOrCreateCharacterAp(trx, characterId);
  }
  // If PC columns are missing (old row), patch them in
  if (row.current_pc === undefined || row.current_pc === null) {
    const cap = await computePcCap(trx, characterId);
    await trx('pol_character_ap')
      .where({ character_id: characterId })
      .update({ current_pc: 0, pc_cap: cap });
    row.current_pc = 0;
    row.pc_cap = cap;
  }
  return row;
}

/**
 * Atomically spend `cost` PC. Throws AppError if insufficient.
 */
export async function spendPc(trx: any, characterId: string, cost: number): Promise<void> {
  if (cost <= 0) return;
  const row = await getOrCreateCharacterPc(trx, characterId);
  if ((row.current_pc ?? 0) < cost) {
    throw new AppError(
      `Insufficient Political Capital: need ${cost}, have ${row.current_pc ?? 0}.`,
      400, 'INSUFFICIENT_PC'
    );
  }
  await trx('pol_character_ap')
    .where({ character_id: characterId })
    .decrement('current_pc', cost);
}

/**
 * Award PC to a character (capped at pc_cap). Used for landmark events.
 */
export async function earnPc(trx: any, characterId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const row = await getOrCreateCharacterPc(trx, characterId);
  const cap = row.pc_cap ?? PC_CAP_BASE;
  const current = row.current_pc ?? 0;
  const newVal = Math.min(current + amount, cap);
  await trx('pol_character_ap')
    .where({ character_id: characterId })
    .update({ current_pc: newVal });
}

/**
 * Passive PC regen: +PC_ARC_REGEN each arc (carries over, does not reset).
 * Called inside processPoliticalArc alongside AP regen.
 */
export async function regenPcForCharacter(
  trx: any, characterId: string, currentArc: number
): Promise<void> {
  const row = await trx('pol_character_ap').where({ character_id: characterId }).first();
  if (!row) return;
  if ((row.pc_regen_arc ?? 0) >= currentArc) return; // already done this arc
  await earnPc(trx, characterId, PC_ARC_REGEN);
  await trx('pol_character_ap')
    .where({ character_id: characterId })
    .update({ pc_regen_arc: currentArc });
}

// ── Faction Helpers ──────────────────────────────────────────────────────────

/**
 * Generate the 3 default factions for a newly-founded party.
 * Called inside the foundParty transaction, after the party row is created.
 */
export async function generateFactionsForParty(
  trx: any, partyId: string, doctrineId: string, currentArc: number
): Promise<void> {
  const templates = DOCTRINE_FACTIONS[doctrineId as DoctrineId];
  if (!templates) return; // unknown doctrine — skip silently

  const rows = templates.map(t => ({
    party_id: partyId,
    name: t.name,
    ideology_lean: JSON.stringify(t.ideology_lean),
    demand_type: t.demand_type,
    demand_payload: JSON.stringify(t.demand_payload),
    membership_share: t.membership_share,
    loyalty: 70,           // all factions start at 70% loyalty
    is_restless: false,
    created_arc: currentArc,
    updated_arc: currentArc,
  }));

  await trx('pol_party_factions').insert(rows);
}

/**
 * Fetch all factions for a party with computed cohesion score.
 */
export async function getPartyFactions(partyId: string) {
  const factions = await db('pol_party_factions').where({ party_id: partyId }).orderBy('membership_share', 'desc');
  const cohesion = computePartyCohesion(factions);
  return { factions, cohesion };
}

/**
 * Cohesion = weighted average of all faction loyalties.
 * Returns 0-100. A single-faction party returns that faction's loyalty.
 */
export function computePartyCohesion(factions: any[]): number {
  if (!factions.length) return 100;
  const total = factions.reduce((sum, f) => sum + Number(f.membership_share), 0);
  if (total <= 0) return 100;
  const weighted = factions.reduce(
    (sum, f) => sum + Number(f.loyalty) * Number(f.membership_share), 0
  );
  return Math.round(weighted / total);
}

/**
 * Per-arc faction loyalty drift:
 * - If party platform has drifted away from a faction's ideology_lean → loyalty drops
 * - If platform is aligned → loyalty recovers slightly
 * - Marks is_restless when loyalty < FACTION_LOYALTY_WARNING
 *
 * Called inside processPoliticalArc for each player party.
 */
export async function updateFactionLoyalties(
  trx: any, partyId: string, currentArc: number
): Promise<void> {
  const party = await trx('pol_parties').where({ id: partyId }).first();
  if (!party) return;

  const allFactions = await trx('pol_party_factions').where({ party_id: partyId });

  const platform = typeof party.platform === 'string' ? safeParseJSON(party.platform) : (party.platform ?? {});

  for (const faction of allFactions) {
    // Skip if already updated this arc
    if (faction.updated_arc >= currentArc) continue;

    const lean = typeof faction.ideology_lean === 'string' ? safeParseJSON(faction.ideology_lean) : (faction.ideology_lean ?? {});
    const axes = ['taxation', 'labour', 'investment', 'trade', 'stability'];

    // Compute average distance on all 5 axes (0-100 scale → 0-100 distance)
    const totalDist = axes.reduce((sum, ax) => {
      const diff = Math.abs((platform[ax] ?? 50) - (lean[ax] ?? 50));
      return sum + diff;
    }, 0);
    const avgDist = totalDist / axes.length; // 0-100

    // If avg distance > 30 → drift down, else → drift up (capped at 70 passive max)
    let loyaltyDelta = 0;
    if (avgDist > 30) {
      loyaltyDelta = -Math.min(FACTION_DRIFT_PER_ARC, Math.floor(avgDist / 15));
    } else {
      loyaltyDelta = Math.min(FACTION_DRIFT_PER_ARC, 1);
    }

    const newLoyalty = Math.max(0, Math.min(100, Number(faction.loyalty) + loyaltyDelta));
    const isRestless = newLoyalty < FACTION_LOYALTY_WARNING;

    await trx('pol_party_factions')
      .where({ id: faction.id })
      .update({ loyalty: newLoyalty, is_restless: isRestless, updated_arc: currentArc });
  }
}

/**
 * Recruit one NPC onto a party's roster.
 * - Deducts RECRUIT_COST_CASH from party treasury
 * - Generates a drifted platform (±RECRUIT_PLATFORM_DRIFT per axis)
 * - Inserts into pol_party_members with is_recruited_npc = true
 */
export async function recruitNpcToParty(
  trx: any,
  party: any,
  currentArc: number
): Promise<void> {
  const basePlatform: Platform = typeof party.platform === 'string' ? safeParseJSON(party.platform) : (party.platform ?? {});

  // Generate drifted platform
  const driftedPlatform: Record<string, number> = {};
  for (const axis of AXES) {
    const drift = (Math.random() * 2 - 1) * RECRUIT_PLATFORM_DRIFT;
    driftedPlatform[axis] = Math.max(0, Math.min(100, basePlatform[axis] + drift));
  }

  // Deduct treasury
  await trx('pol_parties')
    .where({ id: party.id })
    .decrement('treasury', RECRUIT_COST_CASH);

  // Create a placeholder system character (NPC)
  // We store NPCs with character_id = null to match existing NPC-candidate pattern
  await trx('pol_party_members').insert({
    party_id: party.id,
    character_id: null,
    role: 'member',
    joined_arc: currentArc,
    is_recruited_npc: true,
  });
}

async function applyFactorDelta(trx: any, characterId: string | null, factors: Record<string, number>) {
  if (!characterId) return;
  const char = await trx('characters').where({ id: characterId }).first();
  if (!char) return;

  const update: any = {};
  for (const [k, v] of Object.entries(factors)) {
    const current = Number(char[k]) || 0;
    update[k] = Math.max(0, Math.min(100, current + v));
  }
  
  if (Object.keys(update).length > 0) {
    await trx('characters').where({ id: characterId }).update(update);
  }
}

export function derivePhase(
  cycle: { polling_arc: number; formation_end_arc: number },
  currentMonth: number
): 'governing' | 'filing' | 'campaign' | 'polling' | 'formation' {
  const startCampaign = cycle.polling_arc - POL_CAMPAIGN_WINDOW_MONTHS;
  const startFiling = startCampaign - POL_FILING_WINDOW_MONTHS;

  if (currentMonth < startFiling) return 'governing';
  if (currentMonth >= startFiling && currentMonth < startCampaign) return 'filing';
  if (currentMonth >= startCampaign && currentMonth < cycle.polling_arc) return 'campaign';
  if (currentMonth === cycle.polling_arc) return 'polling';
  if (currentMonth > cycle.polling_arc && currentMonth <= cycle.formation_end_arc) return 'formation';
  
  return 'governing';
}

export async function getOrCreateCurrentCycle(stateId: string) {
  const currentMonth = await getCurrentWorldArc();
  let cycle = await db('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
  
  if (!cycle) {
    // Stagger each jurisdiction's first election by its offset so state elections
    // land ~every 6 months across the nation (GDD $3). Ironvale offset = 0.
    const stateRow = await db('pol_states').where({ id: stateId }).first();
    const pollingArc = currentMonth + POL_FIRST_CYCLE_MONTHS + getElectionOffsetMonths(stateRow?.code);
    const formationEndArc = pollingArc + POL_FORMATION_WINDOW_MONTHS;
    
    const phase = derivePhase({ polling_arc: pollingArc, formation_end_arc: formationEndArc }, currentMonth);

    const [inserted] = await db('pol_cycles').insert({
      state_id: stateId,
      cycle_number: 1,
      start_arc: currentMonth,
      polling_arc: pollingArc,
      formation_end_arc: formationEndArc,
      phase,
      status: 'open'
    }).returning('*');
    cycle = inserted;
  }

  // Always re-derive phase from the current arc so stale DB rows self-heal
  // without waiting for the next processPoliticalArc tick. This is safe because
  // derivePhase is pure and deterministic given the cycle's arc boundaries.
  const freshPhase = derivePhase(cycle, currentMonth);
  if (cycle.phase !== freshPhase) {
    await db('pol_cycles').where({ id: cycle.id }).update({ phase: freshPhase });
    cycle = { ...cycle, phase: freshPhase };
  }

  return cycle;
}

export async function ensureCandidates(trx: any, cycleId: string) {
  const cycle = await trx('pol_cycles').where({ id: cycleId }).first();
  if (!cycle) return;

  const parties = await trx('pol_parties').where({ state_id: cycle.state_id });
  const constituencies = await trx('pol_constituencies').where({ state_id: cycle.state_id });
  
  for (const party of parties) {
    for (const constituency of constituencies) {
      const existing = await trx('pol_candidates')
        .where({ cycle_id: cycleId, party_id: party.id, constituency_id: constituency.id })
        .first();
        
      if (!existing) {
        // Use ONLY the most-recent closed cycle for incumbency so that seats
        // from elections two cycles ago don't wrongly mark a candidate as incumbent.
        const prevCycleRow = await trx('pol_cycles')
          .where({ state_id: cycle.state_id, status: 'closed' })
          .orderBy('cycle_number', 'desc')
          .first();
        const seat = prevCycleRow
          ? await trx('pol_council_seats')
              .where({ cycle_id: prevCycleRow.id, party_id: party.id, constituency_id: constituency.id })
              .first()
          : null;

        // For player parties, we might want to attach a character from the roster.
        // But for simplicity in v0.1, we'll just create generic NPC candidates to fill out their slate.
        // Wait, if it's the player's party, we should use their roster members first!
        const members = await trx('pol_party_members')
          .where({ party_id: party.id })
          .select('character_id');
        
        // Find a member who isn't a candidate yet
        const currentCands = await trx('pol_candidates').where({ cycle_id: cycleId, party_id: party.id });
        const usedCharIds = new Set(currentCands.map((c: any) => c.character_id).filter(Boolean));
        const availableMember = members.find((m: any) => !usedCharIds.has(m.character_id));

        const charId = availableMember ? availableMember.character_id : null;
        const isNpcChar = party.is_npc || charId === null; // If we ran out of player-roster, fill with generic NPCs

        await trx('pol_candidates').insert({
          cycle_id: cycleId,
          party_id: party.id,
          constituency_id: constituency.id,
          character_id: charId,
          is_npc: isNpcChar,
          platform: party.platform,
          is_incumbent: !!seat
        });
      }
    }
  }
}

export async function buildEngineCandidates(trx: any, cycleId: string, maxArc?: number): Promise<EngineCandidate[]> {
  const cands = await trx('pol_candidates')
    .leftJoin('characters', 'pol_candidates.character_id', 'characters.id')
    .where({ 'pol_candidates.cycle_id': cycleId })
    .select(
      'pol_candidates.*',
      'characters.credibility as char_cred',
      'characters.charisma as char_charisma'
    );

  let actionsQuery = trx('pol_campaign_actions').where({ cycle_id: cycleId });
  if (maxArc !== undefined) {
    actionsQuery = actionsQuery.andWhere('resolved_arc', '<=', maxArc);
  }
  const actions = await actionsQuery;

  const engineCandidates: EngineCandidate[] = [];

  for (const c of cands) {
    const credibility = c.is_npc ? 50 : (c.char_cred || 0);
    const effortBySegment: Record<string, number> = {};
    
    for (const seg of SEGMENTS) {
      effortBySegment[seg.key] = 0;
    }

    const cActions = actions.filter((a: any) => a.candidate_id === c.id);
    for (const action of cActions) {
      if (action.effort <= 0) continue;
      
      const def = CAMPAIGN_ACTIONS.find(a => a.type === action.action_type);
      if (!def) continue;

      if (def.targeting === 'segment' && action.target_segment) {
        if (effortBySegment[action.target_segment] !== undefined) {
          effortBySegment[action.target_segment] += Number(action.effort);
        }
      } else if (def.targeting === 'all') {
        const amt = Number(action.effort) / SEGMENTS.length;
        for (const seg of SEGMENTS) {
          effortBySegment[seg.key] += amt;
        }
      }
    }

    engineCandidates.push({
      candidateId: c.id,
      partyId: c.party_id,
      platform: c.platform,
      credibility,
      isIncumbent: c.is_incumbent,
      effortBySegment,
      constituencyId: c.constituency_id
    });
  }

  return engineCandidates;
}

export async function getStateConditions(trx: any, stateId: string): Promise<NationalStats> {
  const state = await trx('pol_states').where({ id: stateId }).first();
  return readNationalStatsFromRow(state);
}

/**
 * Drift a state's Conditions toward the target implied by the governing party's
 * active policy. Now handled by the V1 Final Macro-Economy engine.
 */
export async function applyConditionDrift(trx: any, stateId: string, currentMonth: number) {
  const state = await trx('pol_states').where({ id: stateId }).first();
  if (!state) return;
  // We use currentMonth as the uniqueness check for idempotency on ticks if needed, but calculateNationalEconomy can be run idempotently since it just computes from enacted_month
  await calculateNationalEconomy(trx, stateId, currentMonth, true);
}

export async function processPoliticalArc(trx: any, stateId: string, currentMonth: number) {
  const cycle = await trx('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
  if (!cycle) return;

  const newPhase = derivePhase(cycle, currentMonth);
  
  if (cycle.phase !== newPhase) {
    await trx('pol_cycles').where({ id: cycle.id }).update({ phase: newPhase });
    cycle.phase = newPhase;
  }

  // Regen AP for all politicians who have an AP row (lazy-init happens on first action)
  const apRows = await trx('pol_character_ap').select('character_id');
  for (const row of apRows) {
    await regenApForCharacter(trx, row.character_id, currentMonth);
    // PC regenerates passively every arc (carries over, does not reset)
    await regenPcForCharacter(trx, row.character_id, currentMonth);
  }

  // Faction loyalty drift: run for every player-owned (non-NPC) party each arc
  const playerParties = await trx('pol_parties').where({ state_id: stateId, is_npc: false }).select('id');
  for (const p of playerParties) {
    await updateFactionLoyalties(trx, p.id, currentMonth);
  }

  // Coalition agreement health: degrades when member party factions are restless
  await updateCoalitionAgreementHealth(trx, stateId, currentMonth);

  // Scandal system: generate new scandals, escalate existing, apply popularity damage
  await processScandalsForState(trx, stateId, currentMonth);

  // Campaign progress: accumulate GGS, update momentum, fire campaign events
  await updateCampaignProgressForState(trx, stateId, currentMonth);

  // Interest groups: alignment drift, commitment checking, endorsement update
  await processInterestGroupsForState(trx, stateId, currentMonth);

  // Media: coverage processing — runs last so it can pick up all stories from this arc
  await processMediaCoverageForState(trx, stateId, currentMonth);

  // Legacy: longevity increments + economic drift (runs after all other processors)
  await processLegacyForState(trx, stateId, currentMonth);

  // National stats update via V1 Final Macro-Economy engine.
  await applyConditionDrift(trx, stateId, currentMonth);
  await fireConditionCrises(trx, stateId, currentMonth);


  if (newPhase === 'filing') {
    await ensureCandidates(trx, cycle.id);
  }

  if (newPhase === 'campaign') {
    const pendingActions = await trx('pol_campaign_actions')
      .join('pol_candidates', 'pol_campaign_actions.candidate_id', 'pol_candidates.id')
      .where('pol_campaign_actions.cycle_id', cycle.id)
      .andWhere('pol_campaign_actions.resolved_arc', '<=', currentMonth)
      .andWhere('pol_campaign_actions.effort', 0)
      .select('pol_campaign_actions.*', 'pol_candidates.party_id', 'pol_candidates.is_npc', 'pol_candidates.character_id');

    for (const act of pendingActions) {
      const def = CAMPAIGN_ACTIONS.find(a => a.type === act.action_type);
      if (!def) continue;

      const party = await trx('pol_parties').where({ id: act.party_id }).first();
      let hasFunds = true;
      let charismaMult = 1.0;
      
      if (!act.is_npc && act.character_id) {
        const char = await trx('characters').where({ id: act.character_id }).first();
        if (char) {
          charismaMult = 0.6 + 0.4 * ((char.charisma || 0) / 100);
        }
        
        if (def.gates?.uses_influence) {
          if ((char.influence || 0) < POL_ENDORSEMENT_INFLUENCE_COST) {
            hasFunds = false;
          } else {
            await trx('characters').where({ id: char.id }).decrement('influence', POL_ENDORSEMENT_INFLUENCE_COST);
          }
        } else if (def.cost_cash > 0) {
          if ((party?.treasury || 0) < def.cost_cash) {
            hasFunds = false;
          } else {
            await trx('pol_parties').where({ id: party.id }).decrement('treasury', def.cost_cash);
          }
        }
      } else if (act.is_npc) {
        if (def.cost_cash > 0) {
          if ((party?.treasury || 0) < def.cost_cash) {
            hasFunds = false;
          } else {
            await trx('pol_parties').where({ id: party.id }).decrement('treasury', def.cost_cash);
          }
        }
      }

      if (!hasFunds) {
        await trx('pol_campaign_actions').where({ id: act.id }).update({ effort: -1 }); // -1 days skipped
        continue;
      }

      let finalEffort = def.effort * charismaMult;
      let actualCashSpent = def.cost_cash;

      if (def.type === 'fundraiser' && party) {
        const char = !act.is_npc && act.character_id ? await trx('characters').where({ id: act.character_id }).first() : { charisma: 50 };
        const gain = POL_FUNDRAISER_BASE + (char.charisma || 0) * POL_FUNDRAISER_CHARISMA_MULT;
        await trx('pol_parties').where({ id: party.id }).increment('treasury', gain);
        finalEffort = 0.01;
      }

      await trx('pol_campaign_actions').where({ id: act.id }).update({
        effort: finalEffort,
        cash_spent: actualCashSpent
      });
    }

    await runNpcCampaignBrain(trx, stateId, cycle.id, currentMonth);
  }

  if (newPhase === 'polling' && currentMonth === cycle.polling_arc) {
    await resolveElection(trx, cycle.id);
  }

  if (newPhase === 'formation') {
    await processGovernmentFormation(trx, cycle, currentMonth);
  }

  if (newPhase === 'governing') {
    await resolveBills(trx, stateId, cycle.id, currentMonth);
    // Fire one deterministic world event per governing month
    await fireGoverningEvent(trx, stateId, currentMonth);
  }

  // Tenders operate on month boundaries regardless of phase once active
  await awardTenders(trx, stateId, currentMonth);
  await settleTenders(trx, stateId, currentMonth);
}

async function runNpcCampaignBrain(trx: any, stateId: string, cycleId: string, currentMonth: number) {
  // Read PREVIOUS month's effort to run a projection. Avoid state-bleed.
  const prevEngineCands = await buildEngineCandidates(trx, cycleId, currentMonth - 1);
  const state = await trx('pol_states').where({ id: stateId }).first();
  const constituenciesRows = await trx('pol_constituencies').where({ state_id: stateId });
  const engineConstituencies = constituenciesRows.map((r: any) => ({
    id: r.id,
    registeredVoters: r.registered_voters || 80000,
    conditions: readNationalStatsFromRow(state)
  }));
  
  const projection = runElection({
    candidates: prevEngineCands,
    constituencies: engineConstituencies
  });

  const npcCandidates = await trx('pol_candidates')
    .where({ cycle_id: cycleId, is_npc: true });

  for (const cand of npcCandidates) {
    const party = await trx('pol_parties').where({ id: cand.party_id }).first();
    if (!party) continue;

    const treasury = Number(party.treasury || 0);
    const maxSpend = Math.max(0, Math.floor(treasury * POL_NPC_MAX_SPEND_FRAC));
    let remainingSpend = maxSpend;

    if (remainingSpend <= 0) continue;

    // Find segments where the candidate is trailing in the projection.
    const trailingSegments = [];
    const constRes = projection.perConstituency.find(c => c.constituencyId === cand.constituency_id);
    for (const seg of SEGMENTS) {
      const shares = constRes?.segmentShares?.[seg.key] || {};
      const myShare = shares[cand.id] || 0;
      if (myShare < POL_NPC_TRAILING_SHARE) {
        trailingSegments.push({ segment: seg.key, share: myShare });
      }
    }
    trailingSegments.sort((a, b) => a.share - b.share);

    let actionQueued = false;

    for (const trail of trailingSegments) {
      const rallyDef = CAMPAIGN_ACTIONS.find(a => a.type === 'rally')!;
      if (remainingSpend >= rallyDef.cost_cash) {
        remainingSpend -= rallyDef.cost_cash;
        await trx('pol_campaign_actions').insert({
          cycle_id: cycleId,
          candidate_id: cand.id,
          action_type: 'rally',
          target_segment: trail.segment,
          cash_spent: rallyDef.cost_cash,
          effort: rallyDef.effort, // deterministic directly
          resolved_arc: currentMonth
        });
        await trx('pol_parties').where({ id: party.id }).decrement('treasury', rallyDef.cost_cash);
        actionQueued = true;
      } else {
        const canvassDef = CAMPAIGN_ACTIONS.find(a => a.type === 'canvass')!;
        if (remainingSpend >= canvassDef.cost_cash) {
          remainingSpend -= canvassDef.cost_cash;
          await trx('pol_campaign_actions').insert({
            cycle_id: cycleId,
            candidate_id: cand.id,
            action_type: 'canvass',
            target_segment: trail.segment,
            cash_spent: canvassDef.cost_cash,
            effort: canvassDef.effort,
            resolved_arc: currentMonth
          });
          await trx('pol_parties').where({ id: party.id }).decrement('treasury', canvassDef.cost_cash);
          actionQueued = true;
        }
      }
    }

    if (!actionQueued && maxSpend > 0) {
      const adDef = CAMPAIGN_ACTIONS.find(a => a.type === 'media_ad')!;
      if (remainingSpend >= adDef.cost_cash) {
        remainingSpend -= adDef.cost_cash;
        await trx('pol_campaign_actions').insert({
          cycle_id: cycleId,
          candidate_id: cand.id,
          action_type: 'media_ad',
          target_segment: null,
          cash_spent: adDef.cost_cash,
          effort: adDef.effort,
          resolved_arc: currentMonth
        });
        await trx('pol_parties').where({ id: party.id }).decrement('treasury', adDef.cost_cash);
      }
    }
  }
}

async function resolveElection(trx: any, cycleId: string) {
  const existingResult = await trx('pol_results').where({ cycle_id: cycleId }).first();
  if (existingResult) return; // Idempotent check

  const cycle = await trx('pol_cycles').where({ id: cycleId }).first();
  const engineCands = await buildEngineCandidates(trx, cycleId);
  const state = await trx('pol_states').where({ id: cycle.state_id }).first();
  const conditions = readNationalStatsFromRow(state);
  
  const constituenciesRows = await trx('pol_constituencies').where({ state_id: cycle.state_id });
  const engineConstituencies = constituenciesRows.map((r: any) => ({
    id: r.id,
    registeredVoters: r.registered_voters || 80000,
    conditions
  }));

  const result = runElection({ 
    candidates: engineCands, 
    constituencies: engineConstituencies 
  });

  // Determine previous cycle winners for seat loss calculation
  const prevCycle = await trx('pol_cycles')
    .where({ state_id: cycle.state_id, status: 'closed' })
    .orderBy('cycle_number', 'desc')
    .first();

  let prevWinners = new Set<string>();
  if (prevCycle) {
    const prevSeats = await trx('pol_council_seats')
      .where({ cycle_id: prevCycle.id, is_npc: false })
      .whereNotNull('character_id');
    prevSeats.forEach((s: any) => prevWinners.add(s.character_id));
  }

  const newWinners = new Set<string>();

  // Write pol_results
  for (const c of result.perCandidate) {
    await trx('pol_results').insert({
      cycle_id: cycleId,
      candidate_id: c.candidateId,
      votes: c.votes,
      seat_rank: c.seatRank,
      won_seat: c.wonSeat
    });
  }

  // Write pol_council_seats (exactly 61)
  for (const party of result.perParty) {
    const seatsToAllocate = party.seats;
    if (seatsToAllocate <= 0) continue;

    // Get the candidates that won seats
    const wonCands = result.perCandidate.filter(c => c.partyId === party.partyId && c.wonSeat);
    let seatsAllocated = 0;

    for (const c of wonCands) {
      const dbCand = await trx('pol_candidates').where({ id: c.candidateId }).first();
      await trx('pol_council_seats').insert({
        state_id: cycle.state_id,
        cycle_id: cycleId,
        party_id: party.partyId,
        constituency_id: c.constituencyId,
        character_id: dbCand?.character_id || null,
        is_npc: dbCand ? dbCand.is_npc : c.candidateId.startsWith('npc_')
      });
      seatsAllocated++;
      
      if (dbCand && !dbCand.is_npc && dbCand.character_id) {
        newWinners.add(dbCand.character_id);
        await applyFactorDelta(trx, dbCand.character_id, POL_FACTOR_DELTAS.WIN_SEAT);
      }
    }

    // Fill remaining seats with generic NPCs for that party
    while (seatsAllocated < seatsToAllocate) {
      // Find a constituency they won but don't have a candidate for (rare)
      // or just pick an empty constituency ID?
      // Since it's FPTP, they only get a seat if they actually won a constituency.
      // So this fallback loop should find the constituency they won.
      const wonConstId = result.perCandidate.find(c => c.partyId === party.partyId && c.wonSeat)?.constituencyId || null;
      await trx('pol_council_seats').insert({
        state_id: cycle.state_id,
        cycle_id: cycleId,
        party_id: party.partyId,
        constituency_id: wonConstId,
        character_id: null,
        is_npc: true
      });
      seatsAllocated++;
    }
  }

  // Apply loss penalties
  for (const oldCharId of prevWinners) {
    if (!newWinners.has(oldCharId)) {
      await applyFactorDelta(trx, oldCharId, POL_FACTOR_DELTAS.LOSE_SEAT);
    }
  }

  await trx('pol_cycles').where({ id: cycleId }).update({ phase: 'formation' });

  // Emit Ledger event for election results
  const topParty = [...result.perParty].sort((a, b) => b.seats - a.seats)[0];
  const topPartyDb = topParty ? await trx('pol_parties').where({ id: topParty.partyId }).first() : null;
  const topName = topPartyDb ? topPartyDb.name : 'Unknown';

  await trx('pol_ledger_events').insert({
    state_id: cycle.state_id,
    arc: cycle.polling_arc,
    kind: 'election_results',
    headline: `ELECTION RESULTS: ${topName} Secures Most Seats`,
    body: `The polling stations have closed. ${topName} leads with ${topParty?.seats} seats out of ${getSeatsForState(state?.code)}. The political landscape shifts as parties now scramble to form a viable government.`
  });

  // Legacy hooks
  if (topPartyDb?.leader_character_id) {
    await recordLegacyEvent(trx, topPartyDb.leader_character_id, cycle.state_id, cycle.polling_arc, 'election_won');
  }

  // Find previous seats per party to determine gains/losses
  const prevSeatCounts: Record<string, number> = {};
  if (prevCycle) {
    const prevSeatsAll = await trx('pol_council_seats').where({ cycle_id: prevCycle.id });
    for (const s of prevSeatsAll) {
      prevSeatCounts[s.party_id] = (prevSeatCounts[s.party_id] || 0) + 1;
    }
  }

  for (const p of result.perParty) {
    const partyRow = await trx('pol_parties').where({ id: p.partyId }).first();
    if (!partyRow?.leader_character_id) continue;

    if (p.partyId !== topParty?.partyId) {
      await recordLegacyEvent(trx, partyRow.leader_character_id, cycle.state_id, cycle.polling_arc, 'election_lost');
    }

    const oldSeats = prevSeatCounts[p.partyId] || 0;
    const diff = p.seats - oldSeats;
    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        await recordLegacyEvent(trx, partyRow.leader_character_id, cycle.state_id, cycle.polling_arc, 'seats_gained');
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        await recordLegacyEvent(trx, partyRow.leader_character_id, cycle.state_id, cycle.polling_arc, 'seats_lost');
      }
    }
  }
}

function getPlatformDistance(p1: Platform, p2: Platform): number {
  let distSq = 0;
  for (const axis of AXES) {
    distSq += Math.pow(((p1[axis] || 0) - (p2[axis] || 0)) / 100, 2);
  }
  return Math.sqrt(distSq);
}

export async function processGovernmentFormation(trx: any, cycle: any, currentMonth: number) {
  // Majority threshold for THIS jurisdiction (GDD $3 federal model).
  const stateRow = await trx('pol_states').where({ id: cycle.state_id }).first();
  const majoritySeats = getMajorityForState(stateRow?.code);

  // Check if government already formed or finalized as minority
  const existingCoalition = await trx('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
  if (existingCoalition) {
    if (currentMonth >= cycle.formation_end_arc) {
      // make sure cycle isn't already closed
      if (cycle.status === 'open') {
        await performCycleRollover(trx, cycle, currentMonth);
      }
    }
    return;
  }

  // Get seat counts
  const seats = await trx('pol_council_seats').where({ cycle_id: cycle.id }).select('party_id');
  const seatCounts: Record<string, number> = {};
  for (const s of seats) {
    seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
  }

  const parties = await trx('pol_parties').where({ state_id: cycle.state_id });
  const partyList = parties.map((p: any) => ({ ...p, seats: seatCounts[p.id] || 0 })).sort((a: any, b: any) => b.seats - a.seats);
  const largestParty = partyList[0];

  if (!largestParty) return;

  // Single party majority check
  if (largestParty.seats >= majoritySeats) {
    await trx('pol_coalitions').insert({
      cycle_id: cycle.id,
      lead_party_id: largestParty.id,
      member_party_ids: JSON.stringify({ accepted: [largestParty.id], invited: [] }),
      total_seats: largestParty.seats,
      status: 'formed'
    });
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'majority', largestParty.seats);
    if (currentMonth >= cycle.formation_end_arc) await performCycleRollover(trx, cycle, currentMonth);
    return;
  }

  // Check forming coalition
  let forming = await trx('pol_coalitions').where({ cycle_id: cycle.id, status: 'forming' }).first();
  if (!forming) {
    forming = await trx('pol_coalitions').insert({
      cycle_id: cycle.id,
      lead_party_id: largestParty.id,
      member_party_ids: JSON.stringify({ accepted: [largestParty.id], invited: [] }),
      total_seats: largestParty.seats,
      status: 'forming'
    }).returning('*').then((r: any) => r[0]);
  }

  const parsedMembers = typeof forming.member_party_ids === 'string' ? safeParseJSON(forming.member_party_ids) : (forming.member_party_ids ?? {});
  let accepted = new Set<string>(parsedMembers.accepted || (Array.isArray(parsedMembers) ? parsedMembers : []));
  let invited = new Set<string>(parsedMembers.invited || []);
  
  // If largest party is NPC, it auto-invites nearest parties
  if (largestParty.is_npc) {
    const others = partyList.filter((p: any) => p.id !== largestParty.id);
    others.sort((a: any, b: any) => getPlatformDistance(largestParty.platform, a.platform) - getPlatformDistance(largestParty.platform, b.platform));
    
    let currentSeats = 0;
    for (const aId of accepted) {
      currentSeats += (seatCounts[aId] || 0);
    }

    for (const other of others) {
      if (currentSeats >= majoritySeats) break;
      if (accepted.has(other.id)) continue;

      const dist = getPlatformDistance(largestParty.platform, other.platform);
      if (other.is_npc) {
        if (dist <= POL_COALITION_MAX_DISTANCE) {
          accepted.add(other.id);
          currentSeats += other.seats;
        }
      } else {
        // Invite player party if distance is reasonable
        if (dist <= POL_COALITION_MAX_DISTANCE) {
          invited.add(other.id);
        }
      }
    }
  } else {
    // If player formateur, check if any invited NPCs should auto-accept
    for (const invId of invited) {
      if (accepted.has(invId)) continue;
      const invParty = partyList.find((p: any) => p.id === invId);
      if (invParty && invParty.is_npc) {
        const dist = getPlatformDistance(largestParty.platform, invParty.platform);
        if (dist <= POL_COALITION_MAX_DISTANCE) {
          accepted.add(invId);
          invited.delete(invId);
        }
      }
    }
  }

  let totalAcceptedSeats = 0;
  for (const aId of accepted) {
    totalAcceptedSeats += (seatCounts[aId] || 0);
  }

  const membersToSave = {
    accepted: Array.from(accepted),
    invited: Array.from(invited)
  };

  let hasCoalitionArchitect = false;
  if (largestParty.leader_character_id) {
    const scores = await getOrCreateLegacyScores(trx, largestParty.leader_character_id);
    const benefits: string[] = typeof scores.unlocked_benefits === 'string'
      ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);
    if (benefits.includes('coalition_architect')) hasCoalitionArchitect = true;
  }
  
  // 3% of 61 seats is roughly 2 seats
  const effectiveMajorityNeeded = hasCoalitionArchitect ? Math.max(1, majoritySeats - 2) : majoritySeats;

  if (totalAcceptedSeats >= effectiveMajorityNeeded) {

    await trx('pol_coalitions').where({ id: forming.id }).update({
      member_party_ids: JSON.stringify(membersToSave),
      total_seats: totalAcceptedSeats,
      status: 'formed'
    });
    // Create the structured coalition agreement object
    await createCoalitionAgreement(trx, forming.id, largestParty.id, Array.from(accepted), currentMonth);
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'coalition', totalAcceptedSeats);
    if (currentMonth >= cycle.formation_end_arc) await performCycleRollover(trx, cycle, currentMonth);
    return;
  }

  await trx('pol_coalitions').where({ id: forming.id }).update({
    member_party_ids: JSON.stringify(membersToSave),
    total_seats: totalAcceptedSeats
  });

  // End of formation window - finalize as minority if not formed
  if (currentMonth >= cycle.formation_end_arc) {
    await trx('pol_coalitions').where({ id: forming.id }).update({
      status: 'minority'
    });
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'minority', totalAcceptedSeats);
    await performCycleRollover(trx, cycle, currentMonth);
  }
}

// ── Coalition Agreement Helpers ───────────────────────────────────────────────

/**
 * Create a structured coalition agreement record when a coalition is formed.
 * partner_terms captures which parties joined and how many seats they hold.
 * Health starts at 100 and degrades each arc based on faction loyalty and
 * whether mandatory legislation is being passed.
 */
export async function createCoalitionAgreement(
  trx: any,
  coalitionId: string,
  leadPartyId: string,
  partnerPartyIds: string[],
  currentArc: number
): Promise<void> {
  // Don't duplicate if agreement already exists for this coalition
  const existing = await trx('pol_coalition_agreements').where({ coalition_id: coalitionId }).first();
  if (existing) return;

  // Build partner terms: each partner gets seats + their party name.
  // Must filter by cycle_id — otherwise we'd sum seats across ALL past elections.
  const coalitionRow = await trx('pol_coalitions').where({ id: coalitionId }).first();
  const cycleIdForSeats = coalitionRow?.cycle_id || null;

  const partnerTerms = await Promise.all(
    partnerPartyIds.filter(id => id !== leadPartyId).map(async (partyId: string) => {
      const party = await trx('pol_parties').where({ id: partyId }).first();
      const seatsQuery = trx('pol_council_seats').where({ party_id: partyId });
      if (cycleIdForSeats) seatsQuery.andWhere({ cycle_id: cycleIdForSeats });
      const seats = await seatsQuery.count('* as c').first();
      return {
        party_id: partyId,
        name: party?.name ?? 'Unknown',
        seats: Number(seats?.c ?? 0),
        agreed_axes: [],
      };
    })
  );

  await trx('pol_coalition_agreements').insert({
    coalition_id: coalitionId,
    lead_party_id: leadPartyId,
    partner_terms: JSON.stringify(partnerTerms),
    mandatory_legislation: JSON.stringify([]),
    portfolio_allocation: JSON.stringify([]),
    review_interval_arcs: 12,
    next_review_arc: currentArc + 12,
    status: 'active',
    health: 100,
    formed_arc: currentArc,
  });

  // Legacy hooks: record 'coalition_formed' for lead and partner party leaders
  const coalition = await trx('pol_coalitions').where({ id: coalitionId }).first();
  if (coalition) {
    const cycle = await trx('pol_cycles').where({ id: coalition.cycle_id }).first();
    if (cycle) {
      for (const pId of [leadPartyId, ...partnerPartyIds]) {
        const party = await trx('pol_parties').where({ id: pId }).first();
        if (party?.leader_character_id) {
          await recordLegacyEvent(trx, party.leader_character_id, cycle.state_id, currentArc, 'coalition_formed');
        }
      }
    }
  }
}

/**
 * Per-arc coalition health update:
 * - Low cohesion across member parties → health drops
 * - Healthy member parties → health recovers slightly
 * - Below 30 health → agreement enters 'under_review'
 * - Below 10 health → agreement 'broken'
 * Called in processPoliticalArc.
 */
export async function updateCoalitionAgreementHealth(
  trx: any, stateId: string, currentArc: number
): Promise<void> {
  // Find active agreements for this state's coalition
  const agreements = await trx('pol_coalition_agreements')
    .join('pol_coalitions', 'pol_coalition_agreements.coalition_id', 'pol_coalitions.id')
    .join('pol_cycles', 'pol_coalitions.cycle_id', 'pol_cycles.id')
    .where('pol_cycles.state_id', stateId)
    .whereIn('pol_coalition_agreements.status', ['active', 'under_review'])
    .select('pol_coalition_agreements.*');

  for (const agreement of agreements) {
    const parsedTerms = typeof agreement.partner_terms === 'string'
      ? safeParseJSON(agreement.partner_terms) : agreement.partner_terms;
    const partnerTerms = Array.isArray(parsedTerms) ? parsedTerms : [];
    const allPartyIds = [agreement.lead_party_id, ...partnerTerms.map((t: any) => t.party_id)];

    // Average cohesion across all coalition member parties
    let totalCohesion = 0;
    let count = 0;
    for (const partyId of allPartyIds) {
      const factions = await trx('pol_party_factions').where({ party_id: partyId });
      if (factions.length > 0) {
        // Inline cohesion calculation (avoids circular import)
        const total = factions.reduce((s: number, f: any) => s + Number(f.membership_share), 0);
        const weighted = factions.reduce((s: number, f: any) => s + Number(f.loyalty) * Number(f.membership_share), 0);
        totalCohesion += total > 0 ? weighted / total : 100;
        count++;
      }
    }
    const avgCohesion = count > 0 ? totalCohesion / count : 100;

    // Health delta based on avg cohesion
    let healthDelta = 0;
    if (avgCohesion < 35) healthDelta = -3;
    else if (avgCohesion < 55) healthDelta = -1;
    else healthDelta = 1;

    const newHealth = Math.max(0, Math.min(100, Number(agreement.health) + healthDelta));
    const newStatus = newHealth <= 10 ? 'broken'
      : newHealth <= 30 ? 'under_review'
      : 'active';

    await trx('pol_coalition_agreements').where({ id: agreement.id }).update({
      health: newHealth,
      status: newStatus,
      dissolved_arc: newStatus === 'broken' ? currentArc : null,
    });

    // Legacy: coalition collapsed
    if (newStatus === 'broken' && agreement.status !== 'broken') {
      for (const pId of allPartyIds) {
        const party = await trx('pol_parties').where({ id: pId }).first();
        if (party?.leader_character_id) {
          await recordLegacyEvent(trx, party.leader_character_id, stateId, currentArc, 'coalition_collapsed');
        }
      }
    }
  }
}

async function namePremierAndEmitLedger(trx: any, cycle: any, largestParty: any, type: string, seats: number) {
  const holderCharId = largestParty.leader_character_id || null;

  await trx('pol_offices').insert({
    state_id: cycle.state_id,
    office: 'premier',
    holder_character_id: holderCharId,
    party_id: largestParty.id,
    since_arc: cycle.formation_end_arc
  });

  if (holderCharId && !largestParty.is_npc) {
    const pastTerms = await trx('pol_offices')
      .where({ holder_character_id: holderCharId, office: 'premier' })
      .count('* as c')
      .first();
    const count = pastTerms ? Number(pastTerms.c) : 0;
    if (count === 1) { // 1 means they just got this first one
      await applyFactorDelta(trx, holderCharId, POL_FACTOR_DELTAS.BECOME_PREMIER);
    }
    
    // Legacy hook: Government Formed (only for the premier / lead party)
    await recordLegacyEvent(trx, holderCharId, cycle.state_id, cycle.formation_end_arc, 'government_formed');
  }

  let headline = '';
  let body = '';
  if (type === 'majority') {
    headline = `GOVERNMENT FORMED: ${largestParty.name} Secures Majority`;
    body = `With ${seats} seats, ${largestParty.name} governs without opposition support. A strong mandate has been established.`;
  } else if (type === 'coalition') {
    headline = `COALITION FORMED: ${largestParty.name} Leads New Bloc`;
    body = `Reaching the critical 31 seats, a coalition led by ${largestParty.name} has officially taken power.`;
  } else {
    headline = `MINORITY GOVERNMENT: ${largestParty.name} Clings to Power`;
    body = `Unable to secure a majority bloc, ${largestParty.name} forms a fragile minority government with only ${seats} seats.`;
  }

  await trx('pol_ledger_events').insert({
    state_id: cycle.state_id,
    arc: cycle.formation_end_arc,
    kind: 'government_formed',
    headline,
    body
  });
}

async function performCycleRollover(trx: any, oldCycle: any, currentMonth: number) {
  if (oldCycle.status === 'closed') return;
  
  // Award active campaign bonus
  const campaigns = await trx('pol_campaign_actions')
    .where({ cycle_id: oldCycle.id })
    .select('candidate_id')
    .count('* as count')
    .groupBy('candidate_id');

  for (const c of campaigns) {
    if (Number(c.count) >= 3) {
      const cand = await trx('pol_candidates').where({ id: c.candidate_id }).first();
      if (cand && !cand.is_npc && cand.character_id) {
        await applyFactorDelta(trx, cand.character_id, POL_FACTOR_DELTAS.ACTIVE_CAMPAIGN);
      }
    }
  }

  // Day old cycle closed
  await trx('pol_cycles').where({ id: oldCycle.id }).update({ status: 'closed' });

  const startMonth = currentMonth;
  // Term length is per-jurisdiction (24mo state, 48mo national — GDD $3).
  const oldStateRow = await trx('pol_states').where({ id: oldCycle.state_id }).first();
  const pollingArc = startMonth + getTermMonthsForState(oldStateRow?.code);
  const formationEndArc = pollingArc + POL_FORMATION_WINDOW_MONTHS;

  // A new cycle always begins in the governing phase: the election just concluded
  // and the government is being (or has been) formed. The phase will stay
  // 'governing' until startFiling approaches, at which point processPoliticalArc
  // and getOrCreateCurrentCycle both re-derive it automatically.
  await trx('pol_cycles').insert({
    state_id: oldCycle.state_id,
    cycle_number: oldCycle.cycle_number + 1,
    phase: 'governing',
    start_arc: startMonth,
    polling_arc: pollingArc,
    formation_end_arc: formationEndArc,
    status: 'open'
  });
}

export async function resolveBills(trx: any, stateId: string, cycleId: string, currentMonth: number) {
  const proposedBills = await trx('pol_bills')
    .where({ state_id: stateId, status: 'proposed' })
    .andWhere('proposed_arc', '<', currentMonth);

  if (proposedBills.length === 0) return;

  const currentCycle = await trx('pol_cycles').where({ id: cycleId }).first();
  let targetCycleId = cycleId;
  if (currentCycle && currentCycle.cycle_number > 1) {
    const prevCycle = await trx('pol_cycles').where({ state_id: stateId, cycle_number: currentCycle.cycle_number - 1 }).first();
    if (prevCycle) targetCycleId = prevCycle.id;
  }

  const seats = await trx('pol_council_seats').where({ cycle_id: targetCycleId });
  const seatCounts: Record<string, number> = {};
  for (const s of seats) {
    seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
  }

  for (const bill of proposedBills) {
    const votes = await trx('pol_bill_votes').where({ bill_id: bill.id });
    
    // Auto-vote for NPCs if they haven't voted
    const votedParties = new Set<string>();
    for (const v of votes) {
      const pm = await trx('pol_party_members').where({ character_id: v.character_id, role: 'leader' }).first();
      if (pm) votedParties.add(pm.party_id);
    }

    const npcParties = await trx('pol_parties').where({ state_id: stateId, is_npc: true });
    
    // Coalition lookup must use the same targetCycleId as the seat counts so that
    // NPC auto-votes reflect the correct governing bloc. Fall back to the previous
    // cycle when the fresh cycle has no coalition yet (post-rollover window).
    let coalition = await trx('pol_coalitions').where({ cycle_id: targetCycleId }).whereIn('status', ['formed', 'minority']).first();
    if (!coalition && currentCycle && currentCycle.cycle_number > 1 && targetCycleId === cycleId) {
      const prevForCoalition = await trx('pol_cycles').where({ state_id: stateId, cycle_number: currentCycle.cycle_number - 1 }).first();
      if (prevForCoalition) {
        coalition = await trx('pol_coalitions').where({ cycle_id: prevForCoalition.id }).whereIn('status', ['formed', 'minority']).first();
      }
    }
    const parsedGovMembers = coalition ? (typeof coalition.member_party_ids === 'string' ? safeParseJSON(coalition.member_party_ids) : (coalition.member_party_ids ?? {})) : {};
    const govMembers = parsedGovMembers.accepted || (Array.isArray(parsedGovMembers) ? parsedGovMembers : []);

    for (const npc of npcParties) {
      if (!votedParties.has(npc.id)) {
        const isGov = govMembers.includes(npc.id) || coalition?.lead_party_id === npc.id;
        votes.push({
          bill_id: bill.id,
          character_id: 'system',
          vote: isGov ? 'yea' : 'nay',
          _npc_party_id: npc.id
        });
      }
    }

    let yeas = 0;
    let nays = 0;

    for (const v of votes) {
      let pId = (v as any)._npc_party_id;
      if (!pId && v.character_id !== 'system') {
        const pm = await trx('pol_party_members').where({ character_id: v.character_id, role: 'leader' }).first();
        if (pm) pId = pm.party_id;
      }
      if (pId) {
        const pSeats = seatCounts[pId] || 0;
        if (v.vote === 'yea') yeas += pSeats;
        if (v.vote === 'nay') nays += pSeats;
      }
    }

    const proposerParty = await trx('pol_parties').where({ id: bill.proposed_by_party_id }).first();
    const leaderId = proposerParty?.leader_character_id || null;

    if (yeas > nays) {
      if (leaderId && !proposerParty.is_npc) {
        await applyFactorDelta(trx, leaderId, POL_FACTOR_DELTAS.BILL_PASSES);
      }
      await trx('pol_bills').where({ id: bill.id }).update({ status: 'passed' });
      
      if (bill.type === 'policy_change') {
        const { category, option } = bill.params;
        if (category && option) {
          const existing = await trx('pol_state_policy').where({ state_id: stateId }).first();
          const activePolicies = existing?.active_policies 
            ? (typeof existing.active_policies === 'string' ? safeParseJSON(existing.active_policies) : existing.active_policies) 
            : {};
          
          activePolicies[category] = option;
          
          if (existing) {
            await trx('pol_state_policy').where({ state_id: stateId }).update({ active_policies: activePolicies, updated_arc: currentMonth });
          } else {
            await trx('pol_state_policy').insert({ state_id: stateId, active_policies: activePolicies, updated_arc: currentMonth });
          }

          await trx('pol_ledger_events').insert({
            state_id: stateId, arc: currentMonth, kind: 'bill_passed',
            headline: `POLICY REVISED: ${category.toUpperCase()}`,
            body: `Council passes new ${category} policy: ${option.replace(/_/g, ' ').toUpperCase()}. Stats will adjust over the coming month.`
          });
        }
      }
    } else {
      if (leaderId && !proposerParty.is_npc) {
        await applyFactorDelta(trx, leaderId, POL_FACTOR_DELTAS.BILL_FAILS);
      }
      await trx('pol_bills').where({ id: bill.id }).update({ status: 'failed' });
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc: currentMonth, kind: 'bill_failed',
        headline: `BILL FAILED: ${bill.type.replace('_', ' ').toUpperCase()}`,
        body: `Council rejected the proposed ${bill.type.replace('_', ' ')}.`
      });
    }
  }
}

async function awardTenders(trx: any, stateId: string, currentMonth: number) {
  // Find all open tenders whose bid window has closed (posted_arc < currentMonth)
  const openTenders = await trx('pol_tenders')
    .where({ state_id: stateId, status: 'open' })
    .andWhere('posted_arc', '<', currentMonth);

  for (const tender of openTenders) {
    const bids = await trx('pol_tender_bids')
      .join('companies', 'pol_tender_bids.company_id', 'companies.id')
      .leftJoin('characters', 'companies.owner_character_id', 'characters.id')
      .where('pol_tender_bids.tender_id', tender.id)
      .select('pol_tender_bids.*', 'companies.name as company_name', 'characters.influence', 'companies.owner_character_id');

    if (bids.length === 0) {
      await trx('pol_tenders').where({ id: tender.id }).update({ status: 'closed' });
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc: currentMonth, kind: 'tender_awarded',
        headline: `Tender Failed: ${tender.vehicle_class}`,
        body: `No qualifying bids were received for the ${tender.vehicle_class} tender. It has been closed.`
      });
      continue;
    }

    // Sort by price ascending. If tie, optionally use influence
    bids.sort((a: any, b: any) => {
      const priceDiff = Number(a.bid_price) - Number(b.bid_price);
      if (priceDiff === 0 && POL_TENDER_INFLUENCE_TIEBREAK) {
        return (Number(b.influence) || 0) - (Number(a.influence) || 0); // higher influence wins tie
      }
      return priceDiff;
    });

    const winningBid = bids[0];

    if (winningBid.owner_character_id) {
      await applyFactorDelta(trx, winningBid.owner_character_id, POL_FACTOR_DELTAS.TENDER_WINS);
    }

    await trx('pol_tenders').where({ id: tender.id }).update({
      status: 'active',
      awarded_company_id: winningBid.company_id,
      awarded_price: winningBid.bid_price
    });

    await trx('pol_ledger_events').insert({
      state_id: stateId, arc: currentMonth, kind: 'tender_awarded',
      headline: `Tender Awarded: ${tender.vehicle_class}`,
      body: `The ${tender.vehicle_class} procurement contract was awarded to ${winningBid.company_name} at ${winningBid.bid_price} $ per unit.`
    });
  }
}

async function settleTenders(trx: any, stateId: string, currentMonth: number) {
  const activeTenders = await trx('pol_tenders')
    .where({ state_id: stateId, status: 'active' });

  for (const tender of activeTenders) {
    if (currentMonth > tender.posted_arc + tender.duration_arcs) {
      await trx('pol_tenders').where({ id: tender.id }).update({ status: 'closed' });
      continue;
    }

    const company = await trx('companies').where({ id: tender.awarded_company_id }).first();
    if (!company) continue;

    // Ghost-Car clamp: check inventory
    // We need the model from the winning bid to deduct inventory
    const winningBid = await trx('pol_tender_bids')
      .where({ tender_id: tender.id, company_id: company.id })
      .first();
      
    if (!winningBid) continue;

    const invRecord = await trx('manufacturing_inventory')
      .where({ company_id: company.id, vehicle_model_id: winningBid.model_id })
      .first();

    const unitsInStock = invRecord ? Number(invRecord.units_in_stock) : 0;
    const unitsBought = Math.min(Number(tender.units_per_month), unitsInStock);

    if (unitsBought > 0) {
      const revenue = unitsBought * Number(tender.awarded_price);

      // Deduct inventory
      await trx('manufacturing_inventory')
        .where({ id: invRecord.id })
        .decrement('units_in_stock', unitsBought);

      // Add cash
      await trx('company_finances')
        .where({ company_id: company.id })
        .increment('available_cash', revenue);

      // Emit ledger
      await trx('company_ledger').insert({
        company_id: company.id,
        game_year: 1, // approximate, or pull from clock if needed
        game_month: currentMonth,
        game_day: 1,
        entry_type: 'sales',
        amount: revenue,
        balance_after: trx.raw(`(SELECT available_cash FROM company_finances WHERE company_id = ?)`, [company.id]),
        description: `Government Tender: Sold ${unitsBought} units of ${tender.vehicle_class} at ${tender.awarded_price} $`
      });
    }

    // Close tender if this was the final month
    if (currentMonth === tender.posted_arc + tender.duration_arcs) {
      await trx('pol_tenders').where({ id: tender.id }).update({ status: 'closed' });
    }
  }
}

// ── Scandal System ────────────────────────────────────────────────────────────

/** Roll a severity (1-5) using configured probability weights. */
function rollScandalSeverity(): number {
  const r = Math.random();
  let cumul = 0;
  for (let i = 0; i < SCANDAL_SEVERITY_WEIGHTS.length; i++) {
    cumul += SCANDAL_SEVERITY_WEIGHTS[i];
    if (r < cumul) return i + 1;
  }
  return 1;
}

const SCANDAL_TYPES: ScandalType[] = ['financial', 'personal', 'governmental', 'electoral'];
const PHASE_ORDER: ScandalPhase[] = ['rumour', 'investigation', 'allegation', 'explosion', 'inquiry', 'resolved'];

function nextPhase(current: ScandalPhase): ScandalPhase {
  const idx = PHASE_ORDER.indexOf(current);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] : 'resolved';
}

/**
 * Per-arc scandal processor:
 * 1. Probabilistically generate new scandals for active parties.
 * 2. Escalate existing active scandals that have passed their phase duration.
 * 3. Apply popularity damage based on current phase × severity.
 * 4. Attempt natural resolution.
 */
export async function processScandalsForState(
  trx: any, stateId: string, currentArc: number
): Promise<void> {
  const parties = await trx('pol_parties').where({ state_id: stateId });

  for (const party of parties) {
    const probMult = party.is_npc ? SCANDAL_NPC_PROB_MULT : 1.0;
    const roll = Math.random();

    let hasUntouchable = false;
    if (party.leader_character_id) {
      const scores = await getOrCreateLegacyScores(trx, party.leader_character_id);
      const benefits: string[] = typeof scores.unlocked_benefits === 'string'
        ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);
      if (benefits.includes('untouchable')) hasUntouchable = true;
    }
    const finalProb = SCANDAL_BASE_PROB * probMult * (hasUntouchable ? 0.75 : 1.0);

    // Chance to generate a new scandal (only if party has no rumour-phase scandal already)
    const hasActiveRumour = await trx('pol_scandals')
      .where({ party_id: party.id, phase: 'rumour' })
      .whereNull('resolved_arc').first();

    if (!hasActiveRumour && roll < finalProb) {
      const severity = rollScandalSeverity();
      const scandalType = SCANDAL_TYPES[Math.floor(Math.random() * SCANDAL_TYPES.length)];
      await trx('pol_scandals').insert({
        state_id: stateId,
        party_id: party.id,
        character_id: party.leader_character_id ?? null,
        scandal_type: scandalType,
        severity,
        phase: 'rumour',
        popularity_damage: 0,
        discovery_arc: currentArc,
        phase_entered_arc: currentArc,
      });
    }

    // Process existing active scandals for this party
    const activeScandals = await trx('pol_scandals')
      .where({ party_id: party.id })
      .whereNot({ phase: 'resolved' });

    for (const scandal of activeScandals) {
      const phase = scandal.phase as ScandalPhase;
      const phaseDuration = SCANDAL_PHASE_DURATION[phase];
      const arcsInPhase = currentArc - scandal.phase_entered_arc;

      // Apply popularity damage this arc
      const dmg = SCANDAL_PHASE_DAMAGE[phase] * scandal.severity;
      if (dmg > 0) {
        await trx('pol_parties')
          .where({ id: party.id })
          .update({ popularity: trx.raw(`GREATEST(0, popularity - ?)`, [dmg]) });
      }

      // Natural clear check
      const clearProb = SCANDAL_NATURAL_CLEAR_PROB[phase] / scandal.severity;
      if (Math.random() < clearProb) {
        const resolution: ScandalResolution = phase === 'rumour' ? 'suppressed' : 'cleared';
        await trx('pol_scandals').where({ id: scandal.id }).update({
          phase: 'resolved',
          resolution_type: resolution,
          resolved_arc: currentArc,
        });
        // Surviving a scandal awards PC to the party leader
        if (!party.is_npc && party.leader_character_id) {
          await earnPc(trx, party.leader_character_id, 2);
          await recordLegacyEvent(trx, party.leader_character_id, stateId, currentArc, resolution === 'suppressed' ? 'scandal_survived' : 'scandal_resolved');
        }
        continue;
      }

      // Auto-escalate if phase duration exceeded
      if (phaseDuration > 0 && arcsInPhase >= phaseDuration) {
        const escalatedPhase = nextPhase(phase);
        await trx('pol_scandals').where({ id: scandal.id }).update({
          phase: escalatedPhase,
          phase_entered_arc: currentArc,
          resolution_type: escalatedPhase === 'resolved' ? 'weathered' : null,
          resolved_arc: escalatedPhase === 'resolved' ? currentArc : null,
        });
        
        if (escalatedPhase === 'resolved' && party.leader_character_id) {
          await recordLegacyEvent(trx, party.leader_character_id, stateId, currentArc, 'scandal_damage');
        }
      }
    }
  }
}

/**
 * Player-initiated scandal intervention.
 * Deducts AP (or PC for suppress), attempts intervention at configured probability.
 * Returns { success, outcome_message }.
 */
export async function interveneOnScandal(
  trx: any,
  scandalId: string,
  characterId: string,
  partyId: string,
  intervention: string,
  currentArc: number
): Promise<{ success: boolean; message: string }> {
  const scandal = await trx('pol_scandals').where({ id: scandalId, party_id: partyId }).first();
  if (!scandal) throw new AppError('Scandal not found', 404, 'NOT_FOUND');
  if (scandal.phase === 'resolved') throw new AppError('Scandal already resolved', 409, 'CONFLICT');

  const INTERVENTION_MAP: Record<string, { successProb: number; resolution?: ScandalResolution; flag: string; validPhase: ScandalPhase }> = {
    suppress:             { successProb: 0.80, resolution: 'suppressed',  flag: 'was_suppressed',   validPhase: 'rumour' },
    spin:                 { successProb: 0.50, resolution: undefined,     flag: 'was_spun',          validPhase: 'investigation' },
    investigate_internal: { successProb: 0.40, resolution: 'cleared',     flag: 'was_suppressed',   validPhase: 'allegation' },
    stonewall:            { successProb: 0.30, resolution: undefined,     flag: 'was_stonewalled',   validPhase: 'explosion' },
    full_disclosure:      { successProb: 1.00, resolution: 'weathered',   flag: 'was_disclosed',     validPhase: 'explosion' },
  };

  const def = INTERVENTION_MAP[intervention];
  if (!def) throw new AppError('Unknown scandal intervention', 400, 'BAD_REQUEST');

  const success = Math.random() < def.successProb;

  const updates: Record<string, any> = { [def.flag]: true };

  if (success && def.resolution) {
    updates.phase = 'resolved';
    updates.resolution_type = def.resolution;
    updates.resolved_arc = currentArc;
    // Surviving awards PC
    if (characterId) {
      await earnPc(trx, characterId, 2);
      const legacyEventType = def.resolution === 'suppressed' ? 'scandal_survived'
                            : def.resolution === 'cleared' ? 'scandal_resolved'
                            : 'scandal_damage';
      await recordLegacyEvent(trx, characterId, scandal.state_id, currentArc, legacyEventType);
    }
  } else if (success && intervention === 'spin') {
    // Spin: pause escalation for one more phase duration (reset entered arc)
    updates.phase_entered_arc = currentArc;
  } else if (success && intervention === 'stonewall') {
    // Stonewall: costs popularity but resets escalation timer
    updates.phase_entered_arc = currentArc;
    await trx('pol_parties')
      .where({ id: partyId })
      .update({ popularity: trx.raw(`GREATEST(0, popularity - 2)`) });
  }

  await trx('pol_scandals').where({ id: scandalId }).update(updates);

  const labels: Record<string, [string, string]> = {
    suppress:             ['Scandal buried. The rumour never left the room.', 'Suppression failed. An investigative journalist has picked it up.'],
    spin:                 ['Your narrative team has redirected the story. Escalation delayed.', 'The spin failed. The press is unconvinced.'],
    investigate_internal: ['Internal investigation complete. You have been cleared.', 'Internal investigation inconclusive. Allegations remain.'],
    stonewall:            ['Stonewalling successful. Escalation paused — at a popularity cost.', 'Stonewalling backfired. The press doubled down.'],
    full_disclosure:      ['Full disclosure made. The scandal is resolved — you weathered the storm.', ''],
  };

  const [winMsg, failMsg] = labels[intervention] ?? ['Intervention applied.', 'Intervention failed.'];
  return { success, message: success ? winMsg : failMsg };
}

/**
 * Fetch all active (non-resolved) scandals for a party with enriched fields.
 */
export async function getPartyScandalSummary(partyId: string) {
  const scandals = await db('pol_scandals')
    .where({ party_id: partyId })
    .whereNot({ phase: 'resolved' })
    .orderBy('discovery_arc', 'desc');
  return scandals;
}

// ── Campaign System (Phase 5) ─────────────────────────────────────────────────

/**
 * Get or create the persistent campaign record for a party in the current cycle.
 * Called when a candidate is declared or when the party first takes a campaign action.
 */
export async function getOrCreateCampaign(
  trx: any,
  cycleId: string,
  partyId: string,
  currentArc: number,
  strategy: CampaignStrategyType = 'balanced'
): Promise<any> {
  const existing = await trx('pol_campaigns').where({ cycle_id: cycleId, party_id: partyId }).first();
  if (existing) return existing;

  const [created] = await trx('pol_campaigns').insert({
    cycle_id: cycleId,
    party_id: partyId,
    strategy_type: strategy,
    budget_allocated: 0,
    budget_spent: 0,
    ground_game_score: 0,
    arc_actions: JSON.stringify([]),
    fired_events: JSON.stringify([]),
    status: 'active',
    momentum: 0,
    started_arc: currentArc,
  }).returning('*');
  return created;
}

/**
 * Per-arc campaign update — runs inside processPoliticalArc.
 * For each active party campaign:
 *  1. Collect all resolved pol_campaign_actions since last arc.
 *  2. Compute GGS gain = sum(effort) * GGS_PER_EFFORT * strategy.effort_mult + strategy.reach_bonus.
 *  3. Apply momentum: +MOMENTUM_GAIN_ACTION per action taken, then decay toward 0.
 *  4. Fire random campaign events (respecting fired_events dedup).
 *  5. Update campaign record.
 */
export async function updateCampaignProgressForState(
  trx: any, stateId: string, currentArc: number
): Promise<void> {
  // Only process during campaign/filing phases
  const cycle = await trx('pol_cycles')
    .where({ state_id: stateId })
    .whereIn('phase', ['campaign', 'filing', 'governing'])
    .orderBy('cycle_number', 'desc').first();
  if (!cycle) return;

  const campaigns = await trx('pol_campaigns')
    .where({ cycle_id: cycle.id, status: 'active' });

  for (const campaign of campaigns) {
    const strategy = (campaign.strategy_type ?? 'balanced') as CampaignStrategyType;
    const params = CAMPAIGN_STRATEGY_PARAMS[strategy];

    // Resolved actions this arc (effort > 0, resolved_arc = currentArc)
    const resolvedActions = await trx('pol_campaign_actions')
      .join('pol_candidates', 'pol_campaign_actions.candidate_id', 'pol_candidates.id')
      .where('pol_candidates.party_id', campaign.party_id)
      .where('pol_campaign_actions.cycle_id', cycle.id)
      .where('pol_campaign_actions.resolved_arc', currentArc)
      .where('pol_campaign_actions.effort', '>', 0)
      .select('pol_campaign_actions.*');

    const totalEffort = resolvedActions.reduce((s: number, a: any) => s + Number(a.effort), 0);
    const actionCount = resolvedActions.length;

    // GGS accumulation
    const ggsGain = (
      totalEffort * CAMPAIGN_GGS_PER_EFFORT * params.effort_mult +
      params.reach_bonus
    );
    const newGgs = Math.min(CAMPAIGN_GGS_CAP, Number(campaign.ground_game_score) + ggsGain);

    // Momentum: gain per action taken, then decay residual
    let momentum = Number(campaign.momentum);
    if (actionCount > 0) {
      momentum += actionCount * CAMPAIGN_MOMENTUM_GAIN_ACTION;
    }
    momentum = momentum * CAMPAIGN_MOMENTUM_DECAY; // decay toward 0 each arc
    momentum = Math.max(-20, Math.min(20, momentum)); // clamp

    // Campaign events
    const firedEvents: string[] = typeof campaign.fired_events === 'string'
      ? safeParseJSON(campaign.fired_events) : (campaign.fired_events ?? []);
    const arcActionsLog: any[] = typeof campaign.arc_actions === 'string'
      ? safeParseJSON(campaign.arc_actions) : (campaign.arc_actions ?? []);
    const newFiredEvents = [...firedEvents];
    let popularityDelta = 0;
    let budgetDelta = 0;

    for (const ev of CAMPAIGN_EVENTS) {
      // Each event can fire once per campaign (dedup by id)
      if (!newFiredEvents.includes(ev.id) && Math.random() < ev.prob) {
        newFiredEvents.push(ev.id);
        const ggsDelta = ev.ground_game_delta;
        popularityDelta += ev.popularity_delta;
        budgetDelta += ev.budget_cost;

        arcActionsLog.push({
          arc: currentArc,
          event: ev.id,
          message: ev.message,
          ggsImpact: ggsDelta,
        });

        // Apply event GGS impact
        const eventGgs = Math.max(0, Math.min(CAMPAIGN_GGS_CAP,
          Number(campaign.ground_game_score) + ggsGain + ggsDelta));

        // Apply popularity delta directly
        if (ev.popularity_delta !== 0) {
          await trx('pol_parties').where({ id: campaign.party_id })
            .update({ popularity: trx.raw(`GREATEST(0, LEAST(100, popularity + ?))`, [ev.popularity_delta]) });
        }
        // Apply budget drain
        if (ev.budget_cost > 0) {
          await trx('pol_parties').where({ id: campaign.party_id })
            .update({ treasury: trx.raw(`GREATEST(0, treasury - ?)`, [ev.budget_cost]) });
        }
      }
    }

    // Log arc summary
    arcActionsLog.push({
      arc: currentArc,
      strategy,
      total_effort: totalEffort,
      ggs_gain: Math.round(ggsGain * 10) / 10,
      momentum: Math.round(momentum * 10) / 10,
    });

    await trx('pol_campaigns').where({ id: campaign.id }).update({
      ground_game_score: newGgs,
      momentum,
      arc_actions: JSON.stringify(arcActionsLog.slice(-50)), // keep last 50 entries
      fired_events: JSON.stringify(newFiredEvents),
      budget_spent: trx.raw(`budget_spent + ?`, [budgetDelta]),
    });
  }
}

/**
 * Player action: change campaign strategy mid-campaign.
 * Costs 2 AP. Strategy change takes effect from next arc.
 */
export async function setCampaignStrategy(
  trx: any,
  partyId: string,
  cycleId: string,
  characterId: string,
  strategy: CampaignStrategyType,
  currentArc: number
): Promise<void> {
  if (!CAMPAIGN_STRATEGY_PARAMS[strategy]) {
    throw new AppError('Unknown campaign strategy', 400, 'BAD_REQUEST');
  }
  await spendAp(trx, characterId, 2);
  const campaign = await trx('pol_campaigns').where({ cycle_id: cycleId, party_id: partyId }).first();
  if (!campaign) throw new AppError('No active campaign object', 404, 'NOT_FOUND');
  await trx('pol_campaigns').where({ id: campaign.id }).update({ strategy_type: strategy });
}

/**
 * Get the campaign summary for a party in the current cycle.
 */
export async function getPartyCampaignSummary(
  partyId: string, cycleId: string
): Promise<any | null> {
  const campaign = await db('pol_campaigns')
    .where({ party_id: partyId, cycle_id: cycleId })
    .first();
  return campaign ?? null;
}

// ── Interest Group System (Phase 6) ──────────────────────────────────────────

/**
 * Compute how well a party's platform aligns with a group's preferences.
 * Returns 0–1. Formula: weighted sum of (1 - |party - pref| / 100) per axis.
 */
function computeAlignmentScore(
  party: any, group: any
): number {
  const axes = ['taxation', 'labour', 'investment', 'trade', 'stability'] as const;
  const platform = typeof party.platform === 'string' ? safeParseJSON(party.platform) : (party.platform ?? {});
  let score = 0;
  for (const axis of axes) {
    const weight = Number(group[`weight_${axis}`] ?? 0.20);
    const partyVal = Number(platform[axis] ?? 50);
    const prefVal = Number(group[`pref_${axis}`] ?? 50);
    score += weight * (1 - Math.abs(partyVal - prefVal) / 100);
  }
  return Math.min(1, Math.max(0, score));
}

/**
 * Resolve endorsement tier from a relationship score.
 */
function resolveEndorsementTier(score: number): EndorsementStatus {
  if (score >= IG_ENDORSEMENT_THRESHOLDS.allied)      return 'allied';
  if (score >= IG_ENDORSEMENT_THRESHOLDS.endorsed)    return 'endorsed';
  if (score >= IG_ENDORSEMENT_THRESHOLDS.sympathetic) return 'sympathetic';
  return 'none';
}

/**
 * Seed interest group relation rows for a party across all groups in the state.
 * Seeds the initial relationship_score from platform alignment.
 * Safe to call multiple times (ON CONFLICT DO NOTHING equivalent via check).
 */
export async function seedIGRelationsForParty(
  trx: any, partyId: string, stateId: string
): Promise<void> {
  const groups = await trx('pol_interest_groups').where({ state_id: stateId });
  const party = await trx('pol_parties').where({ id: partyId }).first();
  if (!party) return;

  for (const group of groups) {
    const existing = await trx('pol_interest_group_relations')
      .where({ party_id: partyId, group_id: group.id }).first();
    if (existing) continue;

    const alignment = computeAlignmentScore(party, group);
    const seedScore = Math.round(40 + alignment * 35); // 40–75 range at seed
    const tier = resolveEndorsementTier(seedScore);

    await trx('pol_interest_group_relations').insert({
      party_id: partyId,
      group_id: group.id,
      relationship_score: seedScore,
      endorsement_status: tier,
      active_commitments: JSON.stringify([]),
      contact_log: JSON.stringify([]),
      momentum: 0,
    });
  }
}

/**
 * Per-arc interest group processor — runs inside processPoliticalArc.
 * For each active party in the state:
 *  1. Compute platform alignment → drift score up/down
 *  2. Apply passive decay
 *  3. Check commitments (honor bonus / break penalty)
 *  4. Update endorsement tier
 *  5. Apply momentum decay
 */
export async function processInterestGroupsForState(
  trx: any, stateId: string, currentArc: number
): Promise<void> {
  const groups = await trx('pol_interest_groups').where({ state_id: stateId });
  const parties = await trx('pol_parties').where({ state_id: stateId });

  for (const party of parties) {
    // Ensure seeds exist
    await seedIGRelationsForParty(trx, party.id, stateId);

    for (const group of groups) {
      const relation = await trx('pol_interest_group_relations')
        .where({ party_id: party.id, group_id: group.id }).first();
      if (!relation) continue;

      let score = Number(relation.relationship_score);
      const contactLog: any[] = typeof relation.contact_log === 'string'
        ? safeParseJSON(relation.contact_log) : (relation.contact_log ?? []);

      // 1. Platform alignment drift
      const alignment = computeAlignmentScore(party, group);
      let alignmentDelta = 0;
      if (alignment >= 0.6) {
        // Party is aligned — nudge score up
        alignmentDelta = +(alignment - 0.5) * IG_ALIGNMENT_SCORE_SCALE;
      } else {
        // Misaligned — apply decay
        alignmentDelta = -(0.6 - alignment) * IG_ALIGNMENT_DECAY * 10;
      }
      score += alignmentDelta;

      // 2. Passive decay (parties must actively maintain relationships)
      score -= IG_PASSIVE_DECAY_PER_ARC;

      // 3. Commitment checking
      const commitments: any[] = typeof relation.active_commitments === 'string'
        ? safeParseJSON(relation.active_commitments) : (relation.active_commitments ?? []);
      const updatedCommitments: any[] = [];

      for (const c of commitments) {
        if (c.honored_arc || c.broken_arc) {
          updatedCommitments.push(c); // already resolved
          continue;
        }

        // Check if party's current platform reflects the commitment
        const platform = typeof party.platform === 'string'
          ? safeParseJSON(party.platform) : (party.platform ?? {});
        const partyVal = Number(platform[c.axis] ?? 50);
        const honored = c.direction === 'raise' ? partyVal >= c.target_value : partyVal <= c.target_value;

        if (honored) {
          score += IG_COMMITMENT_HONOR_BONUS;
          contactLog.push({ arc: currentArc, action: 'commitment_honored', axis: c.axis, score_delta: IG_COMMITMENT_HONOR_BONUS });
          updatedCommitments.push({ ...c, honored_arc: currentArc });
        } else if (currentArc > c.promised_arc + IG_COMMITMENT_DEADLINE_ARCS) {
          score -= IG_COMMITMENT_BREAK_PENALTY;
          contactLog.push({ arc: currentArc, action: 'commitment_broken', axis: c.axis, score_delta: -IG_COMMITMENT_BREAK_PENALTY });
          updatedCommitments.push({ ...c, broken_arc: currentArc });
        } else {
          updatedCommitments.push(c); // still pending
        }
      }

      // 4. Momentum decay
      let momentum = Number(relation.momentum) * 0.80;

      // 5. Clamp and resolve tier
      score = Math.max(0, Math.min(100, score));
      const newTier = resolveEndorsementTier(score);

      await trx('pol_interest_group_relations')
        .where({ party_id: party.id, group_id: group.id })
        .update({
          relationship_score: score,
          endorsement_status: newTier,
          active_commitments: JSON.stringify(updatedCommitments),
          contact_log: JSON.stringify(contactLog.slice(-40)),
          momentum,
        });
    }
  }
}

/**
 * Player action: perform manual outreach to an interest group.
 * Costs AP. Creates a commitment (optional). Score + momentum boost.
 * Subject to cooldown.
 */
export async function performOutreach(
  trx: any,
  characterId: string,
  partyId: string,
  stateId: string,
  groupId: string,
  commitment: { axis: string; direction: 'raise' | 'lower'; target_value: number } | null,
  currentArc: number
): Promise<{ message: string; score_after: number; tier: EndorsementStatus }> {
  const relation = await trx('pol_interest_group_relations')
    .where({ party_id: partyId, group_id: groupId }).first();
  if (!relation) throw new AppError('No relation found — ensure the party has been seeded', 404, 'NOT_FOUND');

  // Cooldown check
  if (relation.last_outreach_arc && currentArc - relation.last_outreach_arc < IG_OUTREACH_COOLDOWN_ARCS) {
    throw new AppError(
      `Outreach cooldown active — wait ${IG_OUTREACH_COOLDOWN_ARCS - (currentArc - relation.last_outreach_arc)} more arc(s)`,
      409, 'COOLDOWN'
    );
  }

  let hasElderStatesman = false;
  const scores = await getOrCreateLegacyScores(trx, characterId);
  const benefits: string[] = typeof scores.unlocked_benefits === 'string'
    ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);
  if (benefits.includes('elder_statesman')) hasElderStatesman = true;

  const apCost = hasElderStatesman ? Math.max(1, IG_OUTREACH_AP_COST - 1) : IG_OUTREACH_AP_COST;
  await spendAp(trx, characterId, apCost);


  let score = Number(relation.relationship_score) + IG_OUTREACH_BASE_GAIN;
  const contactLog: any[] = typeof relation.contact_log === 'string'
    ? safeParseJSON(relation.contact_log) : (relation.contact_log ?? []);

  const commitments: any[] = typeof relation.active_commitments === 'string'
    ? safeParseJSON(relation.active_commitments) : (relation.active_commitments ?? []);

  let commitmentMsg = '';
  if (commitment) {
    const id = `c_${Date.now()}`;
    commitments.push({
      id,
      axis: commitment.axis,
      direction: commitment.direction,
      target_value: commitment.target_value,
      promised_arc: currentArc,
      honored_arc: null,
      broken_arc: null,
    });
    commitmentMsg = ` You committed to ${commitment.direction === 'raise' ? 'raising' : 'lowering'} ${commitment.axis} policy.`;
  }

  score = Math.max(0, Math.min(100, score));
  const tier = resolveEndorsementTier(score);

  contactLog.push({
    arc: currentArc,
    action: 'manual_outreach',
    score_delta: IG_OUTREACH_BASE_GAIN,
    message: `Outreach meeting with group.${commitmentMsg}`,
  });

  await trx('pol_interest_group_relations')
    .where({ party_id: partyId, group_id: groupId })
    .update({
      relationship_score: score,
      endorsement_status: tier,
      active_commitments: JSON.stringify(commitments),
      contact_log: JSON.stringify(contactLog.slice(-40)),
      last_outreach_arc: currentArc,
      momentum: Number(relation.momentum) + IG_OUTREACH_BASE_GAIN / 2,
    });

  const group = await trx('pol_interest_groups').where({ id: groupId }).first();
  return {
    message: `Outreach to ${group?.name ?? 'the group'} successful. Relationship +${IG_OUTREACH_BASE_GAIN}. Now ${tier}.${commitmentMsg}`,
    score_after: score,
    tier,
  };
}

/**
 * Player action: rally group support (PC cost).
 * Short burst of score + momentum.
 */
export async function performRallySupport(
  trx: any,
  characterId: string,
  partyId: string,
  groupId: string,
  currentArc: number
): Promise<{ message: string; score_after: number; tier: EndorsementStatus }> {
  const relation = await trx('pol_interest_group_relations')
    .where({ party_id: partyId, group_id: groupId }).first();
  if (!relation) throw new AppError('Relation not found', 404, 'NOT_FOUND');

  let hasElderStatesman = false;
  const scores = await getOrCreateLegacyScores(trx, characterId);
  const benefits: string[] = typeof scores.unlocked_benefits === 'string'
    ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);
  if (benefits.includes('elder_statesman')) hasElderStatesman = true;

  const pcCost = hasElderStatesman ? Math.max(1, IG_RALLY_PC_COST - 1) : IG_RALLY_PC_COST;
  await spendPc(trx, characterId, pcCost);


  let score = Math.min(100, Number(relation.relationship_score) + IG_RALLY_GAIN);
  const tier = resolveEndorsementTier(score);
  const momentum = Number(relation.momentum) + IG_RALLY_MOMENTUM_GAIN;

  const contactLog: any[] = typeof relation.contact_log === 'string'
    ? safeParseJSON(relation.contact_log) : [];
  contactLog.push({ arc: currentArc, action: 'rally_support', score_delta: IG_RALLY_GAIN });

  await trx('pol_interest_group_relations')
    .where({ party_id: partyId, group_id: groupId })
    .update({
      relationship_score: score,
      endorsement_status: tier,
      contact_log: JSON.stringify(contactLog.slice(-40)),
      momentum,
    });

  const group = await trx('pol_interest_groups').where({ id: groupId }).first();
  return {
    message: `Rally with ${group?.name ?? 'the group'} energised supporters. +${IG_RALLY_GAIN} relationship.`,
    score_after: score,
    tier,
  };
}

/**
 * Fetch all interest group relations for a party, enriched with group metadata.
 */
export async function getPartyIGRelations(partyId: string, stateId: string) {
  const rows = await db('pol_interest_group_relations as r')
    .join('pol_interest_groups as g', 'r.group_id', 'g.id')
    .where('r.party_id', partyId)
    .where('g.state_id', stateId)
    .select(
      'r.*',
      'g.name as group_name',
      'g.segment_key',
      'g.ideology_lean',
      'g.influence_weight',
    )
    .orderBy('r.relationship_score', 'desc');
  return rows;
}

// ── Media Ecosystem (Phase 7) ─────────────────────────────────────────────────

/**
 * Resolve coverage stance from a relationship score.
 */
function resolveStance(score: number): CoverageStance {
  if (score >= MEDIA_STANCE_THRESHOLDS.allied)     return 'allied';
  if (score >= MEDIA_STANCE_THRESHOLDS.favourable) return 'favourable';
  if (score >= MEDIA_STANCE_THRESHOLDS.neutral)    return 'neutral';
  if (score >= MEDIA_STANCE_THRESHOLDS.sceptical)  return 'sceptical';
  return 'hostile';
}

/**
 * Seed media relations for a party across all outlets in the state.
 * Seed score = 35–65 based on outlet bias–platform alignment. Idempotent.
 */
export async function seedMediaRelationsForParty(
  trx: any, partyId: string, stateId: string
): Promise<void> {
  const outlets = await trx('pol_media_outlets').where({ state_id: stateId });
  const party = await trx('pol_parties').where({ id: partyId }).first();
  if (!party) return;

  const platform = typeof party.platform === 'string'
    ? safeParseJSON(party.platform) : (party.platform ?? {});

  let hasMediaLegend = false;
  if (party.leader_character_id) {
    const scores = await getOrCreateLegacyScores(trx, party.leader_character_id);
    const benefits: string[] = typeof scores.unlocked_benefits === 'string'
      ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);
    if (benefits.includes('media_legend')) hasMediaLegend = true;
  }

  for (const outlet of outlets) {
    const existing = await trx('pol_media_relations')
      .where({ party_id: partyId, outlet_id: outlet.id }).first();
    if (existing) continue;

    const biasAxis = MEDIA_BIAS_AXIS[outlet.bias as OutletBias] ?? null;
    let seed = 50;
    if (biasAxis) {
      const partyVal = Number(platform[biasAxis] ?? 50);
      seed = partyVal >= MEDIA_ALIGNMENT_THRESHOLD ? 58 : 42;
    }
    if (outlet.bias === 'populist') seed = 38; // tabloids default adversarial

    if (hasMediaLegend) seed += 10;
    seed = Math.min(100, Math.max(0, seed));

    const stance = resolveStance(seed);
    await trx('pol_media_relations').insert({
      party_id: partyId,
      outlet_id: outlet.id,
      relationship_score: seed,
      coverage_stance: stance,
      contact_log: JSON.stringify([]),
    });
  }
}

/**
 * Emit a news story for the current arc. Called by other processors when
 * noteworthy events occur (scandals, IG endorsements, coalition events, etc.)
 */
export async function emitStory(
  trx: any,
  stateId: string,
  partyId: string | null,
  arc: number,
  story_type: string,
  headline: string,
  body: string,
): Promise<void> {
  const weight = MEDIA_STORY_WEIGHTS[story_type] ?? 2;
  await trx('pol_news_stories').insert({
    state_id: stateId, party_id: partyId, arc,
    story_type, headline, body, weight, avg_tone: 0, popularity_delta: 0,
  });
}

/**
 * Per-arc media coverage processor — runs AFTER all event processors.
 * 1. Seed relations for new parties.
 * 2. Apply alignment drift + passive decay to all relations.
 * 3. Collect stories emitted this arc, pick top MEDIA_TOP_STORIES_PER_ARC.
 * 4. Compute weighted average tone from outlet stances.
 * 5. Apply popularity delta to party.
 */
export async function processMediaCoverageForState(
  trx: any, stateId: string, currentArc: number
): Promise<void> {
  const outlets = await trx('pol_media_outlets').where({ state_id: stateId });
  const parties = await trx('pol_parties').where({ state_id: stateId });

  // Seed + decay all relations
  for (const party of parties) {
    await seedMediaRelationsForParty(trx, party.id, stateId);

    const platform = typeof party.platform === 'string'
      ? safeParseJSON(party.platform) : (party.platform ?? {});

    for (const outlet of outlets) {
      const rel = await trx('pol_media_relations')
        .where({ party_id: party.id, outlet_id: outlet.id }).first();
      if (!rel) continue;

      const biasAxis = MEDIA_BIAS_AXIS[outlet.bias as OutletBias] ?? null;
      let alignDelta = 0;
      if (biasAxis) {
        const partyVal = Number(platform[biasAxis] ?? 50);
        alignDelta = partyVal >= MEDIA_ALIGNMENT_THRESHOLD ? +0.5 : -0.3;
      }

      let score = Number(rel.relationship_score) + alignDelta - MEDIA_PASSIVE_DECAY;
      score = Math.max(0, Math.min(100, score));
      await trx('pol_media_relations')
        .where({ party_id: party.id, outlet_id: outlet.id })
        .update({ relationship_score: score, coverage_stance: resolveStance(score) });
    }
  }



  // Also get un-processed ones (popularity_delta = 0)
  const rawStories = await trx('pol_news_stories')
    .where({ state_id: stateId, arc: currentArc, popularity_delta: 0 })
    .orderBy('weight', 'desc')
    .limit(MEDIA_TOP_STORIES_PER_ARC);

  for (const story of rawStories) {
    if (!story.party_id) continue;

    const relations = await trx('pol_media_relations as r')
      .join('pol_media_outlets as o', 'r.outlet_id', 'o.id')
      .where('r.party_id', story.party_id)
      .where('o.state_id', stateId)
      .select('r.coverage_stance', 'o.base_tone', 'o.credibility', 'o.reach');

    if (relations.length === 0) continue;

    let weightedTone = 0;
    let totalW = 0;
    for (const rel of relations) {
      const toneMod = MEDIA_STANCE_TONE_MOD[rel.coverage_stance as CoverageStance] ?? 0;
      const tone = Math.max(-1, Math.min(1, Number(rel.base_tone) + toneMod));
      const w = Number(rel.reach) * (Number(rel.credibility) / 100);
      weightedTone += tone * w;
      totalW += w;
    }

    const avgTone = totalW > 0 ? weightedTone / totalW : 0;
    const popDelta = Math.round(story.weight * avgTone * MEDIA_POP_SCALE);

    if (popDelta !== 0) {
      await trx('pol_parties').where({ id: story.party_id })
        .update({ popularity: trx.raw('GREATEST(0, LEAST(100, popularity + ?))', [popDelta]) });
    }

    await trx('pol_news_stories').where({ id: story.id })
      .update({ avg_tone: avgTone, popularity_delta: popDelta });
  }
}

/**
 * Player action: exclusive interview with a single outlet (3 AP, cooldown).
 */
export async function doExclusiveInterview(
  trx: any, characterId: string, partyId: string,
  outletId: string, currentArc: number
): Promise<{ message: string; score_after: number; stance: CoverageStance }> {
  const rel = await trx('pol_media_relations')
    .where({ party_id: partyId, outlet_id: outletId }).first();
  if (!rel) throw new AppError('Relation not found', 404, 'NOT_FOUND');

  if (rel.last_contact_arc && currentArc - rel.last_contact_arc < MEDIA_CONTACT_COOLDOWN_ARCS) {
    throw new AppError(
      `Press cooldown — wait ${MEDIA_CONTACT_COOLDOWN_ARCS - (currentArc - rel.last_contact_arc)} more arc(s)`,
      409, 'COOLDOWN'
    );
  }

  await spendAp(trx, characterId, MEDIA_EXCLUSIVE_AP_COST);
  let score = Math.min(100, Number(rel.relationship_score) + MEDIA_EXCLUSIVE_GAIN);
  const stance = resolveStance(score);

  const log: any[] = typeof rel.contact_log === 'string' ? safeParseJSON(rel.contact_log) : [];
  log.push({ arc: currentArc, action: 'exclusive_interview', score_delta: MEDIA_EXCLUSIVE_GAIN });

  await trx('pol_media_relations')
    .where({ party_id: partyId, outlet_id: outletId })
    .update({ relationship_score: score, coverage_stance: stance,
              contact_log: JSON.stringify(log.slice(-30)), last_contact_arc: currentArc });

  const outlet = await trx('pol_media_outlets').where({ id: outletId }).first();
  return {
    message: `Exclusive granted to ${outlet?.name ?? 'outlet'}. +${MEDIA_EXCLUSIVE_GAIN} → ${stance}.`,
    score_after: score, stance,
  };
}

/**
 * Player action: press conference — all outlets +MEDIA_PRESS_CONF_GAIN (2 AP).
 */
export async function doPressConference(
  trx: any, characterId: string, partyId: string,
  stateId: string, currentArc: number
): Promise<{ message: string; outlets_updated: number }> {
  await spendAp(trx, characterId, MEDIA_PRESS_CONFERENCE_AP_COST);
  const outlets = await trx('pol_media_outlets').where({ state_id: stateId });
  let updated = 0;

  for (const outlet of outlets) {
    const rel = await trx('pol_media_relations')
      .where({ party_id: partyId, outlet_id: outlet.id }).first();
    if (!rel) continue;

    const score = Math.min(100, Number(rel.relationship_score) + MEDIA_PRESS_CONF_GAIN);
    const stance = resolveStance(score);
    const log: any[] = typeof rel.contact_log === 'string' ? safeParseJSON(rel.contact_log) : [];
    log.push({ arc: currentArc, action: 'press_conference', score_delta: MEDIA_PRESS_CONF_GAIN });

    await trx('pol_media_relations')
      .where({ party_id: partyId, outlet_id: outlet.id })
      .update({ relationship_score: score, coverage_stance: stance,
                contact_log: JSON.stringify(log.slice(-30)) });
    updated++;
  }

  return {
    message: `Press conference held. ${updated} outlets received +${MEDIA_PRESS_CONF_GAIN}.`,
    outlets_updated: updated,
  };
}

/**
 * Fetch all media relations for a party enriched with outlet metadata.
 */
export async function getPartyMediaRelations(partyId: string, stateId: string) {
  return db('pol_media_relations as r')
    .join('pol_media_outlets as o', 'r.outlet_id', 'o.id')
    .where('r.party_id', partyId)
    .where('o.state_id', stateId)
    .select('r.*', 'o.name as outlet_name', 'o.outlet_type',
            'o.bias', 'o.credibility', 'o.reach', 'o.base_tone')
    .orderBy('r.relationship_score', 'desc');
}

/**
 * Fetch recent news stories for a state (latest arcs, top-weighted).
 */
export async function getRecentNews(stateId: string, limit = 15) {
  return db('pol_news_stories as s')
    .leftJoin('pol_parties as p', 's.party_id', 'p.id')
    .where('s.state_id', stateId)
    .select('s.*', 'p.name as party_name', 'p.abbreviation as party_abbr')
    .orderBy('s.arc', 'desc')
    .orderBy('s.weight', 'desc')
    .limit(limit);
}

// ── Legacy System (Phase 8) ───────────────────────────────────────────────────

/**
 * Get or create legacy score row for a character (idempotent).
 */
export async function getOrCreateLegacyScores(trx: any, characterId: string): Promise<any> {
  let scores = await trx('pol_legacy_scores').where({ character_id: characterId }).first();
  if (!scores) {
    const [row] = await trx('pol_legacy_scores').insert({
      character_id: characterId,
      electoral: 0, legislative: 0, coalition: 0,
      scandal: 0, economic: 0, longevity: 0,
      total: 0, unlocked_benefits: JSON.stringify([]), last_computed_arc: 0,
    }).returning('*');
    scores = row;
  }
  return scores;
}

/**
 * Resolve rank title from longevity arc count.
 */
function resolveLongevityRank(longevityScore: number): string {
  let title = 'Newcomer';
  for (const r of LEGACY_LONGEVITY_RANKS) {
    if (longevityScore >= r.arcs) title = r.title;
  }
  return title;
}

/**
 * Check and unlock legacy benefits based on current scores.
 * Returns list of newly unlocked benefit keys.
 */
function checkBenefits(scores: any): string[] {
  const alreadyUnlocked: string[] = typeof scores.unlocked_benefits === 'string'
    ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);
  const newlyUnlocked: string[] = [];

  for (const benefit of LEGACY_BENEFITS) {
    if (alreadyUnlocked.includes(benefit.key)) continue;
    const dimScore = benefit.dimension === 'total'
      ? Number(scores.total)
      : Number(scores[benefit.dimension as string] ?? 0);
    if (dimScore >= benefit.threshold) {
      newlyUnlocked.push(benefit.key);
    }
  }
  return newlyUnlocked;
}

/**
 * Append a legacy event record and update the aggregate score.
 * Automatically checks and unlocks benefits.
 */
export async function recordLegacyEvent(
  trx: any,
  characterId: string,
  stateId: string,
  arc: number,
  eventType: string,
  narrativeOverride?: string,
): Promise<{ newly_unlocked: string[] }> {
  const def = LEGACY_EVENT_SCORES[eventType];
  if (!def) return { newly_unlocked: [] };

  const scores = await getOrCreateLegacyScores(trx, characterId);

  // Append record
  if (def.delta !== 0) {
    await trx('pol_legacy_records').insert({
      character_id: characterId,
      state_id: stateId,
      arc,
      dimension: def.dimension,
      event_type: eventType,
      score_delta: def.delta,
      headline: def.headline,
      narrative: narrativeOverride ?? def.headline,
    });
  }

  // Update aggregate
  const updatedScore = Number(scores[def.dimension] ?? 0) + def.delta;
  await trx('pol_legacy_scores')
    .where({ character_id: characterId })
    .update({ [def.dimension]: updatedScore });

  // Re-fetch to get updated total (trigger computes it)
  const refreshed = await trx('pol_legacy_scores').where({ character_id: characterId }).first();

  // Check benefits
  const newly = checkBenefits(refreshed);
  if (newly.length > 0) {
    const existing: string[] = typeof refreshed.unlocked_benefits === 'string'
      ? safeParseJSON(refreshed.unlocked_benefits) : (refreshed.unlocked_benefits ?? []);
    await trx('pol_legacy_scores')
      .where({ character_id: characterId })
      .update({ unlocked_benefits: JSON.stringify([...existing, ...newly]) });

    // Handle immediate mechanical unlocks
    if (newly.includes('party_institution')) {
      const party = await trx('pol_parties').where({ leader_character_id: characterId }).first();
      if (party) {
        await trx('pol_parties')
          .where({ id: party.id })
          .update({ popularity: trx.raw('LEAST(100, popularity + 5)') });
      }
    }
  }

  return { newly_unlocked: newly };
}

/**
 * Per-arc legacy processor — runs after media coverage.
 * For every active party leader in the state:
 *  1. +1 longevity per arc as leader
 *  2. Economic dimension drift based on state conditions
 *  3. Re-evaluate benefits
 */
export async function processLegacyForState(
  trx: any, stateId: string, currentArc: number
): Promise<void> {
  const parties = await trx('pol_parties').where({ state_id: stateId, is_npc: false });

  // Get state conditions to assess economic health
  const conditions = await trx('pol_states').where({ id: stateId }).first();
  const economyScore = conditions
    ? Math.round((Number(conditions.cond_jobs ?? 50) + Number(conditions.cond_prosperity ?? 50)) / 2)
    : 50;
  const economyThriving = economyScore >= 65;
  const economyDeclining = economyScore <= 35;

  for (const party of parties) {
    if (!party.leader_character_id) continue;
    const characterId = party.leader_character_id;

    const scores = await getOrCreateLegacyScores(trx, characterId);

    // Skip if already processed this arc
    if (Number(scores.last_computed_arc) >= currentArc) continue;

    // 1. Longevity: +1 per arc as leader
    await recordLegacyEvent(trx, characterId, stateId, currentArc, 'arc_as_leader');
    // Manually increment longevity by 1 (arc count, not score delta)
    await trx('pol_legacy_scores')
      .where({ character_id: characterId })
      .increment('longevity', 1);

    // 2. Economic dimension drift
    if (economyThriving) {
      await recordLegacyEvent(trx, characterId, stateId, currentArc, 'economy_thriving',
        `Economy health ${economyScore}/100 — thriving under your government.`);
    } else if (economyDeclining) {
      await recordLegacyEvent(trx, characterId, stateId, currentArc, 'economy_declining',
        `Economy health ${economyScore}/100 — declining under your government.`);
    }

    // 3. Mark as computed for this arc
    await trx('pol_legacy_scores')
      .where({ character_id: characterId })
      .update({ last_computed_arc: currentArc });
  }
}

/**
 * Get full legacy summary for a character — scores, rank, benefits (locked + unlocked),
 * and most recent 20 records.
 */
export async function getLegacySummary(characterId: string) {
  const scores = await db('pol_legacy_scores').where({ character_id: characterId }).first();
  if (!scores) return null;

  const unlockedKeys: string[] = typeof scores.unlocked_benefits === 'string'
    ? safeParseJSON(scores.unlocked_benefits) : (scores.unlocked_benefits ?? []);

  const rank = resolveLongevityRank(Number(scores.longevity));

  const benefits = LEGACY_BENEFITS.map(b => ({
    ...b,
    unlocked: unlockedKeys.includes(b.key),
    current_score: b.dimension === 'total'
      ? Number(scores.total)
      : Number(scores[b.dimension as string] ?? 0),
  }));

  const records = await db('pol_legacy_records')
    .where({ character_id: characterId })
    .orderBy('arc', 'desc')
    .limit(20)
    .select('*');

  return {
    scores: {
      electoral:   Number(scores.electoral),
      legislative: Number(scores.legislative),
      coalition:   Number(scores.coalition),
      scandal:     Number(scores.scandal),
      economic:    Number(scores.economic),
      longevity:   Number(scores.longevity),
      total:       Number(scores.total),
    },
    rank,
    benefits,
    records,
  };
}
