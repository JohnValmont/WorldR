import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Law, LawEffect, ActiveModifier } from '../types';

export class LawRepository extends BaseRepository {
  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<Law[]> {
    return this.getDb(trx)('laws').where({ nation_id: nationId }).orderBy('created_at', 'desc');
  }

  public async findById(id: string, trx?: Knex.Transaction): Promise<Law | null> {
    const law = await this.getDb(trx)('laws').where({ id }).first();
    return law || null;
  }

  public async create(law: Omit<Law, 'id' | 'created_at' | 'updated_at'>, trx?: Knex.Transaction): Promise<Law> {
    const [created] = await this.getDb(trx)('laws').insert(law).returning('*');
    return created;
  }

  public async updateStatus(id: string, status: 'passed' | 'proposed' | 'repealed', trx?: Knex.Transaction): Promise<Law> {
    const [updated] = await this.getDb(trx)('laws')
      .where({ id })
      .update({ status, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async findEffectsByLawId(lawId: string, trx?: Knex.Transaction): Promise<LawEffect[]> {
    return this.getDb(trx)('law_effects').where({ law_id: lawId });
  }

  public async createEffect(effect: Omit<LawEffect, 'id' | 'created_at' | 'updated_at'>, trx?: Knex.Transaction): Promise<LawEffect> {
    const [created] = await this.getDb(trx)('law_effects').insert(effect).returning('*');
    return created;
  }

  public async findActiveEffectsByNationId(nationId: string, trx?: Knex.Transaction): Promise<ActiveModifier[]> {
    const rows = await this.getDb(trx)('law_effects')
      .join('laws', 'law_effects.law_id', 'laws.id')
      .where('laws.nation_id', nationId)
      .where('laws.status', 'passed')
      .select([
        'law_effects.target_type as targetType',
        'law_effects.target_name as targetName',
        'law_effects.parameter_name as parameterName',
        'law_effects.modifier_type as modifierType',
        'law_effects.modifier_value as modifierValue'
      ]);
    return rows.map((r: any) => ({
      targetType: r.targettype || r.targetType,
      targetName: r.targetname || r.targetName,
      parameterName: r.parametername || r.parameterName,
      modifierType: r.modifiertype || r.modifierType,
      modifierValue: Number(r.modifiervalue || r.modifierValue)
    }));
  }
}
export const lawRepository = new LawRepository();
