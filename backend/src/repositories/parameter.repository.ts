import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Parameter, NationParameterOverride } from '../types';

export class ParameterRepository extends BaseRepository {
  public async findAll(trx?: Knex.Transaction): Promise<Parameter[]> {
    return this.getDb(trx)('parameters').orderBy(['category', 'name']);
  }

  public async findByCategoryAndName(category: string, name: string, trx?: Knex.Transaction): Promise<Parameter | null> {
    const param = await this.getDb(trx)('parameters').where({ category, name }).first();
    return param || null;
  }

  public async findOverridesByNationId(nationId: string, trx?: Knex.Transaction): Promise<NationParameterOverride[]> {
    return this.getDb(trx)('nation_parameter_overrides').where({ nation_id: nationId });
  }

  public async upsertOverride(
    nationId: string,
    category: string,
    name: string,
    value: number,
    trx?: Knex.Transaction
  ): Promise<NationParameterOverride> {
    const dbInstance = this.getDb(trx);
    const existing = await dbInstance('nation_parameter_overrides')
      .where({ nation_id: nationId, category, name })
      .first();

    if (existing) {
      const [updated] = await dbInstance('nation_parameter_overrides')
        .where({ id: existing.id })
        .update({ value, updated_at: new Date() })
        .returning('*');
      return updated;
    } else {
      const [created] = await dbInstance('nation_parameter_overrides')
        .insert({
          nation_id: nationId,
          category,
          name,
          value,
        })
        .returning('*');
      return created;
    }
  }

  public async upsertGlobal(
    category: string,
    name: string,
    value: number,
    description?: string,
    trx?: Knex.Transaction
  ): Promise<Parameter> {
    const dbInstance = this.getDb(trx);
    const existing = await this.findByCategoryAndName(category, name, trx);
    if (existing) {
      const [updated] = await dbInstance('parameters')
        .where({ id: existing.id })
        .update({ value, description: description || existing.description, updated_at: new Date() })
        .returning('*');
      return updated;
    } else {
      const [created] = await dbInstance('parameters')
        .insert({ category, name, value, description })
        .returning('*');
      return created;
    }
  }
}
export const parameterRepository = new ParameterRepository();
