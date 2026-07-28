-- UP
BEGIN;

CREATE TABLE IF NOT EXISTS pol_petitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id UUID NOT NULL REFERENCES pol_states(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    party_id UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
    policy_category TEXT NOT NULL,
    desired_option TEXT NOT NULL,
    offered_funds NUMERIC(19,4) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'fulfilled', 'failed')),
    created_arc INTEGER NOT NULL,
    resolved_arc INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_petitions_company ON pol_petitions(company_id);
CREATE INDEX IF NOT EXISTS idx_pol_petitions_party ON pol_petitions(party_id);
CREATE INDEX IF NOT EXISTS idx_pol_petitions_status ON pol_petitions(status);

CREATE OR REPLACE FUNCTION update_pol_petitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pol_petitions_updated_at ON pol_petitions;
CREATE TRIGGER trg_pol_petitions_updated_at
  BEFORE UPDATE ON pol_petitions
  FOR EACH ROW EXECUTE FUNCTION update_pol_petitions_updated_at();

COMMIT;
