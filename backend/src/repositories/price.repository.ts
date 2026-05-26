import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Price } from '../types';

export class PriceRepository extends BaseRepository {
  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<Price[]> {
    return this.getDb(trx)('prices').where({ nation_id: nationId }).orderBy('sector_name');
  }

  public async update(id: string, priceData: Partial<Omit<Price, 'id' | 'nation_id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<Price> {
    const [updated] = await this.getDb(trx)('prices')
      .where({ id })
      .update({ ...priceData, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async createMany(prices: Omit<Price, 'id' | 'created_at' | 'updated_at'>[], trx?: Knex.Transaction): Promise<Price[]> {
    return this.getDb(trx)('prices').insert(prices).returning('*');
  }
}
export const priceRepository = new PriceRepository();
