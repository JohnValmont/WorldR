ALTER TABLE company_finances
ADD COLUMN lifetime_net_profit NUMERIC DEFAULT 0,
ADD COLUMN lifetime_units_sold BIGINT DEFAULT 0;
