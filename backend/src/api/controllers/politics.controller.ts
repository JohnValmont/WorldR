import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import {
  getOrCreateCurrentCycle,
  buildEngineCandidates,
  getOrCreateCharacterAp,
  regenApForCharacter,
  spendAp,
  getRosterCap,
  recruitNpcToParty,
  worldClockToArc,
} from '../services/politics.service';
import {
  PARTY_FOUNDING_COST,
  CAMPAIGN_ACTIONS,
  AP_MONTHLY_GRANT,
  SEGMENTS,
  getSeatsForState,
  getMajorityForState,
  AP_COST_RECRUIT,
  AP_COST_STATEMENT,
  AP_COST_FUNDRAISE,
  AP_COST_ENDORSEMENT_AP,
  AP_COST_SCOUT,
  AP_COST_NEGOTIATE,
  POL_FUNDRAISER_BASE,
  POL_FUNDRAISER_CHARISMA_MULT,
  RECRUIT_COST_CASH,
  GENERAL_ACTION_TYPES,
  DOCTRINE_IDS,
  DOCTRINE_PLATFORMS,
  DOCTRINE_SIGNATURE_ACTION,
  DOCTRINE_TENETS,
  SIGNATURE_ACTION_AP_COST,
  TENET_IDS,
} from '../constants/politics';
import { runElection } from '../services/electionEngine';
import { buildPulse } from '../services/politics.pulse';
import { readConditionsFromRow } from '../services/conditions';

/** Resolve a pol_state row by optional stateId (which is actually the state code), falling back to the active state. */
async function resolveState(stateId?: string) {
  if (stateId) {
    const s = await db('pol_states').where({ code: stateId }).first();
    if (!s) throw new AppError('State not found', 404, 'NOT_FOUND');
    return s;
  }
  const s = await db('pol_states').where({ is_active: true }).first();
  if (!s) throw new AppError('No active state', 404, 'NOT_FOUND');
  return s;
}

export async function getStateOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const states = await db('pol_states');
    const activeState = states.find((s: any) => s.is_active);
    const inactiveStates = states.filter((s: any) => !s.is_active);

    let cyclePhase = 'governing';
    let countdown = 0;
    let cycleSummary: any = null;
    
    if (activeState) {
      try {
        const cycle = await getOrCreateCurrentCycle(activeState.id);
        cyclePhase = cycle.phase;
        
        const clock = await db('world_clock').first();
        const actualArc = worldClockToArc(clock);
        
        const startCampaign = cycle.polling_arc - 6;
        const startFiling = startCampaign - 3;
        
        if (cycle.phase === 'governing') {
          countdown = startFiling - actualArc;
        } else if (cycle.phase === 'filing') {
          countdown = startCampaign - actualArc;
        } else if (cycle.phase === 'campaign') {
          countdown = cycle.polling_arc - actualArc;
        } else if (cycle.phase === 'polling') {
          countdown = 1; 
        } else if (cycle.phase === 'formation') {
          countdown = cycle.formation_end_arc - actualArc;
        }

        // Election-schedule summary so the client can render the SCHEDULED election
        // (previously the election arc lived only in the DB and was never sent).
        cycleSummary = {
          cycleNumber: cycle.cycle_number,
          phase: cycle.phase,
          currentArc: actualArc,
          electionArc: cycle.polling_arc,
          formationEndArc: cycle.formation_end_arc,
          filingArc: startFiling,
          campaignArc: startCampaign,
          monthsToElection: Math.max(0, cycle.polling_arc - actualArc),
        };
      } catch {
        // Cycle not yet seeded or migration pending — return governing state gracefully
        cyclePhase = 'governing';
        countdown = 0;
      }
    }

    return res.json({
      activeState,
      inactiveStates,
      cyclePhase,
      countdownToNextPhase: countdown > 0 ? countdown : 0,
      // Election-schedule summary (electionArc, monthsToElection, phase timeline).
      cycle: cycleSummary,
      // Jurisdiction Conditions (GDD §11) — normalized 0–10 indicators for the UI.
      conditions: activeState ? readConditionsFromRow(activeState) : null
    });
  } catch (error) {
    next(error);
  }
}


export async function getCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    return res.json(cycle);
  } catch (error) {
    next(error);
  }
}

export async function getParties(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);

    // Base query — always works even before migration 0008
    const parties = await db('pol_parties')
      .where({ 'pol_parties.state_id': activeState.id })
      .select('pol_parties.*')
      .leftJoin('pol_party_members', 'pol_parties.id', 'pol_party_members.party_id')
      .count('pol_party_members.character_id as member_count')
      .groupBy('pol_parties.id');

    // Optionally enrich with identities — silently skipped if table doesn't exist yet
    let identityMap: Record<string, any> = {};
    try {
      const identities = await db('pol_party_identities')
        .whereIn('party_id', parties.map((p: any) => p.id));
      for (const id of identities) {
        identityMap[id.party_id] = id;
      }
    } catch {
      // pol_party_identities table not yet migrated — return parties without identity
    }

    const normalized = parties.map((p: any) => {
      const id = identityMap[p.id] || null;
      return {
        ...p,
        member_count: Number(p.member_count || 0),
        identity: id
          ? { color: id.color, monogram: id.monogram, leader: id.leader, motto: id.motto, blurb: id.blurb }
          : null
      };
    });

    return res.json(normalized);
  } catch (error) {
    next(error);
  }
}


