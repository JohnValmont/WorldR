-- 0115_component_prices.sql
-- Car parts were priced 100x too low (an engine cost $0.35) while the production
-- maths (BOM_COST in manufacturing.controller produceForCompany) takes $94 of
-- parts out of every car's cost for players, because players buy parts up front.
-- So a player paid under $1 of parts per car and saved $93 a car on NPC rivals.
-- New prices make one car's parts cost exactly $94, the same as NPCs pay:
--   engine 35 + transmission 18 + 4 tyres x 1 + steel 20 + glass 5 + electronics 12.
-- Idempotent: only rows still at the old cents-level price change.

UPDATE manufacturing_component_catalogue SET base_cost = 35 WHERE id = 'comp_engine'       AND base_cost < 1;
UPDATE manufacturing_component_catalogue SET base_cost = 18 WHERE id = 'comp_transmission' AND base_cost < 1;
UPDATE manufacturing_component_catalogue SET base_cost = 1  WHERE id = 'comp_tyres'        AND base_cost < 0.5;
UPDATE manufacturing_component_catalogue SET base_cost = 20 WHERE id = 'comp_steel'        AND base_cost < 1;
UPDATE manufacturing_component_catalogue SET base_cost = 5  WHERE id = 'comp_glass'        AND base_cost < 1;
UPDATE manufacturing_component_catalogue SET base_cost = 12 WHERE id = 'comp_electronics'  AND base_cost < 1;
