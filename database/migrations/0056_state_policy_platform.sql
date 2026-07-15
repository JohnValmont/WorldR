-- 0056_state_policy_platform.sql
-- Political Desk — Nation Stats respond to legislation.
--
-- Adds a per-state "legislated policy platform" to pol_state_policy. When a bill
-- passes in the Legislature it writes the relevant policy axis here (e.g. an
-- industry-tax bill sets `taxation`). The monthly tick blends this legislated
-- platform over the governing party's platform to compute Jurisdiction Condition
-- targets (Prosperity · Jobs · Order · Cohesion · Budget), so the nation's stats
-- visibly drift toward the laws actually in force over the following months.
--
-- Shape: { "taxation"?: 0..100, "labour"?: 0..100, "investment"?: 0..100,
--          "trade"?: 0..100, "stability"?: 0..100 }  (engine 20/50/80 rung scale)
-- Nullable: no legislation yet => conditions follow the governing platform as before.

ALTER TABLE pol_state_policy
  ADD COLUMN IF NOT EXISTS policy_platform JSONB;
