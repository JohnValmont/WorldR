import { db } from '../src/config/database';

async function main() {
  try {
    const res = await db('share_price_history')
      .join('companies', 'companies.id', 'share_price_history.company_id')
      .where('companies.name', 'HaulPro')
      .orderBy('game_year', 'desc')
      .orderBy('game_month', 'desc')
      .limit(20)
      .select('game_year', 'game_month', 'close_price');
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
main();
