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
  getOrCreateCharacterPc,
  spendPc,
  earnPc,
  generateFactionsForParty,
  getPartyFactions,
  createCoalitionAgreement,
  updateCoalitionAgreementHealth,
  processScandalsForState,
  interveneOnScandal,
  getPartyScandalSummary,
  getOrCreateCampaign,
  setCampaignStrategy,
  getPartyCampaignSummary,
  seedIGRelationsForParty,
  processInterestGroupsForState,
  performOutreach,
  performRallySupport,
  getPartyIGRelations,
  seedMediaRelationsForParty,
  doExclusiveInterview,
  doPressConference,
  getPartyMediaRelations,
  getRecentNews,
  getOrCreateLegacyScores,
  getLegacySummary,
  emitStory,
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
  DOCTRINE_IDENTITIES,
  DOCTRINE_SIGNATURE_ACTION,
  DOCTRINE_TENETS,
  SIGNATURE_ACTION_AP_COST,
  TENET_IDS,
  PC_SPEND_COSTS,
  PC_SPEND_ACTIONS,
  POL_CAMPAIGN_WINDOW_MONTHS,
  POL_FILING_WINDOW_MONTHS,
} from '../constants/politics';

import { runElection } from '../services/electionEngine';
import { buildPulse } from '../services/politics.pulse';
import { readNationalStatsFromRow } from '../services/nationalEconomy.service';
import { safeParseJSON } from '../../utils/json';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Resolve a pol_state row by optional stateId (code or UUID), falling back to the active state. */
async function resolveState(stateId?: string) {
  const codeOrId = stateId || 'national';
  const isUuid = UUID_REGEX.test(codeOrId);
  
  let s;
  if (isUuid) {
    s = await db('pol_states').where({ id: codeOrId }).first();
  } else {
    s = await db('pol_states').where({ code: codeOrId }).first();
  }

  if (!s) {
    s = await db('pol_states').where({ is_active: true }).first();
  }
  if (!s) {
    s = await db('pol_states').first(); // Ultimate fallback
  }
  if (!s) throw new AppError('State not found', 404, 'NOT_FOUND');
  return s;
}

