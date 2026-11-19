-- Coalitions (docs/COALITIONS.md): deals made before 0106 carried the old faction-based
-- "health" (usually 100). Since 0106 that column is unity and scales the government whip
-- (whipScale = unity / UNITY_WHIP_REF, 70 in constants/coalition.ts), so those governments
-- whipped 25% harder than before. Reset them to the neutral level, where the whip is
-- exactly as strong as it was before coalitions changed; from here unity moves by the
-- new rules. Idempotent: only rows with no starting unity (pre-0106 deals) are touched.
UPDATE pol_coalition_agreements
   SET health = 70,
       base_unity = 70,
       status = 'active'
 WHERE base_unity IS NULL
   AND status IN ('active', 'under_review');
