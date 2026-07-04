import { db } from '../../config/database';
import {
  POL_FILING_WINDOW_ARCS,
  POL_CAMPAIGN_WINDOW_ARCS,
  POL_FORMATION_WINDOW_ARCS,
  POL_FIRST_CYCLE_ARCS,
  POL_TERM_LENGTH_ARCS,
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
  POL_MAJORITY_SEATS,
  POL_COALITION_MAX_DISTANCE,
  POL_COUNCIL_SEATS,
  POL_FACTOR_DELTAS
} from '../constants/politics';
import { EngineCandidate, runElection } from './electionEngine';

export async function getCurrentWorldArc(): Promise<number> {
  const clock = await db('world_clock').first();
  return clock?.current_arc || 1;
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
  currentArc: number
): 'governing' | 'filing' | 'campaign' | 'polling' | 'formation' {
  const startCampaign = cycle.polling_arc - POL_CAMPAIGN_WINDOW_ARCS;
  const startFiling = startCampaign - POL_FILING_WINDOW_ARCS;

  if (currentArc < startFiling) return 'governing';
  if (currentArc >= startFiling && currentArc < startCampaign) return 'filing';
  if (currentArc >= startCampaign && currentArc < cycle.polling_arc) return 'campaign';
  if (currentArc === cycle.polling_arc) return 'polling';
  if (currentArc > cycle.polling_arc && currentArc <= cycle.formation_end_arc) return 'formation';
  
  return 'governing';
}

