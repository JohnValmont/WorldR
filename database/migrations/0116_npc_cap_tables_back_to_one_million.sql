-- 0116_npc_cap_tables_back_to_one_million.sql
--
-- Reading the order book (GET /exchange/:companyId/book) used to write: it topped
-- the DRX market maker's holding of a company up to 500,000 shares whenever its
-- ask side was empty, and posted a ladder of up to 435,000 shares per side. That
-- created shares out of nothing. The endpoint is now read-only (shareMarket.service
-- getOrderBook), and the market maker sells only shares it holds (placeOrder).
--
-- This repairs computer-run (NPC) companies, which always have exactly 1,000,000
-- shares (constants/exchange.ts SHARES_PER_COMPANY). A share is either held
-- (company_shares.shares) or locked in an open sell order (quantity - filled_quantity).
-- Only the market maker's own shares are removed; no player's holding is touched.
--
-- 1. Where an NPC company has more than 1,000,000 shares, cancel the market
--    maker's open sell orders for it and return the unfilled shares to its holding
--    (exactly what the monthly exchange step does; it re-quotes next month).
-- 2. Remove the excess from the market maker's holding (never below zero).
-- 3. Any excess left (created shares that players already bought) is reported.
--
-- Player companies are not changed: a player IPO issues new shares on purpose
-- (clearAndList "Primary Offering"), so their correct total is not a fixed number.
--
-- Idempotent: once every NPC company is at or below 1,000,000 it changes nothing.

DO $$
DECLARE
  v_mm UUID;
  r RECORD;
  v_left NUMERIC;
BEGIN
  SELECT c.id INTO v_mm
    FROM characters c
    JOIN users u ON u.id = c.user_id
   WHERE u.email = 'system_npc@worldr.game'
   ORDER BY c.created_at ASC
   LIMIT 1;
  IF v_mm IS NULL THEN
    RETURN;
  END IF;

  FOR r IN
    WITH held AS (
      SELECT company_id, SUM(shares) AS n FROM company_shares GROUP BY company_id
    ), locked AS (
      SELECT company_id, SUM(quantity - filled_quantity) AS n
        FROM share_orders
       WHERE side = 'sell' AND status = 'open'
       GROUP BY company_id
    )
    SELECT co.id AS company_id,
           COALESCE(h.n, 0) + COALESCE(l.n, 0) - 1000000 AS excess
      FROM companies co
      LEFT JOIN held h ON h.company_id = co.id
      LEFT JOIN locked l ON l.company_id = co.id
     WHERE co.is_npc = TRUE
       AND COALESCE(h.n, 0) + COALESCE(l.n, 0) > 1000000
  LOOP
    -- 1. Return the market maker's locked ask shares to its holding.
    UPDATE company_shares s
       SET shares = s.shares + o.unfilled,
           updated_at = NOW()
      FROM (
        SELECT SUM(quantity - filled_quantity) AS unfilled
          FROM share_orders
         WHERE company_id = r.company_id AND character_id = v_mm
           AND side = 'sell' AND status = 'open' AND purchaser_company_id IS NULL
      ) o
     WHERE s.company_id = r.company_id
       AND s.holder_character_id = v_mm
       AND COALESCE(o.unfilled, 0) > 0;

    UPDATE share_orders
       SET status = 'cancelled', updated_at = NOW()
     WHERE company_id = r.company_id AND character_id = v_mm
       AND side = 'sell' AND status = 'open' AND purchaser_company_id IS NULL
       AND EXISTS (SELECT 1 FROM company_shares s
                    WHERE s.company_id = r.company_id AND s.holder_character_id = v_mm);

    -- 2. Remove the excess from the market maker's holding.
    UPDATE company_shares
       SET shares = GREATEST(0, shares - r.excess),
           updated_at = NOW()
     WHERE company_id = r.company_id
       AND holder_character_id = v_mm;

    -- 3. Report what is left over, if anything.
    SELECT COALESCE((SELECT SUM(shares) FROM company_shares WHERE company_id = r.company_id), 0)
         + COALESCE((SELECT SUM(quantity - filled_quantity) FROM share_orders
                      WHERE company_id = r.company_id AND side = 'sell' AND status = 'open'), 0)
         - 1000000
      INTO v_left;
    IF v_left > 0 THEN
      RAISE NOTICE 'NPC company % still has % shares over 1,000,000 (held by players)', r.company_id, v_left;
    END IF;
  END LOOP;
END $$;
