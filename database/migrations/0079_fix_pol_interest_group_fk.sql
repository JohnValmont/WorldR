-- UP
BEGIN;

TRUNCATE TABLE pol_interest_groups CASCADE;

ALTER TABLE pol_interest_groups DROP CONSTRAINT IF EXISTS pol_interest_groups_state_id_fkey;
ALTER TABLE pol_interest_groups ALTER COLUMN state_id TYPE UUID USING NULL;
ALTER TABLE pol_interest_groups ADD CONSTRAINT pol_interest_groups_state_id_fkey FOREIGN KEY (state_id) REFERENCES pol_states(id) ON DELETE CASCADE;

DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM pol_states LOOP
    -- Industrial Workers Union Federation
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'industrial_workers', 'Ironvale Union Federation', 'labour',
      30, 85, 75, 55, 55,  0.15, 0.40, 0.25, 0.08, 0.12,  0.20)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Logistics & Trade Workers Alliance
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'logistics_trade_workers', 'Transport & Freight Alliance', 'trade',
      45, 65, 70, 80, 55,  0.12, 0.20, 0.25, 0.35, 0.08,  0.12)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Factory & Business Owners — Manufacturers Council
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'factory_business_owners', 'Drennia Manufacturers Council', 'capital',
      88, 30, 70, 75, 60,  0.45, 0.05, 0.20, 0.20, 0.10,  0.15)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Civic Professionals — Professional Guild
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'civic_professionals', 'Civic Professionals Guild', 'civic',
      60, 55, 65, 60, 70,  0.20, 0.15, 0.25, 0.10, 0.30,  0.14)
    ON CONFLICT (state_id, segment_key) DO NOTHING;

    -- Suburban Families — Homeowners & Community League
    INSERT INTO pol_interest_groups (state_id, segment_key, name, ideology_lean,
      pref_taxation, pref_labour, pref_investment, pref_trade, pref_stability,
      weight_taxation, weight_labour, weight_investment, weight_trade, weight_stability,
      influence_weight)
    VALUES (s.id, 'suburban_families', 'Homeowners & Community League', 'neutral',
      55, 55, 55, 55, 75,  0.25, 0.20, 0.12, 0.08, 0.35,  0.12)
    ON CONFLICT (state_id, segment_key) DO NOTHING;
  END LOOP;
END;
$$;

COMMIT;