export async function getStateOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const states = await db('pol_states');
    const targetCodeOrId = req.query.stateId as string | undefined;
    let activeState = targetCodeOrId 
      ? states.find((s: any) => s.code === targetCodeOrId || s.id === targetCodeOrId)
      : undefined;
    if (!activeState) {
      activeState = states.find((s: any) => s.code === 'national') || states.find((s: any) => s.is_active) || states[0];
    }
    const inactiveStates = states.filter((s: any) => !s.is_active);

    let cyclePhase = 'governing';
    let countdown = 0;
    let cycleSummary: any = null;
    let globalParty: any = null;

    if (req.user?.id) {
      try {
        const character = await db('characters').where({ user_id: req.user.id, status: 'active' }).first();
        if (character) {
          const member = await db('pol_party_members').where({ character_id: character.id }).first();
          if (member) {
            globalParty = await db('pol_parties').where({ id: member.party_id }).first();
            if (globalParty) {
              const members = await db('pol_party_members')
                .join('characters', 'pol_party_members.character_id', 'characters.id')
                .where('pol_party_members.party_id', globalParty.id)
                .select(
                  'characters.id', 'characters.name', 'characters.ideology_score_economic', 
                  'characters.ideology_score_social', 'characters.influence', 
                  'characters.credibility', 'pol_party_members.role'
                );
              globalParty.members = members;
            }
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    
    let pendingPetitions: any[] = [];
    if (activeState) {
      if (globalParty && globalParty.leader_character_id === req.user?.id) {
        try {
          pendingPetitions = await db('pol_petitions')
            .join('companies', 'pol_petitions.company_id', 'companies.id')
            .where({
              'pol_petitions.party_id': globalParty.id,
              'pol_petitions.status': 'pending'
            })
            .select('pol_petitions.*', 'companies.name as company_name');
        } catch (e) {
          // Table might not exist yet if migration pending
        }
      }
      try {
        const cycle = await getOrCreateCurrentCycle(activeState.id);
        cyclePhase = cycle.phase;
        
        const clock = await db('world_clock').first();
        const actualArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });
        
        const startCampaign = cycle.polling_arc - POL_CAMPAIGN_WINDOW_MONTHS;
        const startFiling = startCampaign - POL_FILING_WINDOW_MONTHS;
        
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
      // Jurisdiction Conditions (GDD $11) — normalized 0–10 indicators for the UI.
      conditions: activeState ? readNationalStatsFromRow(activeState) : null,
      globalParty,
      pendingPetitions
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
      .select('pol_parties.*', db.raw('(SELECT count(*) FROM pol_party_members WHERE pol_party_members.party_id = pol_parties.id) as member_count'));

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
    
    const { name, abbreviation, doctrine_id, tenet_id, slogan, colorHex, crisis, ideologyAxes, policies, founders } = req.body;
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

    const stateIdForFound = (req.query.stateId as string | undefined) || (req.body.stateId as string | undefined);
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
      const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      const [party] = await trx('pol_parties').insert({
        state_id: activeState.id,
        name: name.trim(),
        abbreviation: cleanAbbr,
        leader_character_id: character.id,
        platform: JSON.stringify(derivedPlatform),
        doctrine_id,
        tenet_id: tenet_id || null,
        doctrine_drift: JSON.stringify({}),
        doctrine_drift_arc: currentMonth,
        treasury: 0,
        is_npc: false,
        created_arc: currentMonth,
        slogan: slogan || null,
        crisis_id: crisis || null,
        ideology_axes: ideologyAxes ? JSON.stringify(ideologyAxes) : null,
        manifesto_policies: policies ? JSON.stringify(policies) : null,
        founders: founders ? JSON.stringify(founders) : JSON.stringify([])
      }).returning('*');

      const fallbackMonogram = cleanAbbr.slice(0, 2);
      const ident = DOCTRINE_IDENTITIES[doctrine_id as keyof typeof DOCTRINE_IDENTITIES];
      await trx('pol_party_identities').insert({
        party_id: party.id,
        color: colorHex || ident?.color || '#6C7A89',
        monogram: fallbackMonogram,
        leader: character.name || 'Party Leader',
        motto: slogan || ident?.tagline || 'A new voice in the Council.',
        blurb: ident?.blurb || 'Player-founded party.'
      });

      await trx('pol_party_members').insert({
        party_id: party.id,
        character_id: character.id,
        role: 'leader',
        joined_arc: currentMonth
      });

      // Generate the party's internal factions based on its doctrine.
      // Wrapped individually: these are enrichment steps. If a supporting table
      // doesn't exist yet in this environment the party must still be created.
      try { await generateFactionsForParty(trx, party.id, doctrine_id, currentMonth); }
      catch (e) { console.warn('[foundParty] generateFactionsForParty skipped:', (e as any)?.message); }

      // Seed interest group relations for the new party
      try { await seedIGRelationsForParty(trx, party.id, activeState.id, crisis || null); }
      catch (e) { console.warn('[foundParty] seedIGRelationsForParty skipped:', (e as any)?.message); }

      // Seed media relations for the new party
      try { await seedMediaRelationsForParty(trx, party.id, activeState.id); }
      catch (e) { console.warn('[foundParty] seedMediaRelationsForParty skipped:', (e as any)?.message); }

      // Emit news story about the party foundation
      try {
        await emitStory(
          trx, activeState.id, party.id, currentMonth, 'campaign_event',
          `New Political Party Formed: ${party.name}`,
          `${character.name} has officially announced the foundation of ${party.name} (${cleanAbbr}), running on a ${doctrine_id.replace(/_/g, ' ')} platform.`
        );
      } catch (e) { console.warn('[foundParty] emitStory skipped:', (e as any)?.message); }

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
    const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

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
    const actualArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });
    
    const conditions = await readNationalStatsFromRow(activeState);
    const constituenciesRows = await db('pol_constituencies').where({ state_id: activeState.id });
    const engineConstituencies = constituenciesRows.map(r => ({
      id: r.id,
      registeredVoters: r.registered_voters || 80000,
      conditions
    }));

    // Current projection (all resolved campaign effort).
    const engineCands = await buildEngineCandidates(db, cycle.id);
    const projection = runElection({ candidates: engineCands, constituencies: engineConstituencies });

    // Previous-month projection powers momentum. Free & safe: the engine is pure and re-runnable.
    let prevProjection = null;
    try {
      const prevCands = await buildEngineCandidates(db, cycle.id, actualArc - 1);
      prevProjection = runElection({ candidates: prevCands, constituencies: engineConstituencies });
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
    if (['filing', 'campaign', 'polling'].includes(cycle.phase) && cycle.cycle_number > 1) {
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
      const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

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

      if (member.role === 'leader') {
        throw new AppError(
          'As Party Leader you cannot leave your own party. You must transfer leadership or dissolve the party.',
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

export async function dissolveParty(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id: partyId } = req.params;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const member = await trx('pol_party_members').where({ party_id: partyId, character_id: character.id }).first();
      if (!member) throw new AppError('Not a member of this party', 404, 'NOT_FOUND');

      if (member.role !== 'leader') {
        throw new AppError('Only the Party Leader can dissolve the party.', 403, 'FORBIDDEN');
      }

      // Check if there are other player members
      const otherPlayers = await trx('pol_party_members')
        .where({ party_id: partyId, is_recruited_npc: false })
        .whereNot({ character_id: character.id });
        
      if (otherPlayers.length > 0) {
        throw new AppError('Cannot dissolve a party with other player members. Transfer leadership instead.', 409, 'CONFLICT');
      }

      // Scrub party from pol_coalitions member_party_ids (JSONB)
      const seatsToDelete = await trx('pol_council_seats').where({ party_id: partyId }).count('* as count').first();
      const partySeats = Number(seatsToDelete?.count || 0);

      const coalitions = await trx('pol_coalitions').forUpdate();
      for (const c of coalitions) {
        let updated = false;
        let lostSeats = false;
        const members = typeof c.member_party_ids === 'string' ? safeParseJSON(c.member_party_ids) : (c.member_party_ids ?? {});
        if (members && members.accepted && Array.isArray(members.accepted)) {
          const originalLen = members.accepted.length;
          members.accepted = members.accepted.filter((id: string) => id !== partyId);
          if (members.accepted.length !== originalLen) {
            updated = true;
            lostSeats = true;
          }
        }
        if (members && members.invited && Array.isArray(members.invited)) {
          const originalLen = members.invited.length;
          members.invited = members.invited.filter((id: string) => id !== partyId);
          if (members.invited.length !== originalLen) updated = true;
        }
        if (updated) {
          const updateData: any = { member_party_ids: JSON.stringify(members) };
          if (lostSeats) {
            updateData.total_seats = Math.max(0, Number(c.total_seats) - partySeats);
          }
          await trx('pol_coalitions').where({ id: c.id }).update(updateData);
        }
      }


      await trx('pol_parties').where({ id: partyId }).delete();
    });

    return res.json({ success: true, message: 'Party dissolved.' });
  } catch (error) {
    next(error);
  }
}

export async function transferLeadership(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const { id: partyId } = req.params;
    const { targetCharacterId } = req.body;
    
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    if (!targetCharacterId) return next(new AppError('targetCharacterId required', 400, 'BAD_REQUEST'));

    await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const member = await trx('pol_party_members').where({ party_id: partyId, character_id: character.id }).first();
      if (!member || member.role !== 'leader') {
        throw new AppError('Only the Party Leader can transfer leadership.', 403, 'FORBIDDEN');
      }

      const targetMember = await trx('pol_party_members').where({ party_id: partyId, character_id: targetCharacterId }).first();
      if (!targetMember) throw new AppError('Target character is not in the party', 404, 'NOT_FOUND');
      if (targetMember.is_recruited_npc) throw new AppError('Cannot transfer leadership to an NPC candidate.', 400, 'BAD_REQUEST');

      await trx('pol_parties').where({ id: partyId }).update({ leader_character_id: targetCharacterId });
      await trx('pol_party_members').where({ party_id: partyId, character_id: targetCharacterId }).update({ role: 'leader' });
      await trx('pol_party_members').where({ party_id: partyId, character_id: character.id }).update({ role: 'member' });
    });

    return res.json({ success: true, message: 'Leadership transferred.' });
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
        .update({ platform: JSON.stringify(platform) })
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

    const { stateId, constituencyId } = req.body;
    if (!constituencyId) return next(new AppError('Must select a constituency', 400, 'BAD_REQUEST'));

    const activeState = await resolveState(stateId as string | undefined);
    const cycle = await getOrCreateCurrentCycle(activeState.id);
    const clock = await db('world_clock').first();
    const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const member = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!member) throw new AppError('Must be in a party to run', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: member.party_id }).forUpdate().first();
      if (party.is_npc) throw new AppError('Cannot run for an NPC party', 403, 'FORBIDDEN');

      const existingCandidacy = await trx('pol_candidates')
        .where({ cycle_id: cycle.id, character_id: character.id })
        .first();
      if (existingCandidacy) throw new AppError('Already declared candidacy in this cycle', 409, 'CONFLICT');

      // Check if there is already a candidate for this constituency in the same party
      const existingConstituencyCand = await trx('pol_candidates')
        .where({ cycle_id: cycle.id, party_id: party.id, constituency_id: constituencyId })
        .first();

      if (existingConstituencyCand) {
        if (existingConstituencyCand.character_id !== null) {
          throw new AppError('Party already has a named candidate in this constituency', 409, 'CONFLICT');
        } else {
          // Replace the generic NPC candidate
          await trx('pol_candidates').where({ id: existingConstituencyCand.id }).del();
        }
      }

      // Check incumbent status
      let targetCycleId = cycle.id;
      if (cycle.cycle_number > 1) {
        const prevCycle = await trx('pol_cycles').where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 }).first();
        if (prevCycle) targetCycleId = prevCycle.id;
      }
      
      const existingSeat = await trx('pol_council_seats')
        .where({ cycle_id: targetCycleId, character_id: character.id })
        .first();
      const isIncumbent = !!existingSeat;

      const [candidate] = await trx('pol_candidates').insert({
        cycle_id: cycle.id,
        party_id: party.id,
        constituency_id: constituencyId,
        character_id: character.id,
        is_npc: false,
        platform: party.platform,
        is_incumbent: isIncumbent
      }).returning('*');

      // Spawn campaign object for this party if it doesn't exist yet
      await getOrCreateCampaign(trx, cycle.id, party.id, currentMonth);

      return candidate;
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getFormingCoalition(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);
    const cycle = await getOrCreateCurrentCycle(activeState.id);

    if (cycle.phase !== 'formation') {
      return res.json({ coalition: null });
    }

    const coalition = await db('pol_coalitions')
      .where({ cycle_id: cycle.id, status: 'forming' })
      .first();

    if (!coalition) return res.json({ coalition: null });

    const members = typeof coalition.member_party_ids === 'string' 
      ? safeParseJSON(coalition.member_party_ids) 
      : (coalition.member_party_ids ?? { accepted: [], invited: [] });
    
    const partyIds = new Set([
      coalition.lead_party_id,
      ...(members.accepted || []),
      ...(members.invited || [])
    ].filter(Boolean));

    const parties = await db('pol_parties').whereIn('id', Array.from(partyIds));
    const seatsResult = await db('pol_council_seats').where({ cycle_id: cycle.id });
    
    const seatMap: Record<string, number> = {};
    for (const s of seatsResult) {
      seatMap[s.party_id] = (seatMap[s.party_id] || 0) + 1;
    }

    const enrichParty = (id: string) => {
      const p = parties.find((p: any) => p.id === id);
      return p ? { id: p.id, name: p.name, abbreviation: p.abbreviation, seats: seatMap[id] || 0 } : null;
    };

    const formateur = enrichParty(coalition.lead_party_id);
    const accepted = (members.accepted || []).map(enrichParty).filter(Boolean);
    const invited = (members.invited || []).map(enrichParty).filter(Boolean);

    return res.json({
      coalition: {
        id: coalition.id,
        formateur,
        accepted,
        invited
      }
    });

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

      let coalition = await trx('pol_coalitions').where({ cycle_id: cycle.id, status: 'forming' }).forUpdate().first();
      if (!coalition) throw new AppError('No coalition currently forming', 404, 'NOT_FOUND');

      const members = typeof coalition.member_party_ids === 'string' ? safeParseJSON(coalition.member_party_ids) : coalition.member_party_ids;
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
    if (['filing', 'campaign', 'polling'].includes(cycle.phase) && cycle.cycle_number > 1) {
      const prevCycle = await db('pol_cycles').where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 }).first();
      if (prevCycle) targetCycleId = prevCycle.id;
    }

    const seats = await db('pol_council_seats').where({ cycle_id: targetCycleId });
    const seatCounts: Record<string, number> = {};
    for (const s of seats) {
      seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
    }

    if (seats.length === 0) {
      try {
        const engineCands = await buildEngineCandidates(db, cycle.id);
        const constituenciesRows = await db('pol_constituencies').where({ state_id: activeState.id });
        const engineConstituencies = constituenciesRows.map(r => ({
          id: r.id,
          registeredVoters: r.registered_voters || 80000,
          conditions: readNationalStatsFromRow(activeState)
        }));
        const projection = runElection({ candidates: engineCands, constituencies: engineConstituencies });
        for (const p of projection.perParty) {
          seatCounts[p.partyId] = p.seats;
        }
      } catch (err) {
        // Fallback if candidates fail
      }
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
      let charName = 'Unknown';
      if (premierOffice.holder_character_id) {
        const char = await db('characters').where({ id: premierOffice.holder_character_id }).first();
        if (char) charName = char.name;
      }
      premier = {
        characterId: premierOffice.holder_character_id,
        characterName: charName,
        partyId: premierOffice.party_id,
        partyName: pParty?.name || 'Unknown'
      };
    }

    const coalition = await db('pol_coalitions').where({ cycle_id: targetCycleId }).whereIn('status', ['formed', 'minority']).first();
    let govStatus = 'none';
    let members: string[] = [];
    if (coalition) {
      const mems = typeof coalition.member_party_ids === 'string' ? safeParseJSON(coalition.member_party_ids) : (coalition.member_party_ids ?? {});
      members = mems.accepted || (Array.isArray(mems) ? mems : []);
      if (coalition.total_seats >= getMajorityForState(activeState.code) && members.length === 1) {
        govStatus = 'majority';
      } else if (coalition.total_seats >= getMajorityForState(activeState.code)) {
        govStatus = 'coalition';
      } else {
        govStatus = 'minority';
      }
    }

    // Identify Official Opposition: largest non-government party by seats
    const govPartyIds = new Set<string>([
      ...(coalition ? [coalition.lead_party_id] : []),
      ...members
    ]);
    const oppositionParty = partySeats.find(p => !govPartyIds.has(p.partyId));
    const opposition = oppositionParty
      ? { partyId: oppositionParty.partyId, name: oppositionParty.name, seats: oppositionParty.seats }
      : null;

    return res.json({
      partySeats,
      premier,
      government: {
        status: govStatus,
        members
      },
      opposition
    });
  } catch (error) {
    next(error);
  }
}

