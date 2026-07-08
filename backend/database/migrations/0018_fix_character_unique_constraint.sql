ALTER TABLE "characters" DROP CONSTRAINT IF EXISTS "unique_character_per_user_world";
DROP INDEX IF EXISTS "unique_character_per_user_world";

CREATE UNIQUE INDEX "unique_character_per_user_world" 
ON "characters" ("user_id", "world_instance_id") 
WHERE "status" != 'deleted';
