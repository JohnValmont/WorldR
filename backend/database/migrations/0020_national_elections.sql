BEGIN;

-- 1. Create pol_constituencies table
CREATE TABLE pol_constituencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    population INTEGER NOT NULL DEFAULT 120000,
    registered_voters INTEGER NOT NULL DEFAULT 80000
);

-- 2. Add constituency_id to candidates and seats
ALTER TABLE pol_candidates ADD COLUMN constituency_id UUID REFERENCES pol_constituencies(id) ON DELETE CASCADE;
ALTER TABLE pol_council_seats ADD COLUMN constituency_id UUID REFERENCES pol_constituencies(id) ON DELETE CASCADE;

-- 3. Set national state to active, others to inactive
UPDATE pol_states SET is_active = false;

INSERT INTO pol_states (code, name, is_active, country_id, population, registered_voters, base_turnout) 
VALUES ('national', 'Drennia National', true, 'drennia', 2400000, 1600000, 0.65)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- 4. Insert 20 constituencies (5 per region) all under the 'national' state
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Ironvale North' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Ironvale South' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Ironvale Central' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Ironvale East' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Ironvale West' FROM pol_states WHERE code = 'national';

INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Drennport Metro' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Drennport Bay' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Drennport Heights' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Drennport Riverside' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Drennport Suburbs' FROM pol_states WHERE code = 'national';

INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Westport Central' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Westport Coast' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Westport Valley' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Westport Highlands' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Westport Plains' FROM pol_states WHERE code = 'national';

INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Greenmere Forest' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Greenmere Lakes' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Greenmere Agri' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Greenmere Border' FROM pol_states WHERE code = 'national';
INSERT INTO pol_constituencies (state_id, name)
SELECT id, 'Greenmere Town' FROM pol_states WHERE code = 'national';

COMMIT;