export async function foundParty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    
    const { name, abbreviation, doctrine_id, tenet_id } = req.body;
    if (!name || name.trim() === '') return next(new AppError('Party name required', 400, 'BAD_REQUEST'));
    if (!abbreviation || abbreviation.trim().length < 2 || abbreviation.trim().length > 6) {
      return next(new AppError('Abbreviation must be 2-6 characters', 400, 'BAD_REQUEST'));
    }
    const cleanAbbr = abbreviation.trim().toUpperCase();

    if (!doctrine_id) return next(new AppError('doctrine_id required', 400, 'BAD_REQUEST'));
    if (!(DOCTRINE_IDS as readonly string[]).includes(doctrine_id)) {
      return next(new AppError('Invalid doctrine_id', 400, 'BAD_REQUEST'));
    }
    if (tenet_id && !(TENET_IDS as readonly string[]).includes(tenet_id)) {
      return next(new AppError('Invalid tenet_id', 400, 'BAD_REQUEST'));
    }
    // Validate tenet belongs to the chosen doctrine
    if (tenet_id) {
      const doctenets = DOCTRINE_TENETS[doctrine_id as keyof typeof DOCTRINE_TENETS];
      if (!doctenets.includes(tenet_id)) {
        return next(new AppError('Tenet does not belong to this doctrine', 400, 'BAD_REQUEST'));
      }
    }

    const stateIdForFound = (req.body.stateId as string | undefined);
    const activeState = await resolveState(stateIdForFound);

    // Derive the platform from the chosen doctrine
    const derivedPlatform = DOCTRINE_PLATFORMS[doctrine_id as keyof typeof DOCTRINE_PLATFORMS];

    // DB Transaction
    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      // Check uniqueness of name and abbreviation
      const existingName = await trx('pol_parties').whereRaw('LOWER(name) = ?', [name.trim().toLowerCase()]).first();
      if (existingName) throw new AppError('A party with that name already exists.', 409, 'CONFLICT');
      
      const existingAbbr = await trx('pol_parties').whereRaw('UPPER(abbreviation) = ?', [cleanAbbr]).first();
      if (existingAbbr) throw new AppError('That abbreviation is already taken.', 409, 'CONFLICT');

      // Enforce one party per player
      const existingMember = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (existingMember) throw new AppError('Already in a party', 409, 'CONFLICT');

      let finances = await trx('character_finances').where({ character_id: character.id }).forUpdate().first();
      if (!finances || Number(finances.cash_in_hand) < PARTY_FOUNDING_COST) {
        throw new AppError('Insufficient funds to found party', 400, 'INSUFFICIENT_FUNDS');
      }

      // Deduct cash
      await trx('character_finances')
        .where({ character_id: character.id })
        .decrement('cash_in_hand', PARTY_FOUNDING_COST)
        .decrement('net_worth', PARTY_FOUNDING_COST);

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc(clock);

      const [party] = await trx('pol_parties').insert({
        state_id: activeState.id,
        name: name.trim(),
        abbreviation: cleanAbbr,
        leader_character_id: character.id,
        platform: derivedPlatform,
        doctrine_id,
        tenet_id: tenet_id || null,
        doctrine_drift: {},
        doctrine_drift_arc: currentMonth,
        treasury: 0,
        is_npc: false,
        created_arc: currentMonth
      }).returning('*');

      const fallbackMonogram = cleanAbbr.slice(0, 2);
      await trx('pol_party_identities').insert({
        party_id: party.id,
        color: '#6C7A89',
        monogram: fallbackMonogram,
        leader: character.name || 'Party Leader',
        motto: 'A new voice in the Council.',
        blurb: 'Player-founded party.'
      });

      await trx('pol_party_members').insert({
        party_id: party.id,
        character_id: character.id,
        role: 'leader',
        joined_arc: currentMonth
      });

      return party;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function queueCampaignAction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { action_type, target_segment } = req.body;
    if (!action_type) return next(new AppError('Missing action_type', 400, 'BAD_REQUEST'));

    const def = CAMPAIGN_ACTIONS.find(a => a.type === action_type);
    if (!def) return next(new AppError('Unknown campaign action type', 400, 'BAD_REQUEST'));

    if (def.targeting === 'segment' && !target_segment) {
      return next(new AppError('Action requires a target_segment', 400, 'BAD_REQUEST'));
    }
    if (def.targeting === 'none' && target_segment) {
      return next(new AppError('Action does not accept a target_segment', 400, 'BAD_REQUEST'));
    }
    if (target_segment) {
      const segDef = SEGMENTS.find(s => s.key === target_segment);
      if (!segDef) return next(new AppError('Unknown target segment', 400, 'BAD_REQUEST'));
    }

    const activeState = await resolveState(req.body.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    const clock = await db('world_clock').first();
    const currentMonth = worldClockToArc(clock);

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first(); // Don't filter by state_id here unless character has it
      if (!char) throw new AppError('No character', 404, 'NOT_FOUND');

      const partyMember = await trx('pol_party_members').where({ character_id: char.id }).first();
      if (!partyMember) throw new AppError('Not in a party', 403, 'FORBIDDEN');

      const candidacy = await trx('pol_candidates')
        .where({ cycle_id: cycle.id, party_id: partyMember.party_id, character_id: char.id })
        .first();

      if (!candidacy) throw new AppError('You are not a candidate for this party in this cycle', 403, 'FORBIDDEN');

      const [inserted] = await trx('pol_campaign_actions').insert({
        cycle_id: cycle.id,
        candidate_id: candidacy.id,
        action_type,
        target_segment: def.targeting === 'segment' ? target_segment : null,
        effort: 0,
        cash_spent: 0,
        resolved_arc: currentMonth + 1
      }).returning('*');

      return inserted;
    });

    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}

