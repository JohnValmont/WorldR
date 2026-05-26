-- WORLDr Database Migration: 0007 — Schema Timestamp Fixes
-- Target Database: PostgreSQL 13+

BEGIN;

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

COMMIT;
