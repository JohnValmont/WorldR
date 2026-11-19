-- 0110_parliament_party_and_deleted_characters.sql
-- Two data repairs found on the Chamber screen (idempotent: safe to run again).
--
-- 1. A party that holds seats in a nation's parliament must belong to that nation.
--    The Progressive Democratic Party won 75 of Drennia's 151 seats in the old
--    election but was still filed under a retired region (Ironvale). Because the
--    desk and the vote count list a nation's parties by state, those 75 seats
--    were drawn as empty AND cast no vote: every bill passed on the government's
--    76 seats alone. Move such parties into the nation whose parliament they sit in.
--
-- 2. A deleted character must not keep a party, seat, office or cabinet post
--    (they showed up as "Premier ... [DELETED ...]"). Same rule as
--    releaseCharacterPolitics (floor.service.ts), which now runs on every deletion.

-- 1 ── seat-holding parties into the parliament's nation
UPDATE pol_parties p
SET state_id = x.state_id
FROM (
  SELECT DISTINCT ON (cs.party_id) cs.party_id, c.state_id
  FROM pol_council_seats cs
  JOIN pol_cycles c ON c.id = cs.cycle_id
  ORDER BY cs.party_id, c.cycle_number DESC
) x
WHERE p.id = x.party_id
  AND p.state_id <> x.state_id
  -- never when the party also sits in its own state's parliament
  AND NOT EXISTS (
    SELECT 1 FROM pol_council_seats cs2 JOIN pol_cycles c2 ON c2.id = cs2.cycle_id
    WHERE cs2.party_id = p.id AND c2.state_id = p.state_id
  )
  -- and never onto a party of the same name already in that nation
  AND NOT EXISTS (
    SELECT 1 FROM pol_parties q WHERE q.state_id = x.state_id AND lower(q.name) = lower(p.name) AND q.id <> p.id
  );

-- 2 ── release everything a deleted character still holds
-- Seats and cabinet posts stay with the party; officials fill them.
UPDATE pol_council_seats SET character_id = NULL, is_npc = TRUE
  WHERE character_id IN (SELECT id FROM characters WHERE status = 'deleted');
UPDATE pol_cabinet_posts SET holder_character_id = NULL, npc_name = 'Acting minister'
  WHERE holder_character_id IN (SELECT id FROM characters WHERE status = 'deleted');
-- Candidacies in open cycles go to party placeholders.
UPDATE pol_candidates SET character_id = NULL, is_npc = TRUE
  WHERE character_id IN (SELECT id FROM characters WHERE status = 'deleted')
    AND cycle_id IN (SELECT id FROM pol_cycles WHERE status = 'open');
-- Parties they led become computer-run; the head of government's chair goes with it.
UPDATE pol_parties SET leader_character_id = NULL
  WHERE leader_character_id IN (SELECT id FROM characters WHERE status = 'deleted');
UPDATE pol_offices SET holder_character_id = NULL
  WHERE holder_character_id IN (SELECT id FROM characters WHERE status = 'deleted');
DELETE FROM pol_party_members
  WHERE character_id IN (SELECT id FROM characters WHERE status = 'deleted');
