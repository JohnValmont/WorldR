-- UP
BEGIN;

ALTER TABLE company_finances ADD COLUMN last_arc_revenue NUMERIC(19,4) NOT NULL DEFAULT 0.00;

COMMIT;

-- DOWN
BEGIN;

ALTER TABLE company_finances DROP COLUMN last_arc_revenue;

COMMIT;
