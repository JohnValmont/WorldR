-- WORLDr Database Migration: 0008 — Drop Notification User ID Not Null Constraint
-- Target Database: PostgreSQL 13+

BEGIN;

ALTER TABLE notifications
ALTER COLUMN user_id DROP NOT NULL;

COMMIT;
