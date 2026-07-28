-- Migration 0055: Corporate Acquisition Auction System
-- Adds timed auction tables for distressed company takeovers

-- Month arithmetic helper: add N months to a (year, month) pair
-- We store derived start/end years+months directly so no functions needed.

CREATE TABLE IF NOT EXISTS company_acquisitions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES companies(id),
  world_instance_id         TEXT NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'registration'
                              CHECK (status IN ('registration', 'bidding', 'completed', 'cancelled')),
  reserve_price             NUMERIC(18,2) NOT NULL DEFAULT 0,

  -- When registration opened (month 0)
  registration_open_year    INT NOT NULL,
  registration_open_month   INT NOT NULL,

  -- When bidding opens (month 6 after registration, i.e. 7th month)
  bidding_start_year        INT NOT NULL,
  bidding_start_month       INT NOT NULL,

  -- When bidding closes (3 months after bidding starts, i.e. month 9)
  bidding_end_year          INT NOT NULL,
  bidding_end_month         INT NOT NULL,

  -- Settlement
  winner_character_id       UUID REFERENCES characters(id),
  winning_bid_amount        NUMERIC(18,2),

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_acquisitions_active
  ON company_acquisitions(company_id)
  WHERE status IN ('registration', 'bidding');

CREATE TABLE IF NOT EXISTS company_acquisition_bids (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id  UUID NOT NULL REFERENCES company_acquisitions(id) ON DELETE CASCADE,
  character_id    UUID NOT NULL REFERENCES characters(id),
  bid_amount      NUMERIC(18,2) NOT NULL,
  game_year       INT NOT NULL,
  game_month      INT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (acquisition_id, character_id)   -- one active bid per player, upsert to raise
);

CREATE INDEX IF NOT EXISTS idx_acquisition_bids_acquisition ON company_acquisition_bids(acquisition_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_bids_character   ON company_acquisition_bids(character_id);
