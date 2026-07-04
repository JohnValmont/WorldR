-- ============================================================
-- WORLDr Phase 3 — Vehicle Engineering Depth
-- Migration: 0005_engineering_depth.sql
-- ============================================================

-- ─── 1. New columns on manufacturing_vehicle_models ─────────────────────────

ALTER TABLE manufacturing_vehicle_models
  -- Engineering priorities (JSON: {reliability:20, performance:15, ...})
  ADD COLUMN IF NOT EXISTS engineering_priorities JSONB NOT NULL DEFAULT '{"reliability":20,"performance":15,"fuel_economy":20,"comfort":15,"practicality":15,"mfg_simplicity":15}',

  -- Budget allocation per bucket (JSON: {powertrain:..., body:..., ...})
  ADD COLUMN IF NOT EXISTS engineering_budget_alloc JSONB NOT NULL DEFAULT '{}',

  -- Complexity scores (0-100)
  ADD COLUMN IF NOT EXISTS engineering_complexity    NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS manufacturing_complexity  NUMERIC(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS assembly_complexity       NUMERIC(5,2) NOT NULL DEFAULT 50,

  -- Vehicle weight (kg)
  ADD COLUMN IF NOT EXISTS vehicle_weight_kg         INTEGER NOT NULL DEFAULT 1200,

  -- Manufacturing friendliness (0-100; higher = easier/cheaper to build)
  ADD COLUMN IF NOT EXISTS manufacturing_friendliness NUMERIC(5,2) NOT NULL DEFAULT 50,

  -- Engineering risk (0-100; higher = more risk of issues)
  ADD COLUMN IF NOT EXISTS engineering_risk          NUMERIC(5,2) NOT NULL DEFAULT 20,

  -- Prototype confidence (0-100; affects all final scores)
  ADD COLUMN IF NOT EXISTS prototype_confidence      NUMERIC(5,2) NOT NULL DEFAULT 60,

  -- Development stage (engineering | prototype | testing | ready_to_launch)
  ADD COLUMN IF NOT EXISTS dev_stage                 VARCHAR(32) NOT NULL DEFAULT 'engineering',

  -- Balance flags (JSON array of strings, e.g. ["Target Market Conflict"])
  ADD COLUMN IF NOT EXISTS balance_flags             JSONB NOT NULL DEFAULT '[]',

  -- Full engineering report (JSON object)
  ADD COLUMN IF NOT EXISTS engineering_report        JSONB NOT NULL DEFAULT '{}',

  -- Dev stage completion months (year+month for each stage)
  ADD COLUMN IF NOT EXISTS stage_engineering_completes_year  INTEGER,
  ADD COLUMN IF NOT EXISTS stage_engineering_completes_month    INTEGER,
  ADD COLUMN IF NOT EXISTS stage_prototype_completes_year    INTEGER,
  ADD COLUMN IF NOT EXISTS stage_prototype_completes_month      INTEGER,
  ADD COLUMN IF NOT EXISTS stage_testing_completes_year      INTEGER,
  ADD COLUMN IF NOT EXISTS stage_testing_completes_month        INTEGER,

  -- Total planned dev time in months
  ADD COLUMN IF NOT EXISTS planned_dev_time_arcs     INTEGER NOT NULL DEFAULT 2;

-- ─── 2. Company Knowledge table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS manufacturing_company_knowledge (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_instance_id UUID NOT NULL,
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain            VARCHAR(64) NOT NULL,
  xp_points         INTEGER NOT NULL DEFAULT 0,
  level             INTEGER NOT NULL DEFAULT 0,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_company_knowledge_company
  ON manufacturing_company_knowledge(company_id);

-- ─── 3. Engineering Reputation table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS manufacturing_engineering_reputation (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  world_instance_id    UUID NOT NULL,
  company_id           UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  engineering_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  reliability_rep      NUMERIC(5,2) NOT NULL DEFAULT 0,
  performance_rep      NUMERIC(5,2) NOT NULL DEFAULT 0,
  fuel_efficiency_rep  NUMERIC(5,2) NOT NULL DEFAULT 0,
  comfort_rep          NUMERIC(5,2) NOT NULL DEFAULT 0,
  practicality_rep     NUMERIC(5,2) NOT NULL DEFAULT 0,
  mfg_efficiency_rep   NUMERIC(5,2) NOT NULL DEFAULT 0,
  known_for            JSONB NOT NULL DEFAULT '[]',
  projects_completed   INTEGER NOT NULL DEFAULT 0,
  last_updated         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id)
);

-- ─── 4. Seed: Ensure existing models get sensible defaults ──────────────────
-- (All handled by DEFAULT values above — no data migration needed)

-- ─── 5. Update dev_stage for existing models based on development_status ────
UPDATE manufacturing_vehicle_models
  SET dev_stage = CASE
    WHEN development_status = 'in_development' THEN 'engineering'
    WHEN development_status = 'ready_to_launch' THEN 'ready_to_launch'
    WHEN development_status = 'launched' THEN 'ready_to_launch'
    ELSE 'engineering'
  END
WHERE dev_stage = 'engineering'; -- only update those with default value
