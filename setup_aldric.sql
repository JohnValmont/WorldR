DO $$
DECLARE
    sys_char_id UUID;
    instance_id UUID;
    aldric_company_id UUID;
    country_code TEXT := 'drennia';
    state_code TEXT := 'drennia-drennport';
    fact_type TEXT := 'mega-plant';
    
    new_model_id UUID := gen_random_uuid();
    new_factory_id UUID := gen_random_uuid();
    new_line_id UUID := gen_random_uuid();
    
    cur_year INT;
    cur_month INT;
    cur_day INT;
BEGIN
    -- Get current world clock
    SELECT current_year, current_month, current_day 
    INTO cur_year, cur_month, cur_day 
    FROM world_clock LIMIT 1;

    -- Find the company
    SELECT id, world_instance_id INTO aldric_company_id, instance_id 
    FROM companies 
    WHERE name = 'Aldric Automobiles' LIMIT 1;

    IF aldric_company_id IS NULL THEN
        RAISE EXCEPTION 'Could not find "Aldric Automobiles". Please create the company in the game first!';
    END IF;

    -- 1. Skipped is_npc update because we hardcoded Aldric into the engine loop, allowing you to keep control in UI

    -- 2. Inject massive capital so the NPC Brain can spam National Marketing
    UPDATE company_finances 
    SET available_cash = available_cash + 50000000,
        company_value = company_value + 50000000
    WHERE company_id = aldric_company_id;

    -- 3. Create the Ultimate Premium Sedan
    INSERT INTO manufacturing_vehicle_models (
        id, world_instance_id, company_id, name, target_segment, vehicle_class,
        platform_type, power_unit_type, drivetrain_type, body_style_id,
        interior_tier, safety_tier, reliability_score, performance_score,
        fuel_efficiency_score, appeal_score, cargo_score,
        manufacturing_cost_per_unit, sale_price,
        development_status, status, launched_year, launched_month,
        created_at, updated_at
    ) VALUES (
        new_model_id, instance_id, aldric_company_id, 'Aldric Sovereign-P1', 'premium', 'Sedan',
        'standard', 'v8', 'awd', 'sedan',
        'luxury', 'advanced', 98, 96, 75, 100, 60,
        35000.00, 65000.00,
        'launched', 'active', cur_year, cur_month,
        now(), now()
    );

    -- 4. Create a Mega-Plant to produce it
    INSERT INTO manufacturing_factories (
        id, world_instance_id, company_id, factory_type_id, country_id, state_id, name,
        capacity_per_month, worker_capacity, condition, auto_condition_recovery, status, building_status,
        lease_cost_per_month, maintenance_cost_per_month, created_at_world_year, created_at_world_month, created_at_world_day
    ) VALUES (
        new_factory_id, instance_id, aldric_company_id, fact_type, country_code, state_code, 'Aldric Apex Plant',
        1500, 500, 100.0, true, 'active', 'completed',
        250000, 50000, cur_year, cur_month, cur_day
    );

    -- 5. Set up Production Line
    INSERT INTO manufacturing_production_lines (
        id, world_instance_id, factory_id, assigned_vehicle_model_id, target_units_per_month,
        efficiency_rate, condition, status, construction_status,
        maintenance_cost_per_month, setup_cost, created_at_world_year, created_at_world_month, created_at_world_day
    ) VALUES (
        new_line_id, instance_id, new_factory_id, new_model_id, 1500,
        1.0, 100.0, 'active', 'completed',
        15000, 500000, cur_year, cur_month, cur_day
    );

    -- 6. Immediately assign max inventory so the NPC can sell on tick 1
    INSERT INTO manufacturing_inventory (
        id, world_instance_id, company_id, vehicle_model_id, units_in_stock
    ) VALUES (
        gen_random_uuid(), instance_id, aldric_company_id, new_model_id, 1500
    );

    -- 7. Allocate 1500 units to the Drennia Consumer Market with National Marketing
    INSERT INTO manufacturing_market_allocations (
        id, world_instance_id, company_id, vehicle_model_id, region_market_id,
        units_allocated, marketing_tier, status
    ) VALUES (
        gen_random_uuid(), instance_id, aldric_company_id, new_model_id, 'drennport-consumer-market',
        1500, 'national', 'active'
    );
    
    -- 8. Seed Brand Awareness so it dominates instantly
    INSERT INTO manufacturing_brand_awareness (
        id, world_instance_id, company_id, region_market_id, awareness_level, reputation_level
    ) VALUES (
        gen_random_uuid(), instance_id, aldric_company_id, 'drennport-consumer-market', 85.0, 90.0
    ) ON CONFLICT (company_id, region_market_id) DO UPDATE 
      SET awareness_level = 85.0, reputation_level = 90.0;

END $$;
