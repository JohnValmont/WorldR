import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(__dirname, '.env') });

const DEFAULT_COLORS = [
  '#4B6382', '#C9A24A', '#36D399', '#B85555',
  '#9B59B6', '#E67E22', '#1ABC9C', '#E74C3C',
];

async function main() {
  const DB = process.env.DATABASE_URL;
  if (!DB) { console.error('DATABASE_URL not set in backend/.env'); process.exit(1); }

  const db = new Client({ connectionString: DB });
  await db.connect();
  console.log('Connected.\n');

  // 1. Load all parties
  const { rows: parties } = await db.query<{ id: string; name: string; color_hex: string | null }>(
    `SELECT id, name, color_hex FROM pol_parties ORDER BY created_arc ASC`
  );

  if (parties.length === 0) {
    console.error('No parties found. Create at least one party first.');
    await db.end(); process.exit(1);
  }

  console.log(`Found ${parties.length} parties:`);

  // 2. Assign missing/default color_hex
  // The migration sets '#6B6358' as default — treat that as unset
  const DEFAULT_GREY = '#6B6358';
  let colorIdx = 0;
  for (const party of parties) {
    if (!party.color_hex || party.color_hex === DEFAULT_GREY) {
      const color = DEFAULT_COLORS[colorIdx % DEFAULT_COLORS.length];
      await db.query(`UPDATE pol_parties SET color_hex = $1 WHERE id = $2`, [color, party.id]);
      party.color_hex = color;
      console.log(`  ✓ ${party.name} → ${color} (assigned)`);
      colorIdx++;
    } else {
      console.log(`  · ${party.name} → ${party.color_hex} (existing)`);
    }
  }

  // 3. Build equal-split support_json
  const equalShare = parseFloat((100 / parties.length).toFixed(4));
  const shares: Record<string, number> = {};
  let total = 0;
  for (let i = 0; i < parties.length; i++) {
    shares[parties[i].id] = i === parties.length - 1
      ? parseFloat((100 - total).toFixed(4))
      : equalShare;
    total += equalShare;
  }

  console.log(`\nInitial split (equal across ${parties.length} parties):`);
  for (const [id, pct] of Object.entries(shares)) {
    console.log(`  ${parties.find(p => p.id === id)?.name}: ${pct}%`);
  }

  const leadingPartyId = parties[0].id;

  // 4. Seed empty districts
  const { rows: districts } = await db.query<{ id: string; district_number: number }>(
    `SELECT id, district_number FROM drennia_districts WHERE support_json = '{}'::jsonb ORDER BY district_number`
  );

  console.log(`\nSeeding ${districts.length} empty districts...`);

  if (districts.length === 0) {
    console.log('All districts already have support data. Nothing to do.');
    await db.end(); return;
  }

  for (const d of districts) {
    await db.query(
      // current_leading_party_id is NULL for equal-split — the tick engine
      // will set it correctly after the first action or decay cycle.
      `UPDATE drennia_districts SET support_json = $1::jsonb, current_leading_party_id = NULL, last_updated_tick = 0 WHERE id = $2`,
      [JSON.stringify(shares), d.id]
    );
  }

  console.log(`  ✓ ${districts.length} districts seeded.`);

  const { rows: check } = await db.query(
    `SELECT COUNT(*) as total, COUNT(NULLIF(support_json, '{}'::jsonb)) as seeded FROM drennia_districts`
  );
  console.log(`\nDistricts: ${check[0].seeded}/${check[0].total} seeded.`);
  console.log('\n✅  Done. Map will now color correctly on next page load.');

  await db.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
