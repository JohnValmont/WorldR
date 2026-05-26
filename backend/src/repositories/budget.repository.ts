import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { BudgetItem } from '../types';

export class BudgetRepository extends BaseRepository {
  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<BudgetItem[]> {
    return this.getDb(trx)('budget_items').where({ nation_id: nationId }).orderBy('name');
  }

  public async update(id: string, budgetData: Partial<Omit<BudgetItem, 'id' | 'nation_id' | 'created_at' | 'updated_at'>>, trx?: Knex.Transaction): Promise<BudgetItem> {
    const [updated] = await this.getDb(trx)('budget_items')
      .where({ id })
      .update({ ...budgetData, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async createMany(budgets: Omit<BudgetItem, 'id' | 'created_at' | 'updated_at'>[], trx?: Knex.Transaction): Promise<BudgetItem[]> {
    return this.getDb(trx)('budget_items').insert(budgets).returning('*');
  }
}
export const budgetRepository = new BudgetRepository();
