-- WORLDr Migration 0018: Universalise Automobile Engineering Config
-- Adds engineering_programmes_config JSONB column to manufacturing_country_auto_config

ALTER TABLE manufacturing_country_auto_config
  ADD COLUMN IF NOT EXISTS engineering_programmes_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Populate default values for Drennia
UPDATE manufacturing_country_auto_config
SET engineering_programmes_config = '{
  "economy-tune": { "budget": 180000, "baseDuration": 2 },
  "safety-arch": { "budget": 240000, "baseDuration": 2 },
  "durability-val": { "budget": 190000, "baseDuration": 2 },
  "assembly-time": { "budget": 200000, "baseDuration": 2 },
  "spc": { "budget": 230000, "baseDuration": 2 }
}'::jsonb
WHERE country_id = 'drennia';
