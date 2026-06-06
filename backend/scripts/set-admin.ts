import { db } from '../src/config/database';

async function main() {
  const email = 'infoforbiddengaming@gmail.com';
  console.log(`Setting ${email} to admin...`);
  const result = await db('users').where({ email }).update({ role: 'admin' });
  console.log(`Updated ${result} rows.`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
