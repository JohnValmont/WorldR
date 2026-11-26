-- 0116_cancel_unpriced_npc_ladders.sql
-- Exchange-listed rivals that never had a monthly price bar (listed by seed 0007)
-- were priced only by the order-book screen, which placed market-maker ladders
-- from a hard-coded $10 fallback (Valuecorp sat near $14 with book value ~$29 a share).
-- The month end now opens their first bar AT fair value (shareValuation.rules.ts),
-- which can be many times higher. Cancel the old cheap market-maker orders now, so
-- nobody can buy them in the hours before that first bar is written.
-- Same refund as the monthly market-maker refresh (ipoExchange Step F): a buy order
-- returns its escrowed cash, a sell order returns its unfilled shares.
-- Idempotent: only open NPC orders of listed companies with no price bar change.

-- 1. Sell orders: give the unfilled shares back to the holder that escrowed them.
UPDATE company_shares cs
   SET shares = cs.shares + o.unfilled,
       updated_at = NOW()
  FROM (
    SELECT so.company_id, so.character_id, SUM(so.quantity - so.filled_quantity) AS unfilled
      FROM share_orders so
      JOIN companies c ON c.id = so.company_id
     WHERE so.is_npc = TRUE
       AND so.status = 'open'
       AND so.side = 'sell'
       AND so.purchaser_company_id IS NULL
       AND c.is_exchange_listed = TRUE
       AND NOT EXISTS (SELECT 1 FROM share_price_history h WHERE h.company_id = so.company_id)
     GROUP BY so.company_id, so.character_id
  ) o
 WHERE cs.company_id = o.company_id
   AND cs.holder_character_id = o.character_id;

-- 2. Buy orders: give the escrowed cash back to the character that placed them.
UPDATE character_finances cf
   SET cash_in_hand = cf.cash_in_hand + o.escrow
  FROM (
    SELECT so.character_id, SUM(so.escrow_amount) AS escrow
      FROM share_orders so
      JOIN companies c ON c.id = so.company_id
     WHERE so.is_npc = TRUE
       AND so.status = 'open'
       AND so.side = 'buy'
       AND so.purchaser_company_id IS NULL
       AND c.is_exchange_listed = TRUE
       AND NOT EXISTS (SELECT 1 FROM share_price_history h WHERE h.company_id = so.company_id)
     GROUP BY so.character_id
  ) o
 WHERE cf.character_id = o.character_id;

-- 3. Mark those orders cancelled (after the refunds above have read them).
UPDATE share_orders so
   SET status = 'cancelled',
       updated_at = NOW()
  FROM companies c
 WHERE c.id = so.company_id
   AND so.is_npc = TRUE
   AND so.status = 'open'
   AND so.purchaser_company_id IS NULL
   AND c.is_exchange_listed = TRUE
   AND NOT EXISTS (SELECT 1 FROM share_price_history h WHERE h.company_id = so.company_id);
