import { Knex } from 'knex';
import { db } from '../config/database';

export class BaseRepository {
  protected getDb(trx?: Knex.Transaction): Knex | Knex.Transaction {
    return trx || db;
  }
}
