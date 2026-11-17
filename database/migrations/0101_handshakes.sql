-- 0101_handshakes.sql
-- Personal deals between any two politicians (docs/POLITICS_FLOOR.md, "Corridors").
-- Each side may promise a vote on a bill and/or pay money. Vote promises are
-- judged when the bill is counted; money moves when the deal is accepted.
CREATE TABLE IF NOT EXISTS pol_handshakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
  from_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  to_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  -- what the proposer gives
  from_bill_id UUID REFERENCES pol_bills(id) ON DELETE SET NULL,
  from_vote VARCHAR(4),
  from_cash NUMERIC(19,4) NOT NULL DEFAULT 0,
  -- what the proposer asks for
  to_bill_id UUID REFERENCES pol_bills(id) ON DELETE SET NULL,
  to_vote VARCHAR(4),
  to_cash NUMERIC(19,4) NOT NULL DEFAULT 0,
  note VARCHAR(240),
  status VARCHAR(12) NOT NULL DEFAULT 'offered', -- offered | accepted | declined | withdrawn | expired | settled
  from_result VARCHAR(8), -- kept | broken | void (null while waiting or nothing to judge)
  to_result VARCHAR(8),
  created_arc INTEGER NOT NULL,
  resolved_arc INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pol_handshakes_from ON pol_handshakes(from_character_id);
CREATE INDEX IF NOT EXISTS idx_pol_handshakes_to ON pol_handshakes(to_character_id);
CREATE INDEX IF NOT EXISTS idx_pol_handshakes_from_bill ON pol_handshakes(from_bill_id) WHERE status = 'accepted';
CREATE INDEX IF NOT EXISTS idx_pol_handshakes_to_bill ON pol_handshakes(to_bill_id) WHERE status = 'accepted';
