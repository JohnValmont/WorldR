-- 0034: AP (Action Points) system + party popularity/roster support
BEGIN;

-- 1. Add popularity column to pol_parties (drives roster cap)
ALTER TABLE pol_parties ADD COLUMN IF NOT EXISTS popularity INTEGER NOT NULL DEFAULT 0;
-- roster_cap is a convenience denorm; recomputed server-side when popularity changes
ALTER TABLE pol_parties ADD COLUMN IF NOT EXISTS roster_cap INTEGER NOT NULL DEFAULT 2;

-- 2. Create pol_character_ap — one row per politician
CREATE TABLE IF NOT EXISTS pol_character_ap (
    character_id UUID PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
    current_ap INTEGER NOT NULL DEFAULT 4,
    ap_cap INTEGER NOT NULL DEFAULT 4,
    last_regen_arc INTEGER NOT NULL DEFAULT 1
);

-- 3. Expand pol_offices.office to support more office types for future executive actions
ALTER TABLE pol_offices DROP CONSTRAINT IF EXISTS pol_offices_office_check;
ALTER TABLE pol_offices ADD CONSTRAINT pol_offices_office_check
    CHECK (office IN ('premier', 'governor', 'secretary_treasury', 'secretary_education',
                      'secretary_health', 'secretary_infrastructure', 'secretary_justice',
                      'committee_chair'));

-- 4. Add NPC-recruit tracking to pol_party_members so we can distinguish
--    recruited NPCs from the permanent Leader row
ALTER TABLE pol_party_members ADD COLUMN IF NOT EXISTS is_recruited_npc BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
