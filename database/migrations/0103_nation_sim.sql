-- Nations simulation, layers 1 and 2 (docs/NATIONS_SIMULATION.md):
-- people, jobs, sectors, buildings and the world rating.
--
-- One row per nation per politics month. The latest row is the nation's
-- current state; older rows are its history (for trends). UNIQUE(state_id, arc)
-- makes the monthly step idempotent: a re-run of the same month writes nothing.
-- No starting data here: the first monthly step creates each nation's first row
-- from constants/nationSim.ts, so the numbers live in one place.

CREATE TABLE IF NOT EXISTS nation_sim_months (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id      UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    arc           INTEGER NOT NULL,
    population    BIGINT NOT NULL,
    births        INTEGER NOT NULL DEFAULT 0,
    deaths        INTEGER NOT NULL DEFAULT 0,
    migration     INTEGER NOT NULL DEFAULT 0,
    labour_force  BIGINT NOT NULL,
    unemployment  NUMERIC(6,4) NOT NULL,
    gdp_yearly    NUMERIC(20,2) NOT NULL,
    jobs          JSONB NOT NULL,
    output        JSONB NOT NULL,
    buildings     JSONB NOT NULL,
    rating        NUMERIC(5,1) NOT NULL,
    pillars       JSONB NOT NULL,
    tier          VARCHAR(40) NOT NULL,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_nation_sim_month UNIQUE (state_id, arc)
);

CREATE INDEX IF NOT EXISTS idx_nation_sim_months_state_arc ON nation_sim_months (state_id, arc DESC);