export async function getOrCreateCurrentCycle(stateId: string) {
  const currentArc = await getCurrentWorldArc();
  let cycle = await db('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
  
  if (!cycle) {
    const pollingArc = currentArc + POL_FIRST_CYCLE_ARCS;
    const formationEndArc = pollingArc + POL_FORMATION_WINDOW_ARCS;
    
    const phase = derivePhase({ polling_arc: pollingArc, formation_end_arc: formationEndArc }, currentArc);

    const [inserted] = await db('pol_cycles').insert({
      state_id: stateId,
      cycle_number: 1,
      start_arc: currentArc,
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

export async function processPoliticalArc(trx: any, stateId: string, currentArc: number) {
  const cycle = await trx('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
  if (!cycle) return;

  const newPhase = derivePhase(cycle, currentArc);
  
  if (cycle.phase !== newPhase) {
    await trx('pol_cycles').where({ id: cycle.id }).update({ phase: newPhase });
    cycle.phase = newPhase;
  }

  if (newPhase === 'filing') {
    await ensureNpcCandidates(trx, cycle.id);
  }

  if (newPhase === 'campaign') {
    const pendingActions = await trx('pol_campaign_actions')
      .join('pol_candidates', 'pol_campaign_actions.candidate_id', 'pol_candidates.id')
      .where('pol_campaign_actions.cycle_id', cycle.id)
      .andWhere('pol_campaign_actions.resolved_arc', '<=', currentArc)
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
        await trx('pol_campaign_actions').where({ id: act.id }).update({ effort: -1 }); // -1 marks skipped
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

    await runNpcCampaignBrain(trx, stateId, cycle.id, currentArc);
  }

  if (newPhase === 'polling' && currentArc === cycle.polling_arc) {
    await resolveElection(trx, cycle.id);
  }

  if (newPhase === 'formation') {
    await processGovernmentFormation(trx, cycle, currentArc);
  }

  if (newPhase === 'governing') {
    await resolveBills(trx, stateId, cycle.id, currentArc);
  }

  // Tenders operate on arc boundaries regardless of phase once active
  await awardTenders(trx, stateId, currentArc);
  await settleTenders(trx, stateId, currentArc);
}

async function runNpcCampaignBrain(trx: any, stateId: string, cycleId: string, currentArc: number) {
  // Read PREVIOUS arc's effort to run a projection. Avoid state-bleed.
  const prevEngineCands = await buildEngineCandidates(trx, cycleId, currentArc - 1);
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
          resolved_arc: currentArc
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
            resolved_arc: currentArc
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
          resolved_arc: currentArc
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

  const result = runElection({ candidates: engineCands, registeredVoters });

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
    body: `The polling stations have closed. ${topName} leads with ${topParty?.seats} seats out of ${POL_COUNCIL_SEATS}. The political landscape shifts as parties now scramble to form a viable government.`
  });
}

function getPlatformDistance(p1: Platform, p2: Platform): number {
  let distSq = 0;
  for (const axis of AXES) {
    distSq += Math.pow(((p1[axis] || 0) - (p2[axis] || 0)) / 100, 2);
  }
  return Math.sqrt(distSq);
}

export async function processGovernmentFormation(trx: any, cycle: any, currentArc: number) {
  // Check if government already formed or finalized as minority
  const existingCoalition = await trx('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
  if (existingCoalition) {
    if (currentArc >= cycle.formation_end_arc) {
      // make sure cycle isn't already closed
      if (cycle.status === 'open') {
        await performCycleRollover(trx, cycle, currentArc);
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
  if (largestParty.seats >= POL_MAJORITY_SEATS) {
    await trx('pol_coalitions').insert({
      cycle_id: cycle.id,
      lead_party_id: largestParty.id,
      member_party_ids: JSON.stringify({ accepted: [largestParty.id], invited: [] }),
      total_seats: largestParty.seats,
      status: 'formed'
    });
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'majority', largestParty.seats);
    if (currentArc >= cycle.formation_end_arc) await performCycleRollover(trx, cycle, currentArc);
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
      if (currentSeats >= POL_MAJORITY_SEATS) break;
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

  if (totalAcceptedSeats >= POL_MAJORITY_SEATS) {
    await trx('pol_coalitions').where({ id: forming.id }).update({
      member_party_ids: JSON.stringify(members),
      total_seats: totalAcceptedSeats,
      status: 'formed'
    });
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'coalition', totalAcceptedSeats);
    if (currentArc >= cycle.formation_end_arc) await performCycleRollover(trx, cycle, currentArc);
    return;
  }

  await trx('pol_coalitions').where({ id: forming.id }).update({
    member_party_ids: JSON.stringify(members),
    total_seats: totalAcceptedSeats
  });

  // End of formation window - finalize as minority if not formed
  if (currentArc >= cycle.formation_end_arc) {
    await trx('pol_coalitions').where({ id: forming.id }).update({
      status: 'minority'
    });
    await namePremierAndEmitLedger(trx, cycle, largestParty, 'minority', totalAcceptedSeats);
    await performCycleRollover(trx, cycle, currentArc);
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

async function performCycleRollover(trx: any, oldCycle: any, currentArc: number) {
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

  // Mark old cycle closed
  await trx('pol_cycles').where({ id: oldCycle.id }).update({ status: 'closed' });

  const startArc = currentArc;
  const pollingArc = startArc + POL_TERM_LENGTH_ARCS;
  const formationEndArc = pollingArc + POL_FORMATION_WINDOW_ARCS;

  await trx('pol_cycles').insert({
    state_id: oldCycle.state_id,
    cycle_number: oldCycle.cycle_number + 1,
    phase: 'closed', // Will be derived properly on next process
    start_arc: startArc,
    polling_arc: pollingArc,
    formation_end_arc: formationEndArc,
    status: 'open'
  });
}

export async function resolveBills(trx: any, stateId: string, cycleId: string, currentArc: number) {
  const proposedBills = await trx('pol_bills')
    .where({ state_id: stateId, status: 'proposed' })
    .andWhere('proposed_arc', '<', currentArc);

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
          await trx('pol_state_policy').where({ state_id: stateId }).update({ industry_tax_rate: newRate, updated_arc: currentArc });
        } else {
          await trx('pol_state_policy').insert({ state_id: stateId, industry_tax_rate: newRate, infrastructure_level: 1, updated_arc: currentArc });
        }

        await trx('pol_ledger_events').insert({
          state_id: stateId, arc: currentArc, kind: 'bill_passed',
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
        state_id: stateId, arc: currentArc, kind: 'bill_failed',
        headline: `BILL FAILED: ${bill.type.replace('_', ' ').toUpperCase()}`,
        body: `Council rejected the proposed ${bill.type.replace('_', ' ')}.`
      });
    }
  }
}

async function awardTenders(trx: any, stateId: string, currentArc: number) {
  // Find all open tenders whose bid window has closed (posted_arc < currentArc)
  const openTenders = await trx('pol_tenders')
    .where({ state_id: stateId, status: 'open' })
    .andWhere('posted_arc', '<', currentArc);

  for (const tender of openTenders) {
    const bids = await trx('pol_tender_bids')
      .join('companies', 'pol_tender_bids.company_id', 'companies.id')
      .leftJoin('characters', 'companies.owner_character_id', 'characters.id')
      .where('pol_tender_bids.tender_id', tender.id)
      .select('pol_tender_bids.*', 'companies.name as company_name', 'characters.influence', 'companies.owner_character_id');

    if (bids.length === 0) {
      await trx('pol_tenders').where({ id: tender.id }).update({ status: 'closed' });
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc: currentArc, kind: 'tender_awarded',
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
      state_id: stateId, arc: currentArc, kind: 'tender_awarded',
      headline: `Tender Awarded: ${tender.vehicle_class}`,
      body: `The ${tender.vehicle_class} procurement contract was awarded to ${winningBid.company_name} at ${winningBid.bid_price} ₯ per unit.`
    });
  }
}

async function settleTenders(trx: any, stateId: string, currentArc: number) {
  const activeTenders = await trx('pol_tenders')
    .where({ state_id: stateId, status: 'active' });

  for (const tender of activeTenders) {
    if (currentArc > tender.posted_arc + tender.duration_arcs) {
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
    const unitsBought = Math.min(Number(tender.units_per_arc), unitsInStock);

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
        game_orbit: 1, // approximate, or pull from clock if needed
        game_arc: currentArc,
        game_mark: 1,
        entry_type: 'sales',
        amount: revenue,
        balance_after: trx.raw(`(SELECT available_cash FROM company_finances WHERE company_id = ?)`, [company.id]),
        description: `Government Tender: Sold ${unitsBought} units of ${tender.vehicle_class} at ${tender.awarded_price} ₯`
      });
    }

    // Close tender if this was the final arc
    if (currentArc === tender.posted_arc + tender.duration_arcs) {
      await trx('pol_tenders').where({ id: tender.id }).update({ status: 'closed' });
    }
  }
}