export async function getLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const isGlobal = req.query.global === 'true';
    let stateId: string | null = null;
    if (!isGlobal) {
      const activeState = await resolveState(req.query.stateId as string | undefined);
      stateId = activeState.id;
    }

    const rawLimit = parseInt(req.query.limit as string);
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 10;

    let query = db('pol_ledger_events')
      .orderBy('arc', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
      .select('id', 'arc', 'kind', 'headline', 'body', 'state_id');

    if (stateId) {
      query = query.where({ state_id: stateId });
    }

    const events = await query;
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
    // Note: route-level blockPhases('polling', 'formation') already gates this endpoint.
    // No additional phase check needed here — governing party ownership is the gate.

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const partyMember = await trx('pol_party_members').where({ character_id: char.id }).first();
      if (!partyMember) throw new AppError('Must be in a party to propose a bill', 403, 'FORBIDDEN');

      // Check if party is the lead of the current coalition / governing bloc.
      // Fall back to the previous cycle's coalition when the new cycle has just
      // started and no new coalition record exists yet (post-rollover window).
      let coalition = await trx('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
      if (!coalition && cycle.cycle_number > 1) {
        const prevCycle = await trx('pol_cycles')
          .where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 })
          .first();
        if (prevCycle) {
          coalition = await trx('pol_coalitions').where({ cycle_id: prevCycle.id }).whereIn('status', ['formed', 'minority']).first();
        }
      }
      if (!coalition) throw new AppError('No governing coalition found — bills can only be proposed while a government is in power', 400, 'BAD_REQUEST');
      if (coalition.lead_party_id !== partyMember.party_id) {
        throw new AppError('Only the governing party can propose bills', 403, 'FORBIDDEN');
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      await spendAp(trx, char.id, 2);
      await spendPc(trx, char.id, 2);

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
    const { partyId, companyId, policyCategory, desiredOption, offeredFunds } = req.body;
    
    if (!partyId || !companyId || !policyCategory || !desiredOption) {
      return next(new AppError('partyId, companyId, policyCategory, desiredOption required', 400, 'BAD_REQUEST'));
    }

    const funds = Number(offeredFunds) || 0;
    if (funds < 0) return next(new AppError('Invalid funds amount', 400, 'BAD_REQUEST'));

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const company = await trx('companies').where({ id: companyId, owner_character_id: char.id }).first();
      if (!company) throw new AppError('Company not found or not owned by you', 404, 'NOT_FOUND');

      const party = await trx('pol_parties').where({ id: partyId }).first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');

      if (funds > 0) {
        const finances = await trx('company_finances').where({ company_id: company.id }).first();
        if (!finances || Number(finances.available_cash) < funds) {
          throw new AppError('Insufficient company funds', 400, 'BAD_REQUEST');
        }
        await trx('company_finances').where({ company_id: company.id }).decrement('available_cash', funds);
      }

      const clock = await trx('world_clock').first();
      const currentArc = (clock?.current_year || 1) * 12 + (clock?.current_month || 1);
      
      const petition = await trx('pol_petitions').insert({
        state_id: party.state_id,
        company_id: companyId,
        party_id: partyId,
        policy_category: policyCategory,
        desired_option: desiredOption,
        offered_funds: funds,
        status: 'pending',
        created_arc: currentArc
      }).returning('*').then((r: any[]) => r[0]);

      await trx('company_records').insert({
        world_instance_id: company.world_instance_id,
        company_id: company.id,
        record_type: 'business',
        summary: `Lobbying Petition sent to ${party.name} regarding ${policyCategory} (${desiredOption}) for $${funds}`,
        created_at_world_year: clock?.current_year || 1,
        created_at_world_month: clock?.current_month || 1,
        created_at_world_day: clock?.current_day || 1
      });

      return { success: true, petition };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function respondToPetition(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    
    const petitionId = req.params.id;
    const { action } = req.body; // 'accept' or 'reject'
    
    if (action !== 'accept' && action !== 'reject') {
      return next(new AppError('Invalid action', 400, 'BAD_REQUEST'));
    }

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const petition = await trx('pol_petitions').where({ id: petitionId }).first();
      if (!petition) throw new AppError('Petition not found', 404, 'NOT_FOUND');
      
      if (petition.status !== 'pending') {
        throw new AppError(`Petition is already ${petition.status}`, 400, 'BAD_REQUEST');
      }

      const party = await trx('pol_parties').where({ id: petition.party_id }).first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');

      if (party.leader_character_id !== char.id) {
        throw new AppError('Only the party leader can respond to petitions', 403, 'FORBIDDEN');
      }

      const clock = await trx('world_clock').first();
      const currentArc = (clock?.current_year || 1) * 12 + (clock?.current_month || 1);

      if (action === 'accept') {
        if (Number(petition.offered_funds) > 0) {
          await trx('pol_parties').where({ id: party.id }).increment('treasury', Number(petition.offered_funds));
        }
        await trx('pol_petitions').where({ id: petitionId }).update({
          status: 'accepted',
          resolved_arc: currentArc
        });
        
        const company = await trx('companies').where({ id: petition.company_id }).first();
        await trx('pol_ledger_events').insert({
          state_id: party.state_id, arc: currentArc, kind: 'petition_accepted',
          headline: `Lobbying Deal Reached`,
          body: `${party.name} has accepted a lobbying petition from ${company?.name || 'a corporation'} regarding ${petition.policy_category}.`
        });
      } else {
        // Refund the company
        if (Number(petition.offered_funds) > 0) {
          await trx('company_finances').where({ company_id: petition.company_id }).increment('available_cash', Number(petition.offered_funds));
        }
        await trx('pol_petitions').where({ id: petitionId }).update({
          status: 'rejected',
          resolved_arc: currentArc
        });
      }

      return { success: true, action };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getMyPetitions(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
    
    const char = await db('characters').where({ user_id: userId }).first();
    if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

    const companies = await db('companies').where({ owner_character_id: char.id });
    if (!companies.length) return res.json([]);

    const petitions = await db('pol_petitions')
      .join('pol_parties', 'pol_petitions.party_id', 'pol_parties.id')
      .whereIn('company_id', companies.map((c: any) => c.id))
      .select('pol_petitions.*', 'pol_parties.name as party_name')
      .orderBy('pol_petitions.created_at', 'desc');

    return res.json(petitions);
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
    // Note: route already applies blockPhases('polling', 'formation').
    // The governing-party ownership check (coalition membership) is the real gate here.

    const result = await db.transaction(async (trx) => {
      const char = await trx('characters').where({ user_id: userId }).first();
      if (!char) throw new AppError('No character found', 404, 'NOT_FOUND');

      const partyMember = await trx('pol_party_members').where({ character_id: char.id }).first();
      if (!partyMember) throw new AppError('Must be in a party to post a tender', 403, 'FORBIDDEN');

      const coalition = await trx('pol_coalitions').where({ cycle_id: cycle.id }).whereIn('status', ['formed', 'minority']).first();
      if (!coalition) throw new AppError('No governing coalition found', 400, 'BAD_REQUEST');
      
      const parsedMembers = typeof coalition.member_party_ids === 'string' ? safeParseJSON(coalition.member_party_ids) : (coalition.member_party_ids ?? {});
      const govMembers = parsedMembers.accepted || (Array.isArray(parsedMembers) ? parsedMembers : []);
      const isGov = coalition.lead_party_id === partyMember.party_id || govMembers.includes(partyMember.party_id);
      
      if (!isGov) {
        throw new AppError('Only governing bloc can post tenders', 403, 'FORBIDDEN');
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

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

      const tender = await trx('pol_tenders').where({ id: tenderId }).first();
      if (!tender) throw new AppError('Tender not found', 404, 'NOT_FOUND');
      if (tender.status !== 'open') throw new AppError('Tender is not open for bidding', 400, 'BAD_REQUEST');

      if (!company.headquarters_state_id || company.headquarters_state_id !== tender.state_id) {
        throw new AppError('Company must be headquartered in the same state to bid on this tender', 403, 'FORBIDDEN');
      }
      
      if (Number(bidPrice) > Number(tender.max_price)) {
        throw new AppError('Bid price exceeds max price', 400, 'BAD_REQUEST');
      }

      const model = await trx('manufacturing_vehicle_models').where({ id: modelId, company_id: company.id }).first();
      if (!model) throw new AppError('Vehicle model not found or not owned by company', 404, 'NOT_FOUND');
      
      if (model.vehicle_class !== tender.vehicle_class) {
        throw new AppError('Vehicle model class does not match tender requirement', 400, 'BAD_REQUEST');
      }

      const specFloor = typeof tender.spec_floor === 'string' ? safeParseJSON(tender.spec_floor) : tender.spec_floor;
      for (const [key, value] of Object.entries(specFloor)) {
        const modelVal = Number(model[`${key}_score`] || 0);
        if (modelVal < Number(value)) {
          throw new AppError(`Model does not meet spec floor for ${key} (needs ${value}, has ${modelVal})`, 400, 'BAD_REQUEST');
        }
      }

      const clock = await trx('world_clock').first();
      const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

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
    const activeState = await resolveState(req.query.stateId as string | undefined);
    if (!activeState) return next(new AppError('No active state', 400, 'BAD_REQUEST'));

    const bills = await db('pol_bills')
      .where({ state_id: activeState.id })
      .orderBy('proposed_arc', 'desc')
      .limit(50);

    const activePolicy = await db('pol_state_policy').where({ state_id: activeState.id }).first();
    const cycle = await getOrCreateCurrentCycle(activeState.id);

    const resultBills = [];

    // Get current seats
    let targetCycleId = cycle.id;
    if (['filing', 'campaign', 'polling'].includes(cycle.phase) && cycle.cycle_number > 1) {
      const prevCycle = await db('pol_cycles').where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 }).first();
      if (prevCycle) targetCycleId = prevCycle.id;
    }

    const seats = await db('pol_council_seats').where({ cycle_id: targetCycleId });
    const seatCounts: Record<string, number> = {};
    for (const s of seats) {
      seatCounts[s.party_id] = (seatCounts[s.party_id] || 0) + 1;
    }

    // Coal lookup must use the SAME targetCycleId as the seat counts above so
    // yea/nay tallies are consistent. Fall back to previous cycle after rollover.
    let coalition = cycle ? await db('pol_coalitions').where({ cycle_id: targetCycleId }).whereIn('status', ['formed', 'minority']).first() : null;
    if (!coalition && cycle && cycle.cycle_number > 1 && targetCycleId === cycle.id) {
      // targetCycleId is still current cycle (governing phase); look in prev cycle as fallback
      const prevForCoalition = await db('pol_cycles').where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 }).first();
      if (prevForCoalition) coalition = await db('pol_coalitions').where({ cycle_id: prevForCoalition.id }).whereIn('status', ['formed', 'minority']).first();
    }
    const parsedGovMembers = coalition ? (typeof coalition.member_party_ids === 'string' ? safeParseJSON(coalition.member_party_ids) : (coalition.member_party_ids ?? {})) : {};
    const govMembers = parsedGovMembers.accepted || (Array.isArray(parsedGovMembers) ? parsedGovMembers : []);

    const npcParties = await db('pol_parties').where({ state_id: activeState.id, is_npc: true });

    const majority = getMajorityForState(activeState.code);

    // Batch: pre-load all leader→party mappings so the bill loop has no per-vote DB calls
    const allLeaders = await db('pol_party_members').where({ role: 'leader' }).whereNotNull('character_id');
    const leaderToParty: Record<string, string> = {};
    for (const l of allLeaders) {
      if (l.character_id) leaderToParty[l.character_id] = l.party_id;
    }

    for (const bill of bills) {
      const votes = await db('pol_bill_votes').where({ bill_id: bill.id });

      const votedParties = new Set<string>();
      for (const v of votes) {
        const pId = leaderToParty[v.character_id];
        if (pId) votedParties.add(pId);
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
          pId = leaderToParty[v.character_id];
        }
        if (pId) {
          const pSeats = seatCounts[pId] || 0;
          if (v.vote === 'yea') yea += pSeats;
          if (v.vote === 'nay') nay += pSeats;
        }
      }

      const abstain = Math.max(0, getSeatsForState(activeState.code) - (yea + nay)); // total seats for this jurisdiction

      resultBills.push({
        ...bill,
        tally: { yea, nay, abstain },
        projectedPass: yea >= majority
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
    const activeState = await resolveState(req.query.stateId as string | undefined);
    if (!activeState) return next(new AppError('No active state', 400, 'BAD_REQUEST'));

    const tenders = await db('pol_tenders')
      .leftJoin('companies', 'pol_tenders.awarded_company_id', 'companies.id')
      .where('pol_tenders.state_id', activeState.id)
      .select('pol_tenders.*', 'companies.name as awarded_company_name')
      .orderBy('pol_tenders.posted_arc', 'desc')
      .limit(50);

    const clock = await db('world_clock').first();
    const currentMonth = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

    // Batch: load all bids for open tenders in one query to avoid N+1
    const openTenderIds = tenders.filter(t => t.status === 'open').map(t => t.id);
    const allBids = openTenderIds.length > 0
      ? await db('pol_tender_bids').whereIn('tender_id', openTenderIds)
      : [];
    const bidsByTender: Record<string, any[]> = {};
    for (const bid of allBids) {
      if (!bidsByTender[bid.tender_id]) bidsByTender[bid.tender_id] = [];
      bidsByTender[bid.tender_id].push(bid);
    }

    for (const tender of tenders) {
      if (tender.status === 'open') {
        const bids = bidsByTender[tender.id] || [];
        tender.bids_count = bids.length;
        if (bids.length > 0) {
          tender.lowest_bid = Math.min(...bids.map(b => Number(b.bid_price)));
        } else {
          tender.lowest_bid = null;
        }
      }
      tender.remaining_arcs = tender.status === 'active'
        ? Math.max(0, ((tender.posted_arc || 0) + (tender.duration_arcs || 0)) - currentMonth)
        : (tender.status === 'open' ? (tender.duration_arcs || 0) : 0);
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
        const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });
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

    await spendAp(db, character.id, 5);
    await spendPc(db, character.id, 5);

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
      await db('pol_parties').where({ id: partyId }).update({ platform: JSON.stringify(req.body.platform) });
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

    await spendAp(db, character.id, 1);
    await spendPc(db, character.id, 1);

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

      const party = await trx('pol_parties').where({ id: membership.party_id }).forUpdate().first();
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
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

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

// ── Political Capital Controllers ─────────────────────────────────────────────

/** GET /politics/pc — returns current PC + cap for the authed character */
export async function getMyPc(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return res.json({ current_pc: 0, pc_cap: 10 });

    const row = await db.transaction(async (trx) => {
      return getOrCreateCharacterPc(trx, character.id);
    });

    return res.json({ current_pc: row.current_pc ?? 0, pc_cap: row.pc_cap ?? 10 });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/pc/spend
 * Body: { action: PcSpendAction, faction_id?: string }
 * Spends PC on a high-stakes political intervention.
 */
export async function spendPcAction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { action, faction_id } = req.body;
    if (!action || !(PC_SPEND_ACTIONS as readonly string[]).includes(action)) {
      return next(new AppError('Invalid PC spend action', 400, 'BAD_REQUEST'));
    }

    const cost = PC_SPEND_COSTS[action as keyof typeof PC_SPEND_COSTS];

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('You must be in a party to spend Political Capital', 403, 'FORBIDDEN');

      // Gate: emergency_decree requires Premier office
      if (action === 'emergency_decree') {
        const office = await trx('pol_offices').where({ holder_character_id: character.id }).first();
        if (!office) throw new AppError('Emergency Decree requires the Premier office', 403, 'FORBIDDEN');
      }

      await spendPc(trx, character.id, cost);

      const party = await trx('pol_parties').where({ id: membership.party_id }).first();
      let message = '';

      switch (action) {
        case 'force_vote':
          message = 'Political Capital spent. A parliamentary vote has been forced — your whips are mobilised.';
          break;
        case 'negotiate_strength':
          message = 'Leverage applied. Your coalition negotiation position has been strengthened.';
          break;
        case 'rally_base': {
          const lowestFaction = await trx('pol_party_factions')
            .where({ party_id: membership.party_id })
            .orderBy('loyalty', 'asc').first();
          if (lowestFaction) {
            const newLoyalty = Math.min(100, Number(lowestFaction.loyalty) + 20);
            await trx('pol_party_factions')
              .where({ id: lowestFaction.id })
              .update({ loyalty: newLoyalty, is_restless: newLoyalty < 35 });
            message = `Emergency rally held. The ${lowestFaction.name} faction loyalty restored to ${newLoyalty}%.`;
          } else {
            message = 'Rally held. Party morale boosted.';
          }
          break;
        }
        case 'discipline_faction': {
          if (!faction_id) throw new AppError('faction_id required for discipline_faction', 400, 'BAD_REQUEST');
          const faction = await trx('pol_party_factions')
            .where({ id: faction_id, party_id: membership.party_id }).first();
          if (!faction) throw new AppError('Faction not found', 404, 'NOT_FOUND');
          const newLoyalty = Math.min(100, Number(faction.loyalty) + 15);
          await trx('pol_party_factions')
            .where({ id: faction_id })
            .update({ loyalty: newLoyalty, is_restless: false });
          message = `${faction.name} brought back into line. Loyalty +15 → ${newLoyalty}%.`;
          break;
        }
        case 'suppress_scandal':
          message = 'Scandal suppressed at the rumour stage. Investigative trail has been buried.';
          break;
        case 'buy_media_cycle':
          await trx('pol_parties').where({ id: party.id })
            .update({ popularity: trx.raw('LEAST(popularity + 3, 100)') });
          message = "Media cycle purchased. Your party dominates this arc's news. Popularity +3.";
          break;
        case 'trigger_inquiry':
          message = 'Parliamentary inquiry initiated against rival. Reputational damage incoming next arc.';
          break;
        case 'leadership_challenge':
          message = 'Leadership ballot triggered. The party caucus will vote within the next arc.';
          break;
        case 'emergency_decree':
          message = 'Emergency Decree issued. One piece of legislation will bypass normal committee process.';
          break;
        default:
          message = `PC action "${action}" executed.`;
      }

      const pcRow = await trx('pol_character_ap').where({ character_id: character.id }).first();
      return { message, pc: { current_pc: pcRow?.current_pc ?? 0, pc_cap: pcRow?.pc_cap ?? 10 } };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/** GET /politics/parties/:id/factions — returns factions + cohesion for a party */
export async function getPartyFactionsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const party = await db('pol_parties').where({ id }).first();
    if (!party) return next(new AppError('Party not found', 404, 'NOT_FOUND'));

    const { factions, cohesion } = await getPartyFactions(id);
    return res.json({ party_id: id, cohesion, factions });
  } catch (error) {
    next(error);
  }
}

// ── Coalition Agreement Controllers ──────────────────────────────────────────

/**
 * GET /politics/coalition/agreement
 * Returns the active coalition agreement for the current state, including
 * health score, partner terms, and next review arc.
 */
export async function getCoalitionAgreement(req: Request, res: Response, next: NextFunction) {
  try {
    const activeState = await resolveState(req.query.stateId as string | undefined);
    const cycle = await getOrCreateCurrentCycle(activeState.id);

    // Use previous cycle if in early phases
    let targetCycleId = cycle.id;
    if (['filing', 'campaign', 'polling'].includes(cycle.phase) && cycle.cycle_number > 1) {
      const prevCycle = await db('pol_cycles')
        .where({ state_id: activeState.id, cycle_number: cycle.cycle_number - 1 }).first();
      if (prevCycle) targetCycleId = prevCycle.id;
    }

    const coalition = await db('pol_coalitions')
      .where({ cycle_id: targetCycleId })
      .whereIn('status', ['formed', 'minority'])
      .first();

    if (!coalition) return res.json({ agreement: null, coalition: null });

    const agreement = await db('pol_coalition_agreements')
      .where({ coalition_id: coalition.id })
      .whereNot({ status: 'broken' })
      .first();

    // Enrich partner terms with party names + faction cohesion
    let enrichedPartners: any[] = [];
    if (agreement) {
      const terms = typeof agreement.partner_terms === 'string'
        ? safeParseJSON(agreement.partner_terms) : (agreement.partner_terms ?? []);
      enrichedPartners = await Promise.all(terms.map(async (t: any) => {
        const party = await db('pol_parties').where({ id: t.party_id }).first();
        const factions = await db('pol_party_factions').where({ party_id: t.party_id });
        const total = factions.reduce((s: number, f: any) => s + Number(f.membership_share), 0);
        const weighted = factions.reduce((s: number, f: any) => s + Number(f.loyalty) * Number(f.membership_share), 0);
        const cohesion = total > 0 ? Math.round(weighted / total) : 100;
        
        // Also get seats to display in the UI
        const seatsResult = await db('pol_council_seats').where({ cycle_id: targetCycleId, party_id: t.party_id }).first();
        const seats = seatsResult ? seatsResult.seats : 0;

        return { ...t, cohesion, name: party?.name, abbreviation: party?.abbreviation, seats };
      }));
    } else if (coalition.member_party_ids) {
      // Legacy fallback for coalitions formed before agreements
      const parsedMembers = typeof coalition.member_party_ids === 'string'
        ? safeParseJSON(coalition.member_party_ids) : (coalition.member_party_ids ?? {});
      const memberIds = parsedMembers.accepted || (Array.isArray(parsedMembers) ? parsedMembers : []);
      enrichedPartners = await Promise.all(memberIds.map(async (partyId: string) => {
        const party = await db('pol_parties').where({ id: partyId }).first();
        const factions = await db('pol_party_factions').where({ party_id: partyId });
        const total = factions.reduce((s: number, f: any) => s + Number(f.membership_share), 0);
        const weighted = factions.reduce((s: number, f: any) => s + Number(f.loyalty) * Number(f.membership_share), 0);
        const cohesion = total > 0 ? Math.round(weighted / total) : 100;
        
        const seatsResult = await db('pol_council_seats').where({ cycle_id: targetCycleId, party_id: partyId }).first();
        const seats = seatsResult ? seatsResult.seats : 0;

        return { party_id: partyId, cohesion, name: party?.name, abbreviation: party?.abbreviation, seats };
      }));
    }

    const leadParty = await db('pol_parties').where({ id: coalition.lead_party_id }).first();
    const leadFactions = await db('pol_party_factions').where({ party_id: coalition.lead_party_id });
    const leadTotal = leadFactions.reduce((s: number, f: any) => s + Number(f.membership_share), 0);
    const leadWeighted = leadFactions.reduce((s: number, f: any) => s + Number(f.loyalty) * Number(f.membership_share), 0);
    const leadCohesion = leadTotal > 0 ? Math.round(leadWeighted / leadTotal) : 100;

    return res.json({
      coalition: {
        id: coalition.id,
        status: coalition.status,
        total_seats: coalition.total_seats,
        lead_party: { id: coalition.lead_party_id, name: leadParty?.name, cohesion: leadCohesion },
      },
      agreement: agreement ? {
        id: agreement.id,
        health: agreement.health,
        status: agreement.status,
        formed_arc: agreement.formed_arc,
        next_review_arc: agreement.next_review_arc,
        review_interval_arcs: agreement.review_interval_arcs,
        partner_terms: enrichedPartners,
        mandatory_legislation: typeof agreement.mandatory_legislation === 'string'
          ? safeParseJSON(agreement.mandatory_legislation) : (agreement.mandatory_legislation ?? []),
      } : null,
    });
  } catch (error) {
    next(error);
  }
}

// ── Scandal Controllers ───────────────────────────────────────────────────────

/**
 * GET /politics/scandals
 * Returns all active (non-resolved) scandals for the player's party.
 */
export async function getMyScandals(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return res.json({ scandals: [] });

    const membership = await db('pol_party_members').where({ character_id: character.id }).first();
    if (!membership) return res.json({ scandals: [] });

    const scandals = await getPartyScandalSummary(membership.party_id);
    return res.json({ scandals });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/scandals/:id/intervene
 * Body: { intervention: 'suppress' | 'spin' | 'investigate_internal' | 'stonewall' | 'full_disclosure' }
 * Attempts to act on an active scandal. Deducts AP (or PC for suppress).
 */
export async function actOnScandal(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { id: scandalId } = req.params;
    const { intervention } = req.body;

    if (!intervention || !['suppress', 'spin', 'investigate_internal', 'stonewall', 'full_disclosure'].includes(intervention)) {
      return next(new AppError('Valid intervention required', 400, 'BAD_REQUEST'));
    }

    const AP_COST_MAP: Record<string, number> = {
      suppress: 0,             // costs PC (4) instead of AP
      spin: 3,
      investigate_internal: 4,
      stonewall: 2,
      full_disclosure: 0,
    };
    const apCost = AP_COST_MAP[intervention] ?? 0;

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('You must be in a party', 403, 'FORBIDDEN');

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      // Deduct AP (if applicable)
      if (apCost > 0) {
        await spendAp(trx, character.id, apCost);
      }

      // Deduct PC for suppress
      if (intervention === 'suppress') {
        await spendPc(trx, character.id, 4);
      }

      const outcome = await interveneOnScandal(
        trx, scandalId, character.id, membership.party_id, intervention, currentArc
      );

      // Refresh resources
      const apRow = await trx('pol_character_ap').where({ character_id: character.id }).first();
      return {
        ...outcome,
        ap: { current_ap: apRow?.current_ap ?? 0, ap_cap: apRow?.ap_cap ?? 12 },
        pc: { current_pc: apRow?.current_pc ?? 0, pc_cap: apRow?.pc_cap ?? 10 },
      };
    });

    return res.json(result);
  } catch (error) {
    next(error);
  }
}

