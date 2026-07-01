import { db } from '../src/config/database';
import { processPoliticalArc, getOrCreateCurrentCycle, buildEngineCandidates } from '../src/api/services/politics.service';
import { runElection } from '../src/api/services/electionEngine';
import { CAMPAIGN_ACTIONS } from '../src/api/constants/politics';

async function runSmoke() {
  console.log("Setting up for P3A Smoke Test...");
  const state = await db('pol_states').where({ is_active: true }).first();
  if (!state) throw new Error("No active state");
  const cycle = await getOrCreateCurrentCycle(state.id);

  // We are going to artificially manipulate the current arc to walk through the phases.
  // We need a test candidate for the player.
  // First, find or create a character and party for the player.
  const character = await db('characters').first();
  if (!character) throw new Error("No character found");

  let partyMember = await db('pol_party_members').where({ character_id: character.id }).first();
  let party;
  if (!partyMember) {
    const [inserted] = await db('pol_parties').insert({
      state_id: state.id,
      name: 'Smoke Test Party P3A',
      leader_character_id: character.id,
      platform: { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
      treasury: 100000,
      is_npc: false,
      created_arc: 1
    }).returning('*');
    party = inserted;
    await db('pol_party_members').insert({ party_id: party.id, character_id: character.id, role: 'leader', joined_arc: 1 });
  } else {
    party = await db('pol_parties').where({ id: partyMember.party_id }).first();
    await db('pol_parties').where({ id: party.id }).update({ treasury: 100000 });
  }

  // Ensure an NPC party exists for the smoke test
  const existingNpc = await db('pol_parties').where({ is_npc: true }).first();
  if (!existingNpc) {
    await db('pol_parties').insert({
      state_id: state.id,
      name: 'Smoke NPC Party',
      leader_character_id: null,
      platform: { taxation: 60, labour: 60, investment: 60, trade: 60, stability: 60 },
      treasury: 50000,
      is_npc: true,
      created_arc: 1
    });
  }

  const startFiling = cycle.polling_arc - 9; // POL_CAMPAIGN_WINDOW_ARCS + POL_FILING_WINDOW_ARCS
  
  console.log(`\n--- Advancing to FILING (Arc ${startFiling}) ---`);
  await db('world_clock').update({ current_arc: startFiling });
  await processPoliticalArc(db, state.id, startFiling);
  
  const cycleRecord = await db('pol_cycles').where({ id: cycle.id }).first();
  console.log(`Phase is now: ${cycleRecord.phase}`);
  
  const npcCandidates = await db('pol_candidates').where({ cycle_id: cycle.id, is_npc: true });
  console.log(`NPC Candidates generated: ${npcCandidates.length}`);

  // Create Player Candidacy
  console.log("\n--- Declaring Player Candidacy ---");
  await db('pol_candidates').where({ character_id: character.id }).delete(); // clean up if exists
  const [playerCand] = await db('pol_candidates').insert({
    cycle_id: cycle.id,
    party_id: party.id,
    character_id: character.id,
    is_npc: false,
    platform: party.platform,
    is_incumbent: false
  }).returning('*');
  console.log(`Player candidate declared: ${playerCand.id}`);

  const startCampaign = cycle.polling_arc - 6;
  console.log(`\n--- Advancing to CAMPAIGN (Arc ${startCampaign}) ---`);
  await db('world_clock').update({ current_arc: startCampaign });
  await processPoliticalArc(db, state.id, startCampaign);
  
  const campaignCycle = await db('pol_cycles').where({ id: cycle.id }).first();
  console.log(`Phase is now: ${campaignCycle.phase}`);

  console.log("\n--- Queuing Player Action ---");
  await db('pol_campaign_actions').insert({
    cycle_id: cycle.id,
    candidate_id: playerCand.id,
    action_type: 'media_ad',
    target_segment: null,
    cash_spent: 0,
    effort: 0,
    resolved_arc: startCampaign + 1
  });
  console.log("Media Ad queued for next arc.");

  console.log("\n--- Fetching Polls BEFORE Action Resolution ---");
  const candsBefore = await buildEngineCandidates(db, cycle.id);
  const projBefore = runElection({ candidates: candsBefore, registeredVoters: 500000 });
  const playerVotesBefore = projBefore.perCandidate.find((c: any) => c.candidateId === playerCand.id)?.votes || 0;
  console.log(`Player Projected Votes BEFORE Ad: ${playerVotesBefore}`);

  console.log(`\n--- Advancing Arc to resolve action (Arc ${startCampaign + 1}) ---`);
  await db('world_clock').update({ current_arc: startCampaign + 1 });
  await processPoliticalArc(db, state.id, startCampaign + 1);

  const resolvedAction = await db('pol_campaign_actions')
    .where({ candidate_id: playerCand.id, action_type: 'media_ad' })
    .orderBy('resolved_arc', 'desc')
    .first();
  
  console.log(`Action resolved! Effort recorded: ${resolvedAction.effort}, Cash Spent: ${resolvedAction.cash_spent}`);
  
  const updatedParty = await db('pol_parties').where({ id: party.id }).first();
  console.log(`Party Treasury deducted: ${100000 - Number(updatedParty.treasury)} (Expected 12000 for Media Ad)`);

  console.log("\n--- Checking NPC Brain ---");
  const npcParties = await db('pol_parties').where({ is_npc: true });
  for (const p of npcParties) {
    const actions = await db('pol_campaign_actions')
      .join('pol_candidates', 'pol_campaign_actions.candidate_id', 'pol_candidates.id')
      .where('pol_candidates.party_id', p.id)
      .andWhere('pol_campaign_actions.cycle_id', cycle.id);
    
    const totalSpent = actions.reduce((sum, a) => sum + Number(a.cash_spent), 0);
    console.log(`NPC Party ${p.name} queued actions total spend: ${totalSpent}`);
  }

  console.log("\n--- Fetching Polls ---");
  const cands = await buildEngineCandidates(db, cycle.id);
  const proj = runElection({ candidates: cands, registeredVoters: 500000 });
  const playerVotes = proj.perCandidate.find((c: any) => c.candidateId === playerCand.id)?.votes || 0;
  console.log(`Player Projected Votes after Ad: ${playerVotes}`);
  console.log(`Total NPC actions resolved/queued in system:`);
  
  console.log("--- Smoke Test Complete ---");
  process.exit(0);
}

runSmoke().catch(e => {
  console.error(e);
  process.exit(1);
});
