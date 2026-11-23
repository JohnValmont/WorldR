// Shared: only ever run against a local game.
const BASE = process.env.UI_AUDIT_BASE || 'http://localhost:3000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`Refusing to run against ${BASE}: these scripts create accounts and are local only.`);
  process.exit(2);
}
module.exports = { BASE };
