import { db } from './src/config/database';

async function main() {
    try {
        console.log("Looking up mr unknown...");
        const char = await db('characters').where('name', 'ilike', '%mr unknown%').first();
        if (!char) {
            console.error("Character not found!");
            process.exit(1);
        }
        
        console.log(`Found character: ${char.name}, ID: ${char.id}`);
        
        const finances = await db('character_finances').where('character_id', char.id).first();
        if (!finances) {
             console.error("Finances not found!");
             process.exit(1);
        }

        const newCash = Number(finances.cash_in_hand) + 250000;
        
        await db('character_finances').where({ character_id: char.id }).update({ cash_in_hand: newCash });
        console.log(`Successfully added $250,000 to ${char.name}'s personal account. New Balance: $${newCash}`);
        
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await db.destroy();
    }
}

main();
