-- 0033: Global Currency Replacement to Dollar
BEGIN;

-- 1. Insert the new Dollar currency
INSERT INTO currencies (id, name, symbol, locale, decimal_places)
VALUES ('dollar', 'Dollar', '$', 'en-US', 0)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    locale = EXCLUDED.locale,
    decimal_places = EXCLUDED.decimal_places;

-- 2. Update all tables that reference currency_id
UPDATE countries SET currency_id = 'dollar' WHERE currency_id != 'dollar';
UPDATE companies SET currency_id = 'dollar' WHERE currency_id != 'dollar';
UPDATE company_finances SET currency_id = 'dollar' WHERE currency_id != 'dollar';
UPDATE character_finances SET currency_id = 'dollar' WHERE currency_id != 'dollar';

-- 3. Delete any other currencies (e.g. drennian-day, drennia-drachma)
DELETE FROM currencies WHERE id != 'dollar';

COMMIT;
