-- WORLDr Migration 0054: Deduplicate Vehicle Model Names
-- Ensures model names across all companies in a world instance are unique.

BEGIN;

-- 1. Create a temporary function / block to update duplicates safely
DO $$
DECLARE
    r RECORD;
    c RECORD;
    new_name TEXT;
    counter INT;
    conflict_exists BOOLEAN;
BEGIN
    -- Fix models named after wrong company
    FOR r IN 
        SELECT m.id, m.name, m.world_instance_id, c.name AS company_name
        FROM manufacturing_vehicle_models m
        JOIN companies c ON c.id = m.company_id
    LOOP
        FOR c IN SELECT name FROM companies WHERE id != (SELECT company_id FROM manufacturing_vehicle_models WHERE id = r.id) LOOP
            IF r.name ILIKE c.name || ' %' THEN
                -- Replace competitor brand name with owning company name
                new_name := r.company_name || ' ' || SUBSTRING(r.name FROM LENGTH(c.name) + 2);
                new_name := SUBSTRING(new_name FROM 1 FOR 60);

                -- Ensure new_name doesn't conflict
                counter := 1;
                LOOP
                    SELECT EXISTS (
                        SELECT 1 FROM manufacturing_vehicle_models 
                        WHERE world_instance_id = r.world_instance_id 
                          AND id != r.id 
                          AND LOWER(name) = LOWER(new_name)
                    ) INTO conflict_exists;

                    EXIT WHEN NOT conflict_exists;

                    counter := counter + 1;
                    new_name := r.company_name || ' ' || SUBSTRING(r.name FROM LENGTH(c.name) + 2) || ' ' || counter;
                    new_name := SUBSTRING(new_name FROM 1 FOR 60);
                END LOOP;

                UPDATE manufacturing_vehicle_models SET name = new_name WHERE id = r.id;
                RAISE NOTICE 'Renamed model % to % for company %', r.id, new_name, r.company_name;
            END IF;
        END LOOP;
    END LOOP;

    -- Fix remaining exact duplicate model names within same world_instance
    FOR r IN
        SELECT world_instance_id, LOWER(name) as lower_name, COUNT(*)
        FROM manufacturing_vehicle_models
        GROUP BY world_instance_id, LOWER(name)
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        FOR c IN
            SELECT m.id, m.name, comp.name AS company_name
            FROM manufacturing_vehicle_models m
            JOIN companies comp ON comp.id = m.company_id
            WHERE m.world_instance_id = r.world_instance_id
              AND LOWER(m.name) = r.lower_name
            ORDER BY m.created_at ASC
        LOOP
            IF counter > 1 THEN
                new_name := SUBSTRING(c.name FROM 1 FOR 15) || ' ' || c.company_name;
                IF counter > 2 THEN
                    new_name := new_name || ' ' || counter;
                END IF;
                new_name := SUBSTRING(new_name FROM 1 FOR 60);

                -- Verify uniqueness
                LOOP
                    SELECT EXISTS (
                        SELECT 1 FROM manufacturing_vehicle_models 
                        WHERE world_instance_id = r.world_instance_id 
                          AND id != c.id 
                          AND LOWER(name) = LOWER(new_name)
                    ) INTO conflict_exists;

                    EXIT WHEN NOT conflict_exists;

                    counter := counter + 1;
                    new_name := SUBSTRING(c.name FROM 1 FOR 15) || ' ' || c.company_name || ' ' || counter;
                    new_name := SUBSTRING(new_name FROM 1 FOR 60);
                END LOOP;

                UPDATE manufacturing_vehicle_models SET name = new_name WHERE id = c.id;
                RAISE NOTICE 'Deduplicated model % to %', c.id, new_name;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;

END $$;

COMMIT;