/** GET /politics/parties/:id/scandals — public scandal summary for any party */
export async function getPartyScandalsSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const party = await db('pol_parties').where({ id }).first();
    if (!party) return next(new AppError('Party not found', 404, 'NOT_FOUND'));
    const scandals = await getPartyScandalSummary(id);
    return res.json({ party_id: id, scandals });
  } catch (error) {
    next(error);
  }
}

// ── Campaign Controllers (Phase 5) ────────────────────────────────────────────

/**
 * GET /politics/campaign
 * Returns the player's current cycle campaign object with GGS, strategy, momentum, and arc log.
 */
export async function getMyCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return res.json({ campaign: null });

    const membership = await db('pol_party_members').where({ character_id: character.id }).first();
    if (!membership) return res.json({ campaign: null });

    const activeState = await db('pol_states').where({ is_active: true }).first();
    if (!activeState) return res.json({ campaign: null });

    const cycle = await getOrCreateCurrentCycle(activeState.id);
    const campaign = await getPartyCampaignSummary(membership.party_id, cycle.id);

    return res.json({
      campaign,
      cycle: {
        id: cycle.id,
        phase: cycle.phase,
        cycle_number: cycle.cycle_number,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/campaign/strategy
 * Body: { strategy: 'ground_war' | 'air_war' | 'targeted' | 'balanced' | 'insurgent' }
 * Costs 2 AP. Strategy applies from next arc.
 */
export async function setCampaignStrategyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { strategy } = req.body;
    if (!strategy) return next(new AppError('strategy is required', 400, 'BAD_REQUEST'));

    const validStrategies = ['ground_war', 'air_war', 'targeted', 'balanced', 'insurgent'];
    if (!validStrategies.includes(strategy)) {
      return next(new AppError('Invalid strategy type', 400, 'BAD_REQUEST'));
    }

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('You must be in a party', 403, 'FORBIDDEN');
      if (membership.role !== 'leader') throw new AppError('Only the Party Leader can set campaign strategy', 403, 'FORBIDDEN');

      const activeState = await trx('pol_states').where({ is_active: true }).first();
      if (!activeState) throw new AppError('No active state', 404, 'NOT_FOUND');

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });
      const cycle = await getOrCreateCurrentCycle(activeState.id);

      await setCampaignStrategy(trx, membership.party_id, cycle.id, character.id, strategy, currentArc);

      await spendAp(trx, character.id, 2);

      const apRow = await trx('pol_character_ap').where({ character_id: character.id }).first();
      return {
        message: `Campaign strategy changed to "${strategy}". Takes effect next arc.`,
        ap: { current_ap: apRow?.current_ap ?? 0, ap_cap: apRow?.ap_cap ?? 12 },
      };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/campaign/budget
 * Body: { amount: number }
 * Allocates treasury funds to the campaign budget. No AP cost, but deducts from party treasury.
 */
export async function allocateCampaignBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return next(new AppError('amount must be a positive number', 400, 'BAD_REQUEST'));

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('You must be in a party', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: membership.party_id }).forUpdate().first();
      if (!party) throw new AppError('Party not found', 404, 'NOT_FOUND');
      if (party.leader_character_id !== character.id) {
        throw new AppError('Only the party leader can allocate campaign budget', 403, 'FORBIDDEN');
      }

      if (Number(party.treasury) < amount) {
        throw new AppError(`Insufficient treasury. Available: $${Number(party.treasury).toLocaleString()}`, 400, 'INSUFFICIENT_FUNDS');
      }

      const activeState = await trx('pol_states').where({ is_active: true }).first();
      const cycle = await getOrCreateCurrentCycle(activeState.id);
      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      const campaign = await getOrCreateCampaign(trx, cycle.id, membership.party_id, currentArc);

      await trx('pol_parties').where({ id: membership.party_id }).decrement('treasury', amount);
      await trx('pol_campaigns').where({ id: campaign.id }).increment('budget_allocated', amount);

      return {
        message: `$${amount.toLocaleString()} allocated to campaign fund.`,
        budget_allocated: Number(campaign.budget_allocated) + amount,
        treasury_remaining: Number(party.treasury) - amount,
      };
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ── Interest Group Controllers (Phase 6) ─────────────────────────────────────

