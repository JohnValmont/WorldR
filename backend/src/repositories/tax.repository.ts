import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Tax } from '../types';

export class TaxRepository extends BaseRepository {
  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<Tax[]> {
    return this.getDb(trx)('taxes').where({ nation_id: nationId }).orderBy('name');
  }

  public async update(id: string, taxData: Partial<Omit<Tax, 'id' | 'nation_id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<Tax> {
    const [updated] = await this.getDb(trx)('taxes')
      .where({ id })
      .update({ ...taxData, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async createMany(taxes: Omit<Tax, 'id' | 'created_at' | 'updated_at'>[], trx?: Knex.Transaction): Promise<Tax[]> {
    return this.getDb(trx)('taxes').insert(taxes).returning('*');
  }
}
export const taxRepository = new TaxRepository();
