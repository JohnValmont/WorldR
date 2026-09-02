-- Fix drennia_states: set real Drennia state names and codes
-- UUIDs are unchanged — district FKs still valid
UPDATE drennia_states SET name = 'Drennport',  code = 'DRENNPORT' WHERE id = '11111111-0000-0000-0000-000000000001';
UPDATE drennia_states SET name = 'Ironvale',   code = 'IRONVALE'  WHERE id = '11111111-0000-0000-0000-000000000002';
UPDATE drennia_states SET name = 'Greenmere',  code = 'GREENMERE' WHERE id = '11111111-0000-0000-0000-000000000003';
UPDATE drennia_states SET name = 'Westmark',   code = 'WESTMARK'  WHERE id = '11111111-0000-0000-0000-000000000004';
