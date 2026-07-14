import { knex } from 'knex';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, 'backend/.env') });

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
});

async function run() {
  try {
    const activeInstance = await db('world_instances').where({ status: 'active' }).first();
    const activeInstanceId = activeInstance ? activeInstance.id : null;

    const res = await db.raw(`
          WITH
          latest_price AS (
            SELECT DISTINCT ON (company_id) company_id, close_price
            FROM share_price_history
            ORDER BY company_id, game_year DESC, game_month DESC
          ),
          share_totals AS (
            SELECT company_id, SUM(shares) AS total_shares
            FROM company_shares
            GROUP BY company_id
          ),
          inv_val AS (
            SELECT mi.company_id,
              SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit) AS val
            FROM manufacturing_inventory mi
            JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
            GROUP BY mi.company_id
          ),
          book_val AS (
            SELECT cf.company_id,
              GREATEST(0,
                cf.available_cash - COALESCE(cf.debt, 0) + COALESCE(iv.val, 0)
              ) AS bv,
              cf.last_arc_profit
            FROM company_finances cf
            LEFT JOIN inv_val iv ON iv.company_id = cf.company_id
          )
          SELECT
            c.id,
            c.name,
            c.industry_id,
            bv.last_arc_profit,
            CASE
              WHEN c.is_exchange_listed = true
                THEN COALESCE(lp.close_price * st.total_shares, bv.bv)
              ELSE bv.bv
            END AS company_value,
            lp.close_price,
            st.total_shares,
            bv.bv
          FROM companies c
          JOIN book_val bv ON bv.company_id = c.id
          LEFT JOIN latest_price lp ON lp.company_id = c.id
          LEFT JOIN share_totals st ON st.company_id = c.id
          WHERE c.status = 'active'
            AND c.world_instance_id = ?
            AND c.is_npc = true
          ORDER BY
            CASE
              WHEN c.is_exchange_listed = true
                THEN COALESCE(lp.close_price * st.total_shares, bv.bv)
              ELSE bv.bv
            END DESC
          LIMIT 10
    `, [activeInstanceId]);
    console.log(res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await db.destroy();
  }
}

run();
