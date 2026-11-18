-- Coalitions: talks, deals and unity (docs/COALITIONS.md). Idempotent.

-- One offer from a would-be government (from_party) to one party (to_party).
-- kind 'form' = during talks after an election; 'join' = the sitting government
-- brings a party in mid-term. Posts and promises are the price.
CREATE TABLE IF NOT EXISTS pol_coalition_offers (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id                UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    cycle_id                UUID NOT NULL REFERENCES pol_cycles(id) ON DELETE CASCADE,
    kind                    VARCHAR(10) NOT NULL DEFAULT 'form' CHECK (kind IN ('form', 'join')),
    from_party_id           UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    to_party_id             UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    -- ["finance", "defence"]
    posts                   JSONB NOT NULL DEFAULT '[]',
    -- [{"category": "min_wage", "option": "high", "months": 6}]
    promises                JSONB NOT NULL DEFAULT '[]',
    hog                     BOOLEAN NOT NULL DEFAULT FALSE,
    status                  VARCHAR(12) NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'void')),
    -- The computer-run party's score when it decided (coalition.rules offerScore), for the screen.
    score                   NUMERIC(6,3),
    reason                  TEXT,
    offered_arc             INTEGER NOT NULL,
    resolved_arc            INTEGER,
    offered_by_character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT pol_coalition_offers_two_parties CHECK (from_party_id <> to_party_id)
);
CREATE INDEX IF NOT EXISTS idx_pol_coalition_offers_cycle ON pol_coalition_offers(cycle_id, status);
CREATE INDEX IF NOT EXISTS idx_pol_coalition_offers_to ON pol_coalition_offers(to_party_id, status);
-- At most one live offer between the same two parties in one round of talks.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pol_coalition_offers_live
    ON pol_coalition_offers(cycle_id, from_party_id, to_party_id) WHERE status IN ('pending', 'accepted');

-- The deal: who built it, and its starting unity (health is the current unity).
ALTER TABLE pol_coalition_agreements ADD COLUMN IF NOT EXISTS formateur_party_id UUID REFERENCES pol_parties(id) ON DELETE SET NULL;
ALTER TABLE pol_coalition_agreements ADD COLUMN IF NOT EXISTS base_unity INTEGER;
ALTER TABLE pol_coalition_agreements ADD COLUMN IF NOT EXISTS last_unity_arc INTEGER;

-- Repair: deals of governments that have since been replaced stayed 'active'.
UPDATE pol_coalition_agreements a
   SET status = 'dissolved', dissolved_arc = COALESCE(a.dissolved_arc, a.formed_arc)
  FROM pol_coalitions co
  JOIN pol_cycles c ON c.id = co.cycle_id
 WHERE a.coalition_id = co.id
   AND a.status IN ('active', 'under_review')
   AND EXISTS (
     SELECT 1 FROM pol_coalitions co2
       JOIN pol_cycles c2 ON c2.id = co2.cycle_id
      WHERE c2.state_id = c.state_id
        AND c2.cycle_number > c.cycle_number
        AND co2.status IN ('formed', 'minority')
   );
