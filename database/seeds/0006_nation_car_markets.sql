-- Seed 0006: every starter nation gets its own car market.
--
-- Until now only Drennia had car markets, so a Westmark or Eryndor player who
-- opened the Business desk was selling into Drennia's market. The business month
-- already runs country by country (processCountryMonth pools the companies of
-- ONE country and resolves competition per market), so a nation only needs:
--   1. states (company headquarters and factories live in a state),
--   2. region markets (where cars are sold),
--   3. the per-country business settings row (manufacturing_country_auto_config),
--   4. the four computer-run car makers, so a player has rivals from day one.
--
-- Fairness: each nation's markets and rivals are a COPY of Drennia's as they are
-- when this runs (population, income, buyer preferences, rival cars, factories,
-- stock levels and brand awareness). The nations differ in names, laws and
-- politics; their car markets start equal. Laws already reach each market by
-- country (nationalEconomy.getNationalPolicyMultipliers).
--
-- This is a SEED (runs on every boot, after 0004 creates Drennia's rival car
-- makers), not a migration: on a fresh install migrations run before seeds, so a
-- migration would find no rivals to copy. Idempotent: every step only adds what
-- is missing, and it never deletes or resets anything. No explicit BEGIN/COMMIT:
-- the whole file runs as one implicit transaction, so a failure leaves nothing
-- half-done and does not leave the connection in an aborted transaction.
-- Rows are copied column by column through jsonb, so columns added to these
-- tables later are copied too. No question marks in this file: the runner
-- (knex raw) reads them as bind placeholders, hence jsonb_exists.


-- ── helper: insert a copy of a row with some columns overridden ─────────────
-- src is the source row as jsonb (to_jsonb(row)); overrides replace keys.
-- The source id is dropped unless overrides supply one, so serial ids use
-- their default. Returns the new row as jsonb.
CREATE OR REPLACE FUNCTION pg_temp.worldr_clone_row(tbl regclass, src jsonb, overrides jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $fn$
DECLARE
  rec jsonb := (src - 'id') || overrides;
  cols text;
  newrow jsonb;
BEGIN
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) INTO cols
  FROM pg_attribute a
  WHERE a.attrelid = tbl AND a.attnum > 0 AND NOT a.attisdropped
    AND a.attgenerated = '' AND jsonb_exists(rec, a.attname);
  EXECUTE format('INSERT INTO %s AS t (%s) SELECT %s FROM jsonb_populate_record(NULL::%s, $1) RETURNING to_jsonb(t.*)',
                 tbl, cols, cols, tbl)
    INTO newrow USING rec;
  RETURN newrow;
END
$fn$;

-- ── 1. names: Drennia state/market -> the matching place in each nation ─────
CREATE TEMP TABLE _nation_markets (
  country_id   VARCHAR(50),
  src_market   VARCHAR(100),
  new_market   VARCHAR(100),
  market_name  VARCHAR(150),
  new_state    VARCHAR(50),
  state_name   VARCHAR(100)
) ON COMMIT DROP;

