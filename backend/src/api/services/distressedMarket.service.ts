import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';


export async function getDistressedCompanies() {
  const companies = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where('c.status', 'distressed')
    .select(
      'c.id', 'c.name', 'c.country_id', 'c.industry_id', 'c.subsector_id',
      'c.is_npc', 'c.is_exchange_listed',
      'f.available_cash', 'f.debt', 'f.company_value', 'f.last_arc_profit'
    );

  const result = [];
  for (const co of companies) {
    const debtRatio = Number(co.company_value) > 0
      ? (Number(co.debt) / Number(co.company_value))
      : null;
    const acquisitionPrice = Math.max(1, Math.round(Number(co.company_value) * 0.10));
    const lastPrice = await db('share_price_history')
      .where({ company_id: co.id })
      .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
      .select('close_price').first();
    const models = await db('manufacturing_vehicle_models')
      .where({ company_id: co.id, status: 'active' })
      .select('name', 'target_segment', 'sale_price');

    result.push({
      ...co,
      debt_ratio: debtRatio,
      acquisition_price: acquisitionPrice,
      last_share_price: lastPrice ? Number(lastPrice.close_price) : null,
      active_models: models,
    });
  }
  return result;
}

export async function acquireDistressedCompany({
  targetCompanyId,
  characterId,
  acquiringCompanyId,
}: {
  targetCompanyId: string;
  characterId: string;
  acquiringCompanyId?: string;
}) {
  return db.transaction(async (trx) => {
    const target = await trx('companies as c')
      .join('company_finances as f', 'f.company_id', 'c.id')
      .where({ 'c.id': targetCompanyId, 'c.status': 'distressed' })
      .select('c.*', 'f.company_value', 'f.debt', 'f.available_cash')
      .first();

    if (!target) throw new AppError('Company is not in distressed status or does not exist.', 404, 'NOT_FOUND');

    const acquisitionPrice = Math.max(1, Math.round(Number(target.company_value) * 0.10));

    const charFin = await trx('character_finances').where({ character_id: characterId }).first();
    if (!charFin || Number(charFin.cash_in_hand) < acquisitionPrice) {
      throw new AppError(`Insufficient funds. Acquisition fee is $${acquisitionPrice.toLocaleString()}.`, 400, 'INSUFFICIENT_FUNDS');
    }
    await trx('character_finances').where({ character_id: characterId }).decrement('cash_in_hand', acquisitionPrice);

    await trx('companies').where({ id: targetCompanyId }).update({
      owner_character_id: characterId,
      status: 'active',
      is_npc: false,
      npc_personality: null,
      updated_at: trx.fn.now(),
    });

    await trx('company_finances').where({ company_id: targetCompanyId }).update({
      debt: 0,
      available_cash: Math.max(0, Number(target.available_cash)),
      updated_at: trx.fn.now(),
    });

    logger.info(`[Acquisition] Character ${characterId} acquired distressed company ${target.name} for $${acquisitionPrice}`);

    return {
      success: true,
      company_id: targetCompanyId,
      company_name: target.name,
      acquisition_price: acquisitionPrice,
      debt_cleared: Number(target.debt),
    };
  });
}
