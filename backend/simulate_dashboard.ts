import { Client } from 'pg';

const client = new Client('postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres');

async function main() {
  await client.connect();
  try {
    const compId = 'da85639c-8f28-4abe-ab19-a51ae86128c0';
    
    // Simulate getCompanyDashboard behavior exactly
    const latestReport = await client.query(`
      SELECT * FROM manufacturing_arc_reports
      WHERE company_id = $1
      ORDER BY world_year DESC, world_month DESC
      LIMIT 1
    `, [compId]);
    
    console.log("Latest Report found in DB:", latestReport.rows[0]);
    
    // Are there any missing fields or NULLs that could cause JSON to omit it?
    // Let's also check if there are multiple companies for this user.
    const userCompanies = await client.query(`
      SELECT c.id, c.name, c.owner_character_id 
      FROM companies c
      JOIN characters ch ON c.owner_character_id = ch.id
      WHERE ch.user_id = 'c1abf81b-5136-4d2d-8e41-0b5c90b6ec6b' -- Not sure of user ID, let's just query by company id
    `);
    
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
main();
