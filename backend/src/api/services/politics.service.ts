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
} from '../constants/politics';
import { EngineCandidate, runElection } from './electionEngine';
import { fireGoverningEvent, fireConditionCrises } from './governingEvents';
import { Conditions, computeConditionTargets, driftConditions, readConditionsFromRow } from './conditions';

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
  const basePlatform: Platform = party.platform as Platform;

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
  
  return cycle;
}

export async function ensureNpcCandidates(trx: any, cycleId: string) {
  const cycle = await trx('pol_cycles').where({ id: cycleId }).first();
  if (!cycle) return;

  const npcParties = await trx('pol_parties').where({ is_npc: true, state_id: cycle.state_id });
  
  for (const party of npcParties) {
    const existing = await trx('pol_candidates')
      .where({ cycle_id: cycleId, party_id: party.id })
      .first();
      
    if (!existing) {
      const seat = await trx('pol_council_seats')
        .where({ party_id: party.id, state_id: cycle.state_id })
        .first();

      await trx('pol_candidates').insert({
        cycle_id: cycleId,
        party_id: party.id,
        character_id: null,
        is_npc: true,
        platform: party.platform,
        is_incumbent: !!seat
      });
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
      effortBySegment
    });
  }

  return engineCandidates;
}

/** Fetch the current Conditions for a state (falls back to neutral if unseeded). */
export async function getStateConditions(trx: any, stateId: string): Promise<Conditions> {
  const state = await trx('pol_states').where({ id: stateId }).first();
  return readConditionsFromRow(state);
}

/** The governing party's active-policy platform (premier's party), or null if no government. */
async function resolveGoverningPlatform(trx: any, stateId: string): Promise<Record<string, number> | null> {
  const premierSeat = await trx('pol_offices').where({ state_id: stateId, office: 'premier' }).first();
  if (!premierSeat?.party_id) return null;
  const party = await trx('pol_parties').where({ id: premierSeat.party_id }).first();
  if (!party?.platform) return null;
  return typeof party.platform === 'string' ? JSON.parse(party.platform) : party.platform;
}

/**
 * Drift a state's Conditions toward the target implied by the governing party's
 * active policy (GDD $11/$16). Deterministic and idempotent per in-game month:
 * cond_updated_arc guards against running twice for the same month.
 */
export async function applyConditionDrift(trx: any, stateId: string, currentMonth: number) {
  const state = await trx('pol_states').where({ id: stateId }).first();
  if (!state) return;
  if (Number(state.cond_updated_arc ?? 0) >= currentMonth) return; // already drifted this month

  const platform = await resolveGoverningPlatform(trx, stateId);
  const current = readConditionsFromRow(state);
  const targets = computeConditionTargets(platform as any);
  const next = driftConditions(current, targets);

  await trx('pol_states').where({ id: stateId }).update({
    cond_prosperity: next.prosperity,
    cond_jobs: next.jobs,
    cond_order: next.order,
    cond_cohesion: next.cohesion,
    cond_budget: next.budget,
    cond_updated_arc: currentMonth,
  });
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
  }

  // Jurisdiction Conditions (GDD $11): drift toward the governing policy's target,
  // then fire any deterministic crisis events. Both run every month, phase-agnostic.
  await applyConditionDrift(trx, stateId, currentMonth);
  await fireConditionCrises(trx, stateId, currentMonth);

  if (newPhase === 'filing') {
    await ensureNpcCandidates(trx, cycle.id);
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
  const registeredVoters = state ? state.registered_voters || 1600000 : 1600000;
  
  const projection = runElection({
    candidates: prevEngineCands,
    registeredVoters
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
    for (const seg of SEGMENTS) {
      const shares = projection.segmentShares[seg.key] || {};
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
  const registeredVoters = state ? state.registered_voters || 1600000 : 1600000;
  const conditions = readConditionsFromRow(state);

  const result = runElection({ candidates: engineCands, registeredVoters, totalSeats: getSeatsForState(state?.code), conditions });

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
        character_id: dbCand?.character_id || null,
        is_npc: dbCand?.is_npc || false
      });
      seatsAllocated++;
      
      if (dbCand && !dbCand.is_npc && dbCand.character_id) {
        newWinners.add(dbCand.character_id);
        await applyFactorDelta(trx, dbCand.character_id, POL_FACTOR_DELTAS.WIN_SEAT);
      }
    }

    // Fill remaining seats with generic NPCs for that party
    while (seatsAllocated < seatsToAllocate) {
      await trx('pol_council_seats').insert({
        state_id: cycle.state_id,
        cycle_id: cycleId,
        party_id: party.partyId,
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

  const members = typeof forming.member_party_ids === 'string' ? JSON.parse(forming.member_party_ids) : forming.member_party_ids;
  let accepted = new Set<string>(members.accepted || []);
  let invited = new Set<string>(members.invited || []);
  
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

  members.accepted = Array.from(accepted);
  members.invited = Array.from(invited);

  if (totalAcceptedSeats >= majoritySeats) {
    await trx('pol_coalitions').where({ id: forming.id }).update({
      member_party_ids: JSON.stringify(members),
      total_seats: totalAcceptedSeats,
      status: 'formed'
    });
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'coalition', totalAcceptedSeats);
    if (currentMonth >= cycle.formation_end_arc) await performCycleRollover(trx, cycle, currentMonth);
    return;
  }

  await trx('pol_coalitions').where({ id: forming.id }).update({
    member_party_ids: JSON.stringify(members),
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

  await trx('pol_cycles').insert({
    state_id: oldCycle.state_id,
    cycle_number: oldCycle.cycle_number + 1,
    phase: 'closed', // Will be derived properly on next process
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
    
    const coalition = await trx('pol_coalitions').where({ cycle_id: cycleId }).whereIn('status', ['formed', 'minority']).first();
    const govMembers = coalition ? (typeof coalition.member_party_ids === 'string' ? JSON.parse(coalition.member_party_ids).accepted || [] : coalition.member_party_ids.accepted || []) : [];

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
      if (bill.type === 'industry_tax') {
        let newRate = Number(bill.params.rate);
        if (isNaN(newRate)) newRate = 0.20; // fallback POL_DEFAULT_INDUSTRY_TAX_RATE
        
        const existing = await trx('pol_state_policy').where({ state_id: stateId }).first();
        if (existing) {
          await trx('pol_state_policy').where({ state_id: stateId }).update({ industry_tax_rate: newRate, updated_arc: currentMonth });
        } else {
          await trx('pol_state_policy').insert({ state_id: stateId, industry_tax_rate: newRate, infrastructure_level: 1, updated_arc: currentMonth });
        }

        await trx('pol_ledger_events').insert({
          state_id: stateId, arc: currentMonth, kind: 'bill_passed',
          headline: `INDUSTRY TAX REVISED`,
          body: `Council passes the new industry tax rate of ${(newRate * 100).toFixed(1)}%.`
        });
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
