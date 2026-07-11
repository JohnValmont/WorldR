-- WORLDr Migration 0040: Fix Vehicle Model JSON Fields
ALTER TABLE manufacturing_vehicle_models ALTER COLUMN applied_engineering_package TYPE TEXT;
