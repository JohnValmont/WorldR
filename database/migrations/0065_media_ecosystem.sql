-- ── 0065: Media Ecosystem ────────────────────────────────────────────────────
-- Media outlets are persistent world entities (4–6 per state).
-- Each party maintains a relationship score with every outlet.
-- Each arc: top 3 stories are generated, coverage tone is weighted by
-- outlet–party alignment and relationship score.

-- ── Media Outlets ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pol_media_outlets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id        UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  outlet_type     TEXT NOT NULL CHECK (outlet_type IN ('newspaper', 'tv', 'online', 'tabloid', 'radio')),
  -- Political bias: which platform axis this outlet prioritises/sympathises with
  bias            TEXT NOT NULL CHECK (bias IN ('labour', 'capital', 'civic', 'trade', 'populist', 'neutral')),
  credibility     INTEGER NOT NULL DEFAULT 60 CHECK (credibility BETWEEN 0 AND 100),
  -- Audience reach: fraction of the electorate that reads/watches this outlet
  reach           NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  -- Spin tendency: how hard this outlet spins stories (+1 = very positive, -1 = very negative)
  -- Base value, modified per story by relationship score
  base_tone       NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (base_tone BETWEEN -1 AND 1),
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (state_id, name)
);

CREATE INDEX IF NOT EXISTS idx_pol_outlets_state ON pol_media_outlets(state_id);

-- ── Party–Outlet Relations ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pol_media_relations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id            UUID NOT NULL REFERENCES pol_parties(id) ON DELETE CASCADE,
  outlet_id           UUID NOT NULL REFERENCES pol_media_outlets(id) ON DELETE CASCADE,
  -- Relationship score 0–100. Above 60 = favourable coverage, below 40 = hostile
  relationship_score  NUMERIC(5,2) NOT NULL DEFAULT 50,
  -- Derived coverage stance (set each arc)
  coverage_stance     TEXT NOT NULL DEFAULT 'neutral' CHECK (coverage_stance IN (
    'allied',     -- ≥70: strongly positive spin on all stories
    'favourable', -- 55–69: mild positive framing
    'neutral',    -- 40–54: straight reporting
    'sceptical',  -- 25–39: questioning framing
    'hostile'     -- <25: adversarial framing
  )),
  -- Press contact log: JSONB array of { arc, action, score_delta, message }
  contact_log         JSONB NOT NULL DEFAULT '[]',
  last_contact_arc    INTEGER,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (party_id, outlet_id)
);

CREATE INDEX IF NOT EXISTS idx_pol_media_rel_party   ON pol_media_relations(party_id);
CREATE INDEX IF NOT EXISTS idx_pol_media_rel_outlet  ON pol_media_relations(outlet_id);

CREATE OR REPLACE FUNCTION update_pol_media_rel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pol_media_rel_updated_at ON pol_media_relations;
CREATE TRIGGER trg_pol_media_rel_updated_at
  BEFORE UPDATE ON pol_media_relations
  FOR EACH ROW EXECUTE FUNCTION update_pol_media_rel_updated_at();

-- ── Arc News Stories ─────────────────────────────────────────────────────────
-- Generated each arc. Top 3 per state are the "news cycle."
CREATE TABLE IF NOT EXISTS pol_news_stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id      UUID NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  party_id      UUID REFERENCES pol_parties(id) ON DELETE SET NULL,
  arc           INTEGER NOT NULL,
  -- Story metadata
  story_type    TEXT NOT NULL CHECK (story_type IN (
    'scandal_eruption', 'scandal_escalation', 'scandal_resolved',
    'campaign_event',
    'endorsement_gained', 'endorsement_lost',
    'coalition_formed', 'coalition_crisis', 'coalition_collapsed',
    'legislation_passed', 'legislation_blocked',
    'election_called', 'election_result',
    'policy_announcement',
    'interest_group_deal'
  )),
  headline      TEXT NOT NULL,
  body          TEXT NOT NULL,
  -- Weight: determines if this makes the top-3 news cycle (higher = more prominent)
  weight        NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  -- Coverage tone this story received (-1 hostile → +1 favourable), averaged across outlets
  avg_tone      NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  -- Popularity delta actually applied to party this arc from this story
  popularity_delta INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pol_news_state ON pol_news_stories(state_id, arc);
CREATE INDEX IF NOT EXISTS idx_pol_news_party ON pol_news_stories(party_id, arc);

-- ── Seed media outlets for all existing states ───────────────────────────────
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM states LOOP
    -- Ironvale Gazette (centre-left newspaper, high credibility)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'Ironvale Gazette', 'newspaper', 'labour', 72, 0.28, 0.05)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Drennia Tribune (centre-right newspaper, highest credibility)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'Drennia Tribune', 'newspaper', 'capital', 78, 0.32, -0.05)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Channel 4 News (TV, neutral, broad reach)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'Channel 4 News', 'tv', 'neutral', 80, 0.45, 0.00)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- The Industrial Voice (online, labour-aligned, lower credibility)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'The Industrial Voice', 'online', 'labour', 48, 0.14, 0.12)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Drennia Business Daily (online, capital, specialist)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'Drennia Business Daily', 'online', 'capital', 52, 0.16, -0.08)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- The Courier (tabloid, populist, low credibility, wide reach)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'The Courier', 'tabloid', 'populist', 28, 0.35, -0.15)
    ON CONFLICT (state_id, name) DO NOTHING;
  END LOOP;
END;
$$;