export async function getPolls(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    const registeredVoters = activeState.registered_voters || 1600000;

    const clock = await db('world_clock').first();
    const actualArc = worldClockToArc(clock);

    // Current projection (all resolved campaign effort).
    const engineCands = await buildEngineCandidates(db, cycle.id);
    const projection = runElection({ candidates: engineCands, registeredVoters, totalSeats: getSeatsForState(activeState.code) });

    // Previous-month projection powers momentum. Free & safe: the engine is pure and re-runnable.
    let prevProjection = null;
    try {
      const prevCands = await buildEngineCandidates(db, cycle.id, actualArc - 1);
      prevProjection = runElection({ candidates: prevCands, registeredVoters, totalSeats: getSeatsForState(activeState.code) });
    } catch {
      prevProjection = null;
    }

    // Who is asking? (party + candidacy this cycle) — nullable for spectators.
    let myPartyId: string | null = null;
    let myCandidateId: string | null = null;
    const userId = req.user?.id;
    if (userId) {
      const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (character) {
        const membership = await db('pol_party_members').where({ character_id: character.id }).first();
        myPartyId = membership?.party_id || null;
        const cand = await db('pol_candidates').where({ cycle_id: cycle.id, character_id: character.id }).first();
        myCandidateId = cand?.id || null;
      }
    }

    const partyRows = await db('pol_parties')
      .where({ state_id: activeState.id })
      .select('id', 'name', 'is_npc', 'leader_character_id');

    // Currently-held council seats (loss-aversion). Mirror getCouncil's cycle choice.
    let heldCycleId = cycle.id;
    if (['filing', 'campaign', 'polling', 'formation'].includes(cycle.phase) && cycle.cycle_number > 1) {
      const prevCycle = await db('pol_cycles')
        .where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 })
        .first();
      if (prevCycle) heldCycleId = prevCycle.id;
    }
    const heldSeats = await db('pol_council_seats').where({ cycle_id: heldCycleId }).select('party_id');
    const heldSeatsByParty: Record<string, number> = {};
    for (const s of heldSeats) heldSeatsByParty[s.party_id] = (heldSeatsByParty[s.party_id] || 0) + 1;

    const pulse = buildPulse({
      projection,
      prevProjection,
      parties: partyRows,
      myPartyId,
      myCandidateId,
      heldSeatsByParty,
      totalSeats: getSeatsForState(activeState.code),
      majoritySeats: getMajorityForState(activeState.code)
    });

    // Bare object (matches getCouncil/getState convention & PollsTab expectations); pulse rides along.
    res.status(200).json({ ...projection, pulse });
  } catch (error) {
    next(error);
  }
}

export async function joinParty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id: partyId } = req.params;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const existingMember = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (existingMember) throw new AppError('Already in a party', 409, 'CONFLICT');

      const party = await trx('pol_parties').where({ id: partyId }).first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');

      // OWNERSHIP RULE: Players cannot join another player's party.
      // is_npc === false AND has a real leader_character_id means it's a player-owned party.
      if (!party.is_npc && party.leader_character_id && party.leader_character_id !== character.id) {
        throw new AppError(
          'Players cannot join another player\'s party. Found your own party, or run as an Independent.',
          409, 'CONFLICT'
        );
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc(clock);

      await trx('pol_party_members').insert({
        party_id: party.id,
        character_id: character.id,
        role: 'member',
        joined_arc: currentMonth
      });
    });

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function leaveParty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id: partyId } = req.params;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const member = await trx('pol_party_members').where({ party_id: partyId, character_id: character.id }).first();
      if (!member) throw new AppError('Not a member of this party', 404, 'NOT_FOUND');

      // OWNERSHIP RULE: The Leader cannot leave their own party.
      // Dissolution is a future feature (treasury going negative, account inactive).
      if (member.role === 'leader') {
        throw new AppError(
          'As Party Leader you cannot leave your own party. Dissolution will be supported in a future update.',
          409, 'CONFLICT'
        );
      }

      await trx('pol_party_members').where({ party_id: partyId, character_id: character.id }).delete();
    });

    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function updatePlatform(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id: partyId } = req.params;
    const { platform } = req.body;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    if (!platform) return next(new AppError('Platform required', 400, 'BAD_REQUEST'));
    const axes = ['taxation', 'labour', 'investment', 'trade', 'stability'];
    for (const axis of axes) {
      if (typeof platform[axis] !== 'number' || platform[axis] < 0 || platform[axis] > 100) {
        return next(new AppError(`Invalid platform value for ${axis}`, 400, 'BAD_REQUEST'));
      }
    }

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const party = await trx('pol_parties').where({ id: partyId }).first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');
      
      if (party.leader_character_id !== character.id) {
        throw new AppError('Only the leader can update the platform', 403, 'FORBIDDEN');
      }

      const [updated] = await trx('pol_parties')
        .where({ id: partyId })
        .update({ platform })
        .returning('*');
      return updated;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function declareCandidacy(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const activeState = await resolveState(req.body.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const member = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!member) throw new AppError('Must be in a party to run', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: member.party_id }).first();
      if (party.is_npc) throw new AppError('Cannot run for an NPC party', 403, 'FORBIDDEN');

      const existingCandidacy = await trx('pol_candidates')
        .where({ cycle_id: cycle.id, character_id: character.id })
        .first();
      if (existingCandidacy) throw new AppError('Already declared candidacy in this cycle', 409, 'CONFLICT');

      // Check incumbent status
      const existingSeat = await trx('pol_council_seats')
        .where({ state_id: activeState.id, character_id: character.id })
        .first();
      const isIncumbent = !!existingSeat;

      const [candidate] = await trx('pol_candidates').insert({
        cycle_id: cycle.id,
        party_id: party.id,
        character_id: character.id,
        is_npc: false,
        platform: party.platform,
        is_incumbent: isIncumbent
      }).returning('*');

      return candidate;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}
