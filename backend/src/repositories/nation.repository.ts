import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Nation, NationTemplate } from '../types';

export class NationRepository extends BaseRepository {
  public async findById(id: string, trx?: Knex.Transaction): Promise<Nation | null> {
    const nation = await this.getDb(trx)('nations').where({ id }).first();
    return nation || null;
  }

  public async findByIdForUpdate(id: string, trx: Knex.Transaction): Promise<Nation | null> {
    const nation = await this.getDb(trx)('nations').where({ id }).forUpdate().first();
    return nation || null;
  }

  public async findByName(name: string, trx?: Knex.Transaction): Promise<Nation | null> {
    const nation = await this.getDb(trx)('nations').where({ name }).first();
    return nation || null;
  }

  public async create(nation: Omit<Nation, 'created_at' | 'updated_at'>, trx?: Knex.Transaction): Promise<Nation> {
    const [created] = await this.getDb(trx)('nations').insert(nation).returning('*');
    return created;
  }

  public async update(id: string, nationData: Partial<Omit<Nation, 'id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<Nation> {
    const [updated] = await this.getDb(trx)('nations')
      .where({ id })
      .update({ ...nationData, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async findAll(trx?: Knex.Transaction): Promise<Nation[]> {
    return this.getDb(trx)('nations').select('*');
  }

  public async findAllSummary(trx?: Knex.Transaction): Promise<Pick<Nation, 'id' | 'name' | 'region' | 'continent' | 'gdp' | 'approval' | 'stability' | 'current_tick'>[]> {
    return this.getDb(trx)('nations').select(
      'id', 'name', 'region', 'continent', 'gdp', 'approval', 'stability', 'current_tick'
    );
  }

  public async findTemplateByName(name: string, trx?: Knex.Transaction): Promise<NationTemplate | null> {
    const template = await this.getDb(trx)('nation_templates').where({ name }).first();
    return template || null;
  }
}
export const nationRepository = new NationRepository();

