-- WORLDr Database Seeds: Logistics Operations Online

-- 1. PROCUREMENT VEHICLES
INSERT INTO procurement_vehicles (type, purchase_cost, capacity, monthly_maintenance, description)
VALUES 
('Used Delivery Van', 35000, 1, 3000, 'Best for local delivery and small cargo. Low operating cost.'),
('Box Truck', 75000, 2, 7000, 'Medium freight, produce delivery, retail restock. Versatile workhorse.'),
('Used Freight Truck', 180000, 3, 12000, 'Industrial parts, state-to-state freight. High capacity, higher upkeep.')
ON CONFLICT (type) DO UPDATE SET 
    purchase_cost = EXCLUDED.purchase_cost,
    capacity = EXCLUDED.capacity,
    monthly_maintenance = EXCLUDED.monthly_maintenance,
    description = EXCLUDED.description;

-- 2. PROCUREMENT FACILITIES
INSERT INTO procurement_facilities (type, lease_cost_per_month, capacity, description)
VALUES 
('Office', 15000, 0, 'Basic administrative space for dispatchers and clerks.'),
('Vehicle Yard', 25000, 10, 'Secure parking for your fleet.'),
('Depot', 60000, 25, 'Medium-sized facility for cross-docking and maintenance.'),
('Warehouse', 120000, 50, 'Large-scale storage and logistics hub.')
ON CONFLICT (type) DO UPDATE SET 
    lease_cost_per_month = EXCLUDED.lease_cost_per_month,
    capacity = EXCLUDED.capacity,
    description = EXCLUDED.description;

-- 3. OPERATION POOLS
INSERT INTO operation_pools (name, required_capacity, base_revenue_per_month, description)
VALUES 
('Local Delivery Pool', 1, 5000, 'Basic low-margin local delivery operations.'),
('Port Shuttle Pool', 2, 12000, 'Moving containers from port to local warehouses.')
ON CONFLICT (name) DO UPDATE SET 
    required_capacity = EXCLUDED.required_capacity,
    base_revenue_per_month = EXCLUDED.base_revenue_per_month,
    description = EXCLUDED.description;
