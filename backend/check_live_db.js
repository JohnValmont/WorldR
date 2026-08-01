const knex = require('knex');
const liveDbUrl = 'postgresql://postgres.qrwnjcjdsonhrlhdsveu:GURJAR345%40k@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';
const db = knex({ client: 'pg', connection: liveDbUrl });

async function run() {
  try {
    const hasTable = await db.schema.hasTable('company_debt_facilities');
    console.log('LIVE DB has company_debt_facilities?', hasTable);
  } finally {
    db.destroy();
  }
}
run();
