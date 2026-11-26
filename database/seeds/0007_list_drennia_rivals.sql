-- 0007_list_drennia_rivals.sql
-- Drennia's rival car makers trade on the DRX Bourse. On a fresh or reset world
-- they were never listed, so the exchange was empty and a Capital Partners firm
-- (the other open business) had nothing to buy.
-- Same listing as npcBrain spawnNpc + the admin backfill-npc-shares endpoint:
-- the listed flag, and the rival's 1,000,000 founder shares (shareMarket TOTAL_SHARES)
-- held by its system owner so the market maker can sell to players.
-- Runs on every boot: only adds what is missing, never changes or deletes a row.
-- Drennia only: Westmark/Eryndor clones are not listed yet (docs/CLOSED_ALPHA.md).

UPDATE companies
   SET is_exchange_listed = TRUE
 WHERE is_npc = TRUE
   AND country_id = 'drennia'
   AND industry_id = 'manufacturing'
   AND status = 'active'
   AND COALESCE(is_exchange_listed, FALSE) = FALSE;

INSERT INTO company_shares (company_id, holder_character_id, shares, avg_cost_basis)
SELECT c.id, c.owner_character_id, 1000000, 0
  FROM companies c
 WHERE c.is_npc = TRUE
   AND c.country_id = 'drennia'
   AND c.is_exchange_listed = TRUE
   AND c.status = 'active'
   AND NOT EXISTS (SELECT 1 FROM company_shares s WHERE s.company_id = c.id);
