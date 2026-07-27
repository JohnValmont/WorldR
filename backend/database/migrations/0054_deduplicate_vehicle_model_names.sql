-- WORLDr Migration 0054: Deduplicate Vehicle Model Names
-- Ensures model names across all companies in a world instance are unique.

BEGIN;

-- 1. Create a temporary function / block to update duplicates safely
DO $$
DECLARE
    rec_model RECORD;
    rec_comp RECORD;
    new_name TEXT;
    counter INT;
    conflict_exists BOOLEAN;
BEGIN
    -- Fix models named after wrong company
    FOR rec_model IN 
        SELECT m.id, m.name, m.world_instance_id, c.name AS company_name
        FROM manufacturing_vehicle_models m
        JOIN companies c ON c.id = m.company_id
    LOOP
        FOR rec_comp IN SELECT name FROM companies WHERE id != (SELECT company_id FROM manufacturing_vehicle_models WHERE id = rec_model.id) LOOP
            IF rec_model.name ILIKE rec_comp.name || ' %' THEN
                -- Replace competitor brand name with owning company name
                new_name := rec_model.company_name || ' ' || SUBSTRING(rec_model.name FROM LENGTH(rec_comp.name) + 2);
                new_name := SUBSTRING(new_name FROM 1 FOR 60);

                -- Ensure new_name doesn't conflict
                counter := 1;
                LOOP
                    SELECT EXISTS (
                        SELECT 1 FROM manufacturing_vehicle_models 
                        WHERE world_instance_id = rec_model.world_instance_id 
                          AND id != rec_model.id 
                          AND LOWER(name) = LOWER(new_name)
                    ) INTO conflict_exists;

                    EXIT WHEN NOT conflict_exists;

                    counter := counter + 1;
                    new_name := rec_model.company_name || ' ' || SUBSTRING(rec_model.name FROM LENGTH(rec_comp.name) + 2) || ' ' || counter;
                    new_name := SUBSTRING(new_name FROM 1 FOR 60);
                END LOOP;

                UPDATE manufacturing_vehicle_models SET name = new_name WHERE id = rec_model.id;
                RAISE NOTICE 'Renamed model % to % for company %', rec_model.id, new_name, rec_model.company_name;
            END IF;
        END LOOP;
    END LOOP;

    -- Fix remaining exact duplicate model names within same world_instance
    FOR rec_model IN
        SELECT world_instance_id, LOWER(name) as lower_name, COUNT(*)
        FROM manufacturing_vehicle_models
        GROUP BY world_instance_id, LOWER(name)
        HAVING COUNT(*) > 1
    LOOP
        counter := 1;
        FOR rec_comp IN
            SELECT m.id, m.name, comp.name AS company_name
            FROM manufacturing_vehicle_models m
            JOIN companies comp ON comp.id = m.company_id
            WHERE m.world_instance_id = rec_model.world_instance_id
              AND LOWER(m.name) = rec_model.lower_name
            ORDER BY m.created_at ASC
        LOOP
            IF counter > 1 THEN
                new_name := SUBSTRING(rec_comp.name FROM 1 FOR 15) || ' ' || rec_comp.company_name;
                IF counter > 2 THEN
                    new_name := new_name || ' ' || counter;
                END IF;
                new_name := SUBSTRING(new_name FROM 1 FOR 60);

                -- Verify uniqueness
                LOOP
                    SELECT EXISTS (
                        SELECT 1 FROM manufacturing_vehicle_models 
                        WHERE world_instance_id = rec_model.world_instance_id 
                          AND id != rec_comp.id 
                          AND LOWER(name) = LOWER(new_name)
                    ) INTO conflict_exists;

                    EXIT WHEN NOT conflict_exists;

                    counter := counter + 1;
                    new_name := SUBSTRING(rec_comp.name FROM 1 FOR 15) || ' ' || rec_comp.company_name || ' ' || counter;
                    new_name := SUBSTRING(new_name FROM 1 FOR 60);
                END LOOP;

                UPDATE manufacturing_vehicle_models SET name = new_name WHERE id = rec_comp.id;
                RAISE NOTICE 'Deduplicated model % to %', rec_comp.id, new_name;
            END IF;
            counter := counter + 1;
        END LOOP;
    END LOOP;

END $$;

COMMIT;
