import { db } from './src/config/database';

async function run() {
  const lines = await db('manufacturing_production_lines').where('company_id', 'IN', db('companies').select('id').where('is_npc', true)).limit(10);
  console.log(lines.map(l => l.target_units_per_arc));
  
  const snaps = await db('manufacturing_model_snapshots').orderBy('created_at', 'desc').limit(10);
  console.log(snaps.map(s => ({ arc: s.world_arc, prod: s.units_produced, sold: s.units_sold })));

  process.exit(0);
}
run();
