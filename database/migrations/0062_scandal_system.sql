-- ── 0062: Scandal System ──────────────────────────────────────────────────────
-- Tracks political scandals for player and NPC parties.
-- Lifecycle: rumour → investigation → allegation → explosion → inquiry → resolved
-- Players can intervene at each stage (at PC cost or AP cost).

CREATE TABLE IF NOT EXISTS pol_scandals (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  party_id            UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  character_id        UUID REFERENCES characters(id) ON DELETE SET NULL,

  -- Classification
  scandal_type        TEXT NOT NULL CHECK (scandal_type IN (
    'financial',       -- misuse of funds, bribery, embezzlement
    'personal',        -- affair, hypocrisy, substance abuse
    'governmental',    -- policy failure, nepotism, cover-up
    'electoral'        -- vote buying, candidate fraud
  )),
  severity            INTEGER NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
                      -- 1=Minor, 2=Moderate, 3=Serious, 4=Major, 5=Career-Ending

  -- Lifecycle phases
  phase               TEXT NOT NULL DEFAULT 'rumour' CHECK (phase IN (
    'rumour',          -- only the party knows; can be suppressed cheaply
    'investigation',   -- press investigating; harder to suppress
    'allegation',      -- public allegation made; popularity hit begins
    'explosion',       -- full media storm; max popularity damage
    'inquiry',         -- parliamentary or judicial inquiry opened
    'resolved'         -- concluded (cleared, resigned, or weathered)
  )),

  -- Popularity damage per phase (fraction of severity, applied each arc)
  popularity_damage   NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Resolution outcome
  resolution_type     TEXT CHECK (resolution_type IN (
    'suppressed',      -- buried before public (PC spend)
    'cleared',         -- investigation found no wrongdoing
    'weathered',       -- survived public scrutiny
    'resignation',     -- character resigned
    'expelled'         -- removed from party
  )),

  -- Player intervention flags (set when player acts)
  was_suppressed      BOOLEAN NOT NULL DEFAULT FALSE,
  was_spun            BOOLEAN NOT NULL DEFAULT FALSE,
  was_stonewalled     BOOLEAN NOT NULL DEFAULT FALSE,
  was_disclosed       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Timing (arc numbers)
  discovery_arc       INTEGER NOT NULL,
  phase_entered_arc   INTEGER NOT NULL,   -- arc when current phase started
  resolved_arc        INTEGER,

  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_scandals_party ON pol_scandals(party_id);
CREATE INDEX IF NOT EXISTS idx_pol_scandals_state ON pol_scandals(state_id);
CREATE INDEX IF NOT EXISTS idx_pol_scandals_phase ON pol_scandals(phase);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_pol_scandals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pol_scandals_updated_at ON pol_scandals;
CREATE TRIGGER trg_pol_scandals_updated_at
  BEFORE UPDATE ON pol_scandals
  FOR EACH ROW EXECUTE FUNCTION update_pol_scandals_updated_at();
