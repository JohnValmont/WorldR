-- WORLDr Migration 0051: Reset NPC Share Prices to Actual Book Value
-- The original 0044 seed used arbitrary prices ($44/share HaulPro etc.)
-- that produced $880M market caps for companies earning ~$100K/month.
-- This migration resets prices to floor(available_cash - debt + inventory) / shares,
-- with a minimum floor of $0.10/share.
-- After migration 0049 runs (bigger factories, more markets), NPC earnings will
-- grow naturally and the share market engine can push prices back up over time.

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
  haulp_shares BIGINT := 20000000;
  verid_shares BIGINT := 20000000;
  apex_shares  BIGINT := 10000000;
  val_shares   BIGINT := 10000000;
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

  -- Fetch inventory values per NPC
  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO haulp_inv
    FROM manufacturing_inventory mi
    JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
    WHERE mi.company_id = haulp_id;

  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO verid_inv
    FROM manufacturing_inventory mi
    JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
    WHERE mi.company_id = verid_id;

  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO apex_inv
    FROM manufacturing_inventory mi
    JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
    WHERE mi.company_id = apex_id;

  SELECT COALESCE(SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit), 0)
    INTO val_inv
    FROM manufacturing_inventory mi
    JOIN manufacturing_vehicle_models mv ON mi.vehicle_model_id = mv.id
    WHERE mi.company_id = val_id;

  -- Book value = available_cash - debt + inventory
  IF haulp_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + haulp_inv
      INTO haulp_book FROM company_finances WHERE company_id = haulp_id;
    haulp_price := GREATEST(0.10, ROUND((haulp_book / haulp_shares)::numeric, 2));
  END IF;

  IF verid_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + verid_inv
      INTO verid_book FROM company_finances WHERE company_id = verid_id;
    verid_price := GREATEST(0.10, ROUND((verid_book / verid_shares)::numeric, 2));
  END IF;

  IF apex_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + apex_inv
      INTO apex_book FROM company_finances WHERE company_id = apex_id;
    apex_price := GREATEST(0.10, ROUND((apex_book / apex_shares)::numeric, 2));
  END IF;

  IF val_id IS NOT NULL THEN
    SELECT GREATEST(0, available_cash - COALESCE(debt, 0)) + val_inv
      INTO val_book FROM company_finances WHERE company_id = val_id;
    val_price := GREATEST(0.10, ROUND((val_book / val_shares)::numeric, 2));
  END IF;

  -- ── Reset company_finances.company_value to new realistic market cap ──────
  IF haulp_id IS NOT NULL THEN UPDATE company_finances SET company_value = haulp_price * haulp_shares WHERE company_id = haulp_id; END IF;
  IF verid_id IS NOT NULL THEN UPDATE company_finances SET company_value = verid_price * verid_shares WHERE company_id = verid_id; END IF;
  IF apex_id  IS NOT NULL THEN UPDATE company_finances SET company_value = apex_price  * apex_shares  WHERE company_id = apex_id;  END IF;
  IF val_id   IS NOT NULL THEN UPDATE company_finances SET company_value = val_price   * val_shares   WHERE company_id = val_id;   END IF;

  -- ── Insert corrected price bars for current arc ───────────────────────────
  -- (Replace any existing bar for this period so the chart starts from reality)
  DELETE FROM share_price_history
   WHERE company_id IN (haulp_id, verid_id, apex_id, val_id)
     AND game_year = cur_yr
     AND game_month = cur_mo;

  IF haulp_id IS NOT NULL THEN
    INSERT INTO share_price_history
      (company_id, game_year, game_month, open_price, high_price, low_price, close_price,
       volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT haulp_id, cur_yr, cur_mo,
      haulp_price, haulp_price, haulp_price, haulp_price, 0,
      haulp_price * haulp_shares,
      COALESCE(last_arc_profit, 0) / haulp_shares,
      CASE WHEN last_arc_profit > 0 THEN ROUND((haulp_price / NULLIF(last_arc_profit / haulp_shares, 0))::numeric, 2) ELSE NULL END,
      COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = haulp_id;
  END IF;

  IF verid_id IS NOT NULL THEN
    INSERT INTO share_price_history
      (company_id, game_year, game_month, open_price, high_price, low_price, close_price,
       volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT verid_id, cur_yr, cur_mo,
      verid_price, verid_price, verid_price, verid_price, 0,
      verid_price * verid_shares,
      COALESCE(last_arc_profit, 0) / verid_shares,
      CASE WHEN last_arc_profit > 0 THEN ROUND((verid_price / NULLIF(last_arc_profit / verid_shares, 0))::numeric, 2) ELSE NULL END,
      COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = verid_id;
  END IF;

  IF apex_id IS NOT NULL THEN
    INSERT INTO share_price_history
      (company_id, game_year, game_month, open_price, high_price, low_price, close_price,
       volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT apex_id, cur_yr, cur_mo,
      apex_price, apex_price, apex_price, apex_price, 0,
      apex_price * apex_shares,
      COALESCE(last_arc_profit, 0) / apex_shares,
      CASE WHEN last_arc_profit > 0 THEN ROUND((apex_price / NULLIF(last_arc_profit / apex_shares, 0))::numeric, 2) ELSE NULL END,
      COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = apex_id;
  END IF;

  IF val_id IS NOT NULL THEN
    INSERT INTO share_price_history
      (company_id, game_year, game_month, open_price, high_price, low_price, close_price,
       volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
    SELECT val_id, cur_yr, cur_mo,
      val_price, val_price, val_price, val_price, 0,
      val_price * val_shares,
      COALESCE(last_arc_profit, 0) / val_shares,
      CASE WHEN last_arc_profit > 0 THEN ROUND((val_price / NULLIF(last_arc_profit / val_shares, 0))::numeric, 2) ELSE NULL END,
      COALESCE(last_arc_profit, 0), 0
    FROM company_finances WHERE company_id = val_id;
  END IF;

  RAISE NOTICE '0051 complete: NPC share prices reset to book value. HaulPro=$ % (was $44), Veridian=$ % (was $38.50)', haulp_price, verid_price;
END $$;

COMMIT;
