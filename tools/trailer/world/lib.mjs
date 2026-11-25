// Shared helpers for building the filming world. LOCAL ONLY: refuses anything but localhost.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
export const API = process.env.TRAILER_API || 'http://localhost:4000';
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(API)) { console.error(`Refusing to run against ${API}: these scripts create accounts and are local only.`); process.exit(2); }
/** Password of the throwaway local filming accounts (not a secret; override with TRAILER_PASSWORD). */
export const PASS = process.env.TRAILER_PASSWORD || 'Trailer-password-2026';
// The database address comes from backend/.env (never hard-coded), and must be local.
const here = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.resolve(here, '../../../backend/.env');
const DB = (fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '').match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim();
/** Run one SQL statement on the local database (psql), returning trimmed text output. */
export function sql(q) {
  if (!DB || !/@(localhost|127\.0\.0\.1)[:/]/.test(DB)) { console.error('DATABASE_URL in backend/.env must point at a local database.'); process.exit(2); }
  return execFileSync('psql', [DB, '-qAt', '-c', q]).toString().trim();
}
export async function call(method, p, body, token) {
  const r = await fetch(API + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}
export async function login(email) { return (await call('POST', '/auth/login', { email, password: PASS })).data.accessToken; }
