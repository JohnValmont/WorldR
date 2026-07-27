-- UP
BEGIN;

TRUNCATE TABLE pol_media_outlets CASCADE;
TRUNCATE TABLE pol_news_stories CASCADE;

ALTER TABLE pol_media_outlets DROP CONSTRAINT IF EXISTS pol_media_outlets_state_id_fkey;
ALTER TABLE pol_media_outlets ALTER COLUMN state_id TYPE UUID USING NULL;
ALTER TABLE pol_media_outlets ADD CONSTRAINT pol_media_outlets_state_id_fkey FOREIGN KEY (state_id) REFERENCES pol_states(id) ON DELETE CASCADE;

ALTER TABLE pol_news_stories DROP CONSTRAINT IF EXISTS pol_news_stories_state_id_fkey;
ALTER TABLE pol_news_stories ALTER COLUMN state_id TYPE UUID USING NULL;
ALTER TABLE pol_news_stories ADD CONSTRAINT pol_news_stories_state_id_fkey FOREIGN KEY (state_id) REFERENCES pol_states(id) ON DELETE CASCADE;

-- ── Seed media outlets for all existing states ───────────────────────────────
DO $$
DECLARE
  s RECORD;
BEGIN
  FOR s IN SELECT id FROM pol_states LOOP
    -- The Ironvale Standard (Pro-Capital, High Credibility)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'The Drennia Standard', 'newspaper', 'capital', 85, 0.35, 0.10)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- The Workers Voice (Pro-Labour, Tabloid/Opinion, Aggressive)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'The Workers Voice', 'tabloid', 'labour', 40, 0.40, -0.20)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Drennport Broadcasting Channel (Neutral, TV, Wide Reach)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'DBC News', 'tv', 'neutral', 70, 0.50, 0.05)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- The Civic Tribune (Civic/Professional, Online, Nuanced)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'The Civic Tribune', 'online', 'civic', 75, 0.15, -0.05)
    ON CONFLICT (state_id, name) DO NOTHING;

    -- Drennia Daily (Populist, Tabloid, Scandal-driven)
    INSERT INTO pol_media_outlets (state_id, name, outlet_type, bias, credibility, reach, base_tone)
    VALUES (s.id, 'Drennia Daily', 'tabloid', 'populist', 30, 0.45, -0.30)
    ON CONFLICT (state_id, name) DO NOTHING;
  END LOOP;
END;
$$;

COMMIT;
