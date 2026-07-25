import { runWorldTick } from './src/api/services/worldTick.service';
import db from './src/config/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function test() {
  console.log("Starting runWorldTick force...");
  try {
    const res = await runWorldTick({ force: true });
    console.log("RESULT:", res);
  } catch (err) {
    console.error("ERROR:", err);
  }
  await db.destroy();
}

test();
