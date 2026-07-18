-- Migration 0055: Normalize NPC shares to 1,000,000
-- Reduces all NPC company shares to 1M and dynamically scales their share price 
-- proportionally so that their market cap remains identical.

DO $$
DECLARE
  rec RECORD;
  new_shares BIGINT := 1000000;
  multiplier NUMERIC;
BEGIN
  FOR rec IN
    SELECT c.id, c.name, cs.holder_character_id, cs.shares, cs.avg_cost_basis, sph.close_price
    FROM companies c
    JOIN company_shares cs ON cs.company_id = c.id
    JOIN share_price_history sph ON sph.company_id = c.id
    WHERE c.is_npc = true AND cs.shares > 1000000
  LOOP
    multiplier := rec.shares::numeric / new_shares::numeric;

    -- Update cap table
    UPDATE company_shares 
    SET shares = new_shares,
        avg_cost_basis = avg_cost_basis * multiplier
    WHERE company_id = rec.id AND holder_character_id = rec.holder_character_id;

    -- Update share price history to reflect higher per-share price
    UPDATE share_price_history
    SET open_price = open_price * multiplier,
        high_price = high_price * multiplier,
        low_price = low_price * multiplier,
        close_price = close_price * multiplier,
        eps = eps * multiplier
    WHERE company_id = rec.id;

    -- Note: market_cap stays the same since (price * M) * (shares / M) = price * shares
    RAISE NOTICE 'Normalized %: shares % -> %, price % -> %', rec.name, rec.shares, new_shares, rec.close_price, rec.close_price * multiplier;
  END LOOP;
END $$;
