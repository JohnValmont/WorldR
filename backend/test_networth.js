const { Client } = require('pg');
async function test() {
  const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/worldr_db' });
  await client.connect();
  const result = await client.query(`
    WITH
    buy_escrow AS (
      SELECT character_id, SUM(escrow_amount) AS total
      FROM share_orders
      WHERE side = 'buy' AND status = 'open'
      GROUP BY character_id
    ),
    total_shares AS (
      SELECT company_id, SUM(shares) AS total
      FROM company_shares
      GROUP BY company_id
    ),
    open_sells_by_char AS (
      SELECT company_id, character_id, SUM(quantity) AS qty
      FROM share_orders
      WHERE side = 'sell' AND status = 'open'
      GROUP BY company_id, character_id
    ),
    total_open_sells AS (
      SELECT company_id, SUM(quantity) AS qty
      FROM share_orders
      WHERE side = 'sell' AND status = 'open'
      GROUP BY company_id
    ),
    inv_val AS (
      SELECT mi.company_id,
        SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit) AS val
      FROM manufacturing_inventory mi
      JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
      GROUP BY mi.company_id
    ),
    latest_price AS (
      SELECT DISTINCT ON (company_id) company_id, close_price
      FROM share_price_history
      ORDER BY company_id, game_year DESC, game_month DESC
    ),
    latest_trade AS (
      SELECT DISTINCT ON (company_id) company_id, price AS close_price
      FROM share_trades
      ORDER BY company_id, executed_at DESC
    ),
    company_book_value AS (
      SELECT cf.company_id,
        GREATEST(0, cf.available_cash - COALESCE(cf.debt, 0)
                 + COALESCE(iv.val, 0)) AS real_value,
        cf.last_arc_profit,
        cf.available_cash,
        cf.debt,
        iv.val as inventory_val
      FROM company_finances cf
      LEFT JOIN inv_val iv ON iv.company_id = cf.company_id
    ),
    char_equity AS (
      SELECT cs.holder_character_id AS char_id,
        cs.company_id,
        co.name as company_name,
        co.is_exchange_listed,
        cs.shares,
        ts.total as total_shares,
        cbv.real_value,
        cbv.available_cash,
        cbv.debt,
        cbv.inventory_val,
        COALESCE(lp.close_price, lt.close_price) as stock_price,
        COALESCE(SUM(
          CASE
            WHEN co.is_exchange_listed = true
                 AND COALESCE(lp.close_price, lt.close_price) IS NOT NULL
                 AND COALESCE(lp.close_price, lt.close_price) > 0
            THEN
              (CAST(cs.shares AS FLOAT) + COALESCE(osbc.qty, 0))
              * COALESCE(lp.close_price, lt.close_price)
            ELSE
              (CAST(cs.shares AS FLOAT) + COALESCE(osbc.qty, 0))
              / NULLIF(COALESCE(ts.total, 0) + COALESCE(tos.qty, 0), 0)
              * cbv.real_value
          END
        ), 0) AS equity
      FROM company_shares cs
      JOIN companies co ON co.id = cs.company_id
      JOIN company_book_value cbv ON cbv.company_id = cs.company_id
      LEFT JOIN total_shares ts ON ts.company_id = cs.company_id
      LEFT JOIN open_sells_by_char osbc
        ON osbc.company_id = cs.company_id
       AND osbc.character_id = cs.holder_character_id
      LEFT JOIN total_open_sells tos ON tos.company_id = cs.company_id
      LEFT JOIN latest_price lp ON lp.company_id = cs.company_id
      LEFT JOIN latest_trade lt ON lt.company_id = cs.company_id
      GROUP BY cs.holder_character_id, cs.company_id, co.name, co.is_exchange_listed, cs.shares, ts.total, cbv.real_value, cbv.available_cash, cbv.debt, cbv.inventory_val, stock_price
    )
    SELECT
      c.id,
      c.name,
      COALESCE(cf.cash_in_hand, 0) + COALESCE(be.total, 0) AS cash,
      (SELECT json_agg(json_build_object('company_name', ce.company_name, 'equity', ce.equity, 'shares', ce.shares, 'total_shares', ce.total_shares, 'real_value', ce.real_value, 'cash', ce.available_cash, 'debt', ce.debt, 'inventory_val', ce.inventory_val, 'is_listed', ce.is_exchange_listed, 'stock_price', ce.stock_price)) FROM char_equity ce WHERE ce.char_id = c.id) as equities,
      (SELECT SUM(equity) FROM char_equity ce WHERE ce.char_id = c.id) as total_equity
    FROM characters c
    LEFT JOIN character_finances cf ON cf.character_id = c.id
    LEFT JOIN buy_escrow be ON be.character_id = c.id
    WHERE 1=1
  `);
  console.log(result.rows.map(r => r.name + ' (' + r.id + ')').join(', '));
  process.exit(0);
}
test();
