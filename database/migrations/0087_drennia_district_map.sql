-- ── 0087: Drennia District Political Map ─────────────────────────────────────
-- Creates the district-level support tracking system for the Drennia map game.
-- This is a SEPARATE layer from pol_cycles/pol_candidates (the electoral arc
-- system). It tracks continuous district support percentages updated each tick.
-- Tables are prefixed drennia_ to avoid collision with pol_ tables.

BEGIN;

-- ── 1. Add color_hex to pol_parties ──────────────────────────────────────────
-- Needed so the map can color districts by their leading party.
ALTER TABLE pol_parties
  ADD COLUMN IF NOT EXISTS color_hex VARCHAR(7) DEFAULT '#6B6358';

-- ── 2. drennia_states ────────────────────────────────────────────────────────
-- The 4 geographic state groupings of Drennia.
-- Optionally links to an existing pol_states row for shared identity.
CREATE TABLE IF NOT EXISTS drennia_states (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pol_state_id UUID REFERENCES pol_states(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(10)  NOT NULL UNIQUE,   -- 'NORTH','EAST','SOUTH','WEST'
  color_hint  VARCHAR(7)   NOT NULL DEFAULT '#4B6382',  -- UI accent for the state tab
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 3. drennia_districts ──────────────────────────────────────────────────────
-- 151 districts. Each row stores live support percentages as JSONB.
-- district_number matches data-district-id on the SVG path elements.
CREATE TABLE IF NOT EXISTS drennia_districts (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id                 UUID NOT NULL REFERENCES drennia_states(id) ON DELETE CASCADE,
  name                     VARCHAR(100) NOT NULL,
  district_number          INTEGER NOT NULL UNIQUE CHECK (district_number BETWEEN 1 AND 151),
  population               INTEGER NOT NULL DEFAULT 50000,
  -- JSONB map of party_id (UUID text) → support pct (0–100, sums to 100)
  -- Example: { "uuid-party-a": 42.5, "uuid-party-b": 30.0, "uuid-party-c": 27.5 }
  support_json             JSONB NOT NULL DEFAULT '{}',
  current_leading_party_id UUID REFERENCES pol_parties(id) ON DELETE SET NULL,
  -- Snapshot of the support before the last tick (for delta display in UI)
  prev_support_json        JSONB,
  last_updated_tick        INTEGER NOT NULL DEFAULT 0,
  created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drennia_districts_state
  ON drennia_districts(state_id);
CREATE INDEX IF NOT EXISTS idx_drennia_districts_leading
  ON drennia_districts(current_leading_party_id);

-- ── 4. drennia_pending_actions ────────────────────────────────────────────────
-- Player actions queued during a tick window. Never modify district state
-- directly — only resolveTick() does that when the tick fires.
CREATE TABLE IF NOT EXISTS drennia_pending_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES characters(id)  ON DELETE CASCADE,
  party_id     UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  action_type  VARCHAR(50) NOT NULL CHECK (action_type IN ('rally', 'fundraiser')),
  target_type  VARCHAR(10) NOT NULL CHECK (target_type IN ('district', 'state')),
  -- target_id points to either drennia_districts.id or drennia_states.id
  -- depending on target_type. Not a hard FK so both tables can be referenced.
  target_id    UUID NOT NULL,
  ap_cost      INTEGER NOT NULL DEFAULT 1,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  tick_window  INTEGER NOT NULL,   -- which tick number this belongs to
  resolved     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_drennia_pending_tick
  ON drennia_pending_actions(tick_window, resolved);
CREATE INDEX IF NOT EXISTS idx_drennia_pending_player
  ON drennia_pending_actions(player_id);

-- ── 5. drennia_tick_history ───────────────────────────────────────────────────
-- Full district state snapshot after each tick resolution.
-- Used for debugging, auditing, and replaying in tests.
CREATE TABLE IF NOT EXISTS drennia_tick_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tick_number    INTEGER NOT NULL UNIQUE,
  resolved_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actions_count  INTEGER NOT NULL DEFAULT 0,
  -- Full district state after resolution:
  -- [{ districtId, districtNumber, leadingPartyId, supportJson }]
  snapshot_json  JSONB NOT NULL DEFAULT '[]',
  -- Summary of what changed: [{ districtId, districtNumber, oldLeader, newLeader, deltas }]
  summary_json   JSONB NOT NULL DEFAULT '[]'
);

-- ── 6. Current tick window helper view ───────────────────────────────────────
-- Convenience: current drennia tick window number mirrors pol_current_year*12 + pol_current_month
-- No separate table needed — computed on the fly from world_clock.

COMMIT;
