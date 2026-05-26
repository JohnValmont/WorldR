import { db } from '../config/database';
import { nationRepository } from '../repositories/nation.repository';
import { sectorRepository } from '../repositories/sector.repository';
import { populationRepository } from '../repositories/population.repository';
import { taxRepository } from '../repositories/tax.repository';
import { budgetRepository } from '../repositories/budget.repository';
import { lawRepository } from '../repositories/law.repository';
import { priceRepository } from '../repositories/price.repository';
import { userRepository } from '../repositories/user.repository';
import { NotFoundError, ValidationError, ConflictError } from '../utils/errors';
import { Nation } from '../types';

export class NationService {
  public async getNationState(nationId: string) {
    const nation = await nationRepository.findById(nationId);
    if (!nation) {
      throw new NotFoundError('Nation not found');
    }

    const [sectors, populationGroups, taxes, budgetItems, prices, laws] = await Promise.all([
      sectorRepository.findByNationId(nationId),
      populationRepository.findByNationId(nationId),
      taxRepository.findByNationId(nationId),
      budgetRepository.findByNationId(nationId),
      priceRepository.findByNationId(nationId),
      lawRepository.findByNationId(nationId)
    ]);

    return {
      nation,
      sectors,
      populationGroups,
      taxes,
      budgetItems,
      prices,
      laws
    };
  }

  public async updateFiscalPolicy(
    nationId: string,
    userId: string,
    updates: {
      taxes?: { name: any; rate: number }[];
      budgets?: { name: any; allocation: number }[];
    }
  ) {
    return db.transaction(async (trx) => {
      const nation = await nationRepository.findById(nationId, trx);
      if (!nation) {
        throw new NotFoundError('Nation not found');
      }

      // 1. Validate updates
      if (updates.taxes) {
        for (const taxUpdate of updates.taxes) {
          if (taxUpdate.rate < 0.0 || taxUpdate.rate > 1.0) {
            throw new ValidationError('Tax rate must be between 0.0 and 1.0');
          }
        }
      }

      if (updates.budgets) {
        for (const budgetUpdate of updates.budgets) {
          if (budgetUpdate.allocation < 0.0) {
            throw new ValidationError('Budget allocation cannot be negative');
          }
        }
      }

      // 2. Clear any existing proposed budget policies first
      const existing = await trx('laws')
        .where({ nation_id: nationId, title: 'Fiscal Policy Proposal', status: 'proposed' })
        .first();
      if (existing) {
        await trx('law_effects').where({ law_id: existing.id }).delete();
        await trx('laws').where({ id: existing.id }).delete();
      }

      // 3. Construct human-readable summary
      const taxSummaries: string[] = [];
      if (updates.taxes) {
        updates.taxes.forEach(t => taxSummaries.push(`${t.name} to ${(t.rate * 100).toFixed(1)}%`));
      }
      const budgetSummaries: string[] = [];
      if (updates.budgets) {
        updates.budgets.forEach(b => budgetSummaries.push(`${b.name} to $${(b.allocation / 1e6).toFixed(0)}M`));
      }

      let summary = 'Proposed adjustments: ';
      if (taxSummaries.length > 0) {
        summary += 'Taxes (' + taxSummaries.join(', ') + ') ';
      }
      if (budgetSummaries.length > 0) {
        summary += 'Allocations (' + budgetSummaries.join(', ') + ')';
      }

      const description = `${summary}\n\n[METADATA:${JSON.stringify({
        type: 'budget_policy',
        taxes: updates.taxes,
        budgets: updates.budgets
      })}]`;

      // 4. Create the new proposed law
      const newLaw = await lawRepository.create({
        nation_id: nationId,
        title: 'Fiscal Policy Proposal',
        description,
        status: 'proposed'
      }, trx);

      // 5. Create the law effects so they display beautifully on the frontend
      if (updates.taxes) {
        for (const taxUpdate of updates.taxes) {
          await lawRepository.createEffect({
            law_id: newLaw.id,
            target_type: 'tax',
            target_name: taxUpdate.name,
            parameter_name: 'rate',
            modifier_type: 'additive',
            modifier_value: taxUpdate.rate
          }, trx);
        }
      }

      if (updates.budgets) {
        for (const budgetUpdate of updates.budgets) {
          await lawRepository.createEffect({
            law_id: newLaw.id,
            target_type: 'budget_item',
            target_name: budgetUpdate.name,
            parameter_name: 'allocation',
            modifier_type: 'additive',
            modifier_value: budgetUpdate.allocation
          }, trx);
        }
      }

      // 6. Add audit log entry
      await trx('audit_logs').insert({
        nation_id: nationId,
        user_id: userId,
        action: 'PROPOSE_FISCAL_POLICY',
        target_type: 'law',
        target_id: newLaw.id,
        new_values: JSON.stringify({ taxes: updates.taxes, budgets: updates.budgets }),
        created_at: new Date()
      });

      return this.getNationState(nationId);
    });
  }

