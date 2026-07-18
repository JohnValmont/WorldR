-- Migration 0044: Seed NPC Exchange Data
-- Flags the 4 NPC manufacturing companies as exchange-listed,
-- seeds their cap tables (held by system_npc) and opening price bars.
-- UUID-agnostic: resolves IDs by name/email at runtime.

DO $$
DECLARE
  sys_char_id  UUID;
  current_yr   INT;
  current_mo   INT;
  haulp_id     UUID;
  verid_id     UUID;
  apex_id      UUID;
  val_id       UUID;
  haulp_shares BIGINT  := 1000000;
  verid_shares BIGINT  := 1000000;
  apex_shares  BIGINT  := 1000000;
  val_shares   BIGINT  := 1000000;
  haulp_price  NUMERIC := 44.00;
  verid_price  NUMERIC := 38.50;
  apex_price   NUMERIC := 18.50;
  val_price    NUMERIC := 13.75;
  haulp_profit NUMERIC;
  verid_profit NUMERIC;
  apex_profit  NUMERIC;
  val_profit   NUMERIC;
BEGIN
  -- Resolve system_npc character
  SELECT c.id INTO sys_char_id
    FROM characters c
    JOIN users u ON u.id = c.user_id
   WHERE u.email = 'system_npc@worldr.game'
   ORDER BY c.created_at ASC LIMIT 1;

  IF sys_char_id IS NULL THEN
    RAISE NOTICE 'system_npc character not found — skipping 0044';
    RETURN;
  END IF;

  -- Resolve company IDs by name
  SELECT id INTO haulp_id FROM companies WHERE name = 'HaulPro'        AND is_npc = true AND status = 'active' LIMIT 1;
  SELECT id INTO verid_id FROM companies WHERE name = 'Veridian Motors' AND is_npc = true AND status = 'active' LIMIT 1;
  SELECT id INTO apex_id  FROM companies WHERE name = 'Apex Automobili' AND is_npc = true AND status = 'active' LIMIT 1;
  SELECT id INTO val_id   FROM companies WHERE name = 'Valuecorp'       AND is_npc = true AND status = 'active' LIMIT 1;

  -- World clock
  SELECT current_year, current_month INTO current_yr, current_mo FROM world_clock LIMIT 1;
  IF current_yr IS NULL THEN current_yr := 1; END IF;
  IF current_mo IS NULL THEN current_mo := 1; END IF;

  -- Latest profits
  IF haulp_id IS NOT NULL THEN SELECT COALESCE(last_arc_profit,0) INTO haulp_profit FROM company_finances WHERE company_id = haulp_id; END IF;
  IF verid_id IS NOT NULL THEN SELECT COALESCE(last_arc_profit,0) INTO verid_profit FROM company_finances WHERE company_id = verid_id; END IF;
  IF apex_id  IS NOT NULL THEN SELECT COALESCE(last_arc_profit,0) INTO apex_profit  FROM company_finances WHERE company_id = apex_id;  END IF;
  IF val_id   IS NOT NULL THEN SELECT COALESCE(last_arc_profit,0) INTO val_profit   FROM company_finances WHERE company_id = val_id;   END IF;

  -- ── Flag as exchange-listed ──────────────────────────────────────────────
  UPDATE companies SET is_exchange_listed = TRUE
   WHERE id IN (haulp_id, verid_id, apex_id, val_id);

  -- ── Cap tables (treasury = system_npc holds all shares initially) ────────
  INSERT INTO company_shares (company_id, holder_character_id, shares, avg_cost_basis)
  VALUES
    (haulp_id, sys_char_id, haulp_shares, haulp_price),
    (verid_id, sys_char_id, verid_shares, verid_price),
    (apex_id,  sys_char_id, apex_shares,  apex_price),
    (val_id,   sys_char_id, val_shares,   val_price)
  ON CONFLICT (company_id, holder_character_id) DO UPDATE SET
    shares        = EXCLUDED.shares,
    avg_cost_basis = EXCLUDED.avg_cost_basis;

  -- ── Update company_value to match market cap ─────────────────────────────
  UPDATE company_finances SET company_value = haulp_price * haulp_shares WHERE company_id = haulp_id;
  UPDATE company_finances SET company_value = verid_price * verid_shares WHERE company_id = verid_id;
  UPDATE company_finances SET company_value = apex_price  * apex_shares  WHERE company_id = apex_id;
  UPDATE company_finances SET company_value = val_price   * val_shares   WHERE company_id = val_id;

  -- ── Opening price bars (delete any stale ones first) ────────────────────
  DELETE FROM share_price_history WHERE company_id IN (haulp_id, verid_id, apex_id, val_id);

  INSERT INTO share_price_history
    (company_id, game_year, game_month,
     open_price, high_price, low_price, close_price,
     volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct)
  VALUES
    (haulp_id, current_yr, current_mo,
     haulp_price, haulp_price, haulp_price, haulp_price, 0,
     haulp_price * haulp_shares,
     haulp_profit / haulp_shares,
     CASE WHEN haulp_profit > 0 THEN ROUND((haulp_price / ((haulp_profit / haulp_shares) * 12))::numeric, 2) ELSE NULL END,
     haulp_profit, 0),
    (verid_id, current_yr, current_mo,
     verid_price, verid_price, verid_price, verid_price, 0,
     verid_price * verid_shares,
     verid_profit / verid_shares,
     CASE WHEN verid_profit > 0 THEN ROUND((verid_price / ((verid_profit / verid_shares) * 12))::numeric, 2) ELSE NULL END,
     verid_profit, 0),
    (apex_id, current_yr, current_mo,
     apex_price, apex_price, apex_price, apex_price, 0,
     apex_price * apex_shares,
     apex_profit / apex_shares,
     CASE WHEN apex_profit > 0 THEN ROUND((apex_price / ((apex_profit / apex_shares) * 12))::numeric, 2) ELSE NULL END,
     apex_profit, 0),
    (val_id, current_yr, current_mo,
     val_price, val_price, val_price, val_price, 0,
     val_price * val_shares,
     val_profit / val_shares,
     CASE WHEN val_profit > 0 THEN ROUND((val_price / ((val_profit / val_shares) * 12))::numeric, 2) ELSE NULL END,
     val_profit, 0);

  -- ── Cancel stale open orders from any previous test runs ─────────────────
  UPDATE share_orders SET status = 'cancelled'
   WHERE company_id IN (haulp_id, verid_id, apex_id, val_id)
     AND status = 'open';

  RAISE NOTICE '0044 complete: NPC exchange seeded for HaulPro/Veridian/Apex/Valuecorp';
END $$;
