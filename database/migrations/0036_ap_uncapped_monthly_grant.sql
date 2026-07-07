-- 0036: AP refreshes monthly to a flat grant (GDD v0.5 §7, refined)
-- AP is RESET to 12 each in-game month and does NOT accumulate (leftover AP is
-- discarded). The effective cap is therefore the monthly grant (12).
BEGIN;

-- New rows are created explicitly by the service, but keep column defaults
-- consistent with the new model.
ALTER TABLE pol_character_ap ALTER COLUMN current_ap SET DEFAULT 12;
ALTER TABLE pol_character_ap ALTER COLUMN ap_cap     SET DEFAULT 12;

-- Normalise existing politicians onto the new effective cap.
UPDATE pol_character_ap SET ap_cap = 12;
-- Clamp any leftover balances above the fresh monthly grant.
UPDATE pol_character_ap SET current_ap = 12 WHERE current_ap > 12;

COMMIT;
