-- Migration 0024: Seed NPC Exchange Data
-- Update NPC companies to be exchange-listed with proper cap tables and initial price history.

-- 1. Flag companies as exchange listed
UPDATE companies 
SET is_exchange_listed = TRUE 
WHERE id IN (
  '0a8c0f0b-23aa-4692-b4b3-89b08784174b', -- Veridian Motors
  'f36169fb-78b6-41af-b234-969193c68e5c', -- HaulPro
  'd2949b6c-a552-435b-b93a-09684b0760c6', -- Apex Automobili
  '00d99945-0731-428a-997f-f26626fc8722'  -- Valuecorp
);

-- 2. Delete any existing price history to ensure clean slate for these 4 companies
DELETE FROM share_price_history 
WHERE company_id IN (
  '0a8c0f0b-23aa-4692-b4b3-89b08784174b',
  'f36169fb-78b6-41af-b234-969193c68e5c',
  'd2949b6c-a552-435b-b93a-09684b0760c6',
  '00d99945-0731-428a-997f-f26626fc8722'
);

-- 3. Delete stale share orders for these companies
UPDATE share_orders 
SET status = 'cancelled'
WHERE company_id IN (
  '0a8c0f0b-23aa-4692-b4b3-89b08784174b',
  'f36169fb-78b6-41af-b234-969193c68e5c',
  'd2949b6c-a552-435b-b93a-09684b0760c6',
  '00d99945-0731-428a-997f-f26626fc8722'
) AND status = 'open';

-- 4. Set cap tables and price history
DO $$
DECLARE
  sys_char_id UUID;
  current_yr INT;
  current_mo INT;
  haulp_shares INT := 20000000;
  haulp_price NUMERIC := 44.00;
  haulp_eps NUMERIC;
  
  verid_shares INT := 20000000;
  verid_price NUMERIC := 38.50;
  verid_eps NUMERIC;
  
  apex_shares INT := 10000000;
  apex_price NUMERIC := 18.50;
  apex_eps NUMERIC;
  
  value_shares INT := 10000000;
  value_price NUMERIC := 13.75;
  value_eps NUMERIC;

  h_profit NUMERIC;
  v_profit NUMERIC;
  a_profit NUMERIC;
  val_profit NUMERIC;
