import knex, { Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import { parse } from 'pg-connection-string';
import { env } from './env';
import { logger } from '../utils/logger';

const pgConfig = parse(env.DATABASE_URL) as any;
const isProductionOrRemote = env.NODE_ENV === 'production' ||
  (!env.DATABASE_URL.includes('localhost') && !env.DATABASE_URL.includes('127.0.0.1'));

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: pgConfig.host || undefined,
    port: pgConfig.port ? parseInt(pgConfig.port, 10) : undefined,
    database: pgConfig.database || undefined,
    user: pgConfig.user || undefined,
    password: pgConfig.password || undefined,
    ssl: isProductionOrRemote
      ? { rejectUnauthorized: false }
      : false,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    options: pgConfig.options || undefined,
    sslmode: pgConfig.sslmode || undefined,
    application_name: pgConfig.application_name || undefined,
    fallback_application_name: pgConfig.fallback_application_name || undefined,
  } as any,
  pool: {
    min: 2,
    max: 10,
    createTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    // afterCreate: fires once when a brand-new physical connection is opened.
    // We issue a ROLLBACK here as a first-use sanity check.
    afterCreate: (conn: any, done: (err: Error | null, conn: any) => void) => {
      conn.query('ROLLBACK', (err: Error | null) => {
        if (err) {
          logger.warn('[db-pool] afterCreate ROLLBACK warning (benign):', err.message);
        }
        done(null, conn);
      });
    },
    // validate: fires EVERY TIME a connection is checked out from the idle pool.
    // This is the critical guard — afterCreate misses connections that were
    // returned to the pool while already stuck in an aborted transaction.
    // pg_transaction_status() returns:
    //   0 = IDLE    (safe to use)
    //   1 = ACTIVE  (query in flight — should not happen on idle connections)
    //   2 = INTRANS (inside a transaction — potentially dangerous)
    //   4 = INERROR (aborted transaction — POISONED, must be destroyed)
    validate: (conn: any) => {
      // txStatus is a synchronous property on libpq-backed connections (node-postgres)
      const status: number = conn.txStatus ?? conn._client?.txStatus ?? -1;
      if (status === 4 /* INERROR */) {
        logger.warn('[db-pool] validate: destroying poisoned connection (INERROR/aborted transaction)');
        return false; // pool will destroy and create a fresh replacement
      }
      return true;
    },
  },
  acquireConnectionTimeout: 60000,
};

export const db = knex(knexConfig);

export async function checkDatabaseConnection(): Promise<void> {
  try {
    await db.raw('SELECT 1');
  } catch (error) {
    console.error('❌ Database connection failure:');
    throw error;
  }
}

function findDatabaseDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '../database'),
    path.resolve(process.cwd(), 'database'),
    path.resolve(__dirname, '../../database'),
    path.resolve(__dirname, '../../../database'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
      return c;
    }
  }
  throw new Error('Could not find database directory in any candidate paths.');
}

export async function runMigrationsAndSeeds(): Promise<void> {
  let dbDir: string;
  try {
    dbDir = findDatabaseDir();
  } catch (err) {
    logger.error('Failed to locate database directory. Migration run aborted.', err);
    throw err;
  }

  const migrationsDir = path.join(dbDir, 'migrations');

  logger.info(`Database directory resolved to: ${dbDir}`);

  // Create schema_migrations table if not exists
  await db.raw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  if (!fs.existsSync(migrationsDir)) {
    logger.warn(`Migrations directory not found at ${migrationsDir}`);
    return;
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  // Get applied migrations
  const appliedRows = await db('schema_migrations').select('name');
  const appliedSet = new Set(appliedRows.map((r: any) => r.name));

  // Run migrations
  for (const file of migrationFiles) {
    if (!appliedSet.has(file)) {
      logger.info(`Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await db.raw(sql);
        await db('schema_migrations').insert({ name: file });
        logger.info(`Successfully applied migration: ${file}`);
      } catch (err) {
        logger.error(`Failed to apply migration ${file}:`, err);
        throw err;
      }
    }
  }

  // Run seeds
  const seedsDir = path.join(dbDir, 'seeds');
  if (fs.existsSync(seedsDir)) {
    logger.info(`Running seeds from ${seedsDir}`);
    const seedFiles = fs.readdirSync(seedsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of seedFiles) {
      logger.info(`Applying seed: ${file}`);
      const filePath = path.join(seedsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await db.raw(sql);
        logger.info(`Successfully applied seed: ${file}`);
      } catch (err) {
        logger.error(`Failed to apply seed ${file}:`, err);
        throw err;
      }
    }
  }
}
