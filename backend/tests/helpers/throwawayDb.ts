/**
 * A brand-new, uniquely named LOCAL database for one test file.
 *
 * Tests that run whole business months (NPC scenarios) rewrite shared rows:
 * every NPC's cash, prices and stock, world_clock, region markets. They must
 * never touch a database anyone else uses. This helper:
 *
 *   1. refuses (skips) unless DATABASE_URL points at localhost / 127.0.0.1 / ::1;
 *   2. skips when no local Postgres answers, or it may not create databases;
 *   3. creates `worldr_test_<pid>_<random>` on that server, points
 *      process.env.DATABASE_URL at it and builds it with runMigrationsAndSeeds
 *      (the same migrations + seeds the server runs on boot);
 *   4. drops it afterwards, whether the test passed or failed.
 *
 * IMPORTANT: a test using this must NOT import src/config/database (or anything
 * that imports it, e.g. a controller) at the top of the file. That module opens
 * its connection pool from DATABASE_URL the moment it is imported, so it has to
 * be loaded (with require) only after the throwaway database exists. Each test
 * file runs in its own process under `node --test`, so this is safe.
 */
import path from 'path';
import { randomBytes } from 'crypto';
import dotenv from 'dotenv';
import { Client } from 'pg';
import type { TestContext } from 'node:test';
import type { Knex } from 'knex';

// Same .env the server reads (backend/.env). dotenv never overrides a variable
// that is already set, so CI's environment always wins.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const CONNECT_TIMEOUT_MS = 3000;

/** True only for a postgres URL whose host is this machine. */
export function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (u.protocol === 'postgres:' || u.protocol === 'postgresql:') && LOCAL_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function withDatabase(url: string, dbName: string): string {
  const u = new URL(url);
  u.pathname = `/${dbName}`;
  return u.toString();
}

/** Opens an admin connection to the server in `baseUrl` (its own db, else `postgres`). */
async function adminClient(baseUrl: string): Promise<Client | null> {
  for (const candidate of [baseUrl, withDatabase(baseUrl, 'postgres')]) {
    const client = new Client({ connectionString: candidate, connectionTimeoutMillis: CONNECT_TIMEOUT_MS, ssl: false });
    try {
      await client.connect();
      await client.query('select 1');
      return client;
    } catch {
      await client.end().catch(() => {});
    }
  }
  return null;
}

export interface ThrowawayDb {
  /** The knex instance from src/config/database, bound to the throwaway database. */
  db: Knex;
  /** Name of the throwaway database (for log lines). */
  name: string;
}

/**
 * Runs `body` against a freshly built throwaway database, or skips the test
 * (t.skip — reported as skipped, never as passed) when that is not possible.
 */
export async function withThrowawayDb(t: TestContext, body: (ctx: ThrowawayDb) => Promise<void>): Promise<void> {
  const baseUrl = process.env.DATABASE_URL;
  if (!isLocalDatabaseUrl(baseUrl)) {
    t.skip('needs DATABASE_URL on localhost (a throwaway database is created there)');
    return;
  }

  const admin = await adminClient(baseUrl!);
  if (!admin) {
    t.skip('cannot connect or log in to a local Postgres at DATABASE_URL');
    return;
  }

  const name = `worldr_test_${process.pid}_${randomBytes(4).toString('hex')}`;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } catch (err: any) {
    await admin.end().catch(() => {});
    t.skip(`local Postgres refused CREATE DATABASE (${err?.message ?? err})`);
    return;
  }
  await admin.end().catch(() => {});

  let db: Knex | undefined;
  try {
    process.env.DATABASE_URL = withDatabase(baseUrl!, name);
    // require (not import()): loaded only now, after DATABASE_URL points at the new db.
    const database: typeof import('../../src/config/database') = require('../../src/config/database');
    const conn = database.db;
    db = conn;
    await database.runMigrationsAndSeeds();
    await body({ db: conn, name });
  } finally {
    if (db) await db.destroy().catch(() => {});
    process.env.DATABASE_URL = baseUrl;
    const dropper = await adminClient(baseUrl!);
    if (dropper) {
      await dropper.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`).catch((e: any) => {
        console.error(`[throwawayDb] could not drop ${name}: ${e?.message ?? e}`);
      });
      await dropper.end().catch(() => {});
    } else {
      console.error(`[throwawayDb] could not reconnect to drop ${name}; drop it by hand`);
    }
  }
}
