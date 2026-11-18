-- 0102_world_stage.sql
-- Owner decisions 2026-11-18 (docs/WORLD_STAGE.md):
--   * one game month = 8 real hours (was 4), both clocks;
--   * energy carries over up to 24 (constants/politics.ts AP_BANK_CAP);
--   * the politician's career ladder, the Meridian Wire (a neutral international
--     news agency with a monthly World Influence Index and reader dispatches),
--     a personal inbox, and contested leadership challenges.
-- Idempotent: safe to run twice.

-- ── Clock: 8 real hours per game month ──────────────────────────────────────
-- Only clocks still on the 0095 default (4 h) are changed, so a speed an admin
-- set deliberately is left alone. Revert with 14400.
UPDATE world_clock SET real_seconds_per_month = 28800, updated_at = NOW() WHERE real_seconds_per_month = 14400;
UPDATE world_clock SET pol_real_seconds_per_month = 28800, updated_at = NOW()
 WHERE pol_real_seconds_per_month = 14400 OR pol_real_seconds_per_month IS NULL;

-- ── Energy bank ─────────────────────────────────────────────────────────────
UPDATE pol_character_ap SET ap_cap = 24 WHERE ap_cap < 24;

-- ── Inbox: what happened to you while you were away ─────────────────────────
CREATE TABLE IF NOT EXISTS player_notices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  arc          INTEGER NOT NULL,
  kind         VARCHAR(32) NOT NULL,
  text         VARCHAR(400) NOT NULL,
  tab          VARCHAR(16),            -- which politics screen it points to
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_player_notices_char ON player_notices (character_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_notices_unread ON player_notices (character_id) WHERE read_at IS NULL;

-- ── Career record: the ladder you have climbed (kept after you lose office) ─
CREATE TABLE IF NOT EXISTS pol_careers (
  character_id        UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  peak_rung           VARCHAR(16) NOT NULL DEFAULT 'citizen',
  peak_rung_arc       INTEGER,
  months_mp           INTEGER NOT NULL DEFAULT 0,
  months_leader       INTEGER NOT NULL DEFAULT 0,
  months_minister     INTEGER NOT NULL DEFAULT 0,
  months_head         INTEGER NOT NULL DEFAULT 0,
  best_world_rank     INTEGER,
  best_world_rank_arc INTEGER,
  months_world_top    INTEGER NOT NULL DEFAULT 0,  -- editions spent at #1
  updated_arc         INTEGER NOT NULL DEFAULT 0
);

-- ── Contested leadership challenges (human-led parties) ─────────────────────
CREATE TABLE IF NOT EXISTS pol_leadership_contests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id      UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  party_id      UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  challenger_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  leader_id     UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  opened_arc    INTEGER NOT NULL,
  closes_arc    INTEGER NOT NULL,
  status        VARCHAR(12) NOT NULL DEFAULT 'open', -- open | won | lost | void
  result        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pol_leadership_contest_open ON pol_leadership_contests (party_id) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS pol_leadership_ballots (
  contest_id   UUID NOT NULL REFERENCES pol_leadership_contests(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  side         VARCHAR(12) NOT NULL, -- challenger | leader
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (contest_id, character_id)
);

-- ── The Meridian Wire: monthly editions ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS agency_editions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc          INTEGER NOT NULL UNIQUE,
  headline     VARCHAR(200) NOT NULL,
  rankings     JSONB NOT NULL DEFAULT '[]'::jsonb,
  stories      JSONB NOT NULL DEFAULT '[]'::jsonb,
  dispatches   JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Reader dispatches: news written by players ──────────────────────────────
CREATE TABLE IF NOT EXISTS agency_dispatches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arc                 INTEGER NOT NULL,
  author_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  nation_code         VARCHAR(32),
  headline            VARCHAR(120) NOT NULL,
  body                VARCHAR(1500) NOT NULL,
  status              VARCHAR(12) NOT NULL DEFAULT 'published', -- published | hidden | removed
  endorse_count       INTEGER NOT NULL DEFAULT 0,
  report_count        INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agency_dispatches_arc ON agency_dispatches (arc, status);
CREATE INDEX IF NOT EXISTS idx_agency_dispatches_author ON agency_dispatches (author_character_id, arc);

CREATE TABLE IF NOT EXISTS agency_dispatch_reactions (
  dispatch_id  UUID NOT NULL REFERENCES agency_dispatches(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  kind         VARCHAR(8) NOT NULL, -- endorse | report
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dispatch_id, character_id)
);
