import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { EconomicSector } from '../types';

export class SectorRepository extends BaseRepository {
  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<EconomicSector[]> {
    return this.getDb(trx)('economic_sectors').where({ nation_id: nationId }).orderBy('name');
  }

  public async update(id: string, sectorData: Partial<Omit<EconomicSector, 'id' | 'nation_id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<EconomicSector> {
    const [updated] = await this.getDb(trx)('economic_sectors')
      .where({ id })
      .update({ ...sectorData, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async createMany(sectors: Omit<EconomicSector, 'id' | 'created_at' | 'updated_at'>[], trx?: Knex.Transaction): Promise<EconomicSector[]> {
    return this.getDb(trx)('economic_sectors').insert(sectors).returning('*');
  }
}
export const sectorRepository = new SectorRepository();
