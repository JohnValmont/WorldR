-- WORLDr Migration 0053: Reset NPC Cash to fix Book Values
-- Because NPCs were previously selling cars for astronomical prices due to bugs, 
-- they actually amassed hundreds of billions in true cash. 
-- The previous migration accurately calculated their market cap based on that cash,
-- which meant they legitimately had a $400B book value. 
-- This script resets their cash to sane levels and recalculates their share prices.

BEGIN;

DO $$
DECLARE
  haulp_id    UUID;
  verid_id    UUID;
  apex_id     UUID;
  val_id      UUID;
  
  haulp_book  NUMERIC;
  verid_book  NUMERIC;
  apex_book   NUMERIC;
  val_book    NUMERIC;
  
  haulp_inv   NUMERIC;
  verid_inv   NUMERIC;
  apex_inv    NUMERIC;
  val_inv     NUMERIC;
  
  haulp_price NUMERIC;
  verid_price NUMERIC;
  apex_price  NUMERIC;
  val_price   NUMERIC;
  
  haulp_shares BIGINT;
  verid_shares BIGINT;
  apex_shares  BIGINT;
  val_shares   BIGINT;
  
  cur_yr  INT;
  cur_mo  INT;
BEGIN
  -- Resolve company IDs
  SELECT id INTO haulp_id FROM companies WHERE name = 'HaulPro'        AND is_npc = true AND status = 'active' LIMIT 1;
  SELECT id INTO verid_id FROM companies WHERE name = 'Veridian Motors' AND is_npc = true AND status = 'active' LIMIT 1;
  SELECT id INTO apex_id  FROM companies WHERE name = 'Apex Automobili' AND is_npc = true AND status = 'active' LIMIT 1;
  SELECT id INTO val_id   FROM companies WHERE name = 'Valuecorp'       AND is_npc = true AND status = 'active' LIMIT 1;

  -- World clock
  SELECT current_year, current_month INTO cur_yr, cur_mo FROM world_clock LIMIT 1;
  IF cur_yr IS NULL THEN cur_yr := 1; END IF;
  IF cur_mo IS NULL THEN cur_mo := 1; END IF;

  -- 1. Get exact total shares for each NPC from the DB (avoids hardcoding 20M if it changed)
  IF haulp_id IS NOT NULL THEN SELECT COALESCE(SUM(shares), 1000000) INTO haulp_shares FROM company_shares WHERE company_id = haulp_id; END IF;
  IF verid_id IS NOT NULL THEN SELECT COALESCE(SUM(shares), 1000000) INTO verid_shares FROM company_shares WHERE company_id = verid_id; END IF;
  IF apex_id  IS NOT NULL THEN SELECT COALESCE(SUM(shares), 1000000) INTO apex_shares  FROM company_shares WHERE company_id = apex_id; END IF;
  IF val_id   IS NOT NULL THEN SELECT COALESCE(SUM(shares), 1000000) INTO val_shares   FROM company_shares WHERE company_id = val_id; END IF;

  -- 2. HARD RESET NPC CASH TO SANE LEVELS ($10M - $20M)
  IF haulp_id IS NOT NULL THEN UPDATE company_finances SET available_cash = 1000000 WHERE company_id = haulp_id; END IF;
  IF verid_id IS NOT NULL THEN UPDATE company_finances SET available_cash = 1000000 WHERE company_id = verid_id; END IF;
  IF apex_id  IS NOT NULL THEN UPDATE company_finances SET available_cash = 1000000 WHERE company_id = apex_id;  END IF;
  IF val_id   IS NOT NULL THEN UPDATE company_finances SET available_cash = 1000000 WHERE company_id = val_id;   END IF;

  -- 3. Fetch inventory values per NPC
  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO haulp_inv FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id WHERE mi.company_id = haulp_id;

  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO verid_inv FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id WHERE mi.company_id = verid_id;

  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO apex_inv FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id WHERE mi.company_id = apex_id;

  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO val_inv FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id WHERE mi.company_id = val_id;

  -- 4. Calculate true book value per share
  IF haulp_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + haulp_inv INTO haulp_book FROM company_finances WHERE company_id = haulp_id;
    haulp_price := GREATEST(0.10, ROUND((haulp_book / NULLIF(haulp_shares, 0))::numeric, 2));
  END IF;

  IF verid_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + verid_inv INTO verid_book FROM company_finances WHERE company_id = verid_id;
    verid_price := GREATEST(0.10, ROUND((verid_book / NULLIF(verid_shares, 0))::numeric, 2));
  END IF;

  IF apex_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + apex_inv INTO apex_book FROM company_finances WHERE company_id = apex_id;
    apex_price := GREATEST(0.10, ROUND((apex_book / NULLIF(apex_shares, 0))::numeric, 2));
  END IF;

  IF val_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + val_inv INTO val_book FROM company_finances WHERE company_id = val_id;
    val_price := GREATEST(0.10, ROUND((val_book / NULLIF(val_shares, 0))::numeric, 2));
  END IF;

  -- 5. Set company_value to exact calculated market cap
  IF haulp_id IS NOT NULL THEN UPDATE company_finances SET company_value = haulp_price * haulp_shares WHERE company_id = haulp_id; END IF;
  IF verid_id IS NOT NULL THEN UPDATE company_finances SET company_value = verid_price * verid_shares WHERE company_id = verid_id; END IF;
  IF apex_id  IS NOT NULL THEN UPDATE company_finances SET company_value = apex_price  * apex_shares  WHERE company_id = apex_id;  END IF;
  IF val_id   IS NOT NULL THEN UPDATE company_finances SET company_value = val_price   * val_shares   WHERE company_id = val_id;   END IF;

  -- 6. WIPE ALL share price history for NPCs so there are no "future" rows sticking around
  DELETE FROM share_price_history WHERE company_id IN (haulp_id, verid_id, apex_id, val_id);

  -- 7. Insert a single clean bar for the CURRENT arc
  IF haulp_id IS NOT NULL THEN
    INSERT INTO share_price_history (company_id, game_year, game_month, open_price, high_price, low_price, close_price, volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT haulp_id, cur_yr, cur_mo, haulp_price, haulp_price, haulp_price, haulp_price, 0, haulp_price * haulp_shares, COALESCE(last_arc_profit, 0) / haulp_shares, NULL, COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = haulp_id;
  END IF;

  IF verid_id IS NOT NULL THEN
    INSERT INTO share_price_history (company_id, game_year, game_month, open_price, high_price, low_price, close_price, volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT verid_id, cur_yr, cur_mo, verid_price, verid_price, verid_price, verid_price, 0, verid_price * verid_shares, COALESCE(last_arc_profit, 0) / verid_shares, NULL, COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = verid_id;
  END IF;

  IF apex_id IS NOT NULL THEN
    INSERT INTO share_price_history (company_id, game_year, game_month, open_price, high_price, low_price, close_price, volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT apex_id, cur_yr, cur_mo, apex_price, apex_price, apex_price, apex_price, 0, apex_price * apex_shares, COALESCE(last_arc_profit, 0) / apex_shares, NULL, COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = apex_id;
  END IF;

  IF val_id IS NOT NULL THEN
    INSERT INTO share_price_history (company_id, game_year, game_month, open_price, high_price, low_price, close_price, volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT val_id, cur_yr, cur_mo, val_price, val_price, val_price, val_price, 0, val_price * val_shares, COALESCE(last_arc_profit, 0) / val_shares, NULL, COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = val_id;
  END IF;

END $$;

COMMIT;
