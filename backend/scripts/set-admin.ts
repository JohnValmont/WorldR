/**
 * Grant admin rights to one account.
 *
 *   npx tsx scripts/set-admin.ts someone@example.com
 *
 * For permanent admins prefer the ADMIN_EMAILS env var, which is applied on
 * every server boot. Uses DATABASE_URL from backend/.env.
 */
import { db } from '../src/config/database';

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error('Usage: npx tsx scripts/set-admin.ts <email>');
    process.exit(1);
  }
  const result = await db('users').whereRaw('LOWER(email) = LOWER(?)', [email]).update({ role: 'admin' });
  console.log(result > 0 ? `${email} is now an admin.` : `No account found for ${email}.`);
  await db.destroy();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
