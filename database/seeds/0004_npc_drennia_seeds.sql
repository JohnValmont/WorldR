-- WORLDr Seeds: NPC Competitors (Drennia)
-- Idempotent setup for the four NPC manufacturing competitors

DO $$
DECLARE
    v_sys_user_id BIGINT;
    v_sys_char_id UUID;
    v_factory_type_id VARCHAR(100);
    v_region_market_id VARCHAR(100);
    
    v_company_id UUID;
    v_model_id UUID;
    v_factory_id UUID;
BEGIN
    -- 1. Ensure system character exists
    SELECT id INTO v_sys_user_id FROM users WHERE email = 'system_npc@worldr.game';
    
    IF v_sys_user_id IS NULL THEN
        INSERT INTO users (email, password_hash)
        VALUES ('system_npc@worldr.game', 'no_login_allowed')
        RETURNING id INTO v_sys_user_id;
    END IF;

    SELECT id INTO v_sys_char_id FROM characters WHERE user_id = v_sys_user_id LIMIT 1;
    
    IF v_sys_char_id IS NULL THEN
        INSERT INTO characters (user_id, world_instance_id, motherland_country_id, name, age, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_sys_user_id, 'pre-alpha-world-1', 'drennia', 'System NPC', 30, 0, 0, 0)
        RETURNING id INTO v_sys_char_id;
    END IF;
    
    -- 2. Get a standard factory type for leasing
    SELECT id INTO v_factory_type_id FROM manufacturing_factory_types WHERE id = 'small-workshop' LIMIT 1;
    
    -- 3. Get the primary Drennia market for initial allocations
    SELECT id INTO v_region_market_id FROM manufacturing_region_markets WHERE country_id = 'drennia' LIMIT 1;
    
    -- Ensure dependencies exist
    IF v_sys_char_id IS NULL OR v_factory_type_id IS NULL OR v_region_market_id IS NULL THEN
        RAISE NOTICE 'Skipping NPC seed: missing dependencies (sys char, factory type, or region market).';
        RETURN;
    END IF;

    -- ==========================================
    -- 1. VALUECORP (Budget)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Valuecorp' AND country_id = 'drennia') THEN
        INSERT INTO companies (owner_character_id, world_instance_id, country_id, headquarters_state_id, industry_id, legal_structure_id, currency_id, name, status, is_npc, npc_personality, reputation, reliability, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'Valuecorp', 'active', TRUE, 'valuecorp', 50, 50, 0, 0, 0)
        RETURNING id INTO v_company_id;

        INSERT INTO company_finances (company_id, currency_id, available_cash, debt, company_value, last_arc_profit)
        VALUES (v_company_id, 'dollar', 1500000, 0, 1500000, 0);

        INSERT INTO manufacturing_vehicle_models (company_id, world_instance_id, name, vehicle_class, platform_type, power_unit_type, drivetrain_type, interior_tier, safety_tier, target_segment, sale_price, manufacturing_cost_per_unit, reliability_score, performance_score, fuel_efficiency_score, appeal_score, cargo_score, development_status, dev_stage, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'Valuecorp Standard', 'Compact Car', 'economy', 'small-i4', 'fwd', 'basic', 'standard', 'Budget', 14500, 8075, 60, 35, 80, 40, 50, 'launched', 'ready_to_launch', 'active', 0, 0, 0)
        RETURNING id INTO v_model_id;

        INSERT INTO manufacturing_factories (company_id, world_instance_id, country_id, state_id, factory_type_id, name, lease_cost_per_month, maintenance_cost_per_month, capacity_per_month, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', v_factory_type_id, 'Valuecorp Primary Facility', 25000, 8000, 500, 'active', 0, 0, 0)
        RETURNING id INTO v_factory_id;

        INSERT INTO manufacturing_production_lines (company_id, world_instance_id, factory_id, line_number, assigned_vehicle_model_id, target_units_per_month, status)
        VALUES (v_company_id, 'pre-alpha-world-1', v_factory_id, 1, v_model_id, 100, 'active');

        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'factory_worker', 30);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'supervisor', 1);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'sales_manager', 1);

        INSERT INTO manufacturing_market_allocations (company_id, world_instance_id, vehicle_model_id, region_market_id, units_allocated, marketing_tier)
        VALUES (v_company_id, 'pre-alpha-world-1', v_model_id, v_region_market_id, 100, 'local');

        INSERT INTO manufacturing_npc_state (company_id, vehicle_model_id)
        VALUES (v_company_id, v_model_id);
    END IF;

    -- ==========================================
    -- 2. VERIDIAN MOTORS (Family)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Veridian Motors' AND country_id = 'drennia') THEN
        INSERT INTO companies (owner_character_id, world_instance_id, country_id, headquarters_state_id, industry_id, legal_structure_id, currency_id, name, status, is_npc, npc_personality, reputation, reliability, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'Veridian Motors', 'active', TRUE, 'veridian', 50, 50, 0, 0, 0)
        RETURNING id INTO v_company_id;

        INSERT INTO company_finances (company_id, currency_id, available_cash, debt, company_value, last_arc_profit)
        VALUES (v_company_id, 'dollar', 2500000, 0, 2500000, 0);

        INSERT INTO manufacturing_vehicle_models (company_id, world_instance_id, name, vehicle_class, platform_type, power_unit_type, drivetrain_type, interior_tier, safety_tier, target_segment, sale_price, manufacturing_cost_per_unit, reliability_score, performance_score, fuel_efficiency_score, appeal_score, cargo_score, development_status, dev_stage, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'Veridian Family Sedan', 'Sedan', 'standard', 'standard-i4', 'fwd', 'comfort', 'enhanced', 'Family', 27000, 17000, 70, 45, 60, 55, 65, 'launched', 'ready_to_launch', 'active', 0, 0, 0)
        RETURNING id INTO v_model_id;

        INSERT INTO manufacturing_factories (company_id, world_instance_id, country_id, state_id, factory_type_id, name, lease_cost_per_month, maintenance_cost_per_month, capacity_per_month, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', v_factory_type_id, 'Veridian Primary Facility', 25000, 8000, 500, 'active', 0, 0, 0)
        RETURNING id INTO v_factory_id;

        INSERT INTO manufacturing_production_lines (company_id, world_instance_id, factory_id, line_number, assigned_vehicle_model_id, target_units_per_month, status)
        VALUES (v_company_id, 'pre-alpha-world-1', v_factory_id, 1, v_model_id, 90, 'active');

        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'factory_worker', 30);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'supervisor', 1);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'sales_manager', 1);

        INSERT INTO manufacturing_market_allocations (company_id, world_instance_id, vehicle_model_id, region_market_id, units_allocated, marketing_tier)
        VALUES (v_company_id, 'pre-alpha-world-1', v_model_id, v_region_market_id, 90, 'regional');

        INSERT INTO manufacturing_npc_state (company_id, vehicle_model_id)
        VALUES (v_company_id, v_model_id);
    END IF;

    -- ==========================================
    -- 3. APEX AUTOMOBILI (Performance)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'Apex Automobili' AND country_id = 'drennia') THEN
        INSERT INTO companies (owner_character_id, world_instance_id, country_id, headquarters_state_id, industry_id, legal_structure_id, currency_id, name, status, is_npc, npc_personality, reputation, reliability, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'Apex Automobili', 'active', TRUE, 'apex', 50, 50, 0, 0, 0)
        RETURNING id INTO v_company_id;

        INSERT INTO company_finances (company_id, currency_id, available_cash, debt, company_value, last_arc_profit)
        VALUES (v_company_id, 'dollar', 2000000, 0, 2000000, 0);

        INSERT INTO manufacturing_vehicle_models (company_id, world_instance_id, name, vehicle_class, platform_type, power_unit_type, drivetrain_type, interior_tier, safety_tier, target_segment, sale_price, manufacturing_cost_per_unit, reliability_score, performance_score, fuel_efficiency_score, appeal_score, cargo_score, development_status, dev_stage, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'Apex GT', 'Sedan', 'standard', 'v6', 'awd', 'premium', 'advanced', 'Performance', 58000, 29400, 60, 85, 35, 80, 35, 'launched', 'ready_to_launch', 'active', 0, 0, 0)
        RETURNING id INTO v_model_id;

        INSERT INTO manufacturing_factories (company_id, world_instance_id, country_id, state_id, factory_type_id, name, lease_cost_per_month, maintenance_cost_per_month, capacity_per_month, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', v_factory_type_id, 'Apex Primary Facility', 25000, 8000, 500, 'active', 0, 0, 0)
        RETURNING id INTO v_factory_id;

        INSERT INTO manufacturing_production_lines (company_id, world_instance_id, factory_id, line_number, assigned_vehicle_model_id, target_units_per_month, status)
        VALUES (v_company_id, 'pre-alpha-world-1', v_factory_id, 1, v_model_id, 40, 'active');

        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'factory_worker', 30);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'supervisor', 1);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'sales_manager', 1);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'engineer', 1);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'inspector', 1);

        INSERT INTO manufacturing_market_allocations (company_id, world_instance_id, vehicle_model_id, region_market_id, units_allocated, marketing_tier)
        VALUES (v_company_id, 'pre-alpha-world-1', v_model_id, v_region_market_id, 40, 'regional');

        INSERT INTO manufacturing_npc_state (company_id, vehicle_model_id)
        VALUES (v_company_id, v_model_id);
    END IF;

    -- ==========================================
    -- 4. HAULPRO (Commercial)
    -- ==========================================
    IF NOT EXISTS (SELECT 1 FROM companies WHERE name = 'HaulPro' AND country_id = 'drennia') THEN
        INSERT INTO companies (owner_character_id, world_instance_id, country_id, headquarters_state_id, industry_id, legal_structure_id, currency_id, name, status, is_npc, npc_personality, reputation, reliability, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'HaulPro', 'active', TRUE, 'haulpro', 50, 50, 0, 0, 0)
        RETURNING id INTO v_company_id;

        INSERT INTO company_finances (company_id, currency_id, available_cash, debt, company_value, last_arc_profit)
        VALUES (v_company_id, 'dollar', 2500000, 0, 2500000, 0);

        INSERT INTO manufacturing_vehicle_models (company_id, world_instance_id, name, vehicle_class, platform_type, power_unit_type, drivetrain_type, interior_tier, safety_tier, target_segment, sale_price, manufacturing_cost_per_unit, reliability_score, performance_score, fuel_efficiency_score, appeal_score, cargo_score, development_status, dev_stage, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'HaulPro Utility', 'Utility Van', 'heavy-duty', 'standard-i4', 'rwd', 'basic', 'enhanced', 'Commercial', 34000, 22000, 75, 40, 60, 30, 90, 'launched', 'ready_to_launch', 'active', 0, 0, 0)
        RETURNING id INTO v_model_id;

        INSERT INTO manufacturing_factories (company_id, world_instance_id, country_id, state_id, factory_type_id, name, lease_cost_per_month, maintenance_cost_per_month, capacity_per_month, status, created_at_world_year, created_at_world_month, created_at_world_day)
        VALUES (v_company_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', v_factory_type_id, 'HaulPro Primary Facility', 25000, 8000, 500, 'active', 0, 0, 0)
        RETURNING id INTO v_factory_id;

        INSERT INTO manufacturing_production_lines (company_id, world_instance_id, factory_id, line_number, assigned_vehicle_model_id, target_units_per_month, status)
        VALUES (v_company_id, 'pre-alpha-world-1', v_factory_id, 1, v_model_id, 80, 'active');

        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'factory_worker', 30);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'supervisor', 1);
        INSERT INTO company_staff (company_id, role, quantity) VALUES (v_company_id, 'sales_manager', 1);

        INSERT INTO manufacturing_market_allocations (company_id, world_instance_id, vehicle_model_id, region_market_id, units_allocated, marketing_tier)
        VALUES (v_company_id, 'pre-alpha-world-1', v_model_id, v_region_market_id, 80, 'local');

        INSERT INTO manufacturing_npc_state (company_id, vehicle_model_id)
        VALUES (v_company_id, v_model_id);
    END IF;

END $$;