INSERT INTO _nation_markets VALUES
  -- Westmark (Free Ports): Saltgate, Tidewater, The Marches, The Downs
  ('westmark', 'kingscrown-metropolitan-market',  'saltgate-metropolitan-market',  'Saltgate Metropolitan Area',  'westmark-saltgate',    'Saltgate'),
  ('westmark', 'oakhaven-suburban-market',        'saltgate-hill-suburban-market', 'Saltgate Hill Suburbs',       'westmark-saltgate-hill','Saltgate Hill'),
  ('westmark', 'north-drennia-industrial-market', 'marches-mills-industrial-market','Marches Mill Country',       'westmark-marches',     'The Marches'),
  ('westmark', 'drennport-consumer-market',       'port-brannow-consumer-market',  'Port Brannow',                'westmark-port-brannow','Port Brannow'),
  ('westmark', 'silvercoast-scenic-market',       'tidewater-sands-scenic-market', 'Tidewater Sands',             'westmark-tidewater-sands','Tidewater Sands'),
  ('westmark', 'westport-commercial-market',      'tidewater-commercial-market',   'Tidewater Docks',             'westmark-tidewater',   'Tidewater'),
  ('westmark', 'ironvale-worker-market',          'harrowick-worker-market',       'Harrowick Works',             'westmark-harrowick',   'Harrowick'),
  ('westmark', 'greenmere-rural-market',          'downs-rural-market',            'The Downs',                   'westmark-downs',       'The Downs'),
  -- Eryndor (Commonwealth): Highmoor, Coalreach, Goldmere, Southfold
  ('eryndor',  'kingscrown-metropolitan-market',  'highmoor-metropolitan-market',  'Highmoor Royal Capital',      'eryndor-highmoor',     'Highmoor'),
  ('eryndor',  'oakhaven-suburban-market',        'highmoor-commons-suburban-market','Highmoor Commons',          'eryndor-highmoor-commons','Highmoor Commons'),
  ('eryndor',  'north-drennia-industrial-market', 'coalreach-industrial-market',   'Coalreach Hills',             'eryndor-coalreach',    'Coalreach'),
  ('eryndor',  'drennport-consumer-market',       'oakhaven-river-consumer-market','Oakhaven River Port',         'eryndor-oakhaven',     'Oakhaven'),
  ('eryndor',  'silvercoast-scenic-market',       'southfold-orchard-scenic-market','Southfold Orchards',         'eryndor-southfold',    'Southfold'),
  ('eryndor',  'westport-commercial-market',      'fenwick-cross-commercial-market','Fenwick Cross',              'eryndor-fenwick-cross','Fenwick Cross'),
  ('eryndor',  'ironvale-worker-market',          'blackfold-worker-market',       'Blackfold Pit Towns',         'eryndor-blackfold',    'Blackfold'),
  ('eryndor',  'greenmere-rural-market',          'goldmere-rural-market',         'Goldmere Plain',              'eryndor-goldmere',     'Goldmere');

-- Rival car makers: same four kinds as Drennia's (budget, family, performance,
-- commercial), same personality so the computer brain treats them the same.
CREATE TEMP TABLE _nation_rivals (
  country_id  VARCHAR(50),
  personality VARCHAR(50),
  new_name    VARCHAR(100),
  brand       VARCHAR(50),   -- replaces the maker's name in its car names
  hq_state    VARCHAR(50)
) ON COMMIT DROP;

INSERT INTO _nation_rivals VALUES
  ('westmark', 'valuecorp', 'Quayside Motors',          'Quayside',      'westmark-saltgate'),
  ('westmark', 'veridian',  'Tidewater Carriage Co.',   'Tidewater',     'westmark-saltgate'),
  ('westmark', 'apex',      'Saltgate Grand Tourers',   'Saltgate',      'westmark-saltgate'),
  ('westmark', 'haulpro',   'Harbourmaster Vans',       'Harbourmaster', 'westmark-saltgate'),
  ('eryndor',  'valuecorp', 'Crownwheel',               'Crownwheel',    'eryndor-highmoor'),
  ('eryndor',  'veridian',  'Highmoor Motor Company',   'Highmoor',      'eryndor-highmoor'),
  ('eryndor',  'apex',      'Royal Eryndor Coachworks', 'Royal',         'eryndor-highmoor'),
  ('eryndor',  'haulpro',   'Coalreach Haulage Works',  'Coalreach',     'eryndor-highmoor');

DO $$
DECLARE
  m RECORD;
  r RECORD;
  src_company RECORD;
  new_company jsonb;
  new_company_id uuid;
  row_src jsonb;
  new_row jsonb;
  model_map jsonb;
  factory_map jsonb;
  mapped_model text;
  mapped_market text;
  mapped_factory text;