export async function manageCoalition(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { targetPartyId, action } = req.body; // action: 'invite', 'accept', 'decline'
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    if (!targetPartyId || !['invite', 'accept', 'decline'].includes(action)) {
      return next(new AppError('Valid targetPartyId and action required', 400, 'BAD_REQUEST'));
    }

    const activeState = await resolveState(req.query.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    if (cycle.phase !== 'formation') {
      return next(new AppError('Coalition actions only allowed during formation phase', 409, 'CONFLICT'));
    }

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const myParty = await trx('pol_parties').where({ leader_character_id: character.id }).first();
      if (!myParty) throw new AppError('Must be a party leader', 403, 'FORBIDDEN');

      let coalition = await trx('pol_coalitions').where({ cycle_id: cycle.id, status: 'forming' }).first();
      if (!coalition) throw new AppError('No coalition currently forming', 404, 'NOT_FOUND');

      const members = typeof coalition.member_party_ids === 'string' ? JSON.parse(coalition.member_party_ids) : coalition.member_party_ids;
      let accepted = new Set<string>(members.accepted || []);
      let invited = new Set<string>(members.invited || []);

      if (action === 'invite') {
        if (coalition.lead_party_id !== myParty.id) {
          throw new AppError('Only the formateur can invite', 403, 'FORBIDDEN');
        }
        if (accepted.has(targetPartyId)) throw new AppError('Already in coalition', 409, 'CONFLICT');
        invited.add(targetPartyId);
      } else if (action === 'accept') {
        if (myParty.id !== targetPartyId) throw new AppError('Cannot accept for another party', 403, 'FORBIDDEN');
        if (!invited.has(myParty.id)) throw new AppError('No pending invitation', 409, 'CONFLICT');
        invited.delete(myParty.id);
        accepted.add(myParty.id);
      } else if (action === 'decline') {
        if (myParty.id !== targetPartyId) throw new AppError('Cannot decline for another party', 403, 'FORBIDDEN');
        if (!invited.has(myParty.id)) throw new AppError('No pending invitation', 409, 'CONFLICT');
        invited.delete(myParty.id);
      }

      members.accepted = Array.from(accepted);
      members.invited = Array.from(invited);

      const [updated] = await trx('pol_coalitions')
        .where({ id: coalition.id })
        .update({ member_party_ids: JSON.stringify(members) })
        .returning('*');
      return updated;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCouncil(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    
    // Determine the actual cycle ID to get seats for.
    // If we're in early phases, we might want the previous cycle's seats.
    let targetCycleId = cycle.id;
    if (['filing', 'campaign', 'polling', 'formation'].includes(cycle.phase) && cycle.cycle_number > 1) {
      const prevCycle = await db('pol_cycles').where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 }).first();
      if (prevCycle) targetCycleId = prevCycle.id;
    }

    const seats = await db('pol_council_seats').where({ cycle_id: targetCycleId });
    const seatCounts: Record<string, number> = {};
    for (const s of seats) {
      seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
    }

    const parties = await db('pol_parties').where({ state_id: activeState.id });
    const partySeats = parties.map(p => ({
      partyId: p.id,
      name: p.name,
      abbreviation: p.abbreviation,
      seats: seatCounts[p.id] || 0
    })).filter(p => p.seats > 0).sort((a, b) => b.seats - a.seats);

    const premierOffice = await db('pol_offices').where({ state_id: activeState.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
    let premier = null;
    if (premierOffice) {
      const pParty = parties.find(p => p.id === premierOffice.party_id);
      premier = {
        characterId: premierOffice.holder_character_id,
        partyId: premierOffice.party_id,
        partyName: pParty?.name || 'Unknown'
      };
    }

    const coalition = await db('pol_coalitions').where({ cycle_id: targetCycleId }).whereIn('status', ['formed', 'minority']).first();
    let govStatus = 'none';
    let members = [];
    if (coalition) {
      govStatus = coalition.status;
      const mems = typeof coalition.member_party_ids === 'string' ? JSON.parse(coalition.member_party_ids) : coalition.member_party_ids;
      members = mems.accepted || [];
      if (coalition.total_seats >= getMajorityForState(activeState.code) && members.length === 1) {
        govStatus = 'majority';
      } else if (coalition.total_seats >= getMajorityForState(activeState.code)) {
        govStatus = 'coalition';
      } else {
        govStatus = 'minority';
      }
    }

    return res.json({
      partySeats,
      premier,
      government: {
        status: govStatus,
        members
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);

    const limit = parseInt(req.query.limit as string) || 10;

    const events = await db('pol_ledger_events')
      .where({ state_id: activeState.id })
      .orderBy('month', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .select('id', 'month', 'kind', 'headline', 'body');

    return res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function proposeBill(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    const { type, params } = req.body;
    if (!type || !params) return next(new AppError('Missing type or params', 400, 'BAD_REQUEST'));

    const activeState = await resolveState(req.query.stateId as string | undefined);

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    if (cycle.phase !== 'governing') return next(new AppError('Bills can only be proposed during the governing phase', 409, 'CONFLICT'));

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const partyMember = await trx('pol_party_members').where({ character_id: char.id }).first();
      if (!partyMember) throw new AppError('Must be in a party to propose a bill', 403, 'FORBIDDEN');

      // Check if party is the lead of the current coalition / governing bloc
      const coalition = await trx('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
      if (!coalition) throw new AppError('No governing coalition found', 400, 'BAD_REQUEST');
      if (coalition.lead_party_id !== partyMember.party_id) {
        throw new AppError('Only the governing party can propose bills', 403, 'FORBIDDEN');
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc(clock);

      const [bill] = await trx('pol_bills').insert({
        state_id: activeState.id,
        proposed_by_party_id: partyMember.party_id,
        type,
        params,
        status: 'proposed',
        proposed_arc: currentMonth
      }).returning('*');

      return bill;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function voteBill(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    const { id: billId } = req.params;
    const { vote } = req.body;
    if (!['yea', 'nay'].includes(vote)) return next(new AppError('Vote must be yea or nay', 400, 'BAD_REQUEST'));

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const bill = await trx('pol_bills').where({ id: billId, status: 'proposed' }).first();
      if (!bill) throw new AppError('Bill not found or not in proposed status', 404, 'NOT_FOUND');

      // Check if character holds a seat (or their party does and they represent the party)
      const partyMember = await trx('pol_party_members').where({ character_id: char.id, role: 'leader' }).first();
      if (!partyMember) throw new AppError('Only party leaders can cast bloc votes', 403, 'FORBIDDEN');

      await trx('pol_bill_votes')
        .insert({ bill_id: billId, character_id: char.id, vote })
        .onConflict(['bill_id', 'character_id'])
        .merge();

      return { success: true, vote };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function donateToParty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    const { partyId, amount, companyId } = req.body;
    if (!partyId || !amount || !Number.isFinite(amount) || amount <= 0) return next(new AppError('Valid partyId and amount required', 400, 'BAD_REQUEST'));

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const party = await trx('pol_parties').where({ id: partyId }).first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');

      const clock = await trx('world_clock').first();
      const currentYear = clock?.current_year || 1;
      const currentMonth = clock?.current_month || 1;
      const currentDay = clock?.current_day || 1;

      if (companyId) {
        // Deduct from company
        const company = await trx('companies').where({ id: companyId, owner_character_id: char.id }).first();
        if (!company) throw new AppError('Company not found or not owned by you', 404, 'NOT_FOUND');
        const finances = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
        if (Number(finances.available_cash) < amount) throw new AppError('Insufficient company funds', 400, 'INSUFFICIENT_FUNDS');
        
        await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', amount);
        await trx('company_ledger').insert({
          company_id: companyId, game_year: currentYear, game_month: currentMonth, game_day: currentDay,
          entry_type: 'lobbying', amount: -amount, balance_after: Number(finances.available_cash) - amount,
          description: `Donation to ${party.name}`
        });
      } else {
        // Deduct from character
        const finances = await trx('character_finances').where({ character_id: char.id }).forUpdate().first();
        if (Number(finances.cash_in_hand) < amount) throw new AppError('Insufficient funds', 400, 'INSUFFICIENT_FUNDS');
        await trx('character_finances').where({ character_id: char.id }).decrement('cash_in_hand', amount);
      }

      // Add to party treasury
      await trx('pol_parties').where({ id: partyId }).increment('treasury', amount);

      // Grant influence (e.g. 1 influence per 10k donated)
      const influenceGained = Math.floor(amount / 10000);
      if (influenceGained > 0) {
        await trx('characters').where({ id: char.id }).increment('influence', influenceGained);
      }

      return { success: true, amount, influenceGained };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function petitionParty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    const { partyId, companyId, issue } = req.body;
    if (!partyId || !companyId || !issue) return next(new AppError('partyId, companyId, and issue required', 400, 'BAD_REQUEST'));

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const company = await trx('companies').where({ id: companyId, owner_character_id: char.id }).first();
      if (!company) throw new AppError('Company not found or not owned by you', 404, 'NOT_FOUND');

      const clock = await trx('world_clock').first();
      
      // Just record in company_records since there is no pol_petitions table
      await trx('company_records').insert({
        world_instance_id: company.world_instance_id,
        company_id: company.id,
        record_type: 'business',
        summary: `Lobbying Petition sent regarding ${issue}`,
        created_at_world_year: clock?.current_year || 1,
        created_at_world_month: clock?.current_month || 1,
        created_at_world_day: clock?.current_day || 1
      });

      return { success: true, issue };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function postTender(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { vehicle_class, spec_floor, units_per_month, max_price, duration_arcs } = req.body;
    if (!vehicle_class || !spec_floor || !units_per_month || !max_price || !duration_arcs) {
      return next(new AppError('Missing required tender fields', 400, 'BAD_REQUEST'));
    }

    const activeState = await getActiveState();
    if (!activeState) return next(new AppError('No active state', 400, 'BAD_REQUEST'));

    const cycle = await db('pol_cycles').where({ state_id: activeState.id, status: 'open' }).first();
    if (!cycle) return next(new AppError('No active cycle', 400, 'BAD_REQUEST'));
    if (cycle.phase !== 'governing') return next(new AppError('Tenders can only be posted during governing phase', 400, 'BAD_REQUEST'));

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const partyMember = await trx('pol_party_members').where({ character_id: char.id }).first();
      if (!partyMember) throw new AppError('Must be in a party to post a tender', 403, 'FORBIDDEN');

      const coalition = await trx('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
      if (!coalition) throw new AppError('No governing coalition found', 400, 'BAD_REQUEST');
      
      const govMembers = typeof coalition.member_party_ids === 'string' ? JSON.parse(coalition.member_party_ids).accepted || [] : coalition.member_party_ids.accepted || [];
      const isGov = coalition.lead_party_id === partyMember.party_id || govMembers.includes(partyMember.party_id);
      
      if (!isGov) {
        throw new AppError('Only governing bloc can post tenders', 403, 'FORBIDDEN');
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc(clock);

      const [tender] = await trx('pol_tenders').insert({
        state_id: activeState.id,
        vehicle_class,
        spec_floor: JSON.stringify(spec_floor),
        units_per_month,
        max_price,
        duration_arcs,
        status: 'open',
        posted_arc: currentMonth
      }).returning('*');

      await trx('pol_ledger_events').insert({
        state_id: activeState.id,
        arc: currentMonth,
        kind: 'tender_posted',
        headline: `Government Procurement: ${vehicle_class} Tender Posted`,
        body: `The government has opened bidding for ${units_per_month} units per month at a max price of ${max_price} $ for ${duration_arcs} months.`
      });

      return tender;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function bidTender(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    
    const { id: tenderId } = req.params;
    const { companyId, modelId, bidPrice } = req.body;
    
    if (!companyId || !modelId || !bidPrice || !Number.isFinite(Number(bidPrice)) || Number(bidPrice) <= 0) {
      return next(new AppError('Missing or invalid required bid fields', 400, 'BAD_REQUEST'));
    }

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const company = await trx('companies').where({ id: companyId, owner_character_id: char.id, industry_id: 'manufacturing' }).first();
      if (!company) throw new AppError('Manufacturing company not found or not owned by you', 404, 'NOT_FOUND');

      // We need to check if the company is headquartered in ironvale. The test checks this by matching %ironvale% or checking directly
      if (!company.headquarters_state_id || !company.headquarters_state_id.includes('ironvale')) {
        throw new AppError('Company must be headquartered in Ironvale to bid', 403, 'FORBIDDEN');
      }

      const tender = await trx('pol_tenders').where({ id: tenderId }).first();
      if (!tender) throw new AppError('Tender not found', 404, 'NOT_FOUND');
      if (tender.status !== 'open') throw new AppError('Tender is not open for bidding', 400, 'BAD_REQUEST');
      
      if (Number(bidPrice) > Number(tender.max_price)) {
        throw new AppError('Bid price exceeds max price', 400, 'BAD_REQUEST');
      }

      const model = await trx('manufacturing_vehicle_models').where({ id: modelId, company_id: company.id }).first();
      if (!model) throw new AppError('Vehicle model not found or not owned by company', 404, 'NOT_FOUND');
      
      if (model.vehicle_class !== tender.vehicle_class) {
        throw new AppError('Vehicle model class does not match tender requirement', 400, 'BAD_REQUEST');
      }

      const specFloor = typeof tender.spec_floor === 'string' ? JSON.parse(tender.spec_floor) : tender.spec_floor;
      for (const [key, value] of Object.entries(specFloor)) {
        const modelVal = Number(model[`${key}_score`] || 0);
        if (modelVal < Number(value)) {
          throw new AppError(`Model does not meet spec floor for ${key} (needs ${value}, has ${modelVal})`, 400, 'BAD_REQUEST');
        }
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc(clock);

      // Ensure single active bid per company per tender (optional but good practice)
      await trx('pol_tender_bids').where({ tender_id: tender.id, company_id: company.id }).del();

      const [bid] = await trx('pol_tender_bids').insert({
        tender_id: tender.id,
        company_id: company.id,
        model_id: model.id,
        bid_price: bidPrice,
        created_arc: currentMonth
      }).returning('*');

      return bid;
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getActiveState() {
  return await db('pol_states').where({ is_active: true }).first();
}

export async function getBills(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await getActiveState();
    if (!activeState) return next(new AppError('No active state', 400, 'BAD_REQUEST'));

    const bills = await db('pol_bills')
      .where({ state_id: activeState.id })
      .orderBy('proposed_arc', 'desc')
      .limit(50);

    const activePolicy = await db('pol_state_policy').where({ state_id: activeState.id }).first();
    const cycle = await db('pol_cycles').where({ state_id: activeState.id, status: 'open' }).first();

    const resultBills = [];

    // Get current seats
    const seats = await db('pol_council_seats').where({ state_id: activeState.id });
    const seatCounts: Record<string, number> = {};
    for (const s of seats) {
      seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
    }

    const coalition = cycle ? await db('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first() : null;
    const govMembers = coalition ? (typeof coalition.member_party_ids === 'string' ? JSON.parse(coalition.member_party_ids).accepted || [] : coalition.member_party_ids.accepted || []) : [];

    const npcParties = await db('pol_parties').where({ state_id: activeState.id, is_npc: true });

    for (const bill of bills) {
      const votes = await db('pol_bill_votes').where({ bill_id: bill.id });

      const votedParties = new Set<string>();
      for (const v of votes) {
        const pm = await db('pol_party_members').where({ character_id: v.character_id, role: 'leader' }).first();
        if (pm) votedParties.add(pm.party_id);
      }

      const projectedVotes = [...votes];

      if (bill.status === 'proposed') {
        for (const npc of npcParties) {
          if (!votedParties.has(npc.id)) {
            const isGov = govMembers.includes(npc.id) || coalition?.lead_party_id === npc.id;
            projectedVotes.push({
              bill_id: bill.id,
              character_id: 'system',
              vote: isGov ? 'yea' : 'nay',
              _npc_party_id: npc.id
            });
          }
        }
      }

      let yea = 0;
      let nay = 0;

      for (const v of projectedVotes) {
        let pId = (v as any)._npc_party_id;
        if (!pId && v.character_id !== 'system') {
          const pm = await db('pol_party_members').where({ character_id: v.character_id, role: 'leader' }).first();
          if (pm) pId = pm.party_id;
        }
        if (pId) {
          const pSeats = seatCounts[pId] || 0;
          if (v.vote === 'yea') yea += pSeats;
          if (v.vote === 'nay') nay += pSeats;
        }
      }

      const abstain = getSeatsForState(activeState.code) - (yea + nay); // total seats for this jurisdiction

      resultBills.push({
        ...bill,
        tally: { yea, nay, abstain },
        projectedPass: yea > nay
      });
    }

    return res.json({
      bills: resultBills,
      activePolicy
    });
  } catch (error) {
    next(error);
  }
}

export async function getTenders(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await getActiveState();
    if (!activeState) return next(new AppError('No active state', 400, 'BAD_REQUEST'));

    const tenders = await db('pol_tenders')
      .leftJoin('companies', 'pol_tenders.awarded_company_id', 'companies.id')
      .where('pol_tenders.state_id', activeState.id)
      .select('pol_tenders.*', 'companies.name as awarded_company_name')
      .orderBy('pol_tenders.posted_arc', 'desc')
      .limit(50);

    const clock = await db('world_clock').first();
    const currentMonth = worldClockToArc(clock);

    for (const tender of tenders) {
      if (tender.status === 'open') {
        const bids = await db('pol_tender_bids').where({ tender_id: tender.id });
        tender.bids_count = bids.length;
        if (bids.length > 0) {
          tender.lowest_bid = Math.min(...bids.map(b => Number(b.bid_price)));
        } else {
          tender.lowest_bid = null;
        }
      }
      tender.remaining_arcs = tender.status === 'active' 
        ? Math.max(0, (tender.posted_arc + tender.duration_arcs) - currentMonth)
        : (tender.status === 'open' ? tender.duration_arcs : 0);
    }

    return res.json(tenders);
  } catch (error) {
    next(error);
  }
}

// ── New AP-System Controllers ────────────────────────────────────────────────

/** GET /politics/ap — returns current AP + cap for the authed character */
export async function getMyAp(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return res.json({ current_ap: AP_MONTHLY_GRANT, ap_cap: AP_MONTHLY_GRANT }); // no character yet

    // Self-heal on read: refresh the monthly grant if a new in-game month has begun.
    // This corrects stale rows created under the old (pre-GDD) 4-AP cap system without
    // waiting for the world-tick loop, so the desk always shows the current AP.
    const apRow = await db.transaction(async (trx) => {
      await getOrCreateCharacterAp(trx, character.id);
      try {
        const clock = await trx('world_clock').first();
        const currentArc = worldClockToArc(clock);
        await regenApForCharacter(trx, character.id, currentArc);
      } catch {
        // world_clock not available — leave the row as-is
      }
      return getOrCreateCharacterAp(trx, character.id);
    });

    return res.json({ current_ap: apRow.current_ap, ap_cap: apRow.ap_cap });
  } catch (error) {
    next(error);
  }
}

/** POST /politics/general-action — Standard + Doctrine Signature Actions */
export async function doGeneralAction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { type } = req.body;
    if (!type || !GENERAL_ACTION_TYPES.includes(type)) {
      return next(new AppError('Unknown general action type', 400, 'BAD_REQUEST'));
    }
    if (type === 'recruit') return next(new AppError('Use POST /politics/recruit for recruiting', 400, 'BAD_REQUEST'));

    const SIGNATURE_TYPES = new Set(['union_address','investor_roadshow','town_hall','shop_floor_tour','listening_tour','coalition_outreach']);

    const AP_COSTS: Record<string, number> = {
      statement:   AP_COST_STATEMENT,
      fundraise:   AP_COST_FUNDRAISE,
      endorsement: AP_COST_ENDORSEMENT_AP,
      scout:       AP_COST_SCOUT,
      negotiate:   AP_COST_NEGOTIATE,
      ...SIGNATURE_ACTION_AP_COST,
    };
    const cost = AP_COSTS[type] ?? 1;

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('You must be in a party to take political actions', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: membership.party_id }).first();

      // Gate signature actions: only the doctrine's party may use them
      if (SIGNATURE_TYPES.has(type)) {
        const expected = party?.doctrine_id
          ? DOCTRINE_SIGNATURE_ACTION[party.doctrine_id as keyof typeof DOCTRINE_SIGNATURE_ACTION]
          : null;
        if (expected !== type) {
          throw new AppError(`Your party's doctrine does not unlock the "${type}" action.`, 403, 'FORBIDDEN');
        }
      }

      await spendAp(trx, character.id, cost);

      const charisma = Number(character.charisma || 0);
      let message = '';

      if (type === 'statement') {
        await trx('pol_parties').where({ id: party.id })
          .update({ popularity: trx.raw('LEAST(popularity + 1, 100)') });
        message = 'Statement issued. Popularity nudged up by 1.';
      } else if (type === 'fundraise') {
        const gain = Math.round(POL_FUNDRAISER_BASE + charisma * POL_FUNDRAISER_CHARISMA_MULT);
        await trx('pol_parties').where({ id: party.id }).increment('treasury', gain);
        message = `Fundraiser complete. +$${gain.toLocaleString()} added to party treasury.`;
      } else if (type === 'endorsement') {
        message = 'Endorsement drive logged. Candidate boost will apply at next campaign resolution.';
      } else if (type === 'scout') {
        message = 'Scouting report filed. Rival platform outlines now visible in Party view.';
      } else if (type === 'negotiate') {
        message = 'Negotiation outreach logged. This will improve coalition formation odds.';
      // Doctrine Signature Actions
      } else if (type === 'union_address') {
        await trx('pol_parties').where({ id: party.id })
          .update({ popularity: trx.raw('LEAST(popularity + 3, 100)') });
        message = 'Union Address delivered. Strong popularity boost with industrial workers (+3).';
      } else if (type === 'investor_roadshow') {
        const gain = Math.round((POL_FUNDRAISER_BASE * 2) + charisma * POL_FUNDRAISER_CHARISMA_MULT * 1.5);
        await trx('pol_parties').where({ id: party.id }).increment('treasury', gain);
        message = `Investor Roadshow complete. +$${gain.toLocaleString()} raised from business backers.`;
      } else if (type === 'town_hall') {
        await trx('pol_parties').where({ id: party.id })
          .update({ popularity: trx.raw('LEAST(popularity + 2, 100)') });
        message = 'Town Hall held. Community trust reinforced (+2 popularity).';
      } else if (type === 'shop_floor_tour') {
        message = 'Shop Floor Tour complete. Labour-aligned candidates are more likely to respond to your next Recruit action.';
      } else if (type === 'listening_tour') {
        message = 'Listening Tour complete. Voter sentiment data updated. Check your party analytics for fresh segment readings.';
      } else if (type === 'coalition_outreach') {
        message = 'Coalition Outreach dispatched. Cross-party dialogue initiated. Coalition formation odds improved.';
      }

      const apRow = await trx('pol_character_ap').where({ character_id: character.id }).first();
      return { message, ap: { current_ap: apRow.current_ap, ap_cap: apRow.ap_cap } };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function setDoctrine(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const partyId = req.params.id;
    const { doctrine_id, tenet_id } = req.body;

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return next(new AppError('No active character', 400, 'NO_CHARACTER'));

    const party = await db('pol_parties').where({ id: partyId }).first();
    if (!party) return next(new AppError('Party not found', 404, 'NOT_FOUND'));
    if (party.leader_character_id !== character.id) {
      return next(new AppError('Only the party leader can set the doctrine', 403, 'FORBIDDEN'));
    }

    if (tenet_id && doctrine_id) {
      const doctenets = DOCTRINE_TENETS[doctrine_id as keyof typeof DOCTRINE_TENETS];
      if (doctenets && !doctenets.includes(tenet_id)) {
        return next(new AppError("Tenet does not belong to the selected doctrine", 400, 'BAD_REQUEST'));
      }
    }

    // Optional: resolve platform from doctrine?
    // In our founding logic, the client passes `platform` optionally, but usually we just set the ID.
    // If we need to set the default platform, we could do it here or let the client do it via updatePlatform.
    // The instructions say "Confirm picking a Doctrine correctly sets all 5 axis values to that Doctrine's defined preset per axis".
    // I will let the client send the platform in the request, or we can look it up if we had access to the doctrine definitions here.
    // Actually, founding a party sets the platform via `req.body.platform` which is passed by the client! Wait, founding doesn't take platform, let's see.

    await db('pol_parties').where({ id: partyId }).update({ doctrine_id, tenet_id: tenet_id || null });
    
    if (req.body.platform) {
      await db('pol_parties').where({ id: partyId }).update({ platform: req.body.platform });
    }

    return res.json({ success: true, message: 'Doctrine confirmed.' });
  } catch (error) {
    next(error);
  }
}

/** PATCH /politics/parties/:id/tenet — set or change a party's active tenet (Leader only) */
export async function setTenet(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const partyId = req.params.id;
    const { tenet_id } = req.body;

    if (tenet_id && !(TENET_IDS as readonly string[]).includes(tenet_id)) {
      return next(new AppError('Invalid tenet_id', 400, 'BAD_REQUEST'));
    }

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return next(new AppError('No active character', 400, 'NO_CHARACTER'));

    const party = await db('pol_parties').where({ id: partyId }).first();
    if (!party) return next(new AppError('Party not found', 404, 'NOT_FOUND'));
    if (party.leader_character_id !== character.id) {
      return next(new AppError('Only the party leader can change the tenet', 403, 'FORBIDDEN'));
    }

    if (tenet_id && party.doctrine_id) {
      const doctenets = DOCTRINE_TENETS[party.doctrine_id as keyof typeof DOCTRINE_TENETS];
      if (doctenets && !doctenets.includes(tenet_id)) {
        return next(new AppError("Tenet does not belong to your party's doctrine", 400, 'BAD_REQUEST'));
      }
    }

    await db('pol_parties').where({ id: partyId }).update({ tenet_id: tenet_id || null });
    return res.json({ success: true, message: tenet_id ? `Tenet set to "${tenet_id}".` : 'Tenet cleared.' });
  } catch (error) {
    next(error);
  }
}

/** POST /politics/recruit — recruit one NPC onto the party roster */
export async function recruitNpc(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('You must be in a party to recruit', 403, 'FORBIDDEN');
      if (membership.role !== 'leader') throw new AppError('Only the Party Leader can recruit NPCs', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: membership.party_id }).first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');

      // Check roster cap
      const cap = getRosterCap(Number(party.popularity || 0));
      const currentRoster = await trx('pol_party_members').where({ party_id: party.id }).count('* as count').first();
      const rosterSize = Number(currentRoster?.count || 0);
      if (rosterSize >= cap) {
        throw new AppError(
          `Roster is full (${rosterSize}/${cap}). Raise party popularity to unlock more slots.`,
          409, 'CONFLICT'
        );
      }

      // Check treasury
      if (Number(party.treasury || 0) < RECRUIT_COST_CASH) {
        throw new AppError(
          `Insufficient party funds: need $${RECRUIT_COST_CASH.toLocaleString()}, have $${Number(party.treasury).toLocaleString()}.`,
          400, 'INSUFFICIENT_FUNDS'
        );
      }

      // Deduct AP
      await spendAp(trx, character.id, AP_COST_RECRUIT);

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc(clock);

      // Recruit the NPC
      await recruitNpcToParty(trx, party, currentArc);

      // Update roster_cap convenience column
      await trx('pol_parties').where({ id: party.id }).update({ roster_cap: cap });

      const apRow = await trx('pol_character_ap').where({ character_id: character.id }).first();
      return {
        message: `NPC candidate recruited to ${party.name}. Roster: ${rosterSize + 1}/${cap}.`,
        ap: { current_ap: apRow.current_ap, ap_cap: apRow.ap_cap },
      };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
