-- 0109_candidate_drafted.sql
-- Standing for election (docs/POLITICS_FLOOR.md, "Your race").
-- drafted = the party put this member up in their best open district because
-- they had not chosen one when filing closed (draftUnfiledMembers). A member
-- who picks a district themselves has drafted = false.
ALTER TABLE pol_candidates ADD COLUMN IF NOT EXISTS drafted BOOLEAN NOT NULL DEFAULT FALSE;