/**
 * GET /politics/interest-groups
 * Returns all interest group relations for the player's party in the current state.
 */
export async function getMyInterestGroups(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return res.json({ groups: [] });

    const membership = await db('pol_party_members').where({ character_id: character.id }).first();
    if (!membership) return res.json({ groups: [] });

    const activeState = await db('pol_states').where({ is_active: true }).first();
    if (!activeState) return res.json({ groups: [] });

    // Ensure seeds exist (idempotent)
    await db.transaction(async (trx) => {
      await seedIGRelationsForParty(trx, membership.party_id, activeState.id);
    });

    const groups = await getPartyIGRelations(membership.party_id, activeState.id);
    return res.json({ groups });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/interest-groups/:groupId/outreach
 * Body: { commitment?: { axis, direction, target_value } }
 * Costs 3 AP. Subject to 2-arc cooldown. Optionally makes a policy commitment.
 */
export async function doOutreach(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { groupId } = req.params;
    const { commitment } = req.body;

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('Must be in a party', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: membership.party_id }).first();
      if (party.leader_character_id !== character.id) {
        throw new AppError('Only the party leader can perform outreach', 403, 'FORBIDDEN');
      }

      const activeState = await trx('pol_states').where({ is_active: true }).first();
      if (!activeState) throw new AppError('No active state', 404, 'NOT_FOUND');

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      await spendAp(trx, character.id, 3);

      return performOutreach(
        trx, character.id, membership.party_id, activeState.id,
        groupId, commitment ?? null, currentArc
      );
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/interest-groups/:groupId/rally
 * Costs 2 PC. Short burst of relationship score and momentum.
 */
export async function doRallySupport(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { groupId } = req.params;

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('Must be in a party', 403, 'FORBIDDEN');

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      await spendPc(trx, character.id, 2);

      return performRallySupport(trx, character.id, membership.party_id, groupId, currentArc);
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// ── Media Ecosystem Controllers (Phase 7) ────────────────────────────────────

/**
 * GET /politics/media
 * Returns all outlet relations for the player's party, seeded if needed.
 */
export async function getMyMedia(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const character = await db('characters').where({ user_id: userId, status: 'active' }).first();
    if (!character) return res.json({ outlets: [] });

    const membership = await db('pol_party_members').where({ character_id: character.id }).first();
    if (!membership) return res.json({ outlets: [] });

    const activeState = await db('pol_states').where({ is_active: true }).first();
    if (!activeState) return res.json({ outlets: [] });

    await db.transaction(async (trx) => {
      await seedMediaRelationsForParty(trx, membership.party_id, activeState.id);
    });

    const outlets = await getPartyMediaRelations(membership.party_id, activeState.id);
    return res.json({ outlets });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/media/:outletId/exclusive
 * Costs 3 AP. 2-arc cooldown. Significant score gain with one outlet.
 */
export async function doExclusiveInterviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { outletId } = req.params;

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('Must be in a party', 403, 'FORBIDDEN');

      const party = await trx('pol_parties').where({ id: membership.party_id }).first();
      if (party.leader_character_id !== character.id) {
        throw new AppError('Only the party leader can grant exclusives', 403, 'FORBIDDEN');
      }

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      await spendAp(trx, character.id, 3);

      return doExclusiveInterview(trx, character.id, membership.party_id, outletId, currentArc);
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /politics/media/press-conference
 * Costs 2 AP. Improves all outlet relations by a small amount.
 */
export async function doPressConferenceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const result = await db.transaction(async (trx) => {
      const character = await trx('characters').where({ user_id: userId, status: 'active' }).first();
      if (!character) throw new AppError('No active character', 400, 'NO_CHARACTER');

      const membership = await trx('pol_party_members').where({ character_id: character.id }).first();
      if (!membership) throw new AppError('Must be in a party', 403, 'FORBIDDEN');

      const activeState = await trx('pol_states').where({ is_active: true }).first();
      if (!activeState) throw new AppError('No active state', 404, 'NOT_FOUND');

      const clock = await trx('world_clock').first();
      const currentArc = worldClockToArc({ current_year: clock.pol_current_year, current_month: clock.pol_current_month });

      await spendAp(trx, character.id, 2);

      return doPressConference(trx, character.id, membership.party_id, activeState.id, currentArc);
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /politics/news
 * Returns the most recent top-weighted stories for the active state.
 */
export async function getNewsFeedHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const activeState = await db('pol_states').where({ is_active: true }).first();
    if (!activeState) return res.json({ stories: [] });

    const stories = await getRecentNews(activeState.id, 15);
    return res.json({ stories });
  } catch (error) {
    next(error);
  }
}

// ── Legacy System (Phase 8) ───────────────────────────────────────────────────

/**
 * GET /politics/legacy/:characterId
 * If :characterId is "me", returns the active player character's legacy.
 */
export async function getLegacyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    let targetCharId = req.params.characterId;
    
    if (targetCharId === 'me') {
      const char = await db('characters').where({ user_id: userId, status: 'active' }).first();
      if (!char) return next(new AppError('No active character', 404, 'NOT_FOUND'));
      targetCharId = char.id;
    }

    // Ensure the legacy score row exists before reading
    await db.transaction(async (trx) => {
      await getOrCreateLegacyScores(trx, targetCharId);
    });

    const summary = await getLegacySummary(targetCharId);
    if (!summary) return next(new AppError('Legacy not found', 404, 'NOT_FOUND'));

    return res.json({ success: true, ...summary });
  } catch (error) {
    next(error);
  }
}
