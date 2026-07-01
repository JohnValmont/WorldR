import { db } from '../src/config/database';
import { getOrCreateCurrentCycle, ensureNpcCandidates } from '../src/api/services/politics.service';

async function checkCounts() {
  const activeState = await db('pol_states').where({ is_active: true }).first();
  const cycle = await getOrCreateCurrentCycle(activeState.id);
  
  await ensureNpcCandidates(db, cycle.id);
  
  const npcs = await db('pol_candidates').where({ cycle_id: cycle.id, is_npc: true });
  console.log(`NPC Candidates for cycle ${cycle.id}: ${npcs.length}`);
  
  const voters = activeState.registered_voters;
  console.log(`Registered voters for ${activeState.name}: ${voters}`);
  
  process.exit(0);
}

checkCounts().catch(console.error);
