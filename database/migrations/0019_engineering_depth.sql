-- WORLDr Migration 0019: Engineering Depth (Phase 3)
-- Adds engineering priorities, complexity metrics, dev-stage tracking to vehicle models.
-- Creates: manufacturing_company_knowledge, manufacturing_engineering_reputation

-- 1. Phase 3 columns on manufacturing_vehicle_models
ALTER TABLE manufacturing_vehicle_models
  ADD COLUMN IF NOT EXISTS engineering_priorities            JSONB        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS engineering_budget_alloc          JSONB        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS engineering_complexity            NUMERIC(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS manufacturing_complexity          NUMERIC(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS assembly_complexity               NUMERIC(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS vehicle_weight_kg                 NUMERIC(7,1) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS manufacturing_friendliness        NUMERIC(5,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS engineering_risk                  NUMERIC(5,2) DEFAULT 20,
  ADD COLUMN IF NOT EXISTS prototype_confidence              NUMERIC(5,2) DEFAULT 70,
  ADD COLUMN IF NOT EXISTS dev_stage                         VARCHAR(30)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS planned_dev_time_arcs             INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS balance_flags                     JSONB        DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS engineering_report                JSONB        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_engineering_completes_orbit INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_engineering_completes_arc   INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_prototype_completes_orbit   INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_prototype_completes_arc     INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_testing_completes_orbit     INT          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stage_testing_completes_arc       INT          DEFAULT NULL;

UPDATE manufacturing_vehicle_models
  SET dev_stage = 'engineering'
  WHERE development_status = 'in_development' AND dev_stage IS NULL;

-- 2. Company Knowledge table
CREATE TABLE IF NOT EXISTS manufacturing_company_knowledge (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  world_instance_id VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
  company_id        UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain            VARCHAR(40) NOT NULL,
  xp_points         INT         NOT NULL DEFAULT 0,
  level             INT         NOT NULL DEFAULT 0,
  last_updated      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_company_knowledge UNIQUE (company_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_company_knowledge_company ON manufacturing_company_knowledge(company_id);
ALTER TABLE manufacturing_company_knowledge ENABLE ROW LEVEL SECURITY;

-- 3. Engineering Reputation table
CREATE TABLE IF NOT EXISTS manufacturing_engineering_reputation (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  world_instance_id   VARCHAR(50) NOT NULL REFERENCES world_instances(id) ON DELETE RESTRICT,
  company_id          UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reliability_rep     NUMERIC(6,2) NOT NULL DEFAULT 0,
  performance_rep     NUMERIC(6,2) NOT NULL DEFAULT 0,
  fuel_efficiency_rep NUMERIC(6,2) NOT NULL DEFAULT 0,
  comfort_rep         NUMERIC(6,2) NOT NULL DEFAULT 0,
  practicality_rep    NUMERIC(6,2) NOT NULL DEFAULT 0,
  mfg_efficiency_rep  NUMERIC(6,2) NOT NULL DEFAULT 0,
  projects_completed  INT          NOT NULL DEFAULT 0,
  last_updated        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_engineering_reputation UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_eng_reputation_company ON manufacturing_engineering_reputation(company_id);
ALTER TABLE manufacturing_engineering_reputation ENABLE ROW LEVEL SECURITY;