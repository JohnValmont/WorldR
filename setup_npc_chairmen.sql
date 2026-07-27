DO $$
DECLARE
    instance_id TEXT;
    cur_year INT;
    cur_month INT;
    cur_day INT;
    
    npc_rec RECORD;
    new_char_id UUID;
    chair_user_id BIGINT;
    chair_email TEXT;
    company_val NUMERIC;
    
    chairmen_names TEXT[] := ARRAY[
        'Gideon Cross',
        'Victor Vance',
        'Sterling Sterling',
        'Elena Rostova',
        'Marcus Thorne',
        'Sir Arthur Pendelton',
        'Giovanni Veloce',
        'Cassandra Zenith',
        'Julian Vance',
        'Baron Von Sterling'
    ];
    idx INT := 1;
    c_name TEXT;
BEGIN
    -- Get current world clock
    SELECT current_year, current_month, current_day 
    INTO cur_year, cur_month, cur_day 
    FROM world_clock LIMIT 1;

    SELECT world_instance_id INTO instance_id FROM companies LIMIT 1;

    -- Loop through all active NPC companies
    FOR npc_rec IN 
        SELECT c.id AS company_id, c.name AS company_name, c.owner_character_id, cf.company_value
        FROM companies c
        LEFT JOIN company_finances cf ON cf.company_id = c.id
        WHERE c.is_npc = true AND c.status = 'active'
    LOOP
        -- Choose a distinct chairman name
        c_name := chairmen_names[((idx - 1) % array_length(chairmen_names, 1)) + 1];
        idx := idx + 1;
        
        chair_email := lower(replace(c_name, ' ', '_')) || '@npc.worldr.game';

        -- 1. Create User account for Chairman to satisfy unique_character_per_user_world
        INSERT INTO users (
            email, password_hash, role, is_verified, display_name, created_at, updated_at
        ) VALUES (
            chair_email, '$2b$10$npc_dummy_hash_for_npc_chairmen_worldr', 'user', true, c_name, now(), now()
        ) ON CONFLICT (email) DO NOTHING;

        SELECT id INTO chair_user_id FROM users WHERE email = chair_email LIMIT 1;
        
        -- 2. Check if Chairman character already exists
        SELECT id INTO new_char_id FROM characters WHERE name = c_name LIMIT 1;
        
        IF new_char_id IS NULL THEN
            new_char_id := gen_random_uuid();
            
            -- Insert Chairman character
            INSERT INTO characters (
                id, world_instance_id, user_id, motherland_country_id, home_state_id,
                name, age, credibility, charisma, influence, status,
                created_at_world_year, created_at_world_month, created_at_world_day,
                created_at, updated_at
            ) VALUES (
                new_char_id, instance_id, chair_user_id, 'drennia', 'drennia-drennport',
                c_name, 45 + (idx * 3 % 20), 85, 90, 80, 'active',
                cur_year, cur_month, cur_day,
                now(), now()
            );
            
            -- Insert Character finances with $15M cash in hand
            INSERT INTO character_finances (
                character_id, currency_id, cash_in_hand, net_worth, updated_at
            ) VALUES (
                new_char_id, 'dollar', 15000000.00, 50000000.00, now()
            ) ON CONFLICT (character_id) DO UPDATE 
              SET cash_in_hand = 15000000.00;
        END IF;
        
        -- 3. Assign Chairman as company owner
        UPDATE companies SET owner_character_id = new_char_id WHERE id = npc_rec.company_id;
        
        -- 4. Delete old generic shares for this company owned by system NPC
        IF npc_rec.owner_character_id IS NOT NULL AND npc_rec.owner_character_id != new_char_id THEN
            DELETE FROM company_shares 
            WHERE company_id = npc_rec.company_id AND holder_character_id = npc_rec.owner_character_id;
        END IF;

        -- 5. Assign 70% company shares (700,000 shares) to Chairman using IF EXISTS block
        company_val := COALESCE(npc_rec.company_value, 25000000);
        
        IF EXISTS (SELECT 1 FROM company_shares WHERE company_id = npc_rec.company_id AND holder_character_id = new_char_id) THEN
            UPDATE company_shares 
            SET shares = 700000, updated_at = now() 
            WHERE company_id = npc_rec.company_id AND holder_character_id = new_char_id;
        ELSE
            INSERT INTO company_shares (
                id, company_id, holder_character_id, shares, avg_cost_basis, updated_at
            ) VALUES (
                gen_random_uuid(), npc_rec.company_id, new_char_id, 700000, company_val / 1000000, now()
            );
        END IF;

    END LOOP;

    RAISE NOTICE 'Successfully assigned unique Chairman characters for all NPC companies!';
END $$;
