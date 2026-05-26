import knex, { Knex } from 'knex';
import { env } from './env';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: env.DATABASE_URL,
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
