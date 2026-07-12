ALTER TABLE manufacturing_factories
ADD COLUMN maintenance_budget_modifier NUMERIC(4, 2) NOT NULL DEFAULT 1.0;
