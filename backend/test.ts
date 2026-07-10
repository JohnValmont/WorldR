import { db } from './src/config/database';

async function test() {
  try {
      const richestPlayers = await db.raw(\
        SELECT 
          c.id, 
          c.full_name, 
          COALESCE(cf.cash_in_hand, 0) as cash,
          (
            SELECT COALESCE(SUM(
              (CAST(cs.shares AS FLOAT) / (SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id)) * compf.company_value
            ), 0)
            FROM company_shares cs
            JOIN company_finances compf ON compf.company_id = cs.company_id
            WHERE cs.holder_character_id = c.id
          ) as equity,
          COALESCE(cf.cash_in_hand, 0) + (
            SELECT COALESCE(SUM(
              (CAST(cs.shares AS FLOAT) / (SELECT SUM(shares) FROM company_shares WHERE company_id = cs.company_id)) * compf.company_value
            ), 0)
            FROM company_shares cs
            JOIN company_finances compf ON compf.company_id = cs.company_id
            WHERE cs.holder_character_id = c.id
          ) as net_worth
        FROM characters c
        LEFT JOIN character_finances cf ON cf.character_id = c.id
        WHERE c.status = 'active'
        ORDER BY net_worth DESC
        LIMIT 10
      \);
      console.log('richestPlayers', richestPlayers);
  } catch (err) {
      console.error('ERROR', err);
  } finally {
      db.destroy();
  }
}
test();