BEGIN
  -- Only nations whose country row exists (0099 adds them).
  -- ── 2. states ──────────────────────────────────────────────────────────────
  INSERT INTO states (id, country_id, name)
  SELECT DISTINCT nm.new_state, nm.country_id, nm.state_name
  FROM _nation_markets nm
  JOIN countries c ON c.id = nm.country_id
  ON CONFLICT (id) DO NOTHING;

  -- ── 3. region markets: copy Drennia's market, rename, move ─────────────────
  FOR m IN
    SELECT nm.*, to_jsonb(src) AS src
    FROM _nation_markets nm
    JOIN countries c ON c.id = nm.country_id
    JOIN manufacturing_region_markets src ON src.id = nm.src_market
    WHERE NOT EXISTS (SELECT 1 FROM manufacturing_region_markets x WHERE x.id = nm.new_market)
  LOOP
    PERFORM pg_temp.worldr_clone_row('manufacturing_region_markets', m.src,
      jsonb_build_object('id', m.new_market, 'country_id', m.country_id,
                         'state_id', m.new_state, 'name', m.market_name));
  END LOOP;

  -- ── 4. per-country business settings ───────────────────────────────────────
  FOR m IN
    SELECT DISTINCT nm.country_id FROM _nation_markets nm JOIN countries c ON c.id = nm.country_id
  LOOP
    IF NOT EXISTS (SELECT 1 FROM manufacturing_country_auto_config WHERE country_id = m.country_id) THEN
      SELECT to_jsonb(cfg) INTO row_src FROM manufacturing_country_auto_config cfg WHERE country_id = 'drennia' LIMIT 1;
      IF row_src IS NOT NULL THEN
        -- Keep the source id out only if it is not the key; country_id is the identity here.
        PERFORM pg_temp.worldr_clone_row('manufacturing_country_auto_config', row_src,
          CASE WHEN jsonb_exists(row_src, 'id') AND jsonb_typeof(row_src->'id') = 'string'
               THEN jsonb_build_object('id', gen_random_uuid()::text, 'country_id', m.country_id)
               ELSE jsonb_build_object('country_id', m.country_id) END);
      END IF;
    END IF;
  END LOOP;

  -- ── 5. rival car makers: copy each Drennia computer-run maker ──────────────
  FOR r IN
    SELECT nr.* FROM _nation_rivals nr JOIN countries c ON c.id = nr.country_id
  LOOP
    IF EXISTS (SELECT 1 FROM companies WHERE country_id = r.country_id AND is_npc = TRUE AND npc_personality = r.personality) THEN
      CONTINUE;
    END IF;

    SELECT * INTO src_company FROM companies
    WHERE country_id = 'drennia' AND is_npc = TRUE AND npc_personality = r.personality
      AND industry_id = 'manufacturing' AND status = 'active'
    ORDER BY created_at LIMIT 1;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Not listed on the exchange: a listing needs share rows (company_shares),
    -- which are not copied. The exchange stays Drennia's for now.
    new_company := pg_temp.worldr_clone_row('companies', to_jsonb(src_company),
      jsonb_build_object('id', gen_random_uuid(), 'country_id', r.country_id,
                         'headquarters_state_id', r.hq_state, 'name', r.new_name)
      || CASE WHEN jsonb_exists(to_jsonb(src_company), 'is_exchange_listed')
              THEN jsonb_build_object('is_exchange_listed', FALSE) ELSE '{}'::jsonb END);
    new_company_id := (new_company->>'id')::uuid;

    -- finances
    FOR row_src IN SELECT to_jsonb(f) FROM company_finances f WHERE f.company_id = src_company.id LOOP
      PERFORM pg_temp.worldr_clone_row('company_finances', row_src,
        CASE WHEN jsonb_typeof(row_src->'id') = 'string'
             THEN jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id)
             ELSE jsonb_build_object('company_id', new_company_id) END);
    END LOOP;

    -- staff
    FOR row_src IN SELECT to_jsonb(s) FROM company_staff s WHERE s.company_id = src_company.id LOOP
      PERFORM pg_temp.worldr_clone_row('company_staff', row_src,
        CASE WHEN jsonb_typeof(row_src->'id') = 'string'
             THEN jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id)
             ELSE jsonb_build_object('company_id', new_company_id) END);
    END LOOP;

    -- cars on sale (active models only); "Apex GT" becomes "Saltgate GT"
    model_map := '{}'::jsonb;
    FOR row_src IN
      SELECT to_jsonb(v) FROM manufacturing_vehicle_models v
      WHERE v.company_id = src_company.id AND v.status = 'active'
    LOOP
      new_row := pg_temp.worldr_clone_row('manufacturing_vehicle_models', row_src,
        jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id,
                           'name', regexp_replace(replace(row_src->>'name', src_company.name, r.brand),
                                                  '^' || split_part(src_company.name, ' ', 1), r.brand))
        || CASE WHEN jsonb_exists(row_src, 'npc_cloned_from_model_id') THEN jsonb_build_object('npc_cloned_from_model_id', NULL) ELSE '{}'::jsonb END);
      model_map := model_map || jsonb_build_object(row_src->>'id', new_row->>'id');
    END LOOP;

    -- factories (moved to the new HQ state)
    factory_map := '{}'::jsonb;
    FOR row_src IN
      SELECT to_jsonb(f) FROM manufacturing_factories f
      WHERE f.company_id = src_company.id AND f.status = 'active'
    LOOP
      new_row := pg_temp.worldr_clone_row('manufacturing_factories', row_src,
        jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id,
                           'country_id', r.country_id, 'state_id', r.hq_state,
                           'name', regexp_replace(replace(row_src->>'name', src_company.name, r.brand),
                                                  '^' || split_part(src_company.name, ' ', 1), r.brand)));
      factory_map := factory_map || jsonb_build_object(row_src->>'id', new_row->>'id');
    END LOOP;

    -- production lines
    FOR row_src IN
      SELECT to_jsonb(l) FROM manufacturing_production_lines l WHERE l.company_id = src_company.id
    LOOP
      mapped_factory := factory_map->>(row_src->>'factory_id');
      IF mapped_factory IS NULL THEN CONTINUE; END IF;
      mapped_model := model_map->>(row_src->>'assigned_vehicle_model_id');
      PERFORM pg_temp.worldr_clone_row('manufacturing_production_lines', row_src,
        jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id,
                           'factory_id', mapped_factory, 'assigned_vehicle_model_id', mapped_model));
    END LOOP;

    -- stock sent to each market + marketing (mapped to the nation's market)
    FOR row_src IN
      SELECT to_jsonb(a) FROM manufacturing_market_allocations a WHERE a.company_id = src_company.id
    LOOP
      mapped_model := model_map->>(row_src->>'vehicle_model_id');
      SELECT nm.new_market INTO mapped_market FROM _nation_markets nm
      WHERE nm.country_id = r.country_id AND nm.src_market = row_src->>'region_market_id';
      IF mapped_model IS NULL OR mapped_market IS NULL THEN CONTINUE; END IF;
      PERFORM pg_temp.worldr_clone_row('manufacturing_market_allocations', row_src,
        jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id,
                           'vehicle_model_id', mapped_model, 'region_market_id', mapped_market));
    END LOOP;

    -- brand awareness per market
    FOR row_src IN
      SELECT to_jsonb(b) FROM manufacturing_brand_awareness b WHERE b.company_id = src_company.id
    LOOP
      SELECT nm.new_market INTO mapped_market FROM _nation_markets nm
      WHERE nm.country_id = r.country_id AND nm.src_market = row_src->>'region_market_id';
      IF mapped_market IS NULL THEN CONTINUE; END IF;
      PERFORM pg_temp.worldr_clone_row('manufacturing_brand_awareness', row_src,
        jsonb_build_object('id', gen_random_uuid(), 'company_id', new_company_id,
                           'region_market_id', mapped_market));
    END LOOP;

    -- the computer brain's memory, per car
    FOR row_src IN
      SELECT to_jsonb(n) FROM manufacturing_npc_state n WHERE n.company_id = src_company.id
    LOOP
      mapped_model := model_map->>(row_src->>'vehicle_model_id');
      IF mapped_model IS NULL THEN CONTINUE; END IF;
      PERFORM pg_temp.worldr_clone_row('manufacturing_npc_state', row_src,
        jsonb_build_object('company_id', new_company_id, 'vehicle_model_id', mapped_model));
    END LOOP;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS pg_temp.worldr_clone_row(regclass, jsonb, jsonb);

