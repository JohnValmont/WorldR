import { db } from './src/config/database';
async function main() {
  try {
    const c = await db('companies').select('*');
    console.log(c);
  } catch(e) { console.error(e) }
  process.exit(0);
}
main();
