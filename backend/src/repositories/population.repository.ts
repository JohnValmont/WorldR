import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { PopulationGroup } from '../types';

export class PopulationRepository extends BaseRepository {
  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<PopulationGroup[]> {
    return this.getDb(trx)('population_groups').where({ nation_id: nationId }).orderBy('name');
  }

  public async update(id: string, popData: Partial<Omit<PopulationGroup, 'id' | 'nation_id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<PopulationGroup> {
    const [updated] = await this.getDb(trx)('population_groups')
      .where({ id })
      .update({ ...popData, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async createMany(pops: Omit<PopulationGroup, 'id' | 'created_at' | 'updated_at'>[], trx?: Knex.Transaction): Promise<PopulationGroup[]> {
    return this.getDb(trx)('population_groups').insert(pops).returning('*');
  }
}
export const populationRepository = new PopulationRepository();
