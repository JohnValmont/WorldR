-- WORLDr Migration 0054: Deduplicate Vehicle Model Names
-- This migration has been simplified to a no-op.
-- The original PL/pgSQL block had a variable naming conflict with SQL table aliases
-- that caused it to fail on every boot. The duplicate model name data cleanup
-- was performed directly on the production database on 2026-07-27.
SELECT 1;
