/**
 * Book value of a company and loan balances of a character: ONE definition,
 * used by the business month (company_value), every buy/sell of land and
 * buildings, and every net-worth calculation (Money page, rich list, history).
 *
 *   book value = cash − company debt − bank loans still owed
 *              + cars in stock at cost + land + factories + production lines
 *
 * Before this, net worth used `cash − debt + stock` and ignored bank loans, so
 * borrowing $20M raised a player's net worth by $20M; and buying a factory
 * added its price to company_value on top of the cash already counted.
 *
 * Everything here is SQL built only from constants (no user input).
 */
import {
  FACTORY_BUILD_COST, DEFAULT_FACTORY_TYPE, DEFAULT_EXPANSION_COST, PRODUCTION_LINE_BUILD_COST,
  OWED_COMPANY_LOAN_STATUSES, OWED_PERSONAL_LOAN_STATUSES,
} from '../constants/companyAssets';

const list = (xs: string[]) => xs.map(x => `'${x.replace(/'/g, "''")}'`).join(', ');

const factoryCostCase = (typeCol: string) =>
  `CASE ${typeCol} ${Object.entries(FACTORY_BUILD_COST).map(([k, v]) => `WHEN '${k}' THEN ${v}`).join(' ')} ELSE ${FACTORY_BUILD_COST[DEFAULT_FACTORY_TYPE]} END`;

const stateMult = (stateCol: string) =>
  `COALESCE((SELECT rm.economic_multiplier FROM manufacturing_region_markets rm WHERE rm.state_id = ${stateCol} LIMIT 1), 1)`;

/** Bank loans a company still owes. `id` is a SQL expression for the company id. */
export function companyLoansOwedSql(id: string): string {
  return `COALESCE((SELECT SUM(bl.remaining_principal) FROM banking_active_loans bl
     WHERE bl.borrower_type = 'company' AND bl.borrower_id = (${id})::text
       AND bl.status IN (${list(OWED_COMPANY_LOAN_STATUSES)})), 0)`;
}

/** Land, factories and lines at what they cost to build. */
export function companyFixedAssetsSql(id: string): string {
  return `(
    COALESCE((SELECT SUM(lp.purchase_price) FROM manufacturing_land_plots lp WHERE lp.company_id = ${id}), 0)
  + COALESCE((SELECT SUM(${factoryCostCase('f.factory_type_id')} * ${stateMult('f.state_id')}
        + CASE WHEN f.expansion_status IN ('expanded', 'construction_underway')
               THEN COALESCE(NULLIF(f.expansion_cost, 0), ${DEFAULT_EXPANSION_COST}) ELSE 0 END)
      FROM manufacturing_factories f WHERE f.company_id = ${id} AND f.status = 'active'
        AND COALESCE(f.ownership_type, 'owned') <> 'leased'), 0)
  + COALESCE((SELECT SUM(${PRODUCTION_LINE_BUILD_COST} * ${stateMult('pf.state_id')})
      FROM manufacturing_production_lines pl JOIN manufacturing_factories pf ON pf.id = pl.factory_id
      WHERE pl.company_id = ${id} AND pf.status = 'active' AND COALESCE(pf.ownership_type, 'owned') <> 'leased'), 0)
  )`;
}

/** Cars in stock, at what they cost to build. */
export function companyInventorySql(id: string): string {
  return `COALESCE((SELECT SUM(mi.units_in_stock * mv.manufacturing_cost_per_unit)
     FROM manufacturing_inventory mi JOIN manufacturing_vehicle_models mv ON mv.id = mi.vehicle_model_id
     WHERE mi.company_id = ${id}), 0)`;
}

/**
 * Shares the company itself holds (a Capital Partners firm's portfolio), at the
 * latest monthly close, else what was paid; plus cash locked in its open buy orders.
 */
export function companyHoldingsSql(id: string): string {
  return `(
    COALESCE((SELECT SUM(hs.shares * COALESCE((
        SELECT h.close_price FROM share_price_history h WHERE h.company_id = hs.company_id
        ORDER BY h.game_year DESC, h.game_month DESC LIMIT 1), hs.avg_cost_basis, 0))
      FROM company_shares hs WHERE hs.holder_company_id = ${id} AND hs.shares > 0), 0)
  + COALESCE((SELECT SUM(so.escrow_amount) FROM share_orders so
      WHERE so.purchaser_company_id = ${id} AND so.status = 'open' AND so.side = 'buy'), 0)
  )`;
}

/** The book value of a company (never below zero). */
export function companyBookValueSql(id: string): string {
  return `GREATEST(0,
    COALESCE((SELECT bv.available_cash - COALESCE(bv.debt, 0) FROM company_finances bv WHERE bv.company_id = ${id}), 0)
    - ${companyLoansOwedSql(id)}
    + ${companyInventorySql(id)}
    + ${companyFixedAssetsSql(id)}
    + ${companyHoldingsSql(id)}
  )`;
}

/**
 * What a character owes (bank personal loans, money borrowed from players)
 * minus what other players owe them. Subtract this from cash + equity.
 */
export function characterNetDebtSql(id: string): string {
  const p2pOutstanding = `p.principal * p.months_remaining / NULLIF(p.term_months, 0)`;
  return `(
    COALESCE((SELECT SUM(d.remaining_principal) FROM character_debt_facilities d
       WHERE d.character_id = ${id} AND d.status IN (${list(OWED_PERSONAL_LOAN_STATUSES)})), 0)
  + COALESCE((SELECT SUM(${p2pOutstanding}) FROM p2p_loans p
       WHERE p.borrower_character_id = ${id} AND p.status IN ('active', 'defaulted')), 0)
  - COALESCE((SELECT SUM(${p2pOutstanding}) FROM p2p_loans p
       WHERE p.lender_character_id = ${id} AND p.status = 'active'), 0)
  )`;
}

/** Recompute and store company_value. Call after anything that changes assets or debt. */
export async function refreshCompanyValue(trx: any, companyId: string | number): Promise<number> {
  const row = await trx.raw(
    `UPDATE company_finances SET company_value = ROUND(${companyBookValueSql('company_finances.company_id')}), updated_at = now()
     WHERE company_id = ? RETURNING company_value`,
    [companyId],
  );
  return Number(row.rows?.[0]?.company_value ?? 0);
}

/** Net debt of one character (see characterNetDebtSql). */
export async function characterNetDebt(conn: any, characterId: string | number): Promise<number> {
  const r = await conn.raw(`SELECT ${characterNetDebtSql('c.id')} AS v FROM characters c WHERE c.id = ?`, [characterId]);
  return Number(r.rows?.[0]?.v ?? 0);
}
