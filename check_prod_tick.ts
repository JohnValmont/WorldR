import { Client } from 'pg';

const PROD_DB = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

async function main() {
  const client = new Client(PROD_DB);
  await client.connect();

  console.log('--- Production Tick Diagnosis ---\n');

  // World clock
  const clock = await client.query('SELECT * FROM world_clock LIMIT 1');
  const c = clock.rows[0];
  console.log('World Clock:', {
    year: c.current_year,
    month: c.current_month,
    status: c.status,
    next_tick: c.next_arc_close_at,
    now: new Date().toISOString(),
    overdue_by_mins: Math.floor((Date.now() - new Date(c.next_arc_close_at).getTime()) / 60000)
  });

  // Recent tick logs
  const logs = await client.query(`
    SELECT world_year, world_month, tick_started_at, tick_completed_at, 
           processed_companies, failures, status
    FROM world_tick_log 
    ORDER BY tick_started_at DESC 
    LIMIT 5
  `).catch(() => ({ rows: [] }));
  console.log('\nRecent tick logs:', logs.rows.length === 0 ? '(table not found or empty)' : '');
  for (const l of logs.rows) {
    console.log(`  Y${l.world_year}M${l.world_month} | companies:${l.processed_companies} | failures:${l.failures} | status:${l.status}`);
  }

  // Active manufacturing companies count
  const mfgRes = await client.query(`
    SELECT count(*) FROM companies 
    WHERE status = 'active' AND industry_id = 'manufacturing'
  `);
  console.log('\nActive manufacturing companies:', mfgRes.rows[0].count);

  // Check if any company was processed this month
  const processed = await client.query(`
    SELECT c.name, c.is_npc, cf.last_arc_profit, cf.available_cash
    FROM companies c
    JOIN company_finances cf ON cf.company_id = c.id
    WHERE c.status = 'active' AND c.industry_id = 'manufacturing'
    ORDER BY c.is_npc, c.name
    LIMIT 20
  `);
  console.log('\nManufacturing company finances:');
  for (const r of processed.rows) {
    console.log(`  [${r.is_npc ? 'NPC' : 'PLAYER'}] ${r.name}: profit=${r.last_arc_profit}, cash=${Number(r.available_cash).toLocaleString()}`);
  }

  // Check for any recent sales results
  const salesRes = await client.query(`
    SELECT world_year, world_month, count(*) as count, sum(units_sold) as units
    FROM manufacturing_sales_results
    GROUP BY world_year, world_month
    ORDER BY world_year DESC, world_month DESC
    LIMIT 5
  `);
  console.log('\nRecent sales results:');
  for (const r of salesRes.rows) {
    console.log(`  Y${r.world_year}M${r.world_month}: ${r.count} records, ${r.units} units sold`);
  }

  await client.end();
}

main().catch(console.error);
