-- Nations simulation layers 3 and 4 (docs/NATIONS_SIMULATION.md):
-- the national budget and trade between nations.

-- Each month's row also records the state's books and its trade.
-- debt is NULL on rows written before this migration; the monthly step then
-- starts the debt from the nation's starting ratio (constants/nationSim.ts).
ALTER TABLE nation_sim_months ADD COLUMN IF NOT EXISTS debt   NUMERIC(20,2);
ALTER TABLE nation_sim_months ADD COLUMN IF NOT EXISTS budget JSONB;
ALTER TABLE nation_sim_months ADD COLUMN IF NOT EXISTS trade  JSONB;

-- The budget split a player (head of government or finance minister) chose.
-- One row per nation. It applies only while the person who set it still holds
-- one of those offices; otherwise the government's lead party decides by its
-- platform (npcSplit). No row = computer-run split.
CREATE TABLE IF NOT EXISTS nation_budgets (
    state_id             UUID PRIMARY KEY REFERENCES pol_states(id) ON DELETE CASCADE,
    split                JSONB NOT NULL,
    set_by_character_id  UUID REFERENCES characters(id) ON DELETE SET NULL,
    set_arc              INTEGER NOT NULL,
    updated_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
