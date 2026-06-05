-- WORLDr Database Migration: Add Maintenance Policy to Company Finances

ALTER TABLE company_finances 
ADD COLUMN IF NOT EXISTS maintenance_policy VARCHAR(50) NOT NULL DEFAULT 'Standard';
