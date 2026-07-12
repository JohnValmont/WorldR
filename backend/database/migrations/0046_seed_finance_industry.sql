-- Migration 0046: Seed finance industry reference row
-- Required for Capital Partners firms (industry_id = 'finance').
-- The FK constraint on companies.industry_id references industries(id),
-- so this row must exist before any finance company can be created.

INSERT INTO industries (id, name)
VALUES ('finance', 'Finance & Services')
ON CONFLICT (id) DO NOTHING;
