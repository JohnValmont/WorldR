import { runNpcBrainForCompany } from './src/api/services/npcBrain.service';
import db from './src/config/db';

async function test() {
    const trx = await db.transaction();
    try {
        const haulPro = await trx('companies').where({ name: 'HaulPro' }).first();
        console.log("Running for HaulPro:", haulPro.id);
        await runNpcBrainForCompany(trx, haulPro.id, 7, 6);
        await trx.rollback();
        console.log("Done");
    } catch (e) {
        console.error(e);
        await trx.rollback();
    } finally {
        await db.destroy();
    }
}
test();
