ALTER TABLE manufacturing_vehicle_models
ADD COLUMN IF NOT EXISTS safety_score INT NOT NULL DEFAULT 50;
