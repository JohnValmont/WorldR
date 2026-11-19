-- 0108_cabinet_posts_repair.sql
-- Repair pol_cabinet_posts on databases where an older table of that name
-- existed before 0097_politics_v2.sql ran.
--
-- 0097 used CREATE TABLE IF NOT EXISTS, so on such a database it kept the old
-- table, which has no post_key column. Every query that reads or writes
-- ministers then fails ("column post_key does not exist"). The worst case is
-- forming a government: formCabinet writes post_key, the insert fails, and the
-- nation's whole politics month rolls back, so the nation stays stuck in
-- "Forming a government" forever (the Corridors and World Press screens fail
-- on the same column).
--
-- Fix: if the table has no post_key, move it aside as pol_cabinet_posts_legacy
-- (rows are kept, nothing reads them) and create the table the code expects.
-- The next government to form fills it (statecraft.formCabinet).
--
-- Idempotent: does nothing on a database whose table already has post_key.

DO $$
DECLARE
  legacy text := 'pol_cabinet_posts_legacy';
  n int := 1;
  r record;
BEGIN
  IF EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = current_schema() AND table_name = 'pol_cabinet_posts')
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema() AND table_name = 'pol_cabinet_posts' AND column_name = 'post_key')
  THEN
    WHILE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = legacy) LOOP
      n := n + 1;
      legacy := 'pol_cabinet_posts_legacy' || n;
    END LOOP;

    EXECUTE format('ALTER TABLE pol_cabinet_posts RENAME TO %I', legacy);

    -- Index names are schema-wide; free "pol_cabinet_posts_pkey" etc. for the new table.
    FOR r IN SELECT indexname FROM pg_indexes WHERE schemaname = current_schema() AND tablename = legacy LOOP
      EXECUTE format('ALTER INDEX %I RENAME TO %I', r.indexname, left(r.indexname, 30) || '_' || legacy);
    END LOOP;

    RAISE NOTICE 'pol_cabinet_posts had no post_key; old table kept as %', legacy;
  END IF;
END $$;

-- Same definition as 0097_politics_v2.sql.
CREATE TABLE IF NOT EXISTS pol_cabinet_posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id              UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  post_key              VARCHAR(30) NOT NULL,
  party_id              UUID REFERENCES pol_parties(id) ON DELETE SET NULL,
  holder_character_id   UUID REFERENCES characters(id) ON DELETE SET NULL,
  npc_name              VARCHAR(100),
  appointed_arc         INTEGER NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (state_id, post_key)
);
