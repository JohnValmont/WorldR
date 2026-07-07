-- 0036: AP is now uncapped and granted monthly (GDD v0.5 §7)
-- AP accumulates at +12 per in-game month with NO cap. The ap_cap column is
-- retained but now stores a large "no cap" sentinel (1,000,000,000) that fits
-- comfortably inside a Postgres INTEGER and never clamps current_ap.
BEGIN;

-- New rows are created explicitly by the service, but keep column defaults
-- consistent with the new model.
ALTER TABLE pol_character_ap ALTER COLUMN current_ap SET DEFAULT 12;
ALTER TABLE pol_character_ap ALTER COLUMN ap_cap     SET DEFAULT 1000000000;

-- Lift the old cap on every existing politician so accumulation is never clamped.
UPDATE pol_character_ap
   SET ap_cap = 1000000000
 WHERE ap_cap < 1000000000;

COMMIT;