  public async spawnNationFromTemplate(
    userId: string,
    templateName: string,
    nationName: string,
    region?: string,
    continent?: string
  ): Promise<Nation> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.nation_id) {
      throw new ConflictError('User is already governing a nation state');
    }

    const existingNation = await nationRepository.findByName(nationName);
    if (existingNation) {
      throw new ConflictError(`Nation name ${nationName} is already taken`);
    }

    const template = await nationRepository.findTemplateByName(templateName);
    if (!template) {
      throw new NotFoundError(`Nation template ${templateName} not found`);
    }

    return db.transaction(async (trx) => {
      const nation = await nationRepository.create({
        id: db.raw('gen_random_uuid()') as any,
        name: nationName,
        region: region ?? null,
        continent: continent ?? null,
        treasury: Number(template.treasury),
        debt: Number(template.debt),
        gdp: Number(template.gdp),
        inflation_food: Number(template.inflation_food),
        inflation_fuel: Number(template.inflation_fuel),
        inflation_housing: Number(template.inflation_housing),
        inflation_cpi: Number(template.inflation_cpi),
        approval: Number(template.approval),
        stability: Number(template.stability),
        current_tick: 0
      }, trx);

      const parsedData = typeof template.template_data === 'string'
        ? JSON.parse(template.template_data)
        : template.template_data;

      const sectors = parsedData.sectors.map((s: any) => ({
        nation_id: nation.id,
        name: s.name,
        output: Number(s.output),
        workers: Number(s.workers),
        productivity: Number(s.productivity),
        wages: Number(s.wages),
        growth: Number(s.growth)
      }));
      await sectorRepository.createMany(sectors, trx);

      const population = parsedData.population_groups.map((p: any) => ({
        nation_id: nation.id,
        name: p.name,
        size: Number(p.size),
        income: Number(p.income),
        approval: Number(p.approval),
        ideology: p.ideology,
        inflation_sensitivity: Number(p.inflation_sensitivity),
        unemployment_sensitivity: Number(p.unemployment_sensitivity)
      }));
      await populationRepository.createMany(population, trx);

      const taxes = parsedData.taxes.map((t: any) => ({
        nation_id: nation.id,
        name: t.name,
        rate: Number(t.rate),
        revenue: Number(t.revenue)
      }));
      await taxRepository.createMany(taxes, trx);

      const budgets = parsedData.budgets.map((b: any) => ({
        nation_id: nation.id,
        name: b.name,
        allocation: Number(b.allocation)
      }));
      await budgetRepository.createMany(budgets, trx);

      const prices = parsedData.prices.map((p: any) => ({
        nation_id: nation.id,
        sector_name: p.sector_name,
        price_index: Number(p.price_index),
        base_price: Number(p.base_price),
        inflation_rate: Number(p.inflation_rate)
      }));
      await priceRepository.createMany(prices, trx);

      await userRepository.updateNationId(userId, nation.id, trx);

      await trx('audit_logs').insert({
        nation_id: nation.id,
        user_id: userId,
        action: 'SPAWN_NATION',
        target_type: 'nation',
        target_id: nation.id,
        new_values: JSON.stringify({ templateName, nationName }),
        created_at: new Date()
      });

      return nation;
    });
  }

  public async listNations() {
    return nationRepository.findAllSummary();
  }
}
export const nationService = new NationService();
