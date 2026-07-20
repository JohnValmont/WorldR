-- ── 0066: Legacy System ──────────────────────────────────────────────────────
-- A politician's permanent historical record across 6 dimensions.
-- Records are appended on milestone events (elections, coalitions, scandals, etc.)
-- Aggregate scores are stored in pol_legacy_scores and updated each arc.
-- Legacy benefits unlock at score thresholds and provide mechanical advantages.

-- ── Event Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pol_legacy_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id    UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  state_id VARCHAR(50) NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  arc             INTEGER NOT NULL,
  -- Which dimension this event affects
  dimension       TEXT NOT NULL CHECK (dimension IN (
    'electoral', 'legislative', 'coalition', 'scandal', 'economic', 'longevity'
  )),
  event_type      TEXT NOT NULL,   -- e.g. 'election_won', 'scandal_erupted', 'coalition_formed'
  score_delta     INTEGER NOT NULL DEFAULT 0,
  -- Human-readable narrative for the historical record viewer
  headline        TEXT NOT NULL,
  narrative       TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_legacy_char   ON pol_legacy_records(character_id, arc);
CREATE INDEX IF NOT EXISTS idx_pol_legacy_dim    ON pol_legacy_records(character_id, dimension);

-- ── Aggregate Scores ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pol_legacy_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id        UUID NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  -- Six dimensions (0-based, can go negative on scandal/coalition)
  electoral           INTEGER NOT NULL DEFAULT 0,
  legislative         INTEGER NOT NULL DEFAULT 0,
  coalition           INTEGER NOT NULL DEFAULT 0,
  scandal             INTEGER NOT NULL DEFAULT 0,   -- positive = clean record
  economic            INTEGER NOT NULL DEFAULT 0,
  longevity           INTEGER NOT NULL DEFAULT 0,
  -- Derived total (sum across all dimensions)
  total               INTEGER NOT NULL DEFAULT 0,
  -- Unlocked benefit keys (JSONB array of strings)
  unlocked_benefits   JSONB NOT NULL DEFAULT '[]',
  -- Last arc this was computed
  last_computed_arc   INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_pol_legacy_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.total = NEW.electoral + NEW.legislative + NEW.coalition + NEW.scandal + NEW.economic + NEW.longevity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pol_legacy_updated_at ON pol_legacy_scores;
CREATE TRIGGER trg_pol_legacy_updated_at
  BEFORE UPDATE ON pol_legacy_scores
  FOR EACH ROW EXECUTE FUNCTION update_pol_legacy_scores_updated_at();
