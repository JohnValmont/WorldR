-- ============================================================================
-- Migration 0089: Purge ALL player accounts permanently
-- Keeps: system_npc@worldr.game user, DRX Market Maker character, NPC companies
-- Deletes: every other user, character, and all their downstream data
-- ============================================================================

BEGIN;

-- ── 0. Identify player characters and player companies ──────────────────────
-- Player = any user whose email is NOT 'system_npc@worldr.game'

CREATE TEMP TABLE _player_user_ids AS
  SELECT id FROM users WHERE email <> 'system_npc@worldr.game';

CREATE TEMP TABLE _player_char_ids AS
  SELECT id FROM characters WHERE user_id IN (SELECT id FROM _player_user_ids);

CREATE TEMP TABLE _player_company_ids AS
  SELECT id FROM companies WHERE is_npc = false;

-- ── 1. Delete tables referencing characters (NO ACTION / RESTRICT first) ────

-- share_trades (NO ACTION on buyer/seller character)
DELETE FROM share_trades
  WHERE buyer_character_id  IN (SELECT id FROM _player_char_ids)
     OR seller_character_id IN (SELECT id FROM _player_char_ids);

-- p2p_loans (NO ACTION on borrower/lender character)
DELETE FROM p2p_loans
  WHERE borrower_character_id IN (SELECT id FROM _player_char_ids)
     OR lender_character_id   IN (SELECT id FROM _player_char_ids);

-- character_net_worth_history (NO ACTION)
DELETE FROM character_net_worth_history
  WHERE character_id IN (SELECT id FROM _player_char_ids);

-- company_acquisitions (NO ACTION on winner_character_id)
DELETE FROM company_acquisitions
  WHERE winner_character_id IN (SELECT id FROM _player_char_ids)
     OR company_id IN (SELECT id FROM _player_company_ids);

-- ── 2. Delete tables referencing companies (RESTRICT / NO ACTION) ───────────

-- company_finances (RESTRICT)
DELETE FROM company_finances
  WHERE company_id IN (SELECT id FROM _player_company_ids);

-- manufacturing_market_brand_milestones (NO ACTION)
DELETE FROM manufacturing_market_brand_milestones
  WHERE company_id IN (SELECT id FROM _player_company_ids);

-- company_acquisition_bid_funding (CASCADE from companies but let's be explicit)
DELETE FROM company_acquisition_bid_funding
  WHERE funding_company_id IN (SELECT id FROM _player_company_ids);

-- ── 3. Delete tables referencing characters (RESTRICT) ──────────────────────

-- character_finances (RESTRICT)
DELETE FROM character_finances
  WHERE character_id IN (SELECT id FROM _player_char_ids);

-- ── 4. Delete the player companies themselves ───────────────────────────────
-- Most child tables CASCADE, but we already cleaned the RESTRICT/NO ACTION ones
DELETE FROM companies
  WHERE id IN (SELECT id FROM _player_company_ids);

-- ── 5. Delete the player characters themselves ──────────────────────────────
-- Most child tables CASCADE, but we already cleaned the RESTRICT/NO ACTION ones
DELETE FROM characters
  WHERE id IN (SELECT id FROM _player_char_ids);

-- ── 6. Delete the player users ──────────────────────────────────────────────
-- refresh_tokens and email_verification_tokens CASCADE automatically
DELETE FROM users
  WHERE id IN (SELECT id FROM _player_user_ids);

-- ── 7. Cleanup temp tables ──────────────────────────────────────────────────
DROP TABLE _player_company_ids;
DROP TABLE _player_char_ids;
DROP TABLE _player_user_ids;

COMMIT;
