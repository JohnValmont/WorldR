import knex, { Knex } from 'knex';
import fs from 'fs';
import path from 'path';
import { env } from './env';
import { logger } from '../utils/logger';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    connectionString: env.DATABASE_URL,
    ssl: (env.NODE_ENV === 'production' || (!env.DATABASE_URL.includes('localhost') && !env.DATABASE_URL.includes('127.0.0.1')))
      ? { rejectUnauthorized: false }
      : false,
  },
  pool: {
    min: 2,
    max: 10,
    createTimeoutMillis: 30000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
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
  const seedsDir = path.join(dbDir, 'seeds');

  logger.info(`Database directory resolved to: ${dbDir}`);

  // Create schema_migrations table if not exists
  await db.raw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Create reset_token columns in users table if not exists
  try {
    await db.raw(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP WITH TIME ZONE;
    `);
  } catch (err) {
    logger.warn('Failed to alter users table for reset_token columns:', err);
  }

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

  // Seed the database if no nations exist
  try {
    const nationCountRow = await db('nations').count('id as count').first();
    const nationCount = nationCountRow ? parseInt(nationCountRow.count as string, 10) : 0;

    if (nationCount === 0) {
      logger.info('No nations found in database. Starting database seeding...');
      if (fs.existsSync(seedsDir)) {
        const seedFiles = fs.readdirSync(seedsDir)
          .filter(file => file.endsWith('.sql'))
          .sort();

        for (const file of seedFiles) {
          // Skip first_nation_seed.sql to avoid conflicting with Valdoria/Keldoria seeds
          if (file === 'first_nation_seed.sql') {
            logger.info(`Skipping first_nation_seed.sql to avoid conflicting with Valdoria/Keldoria seeds.`);
            continue;
          }
          logger.info(`Running seed: ${file}`);
          const filePath = path.join(seedsDir, file);
          const sql = fs.readFileSync(filePath, 'utf8');

          try {
            await db.raw(sql);
            logger.info(`Successfully run seed: ${file}`);
          } catch (err) {
            logger.error(`Failed to run seed ${file}:`, err);
            throw err;
          }
        }
      } else {
        logger.warn(`Seeds directory not found at ${seedsDir}`);
      }
    } else {
      logger.info(`Database already seeded with ${nationCount} nations.`);
    }
  } catch (err) {
    logger.error('Failed to run database seeds:', err);
    throw err;
  }
}

