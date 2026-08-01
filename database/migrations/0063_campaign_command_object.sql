-- ── 0063: Campaign Command Object ──────────────────────────────────────────
-- Adds the persistent party-level campaign object for multi-arc campaign management.
-- Each party gets one campaign record per election cycle.
-- Individual candidate actions continue in pol_campaign_actions (unchanged).

CREATE TABLE IF NOT EXISTS pol_campaigns (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id                UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
  party_id                UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,

  -- Campaign identity
  strategy_type           TEXT NOT NULL DEFAULT 'balanced' CHECK (strategy_type IN (
    'ground_war',         -- canvass-heavy, high base-vote retention
    'air_war',            -- media-heavy, broad reach but shallow
    'targeted',           -- precision targeting of swing segments
    'balanced',           -- even spread
    'insurgent'           -- low budget, high energy signature events
  )),

  -- Budget management
  budget_allocated        INTEGER NOT NULL DEFAULT 0,   -- total treasury committed to campaign
  budget_spent            INTEGER NOT NULL DEFAULT 0,   -- accumulated spend

  -- Ground game is the key multi-arc accumulator
  -- Accumulated effort score across all arcs. Fed into election engine as bonus.
  ground_game_score       NUMERIC(8,2) NOT NULL DEFAULT 0,

  -- Per-arc action log (JSONB array of { arc, action_type, target_segment, effort, outcome })
  arc_actions             JSONB NOT NULL DEFAULT '[]',

  -- Campaign events that have fired (prevents repeat)
  fired_events            JSONB NOT NULL DEFAULT '[]',

  -- Current status
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',             -- campaign in progress
    'paused',             -- no candidacy this arc
    'concluded'           -- election resolved
  )),

  -- Momentum: positive = building, negative = losing ground
  momentum                NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Key advantage: segment where campaign has strongest ground (null = none yet)
  stronghold_segment      TEXT,

  started_arc             INTEGER NOT NULL,
  concluded_arc           INTEGER,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (cycle_id, party_id)
);

CREATE INDEX IF NOT EXISTS idx_pol_campaigns_party ON pol_campaigns(party_id);
CREATE INDEX IF NOT EXISTS idx_pol_campaigns_cycle ON pol_campaigns(cycle_id);
CREATE INDEX IF NOT EXISTS idx_pol_campaigns_status ON pol_campaigns(status);

CREATE OR REPLACE FUNCTION update_pol_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_pol_campaigns_updated_at ON pol_campaigns;
CREATE TRIGGER trg_pol_campaigns_updated_at
  BEFORE UPDATE ON pol_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_pol_campaigns_updated_at();
