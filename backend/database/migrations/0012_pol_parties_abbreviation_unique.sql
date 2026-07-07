-- 0012_pol_parties_abbreviation_unique.sql
ALTER TABLE pol_parties ADD COLUMN abbreviation VARCHAR(6);

UPDATE pol_parties SET abbreviation = UPPER(SUBSTRING(REPLACE(name, ' ', '') FROM 1 FOR 5));

ALTER TABLE pol_parties ALTER COLUMN abbreviation SET NOT NULL;

-- Enforce uniqueness of name and abbreviation globally (across all states)
ALTER TABLE pol_parties ADD CONSTRAINT unique_party_name UNIQUE (name);
ALTER TABLE pol_parties ADD CONSTRAINT unique_party_abbreviation UNIQUE (abbreviation);
