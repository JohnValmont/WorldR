-- Migration 0045: Capital Partners Firm Support
-- 1. Seed 30% auto-dividend policy for all NPC exchange-listed companies
-- 2. Nothing structural to change — finance companies reuse existing tables

DO $$
DECLARE
  haulp_id  UUID;
  verid_id  UUID;
  apex_id   UUID;
  val_id    UUID;
  sys_wid   VARCHAR;
BEGIN
  SELECT world_instance_id INTO sys_wid FROM world_instances WHERE status = 'active' LIMIT 1;

  SELECT id INTO haulp_id FROM companies WHERE name = 'HaulPro'        AND is_npc = true LIMIT 1;
  SELECT id INTO verid_id FROM companies WHERE name = 'Veridian Motors' AND is_npc = true LIMIT 1;
  SELECT id INTO apex_id  FROM companies WHERE name = 'Apex Automobili' AND is_npc = true LIMIT 1;
  SELECT id INTO val_id   FROM companies WHERE name = 'Valuecorp'       AND is_npc = true LIMIT 1;

  -- Insert 30% payout policy for each NPC exchange-listed company (if not already set)
  INSERT INTO dividend_policies (company_id, payout_percent)
  SELECT id, 30
  FROM   (VALUES (haulp_id), (verid_id), (apex_id), (val_id)) AS t(id)
  WHERE  t.id IS NOT NULL
  ON CONFLICT (company_id) DO UPDATE SET payout_percent = 30;

  RAISE NOTICE '0045: NPC dividend policies seeded (30%% payout on profit)';
END $$;
