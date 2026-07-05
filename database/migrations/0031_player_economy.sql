-- 0031: Player economy — company structures, P2P investments, share market
-- Structures: sole-trader / private-company / public-corporation (chosen freely at creation, convertible later)

-- ============================================================
-- 1. Legal structure gameplay rules
-- ============================================================
ALTER TABLE legal_structures
  ADD COLUMN IF NOT EXISTS filing_fee NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_compliance_cost NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_shareholders INTEGER,          -- NULL = unlimited
  ADD COLUMN IF NOT EXISTS can_sell_equity BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS can_list_publicly BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS min_company_value NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE legal_structures SET
  filing_fee = 500, monthly_compliance_cost = 50, max_shareholders = 1,
  can_sell_equity = FALSE, can_list_publicly = FALSE, min_company_value = 0, is_available = TRUE,
  description = 'One owner. Cheapest to run. No outside investors — all profit and risk are yours.'
WHERE id = 'sole-trader';

UPDATE legal_structures SET
  filing_fee = 5000, monthly_compliance_cost = 300, max_shareholders = 10,
  can_sell_equity = TRUE, can_list_publicly = FALSE, min_company_value = 0, is_available = TRUE,
  description = 'Up to 10 shareholders. Raise capital through private share placements.'
WHERE id = 'private-company';

UPDATE legal_structures SET
  filing_fee = 50000, monthly_compliance_cost = 2000, max_shareholders = NULL,
  can_sell_equity = TRUE, can_list_publicly = TRUE, min_company_value = 250000, is_available = TRUE,
  description = 'Listed on the national exchange. Unlimited shareholders. Requires §250,000 company value to IPO.'
WHERE id = 'public-corporation';

-- Unavailable legacy tiers stay hidden
UPDATE legal_structures SET is_available = FALSE WHERE id IN ('corporation', 'holding-company');

-- ============================================================
-- 2. Cap table
-- ============================================================
CREATE TABLE IF NOT EXISTS company_shares (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  holder_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  shares BIGINT NOT NULL CHECK (shares >= 0),
  avg_cost_basis NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, holder_character_id)
);
CREATE INDEX IF NOT EXISTS idx_company_shares_holder ON company_shares(holder_character_id);

-- Backfill: every existing company defaults to sole trader; founder holds all 1,000,000 shares
UPDATE companies SET legal_structure_id = 'sole-trader' WHERE legal_structure_id IS NULL;

INSERT INTO company_shares (company_id, holder_character_id, shares, avg_cost_basis)
SELECT c.id, c.owner_character_id, 1000000, 0
FROM companies c
WHERE c.owner_character_id IS NOT NULL
ON CONFLICT (company_id, holder_character_id) DO NOTHING;

-- ============================================================
-- 3. Share market (public player companies only)
-- ============================================================
CREATE TABLE IF NOT EXISTS share_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  side VARCHAR(4) NOT NULL CHECK (side IN ('buy', 'sell')),
  price NUMERIC NOT NULL CHECK (price > 0),
  quantity BIGINT NOT NULL CHECK (quantity > 0),
  filled_quantity BIGINT NOT NULL DEFAULT 0 CHECK (filled_quantity >= 0),
  escrow_amount NUMERIC NOT NULL DEFAULT 0,   -- cash locked for buys, informational for sells
  status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_share_orders_book ON share_orders(company_id, side, status, price);
CREATE INDEX IF NOT EXISTS idx_share_orders_character ON share_orders(character_id, status);

CREATE TABLE IF NOT EXISTS share_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  buy_order_id UUID NOT NULL REFERENCES share_orders(id),
  sell_order_id UUID NOT NULL REFERENCES share_orders(id),
  buyer_character_id UUID NOT NULL REFERENCES characters(id),
  seller_character_id UUID NOT NULL REFERENCES characters(id),
  price NUMERIC NOT NULL,
  quantity BIGINT NOT NULL,
  game_year INTEGER NOT NULL DEFAULT 1,
  game_month INTEGER NOT NULL DEFAULT 1,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_share_trades_company ON share_trades(company_id, executed_at DESC);

-- ============================================================
-- 4. Player-to-player loans
-- ============================================================
CREATE TABLE IF NOT EXISTS loan_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_character_id UUID REFERENCES characters(id) ON DELETE CASCADE,  -- NULL = open offer
  max_amount NUMERIC NOT NULL CHECK (max_amount > 0),
  monthly_interest_rate NUMERIC NOT NULL CHECK (monthly_interest_rate >= 0 AND monthly_interest_rate <= 0.25),
  term_months INTEGER NOT NULL CHECK (term_months BETWEEN 1 AND 60),
  purpose TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loan_offers_status ON loan_offers(status);

CREATE TABLE IF NOT EXISTS p2p_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES loan_offers(id),
  lender_character_id UUID NOT NULL REFERENCES characters(id),
  borrower_character_id UUID NOT NULL REFERENCES characters(id),
  principal NUMERIC NOT NULL CHECK (principal > 0),
  monthly_interest_rate NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  months_remaining INTEGER NOT NULL,
  monthly_payment NUMERIC NOT NULL,
  total_paid NUMERIC NOT NULL DEFAULT 0,
  missed_payments INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'repaid', 'defaulted')),
  started_game_year INTEGER NOT NULL DEFAULT 1,
  started_game_month INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_p2p_loans_borrower ON p2p_loans(borrower_character_id, status);
CREATE INDEX IF NOT EXISTS idx_p2p_loans_lender ON p2p_loans(lender_character_id, status);

-- ============================================================
-- 5. Private equity placements
-- ============================================================
CREATE TABLE IF NOT EXISTS equity_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  seller_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_character_id UUID REFERENCES characters(id) ON DELETE CASCADE,  -- NULL = open to all
  shares BIGINT NOT NULL CHECK (shares > 0),
  price_per_share NUMERIC NOT NULL CHECK (price_per_share > 0),
  status VARCHAR(12) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_equity_placements_status ON equity_placements(status, company_id);

-- ============================================================
-- 6. Dividends
-- ============================================================
CREATE TABLE IF NOT EXISTS dividend_policies (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  payout_percent NUMERIC NOT NULL DEFAULT 0 CHECK (payout_percent >= 0 AND payout_percent <= 50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dividend_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  holder_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  game_year INTEGER NOT NULL,
  game_month INTEGER NOT NULL,
  shares_held BIGINT NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dividend_payments_holder ON dividend_payments(holder_character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dividend_payments_company ON dividend_payments(company_id, game_year, game_month);
