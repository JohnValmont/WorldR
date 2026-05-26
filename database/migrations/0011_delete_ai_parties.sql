-- WORLDr Database Migration: 0011 — Delete AI Parties
-- Target Database: PostgreSQL 13+

BEGIN;

-- Delete all existing parties and memberships to start with a clean multiplayer slate
DELETE FROM party_memberships;
DELETE FROM parties;

COMMIT;
