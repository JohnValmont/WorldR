-- 0035: IPO system + DRX Bourse (public capital markets)
-- Adds the three-phase IPO pipeline (preparation -> book-building -> listing),
-- monthly OHLC price history, the DRX market index, founder share lockups,
-- and a system market-maker so listed order books are never empty.

-- ============================================================
-- 1. IPO listings — one active IPO process per company
-- ============================================================
CREATE TABLE IF NOT EXISTS ipo_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'book_building', 'listed', 'withdrawn', 'failed')),
  ipo_price_min NUMERIC(14,4) NOT NULL CHECK (ipo_price_min > 0),
  ipo_price_max NUMERIC(14,4) NOT NULL CHECK (ipo_price_max > 0),
  float_percent NUMERIC(5,4) NOT NULL CHECK (float_percent >= 0.10 AND float_percent <= 0.49),
  float_shares INTEGER NOT NULL CHECK (float_shares > 0),
  clearing_price NUMERIC(14,4),
  proceeds_raised NUMERIC(14,2),
  use_of_proceeds TEXT,
  lockup_months INTEGER NOT NULL DEFAULT 3 CHECK (lockup_months BETWEEN 3 AND 12),
  review_ends_year INTEGER NOT NULL,
  review_ends_month INTEGER NOT NULL,
  bookbuild_ends_year INTEGER,
  bookbuild_ends_month INTEGER,
  listing_year INTEGER,
  listing_month INTEGER,
  filing_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ipo_listings_status ON ipo_listings(status);
CREATE INDEX IF NOT EXISTS idx_ipo_listings_company ON ipo_listings(company_id);
-- Only one live IPO process per company (a company may re-IPO after withdrawn/failed)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ipo_active_per_company
  ON ipo_listings(company_id)
  WHERE status IN ('pending_review', 'book_building');

-- ============================================================
-- 2. Indications of interest (book-building order-taking)
-- ============================================================
CREATE TABLE IF NOT EXISTS ipo_indications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL REFERENCES ipo_listings(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,   -- NULL only if data lost; NPCs use the system character
  is_npc BOOLEAN NOT NULL DEFAULT FALSE,
  price_per_share NUMERIC(14,4) NOT NULL CHECK (price_per_share > 0),
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  quantity_allocated INTEGER,
  status VARCHAR(12) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'allocated', 'pro_rated', 'withdrawn', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ipo_indications_ipo ON ipo_indications(ipo_id, status);
CREATE INDEX IF NOT EXISTS idx_ipo_indications_character ON ipo_indications(character_id);
-- A player can hold only one live IOI per IPO (they edit by cancel + resubmit)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ioi_pending_per_player
  ON ipo_indications(ipo_id, character_id)
  WHERE status = 'pending' AND is_npc = FALSE;

-- ============================================================
-- 3. Monthly OHLC price history (drives candlestick charts)
-- ============================================================
CREATE TABLE IF NOT EXISTS share_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  game_year INTEGER NOT NULL,
  game_month INTEGER NOT NULL,
  open_price NUMERIC(14,4) NOT NULL,
  high_price NUMERIC(14,4) NOT NULL,
  low_price NUMERIC(14,4) NOT NULL,
  close_price NUMERIC(14,4) NOT NULL,
  volume_shares BIGINT NOT NULL DEFAULT 0,
  market_cap NUMERIC(20,2) NOT NULL DEFAULT 0,
  eps NUMERIC(14,6) NOT NULL DEFAULT 0,
  pe_ratio NUMERIC(10,2),
  analyst_estimate NUMERIC(14,2),
  profit_surprise_pct NUMERIC(8,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, game_year, game_month)
);
CREATE INDEX IF NOT EXISTS idx_share_price_history_company
  ON share_price_history(company_id, game_year, game_month);

-- ============================================================
-- 4. DRX market index (aggregate market-cap index, NASDAQ-style)
-- ============================================================
CREATE TABLE IF NOT EXISTS drx_index_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_year INTEGER NOT NULL,
  game_month INTEGER NOT NULL,
  index_value NUMERIC(14,4) NOT NULL,
  total_listed INTEGER NOT NULL DEFAULT 0,
  total_volume BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (game_year, game_month)
);

-- Persistent index config (base divisor is fixed at the first-ever listing so
-- the index anchors at 1000 and then floats with aggregate market cap).
CREATE TABLE IF NOT EXISTS drx_index_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  base_divisor NUMERIC(24,6),
  base_value NUMERIC(14,4) NOT NULL DEFAULT 1000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO drx_index_config (id, base_divisor, base_value)
VALUES (1, NULL, 1000)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Founder share lockups (cap table)
-- ============================================================
ALTER TABLE company_shares
  ADD COLUMN IF NOT EXISTS lockup_until_year INTEGER,
  ADD COLUMN IF NOT EXISTS lockup_until_month INTEGER;

-- ============================================================
-- 6. Order-book tags for NPC market makers + circuit breaker
-- ============================================================
ALTER TABLE share_orders
  ADD COLUMN IF NOT EXISTS is_npc BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejected_circuit_breaker BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_share_orders_npc ON share_orders(company_id, is_npc, status);

-- ============================================================
-- 7. System market-maker character (infinite liquidity specialist)
--    Reuses the existing system NPC user/character if present.
-- ============================================================
DO $$
DECLARE
  v_sys_user_id BIGINT;
  v_sys_char_id UUID;
BEGIN
  SELECT id INTO v_sys_user_id FROM users WHERE email = 'system_npc@worldr.game';
  IF v_sys_user_id IS NULL THEN
    INSERT INTO users (email, password_hash)
    VALUES ('system_npc@worldr.game', 'no_login_allowed')
    RETURNING id INTO v_sys_user_id;
  END IF;

  SELECT id INTO v_sys_char_id FROM characters WHERE user_id = v_sys_user_id LIMIT 1;
  INSERT INTO world_instances (id, name, status) VALUES ('pre-alpha-world-1', 'Pre-Alpha World 1', 'active') ON CONFLICT DO NOTHING;
  INSERT INTO currencies (id, name, symbol, locale, decimal_places) VALUES ('dollar', 'Drennian Dollar', '$', 'en-US', 2) ON CONFLICT DO NOTHING;
  INSERT INTO countries (id, world_instance_id, name, currency_id, status) VALUES ('drennia', 'pre-alpha-world-1', 'Republic of Drennia', 'dollar', 'active') ON CONFLICT DO NOTHING;
  
  IF v_sys_char_id IS NULL THEN
    INSERT INTO characters (user_id, world_instance_id, motherland_country_id, name, age,
                            created_at_world_year, created_at_world_month, created_at_world_day)
    VALUES (v_sys_user_id, 'pre-alpha-world-1', 'drennia', 'DRX Market Maker', 30, 0, 0, 0)
    RETURNING id INTO v_sys_char_id;
  END IF;

  -- Fund the specialist with deep cash so it can always underwrite IOIs and post bids.
  INSERT INTO character_finances (character_id, currency_id, cash_in_hand, net_worth)
  VALUES (v_sys_char_id, 'dollar', 1000000000000, 1000000000000)
  ON CONFLICT (character_id) DO UPDATE
    SET cash_in_hand = GREATEST(character_finances.cash_in_hand, 1000000000000);
END $$;
