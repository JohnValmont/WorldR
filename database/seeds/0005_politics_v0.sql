-- 0005_politics_v0.sql — baseline politics data for Drennia.
--
-- IMPORTANT: seeds run on EVERY server boot (backend/src/config/database.ts).
-- This file must therefore only ADD what is missing and never delete or reset
-- live game state.
--
-- History: until Phase 2 this file started with
--   DELETE FROM pol_parties WHERE is_npc = TRUE;
-- and reset pol_state_policy, so every restart (each deploy, and each time the
-- host woke the server from sleep) deleted all computer-run parties. The
-- foreign-key cascades then wiped their parliament seats, the governing
-- coalition, the Premier and their bills, and national policy went back to
-- defaults.

BEGIN;

-- Jurisdictions: insert if missing. Never overwrite live population/turnout or
-- the active flag on an existing row.
INSERT INTO pol_states (code, name, is_active, country_id, population, registered_voters, base_turnout)
VALUES
('ironvale', 'Ironvale', FALSE, 'drennia', 2400000, 1600000, 0.58),
('drennport', 'Drennport', FALSE, 'drennia', 0, 0, 0.50),
('westport', 'Westport', FALSE, 'drennia', 0, 0, 0.50),
('greenmere', 'Greenmere', FALSE, 'drennia', 0, 0, 0.50),
('national', 'National Parliament', TRUE, 'drennia', 10000000, 7000000, 0.60)
ON CONFLICT (code) DO NOTHING;

-- Computer-run national parties: insert each only if a computer-run party with
-- that name doesn't already exist in the National Parliament.
INSERT INTO pol_parties (state_id, name, abbreviation, platform, treasury, is_npc, created_arc)
SELECT s.id, v.name, v.abbr, v.platform::jsonb, v.treasury, TRUE, 0
FROM pol_states s
CROSS JOIN (VALUES
  ('National Labour Front',   'NLF', '{"taxation": 30, "labour": 90, "investment": 70, "trade": 50, "stability": 50}', 500000.0000),
  ('National Progress Party', 'NPP', '{"taxation": 85, "labour": 35, "investment": 75, "trade": 80, "stability": 60}', 500000.0000),
  ('Civic Stability Union',   'CSU', '{"taxation": 55, "labour": 55, "investment": 60, "trade": 60, "stability": 80}', 500000.0000),
  ('Independent',             'IND', '{"taxation": 50, "labour": 50, "investment": 50, "trade": 50, "stability": 50}',  50000.0000)
) AS v(name, abbr, platform, treasury)
WHERE s.code = 'national'
  AND NOT EXISTS (
    SELECT 1 FROM pol_parties p WHERE p.state_id = s.id AND p.name = v.name AND p.is_npc = TRUE
  );

-- Give computer-run parties without an abbreviation one (display only).
UPDATE pol_parties p SET abbreviation = v.abbr
FROM pol_states s, (VALUES
  ('National Labour Front', 'NLF'), ('National Progress Party', 'NPP'),
  ('Civic Stability Union', 'CSU'), ('Independent', 'IND')
) AS v(name, abbr)
WHERE p.state_id = s.id AND s.code = 'national' AND p.is_npc = TRUE
  AND p.name = v.name AND p.abbreviation IS NULL;

-- Default national policy row, only if none exists yet.
INSERT INTO pol_state_policy (state_id, active_policies, updated_arc)
SELECT id, '{"taxation": "standard", "labor": "regulated", "environment": "standard", "welfare": "standard"}'::jsonb, 0
FROM pol_states WHERE code = 'national'
ON CONFLICT (state_id) DO NOTHING;

-- Identities (colour, monogram, leader, motto) for the computer-run national
-- parties. Inserted only when missing; never overwrites an existing identity.
INSERT INTO pol_party_identities (party_id, color, monogram, leader, motto, blurb)
SELECT p.id, v.color, v.mono, v.leader, v.motto, v.blurb
FROM pol_parties p
JOIN pol_states s ON s.id = p.state_id AND s.code = 'national'
JOIN (VALUES
  ('National Labour Front',   '#B23A3A', 'LF', 'Sera Dunne',     'The floor of the factory is the floor of the nation.', 'Workers'' party: strong unions, public investment, taxes on the wealthy.'),
  ('National Progress Party', '#C9962E', 'NP', 'Marcus Vell',    'Let Drennia build, and get out of its way.',           'Business party: low taxes, open trade, light regulation.'),
  ('Civic Stability Union',   '#3F6C9E', 'CS', 'Adele Renner',   'Order first. Prosperity follows.',                    'Centre-right: law and order, balanced books, steady growth.'),
  ('Independent',             '#7A8594', 'IN', 'Various',        'Answerable to voters, not to a party line.',          'Independents with no fixed programme.')
) AS v(name, color, mono, leader, motto, blurb) ON v.name = p.name
WHERE p.is_npc = TRUE
ON CONFLICT (party_id) DO NOTHING;

COMMIT;
