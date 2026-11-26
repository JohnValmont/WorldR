/**
 * A throwaway database for tests that run whole business months.
 *
 * Why: processing a month (ManufacturingController.processCountryMonth) writes
 * to EVERY company in the nation — NPC cash, stock, prices, sales results,
 * reports, brand awareness. A test can't "delete only the rows it created"
 * when the code under test changes rows it didn't create, and two such test
 * files run in parallel (node --test) used to crash each other: each one's
 * month picked up the other's player company and already-processed months.
 *
 * So each test gets its own database on the LOCAL server: created empty,
 * built by the real runMigrationsAndSeeds, and dropped afterwards. Nothing in
 * the developer's own database is read or changed.
 *
 * SAFETY: runs only when DATABASE_URL points at localhost/127.0.0.1 and that
 * server is reachable; otherwise the test is skipped with the reason. The
 * database user needs CREATEDB (a local superuser has it).
 *
 * Load the app's database module ONLY through this helper (no static import of
 * src/config/database or anything that imports it in the test file): the
 * module connects to DATABASE_URL when first imported, so it must be imported
 * after DATABASE_URL points at the scratch database. One scratch database per
 * test file (the module is a singleton per process).
 */
import path from 'path';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import { Client } from 'pg';
import type { TestContext } from 'node:test';
import type { Knex } from 'knex';

// Same .env the server reads (backend/.env); never overrides a variable already set.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const LOCAL_DB_PATTERN = /@(localhost|127\.0\.0\.1)(:\d+)?\//;

/** Set NPC_TEST_VERBOSE=1 to see the month pipeline's own console.log output. */
const VERBOSE = process.env.NPC_TEST_VERBOSE === '1';

let used = false;

/** Runs `fn` with console.log silenced (unless NPC_TEST_VERBOSE=1). */
export async function quietly<T>(fn: () => Promise<T>): Promise<T> {
  if (VERBOSE) return fn();
  const log = console.log;
  console.log = () => {};
  try { return await fn(); } finally { console.log = log; }
}

/**
 * Creates a scratch database, migrates and seeds it, runs `body` against it,
 * then drops it — whether `body` passed, failed or threw.
 * Calls t.skip(reason) and returns without running `body` when no local
 * database is available.
 */
export async function withScratchDatabase(
  t: TestContext,
  label: string,
  body: (db: Knex) => Promise<void>,
): Promise<void> {
  if (used) throw new Error('withScratchDatabase: one scratch database per test file');
  used = true;

  const baseUrl = process.env.DATABASE_URL || '';
  if (!LOCAL_DB_PATTERN.test(baseUrl)) {
    t.skip('needs a local test database (DATABASE_URL on localhost)');
    return;
  }

  const admin = new Client({ connectionString: baseUrl, connectionTimeoutMillis: 5000 });
  try {
    await admin.connect();
  } catch (err: any) {
    t.skip(`cannot connect to the local test database (${err?.code || err?.message || err})`);
    return;
  }

  const name = `worldr_test_${label.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}_${randomUUID().slice(0, 8)}`;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
  } catch (err: any) {
    await admin.end();
    t.skip(`the local database user cannot create a scratch database (${err?.message || err})`);
    return;
  }

  const scratchUrl = new URL(baseUrl);
  scratchUrl.pathname = `/${name}`;
  process.env.DATABASE_URL = scratchUrl.toString();

  let db: Knex | undefined;
  try {
    const database = await import('../../src/config/database');
    const scratchDb = database.db;
    db = scratchDb;

    // Seeds log their failures and carry on (so a live server still boots).
    // A test must not run on a half-seeded world: collect those and fail.
    const seedErrors: string[] = [];
    const error = console.error;
    console.error = (...args: any[]) => { seedErrors.push(args.map(String).join(' ')); error(...args); };
    try {
      await quietly(() => database.runMigrationsAndSeeds());
    } finally {
      console.error = error;
    }
    if (seedErrors.length) throw new Error(`building the scratch database failed:\n${seedErrors.join('\n')}`);

    await body(scratchDb);
  } finally {
    if (db) await db.destroy();
    process.env.DATABASE_URL = baseUrl;
    try {
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  }
}
