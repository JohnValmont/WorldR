/**
 * A fresh, private database for a scenario test.
 *
 * The scenario tests run whole business months, which rewrite NPC companies,
 * prices, stock and the world clock. They must never do that in a shared
 * database (AGENTS.md: tests delete only the rows they created). So each one
 * builds its own database on the LOCAL Postgres server named by DATABASE_URL,
 * runs every migration and seed in it (exactly what the server does on boot),
 * and drops it afterwards.
 *
 * Skips (never passes silently) when DATABASE_URL is not on this machine or
 * no local Postgres answers. Usage:
 *
 *   const tmp = await openThrowawayDb('npc_stability');
 *   if ('skip' in tmp) { t.skip(tmp.skip); return; }
 *   process.env.DATABASE_URL = tmp.url;      // BEFORE importing src/config/*
 *   const { db, runMigrationsAndSeeds } = await import('../src/config/database');
 *   try { await runMigrationsAndSeeds(); ... } finally { await db.destroy(); await tmp.drop(); }
 */
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

// Same .env the server reads; never overrides a DATABASE_URL already set.
dotenv.config({ path: path.join(__dirname, '../../.env') });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export interface ThrowawayDb {
  /** Connection string of the new database. */
  url: string;
  name: string;
  /** Drops the database (closes any connection still open to it). */
  drop(): Promise<void>;
}

function withDatabase(url: URL, database: string): string {
  const u = new URL(url.toString());
  u.pathname = '/' + database;
  return u.toString();
}

async function adminQuery(adminUrl: string, sql: string): Promise<void> {
  const client = new Client({ connectionString: adminUrl, connectionTimeoutMillis: 3000 });
  await client.connect();
  try { await client.query(sql); } finally { await client.end(); }
}

export async function openThrowawayDb(label: string): Promise<ThrowawayDb | { skip: string }> {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { skip: 'needs DATABASE_URL pointing at a local Postgres server' };

  let base: URL;
  try { base = new URL(raw); } catch { return { skip: 'DATABASE_URL is not a valid URL' }; }
  if (!LOCAL_HOSTS.has(base.hostname)) {
    return { skip: 'DATABASE_URL is not on localhost; scenario tests only build databases on a local server' };
  }

  // Connect to the server's maintenance database to create/drop ours.
  const adminUrl = withDatabase(base, 'postgres');
  const name = `worldr_test_${label.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}_${Date.now()}_${process.pid}`;
  try {
    await adminQuery(adminUrl, `CREATE DATABASE "${name}"`);
  } catch (err: any) {
    // ECONNREFUSED = no server; 28P01 = wrong password; 42501 = no CREATEDB right.
    return { skip: `could not create a test database on the local Postgres (${err?.code || err?.message || err})` };
  }

  return {
    url: withDatabase(base, name),
    name,
    async drop() {
      try {
        await adminQuery(adminUrl, `DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } catch {
        // Postgres before 13 has no WITH (FORCE).
        await adminQuery(adminUrl, `DROP DATABASE IF EXISTS "${name}"`);
      }
    },
  };
}