BEGIN
  -- Get system_npc ID
  SELECT c.id INTO sys_char_id 
  FROM characters c 
  JOIN users u ON u.id = c.user_id 
  WHERE u.email = 'system_npc@worldr.game' 
  ORDER BY c.created_at ASC LIMIT 1;

  -- Get current clock
  SELECT current_year, current_month INTO current_yr, current_mo FROM world_clock LIMIT 1;
  IF current_yr IS NULL THEN current_yr := 1; END IF;
  IF current_mo IS NULL THEN current_mo := 1; END IF;

  -- Get latest profits
  SELECT last_arc_profit INTO h_profit FROM company_finances WHERE company_id = 'f36169fb-78b6-41af-b234-969193c68e5c';
  SELECT last_arc_profit INTO v_profit FROM company_finances WHERE company_id = '0a8c0f0b-23aa-4692-b4b3-89b08784174b';
  SELECT last_arc_profit INTO a_profit FROM company_finances WHERE company_id = 'd2949b6c-a552-435b-b93a-09684b0760c6';
  SELECT last_arc_profit INTO val_profit FROM company_finances WHERE company_id = '00d99945-0731-428a-997f-f26626fc8722';

  haulp_eps := COALESCE(h_profit, 0) / haulp_shares;
  verid_eps := COALESCE(v_profit, 0) / verid_shares;
  apex_eps := COALESCE(a_profit, 0) / apex_shares;
  value_eps := COALESCE(val_profit, 0) / value_shares;

  -- Upsert company_shares for Treasury
  IF sys_char_id IS NOT NULL THEN
    INSERT INTO company_shares (company_id, holder_character_id, shares, avg_cost_basis)
    VALUES 
      ('f36169fb-78b6-41af-b234-969193c68e5c', sys_char_id, haulp_shares, haulp_price),
      ('0a8c0f0b-23aa-4692-b4b3-89b08784174b', sys_char_id, verid_shares, verid_price),
      ('d2949b6c-a552-435b-b93a-09684b0760c6', sys_char_id, apex_shares, apex_price),
      ('00d99945-0731-428a-997f-f26626fc8722', sys_char_id, value_shares, value_price)
    ON CONFLICT (company_id, holder_character_id) DO UPDATE SET 
      shares = EXCLUDED.shares,
      avg_cost_basis = EXCLUDED.avg_cost_basis;

    -- Also set any other holdings for these companies to 0 to ensure the cap table equals the treasury size exactly
    UPDATE company_shares SET shares = 0 WHERE company_id IN (
      'f36169fb-78b6-41af-b234-969193c68e5c',
      '0a8c0f0b-23aa-4692-b4b3-89b08784174b',
      'd2949b6c-a552-435b-b93a-09684b0760c6',
      '00d99945-0731-428a-997f-f26626fc8722'
    ) AND holder_character_id != sys_char_id;
  END IF;

  -- Update company_finances.company_value to reflect new market cap
  UPDATE company_finances SET company_value = haulp_shares * haulp_price WHERE company_id = 'f36169fb-78b6-41af-b234-969193c68e5c';
  UPDATE company_finances SET company_value = verid_shares * verid_price WHERE company_id = '0a8c0f0b-23aa-4692-b4b3-89b08784174b';
  UPDATE company_finances SET company_value = apex_shares * apex_price WHERE company_id = 'd2949b6c-a552-435b-b93a-09684b0760c6';
  UPDATE company_finances SET company_value = value_shares * value_price WHERE company_id = '00d99945-0731-428a-997f-f26626fc8722';

  -- Insert Opening Price Bars
  INSERT INTO share_price_history (
    company_id, game_year, game_month,
    open_price, high_price, low_price, close_price,
    volume_shares, market_cap, eps, pe_ratio, analyst_estimate, profit_surprise_pct
  ) VALUES 
  (
    'f36169fb-78b6-41af-b234-969193c68e5c', current_yr, current_mo,
    haulp_price, haulp_price, haulp_price, haulp_price, 0,
    haulp_price * haulp_shares, haulp_eps, 
    CASE WHEN haulp_eps > 0 THEN ROUND((haulp_price / (haulp_eps * 12))::numeric, 2) ELSE NULL END,
    COALESCE(h_profit, 0), 0
  ),
  (
    '0a8c0f0b-23aa-4692-b4b3-89b08784174b', current_yr, current_mo,
    verid_price, verid_price, verid_price, verid_price, 0,
    verid_price * verid_shares, verid_eps, 
    CASE WHEN verid_eps > 0 THEN ROUND((verid_price / (verid_eps * 12))::numeric, 2) ELSE NULL END,
    COALESCE(v_profit, 0), 0
  ),
  (
    'd2949b6c-a552-435b-b93a-09684b0760c6', current_yr, current_mo,
    apex_price, apex_price, apex_price, apex_price, 0,
    apex_price * apex_shares, apex_eps, 
    CASE WHEN apex_eps > 0 THEN ROUND((apex_price / (apex_eps * 12))::numeric, 2) ELSE NULL END,
    COALESCE(a_profit, 0), 0
  ),
  (
    '00d99945-0731-428a-997f-f26626fc8722', current_yr, current_mo,
    value_price, value_price, value_price, value_price, 0,
    value_price * value_shares, value_eps, 
    CASE WHEN value_eps > 0 THEN ROUND((value_price / (value_eps * 12))::numeric, 2) ELSE NULL END,
    COALESCE(val_profit, 0), 0
  );

END $$;
