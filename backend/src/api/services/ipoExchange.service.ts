import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { placeOrder, getLastClose, TOTAL_SHARES } from './shareMarket.service';
import { recalcPortfolioValues } from './capitalPartners.service';

/**
 * IPO & DRX Bourse engine.
 *
 * Founder actions (file / withdraw IPO, read status) run in their own request
 * transactions. The month-tick pipeline (processExchangeMonth) runs INSIDE the
 * world-tick transaction so it shares locks and atomicity with the rest of the
 * economy month. All NPC order placement therefore passes `existingTrx`.
 */

// ── Tunables ────────────────────────────────────────────────────────────────
const IPO_FILING_FEE = 5000;            // $5,000, non-refundable, paid from company cash
const MIN_COMPANY_VALUE = 250_000;      // $250k minimum to file
const MIN_COMPANY_AGE_MONTHS = 3;       // must exist ≥ 3 game months
const MAX_DEBT_RATIO = 0.80;            // debt / company_value must be below this
const REVIEW_MONTHS = 2;                // regulatory review window
const BOOKBUILD_MONTHS = 3;             // roadshow window
const MM_SPREAD_PCT = 0.025;            // 2.5% market-maker spread
const MM_ORDER_SIZE = 5000;             // shares per market-maker quote
const IPO_POP = 1.15;                   // opening ask = clearing × 1.15
const IMPULSE_COEFF = 0.40;             // earnings surprise → price impulse coefficient
const IMPULSE_CLAMP = 0.30;             // ±30% of last close per month
const DRX_BASE_VALUE = 1000;            // index anchors here at first listing

// ── Month arithmetic (12 months = 1 game year) ──────────────────────────────
function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const t = year * 12 + (month - 1) + delta;
  return { year: Math.floor(t / 12), month: (t % 12) + 1 };
}
function reached(endYear: number, endMonth: number, curYear: number, curMonth: number): boolean {
  return endYear < curYear || (endYear === curYear && endMonth <= curMonth);
}
function monthsBetween(y1: number, m1: number, y2: number, m2: number): number {
  return (y2 * 12 + (m2 - 1)) - (y1 * 12 + (m1 - 1));
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

async function getSystemCharacterId(trx: any): Promise<string | null> {
  const user = await trx('users').where({ email: 'system_npc@worldr.game' }).first();
  if (!user) return null;
  const char = await trx('characters').where({ user_id: user.id }).orderBy('created_at', 'asc').first();
  return char?.id ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
// FOUNDER ACTIONS
// ════════════════════════════════════════════════════════════════════════════

async function loadFounderCompany(trx: any, companyId: string, characterId: string) {
  const company = await trx('companies').where({ id: companyId, owner_character_id: characterId }).first();
  if (!company) throw new AppError('Company not found or you are not the founder', 404, 'NOT_FOUND');
  const finances = await trx('company_finances').where({ company_id: companyId }).first();
  return { company, finances };
}

export async function getEligibility(companyId: string, characterId: string) {
  const { company, finances } = await loadFounderCompany(db, companyId, characterId);
  const clock = await db('world_clock').first();
  const curYear = clock?.current_year ?? 1;
  const curMonth = clock?.current_month ?? 1;

  const companyValue = Number(finances?.company_value ?? 0);
  const debt = Number(finances?.debt ?? 0);
  const ageMonths = monthsBetween(company.created_at_world_year, company.created_at_world_month, curYear, curMonth);
  const debtRatio = companyValue > 0 ? debt / companyValue : 1;

  const activeIpo = await db('ipo_listings')
    .where({ company_id: companyId })
    .whereIn('status', ['pending_review', 'book_building'])
    .first();

  const checks = [
    { key: 'structure', label: 'Registered as a Public Corporation', pass: company.legal_structure_id === 'public-corporation' },
    { key: 'value', label: `Company value ≥ $${MIN_COMPANY_VALUE.toLocaleString()}`, pass: companyValue >= MIN_COMPANY_VALUE, detail: `$${Math.round(companyValue).toLocaleString()}` },
    { key: 'age', label: `Trading ≥ ${MIN_COMPANY_AGE_MONTHS} months`, pass: ageMonths >= MIN_COMPANY_AGE_MONTHS, detail: `${ageMonths} mo` },
    { key: 'debt', label: `Debt ratio < ${Math.round(MAX_DEBT_RATIO * 100)}%`, pass: debtRatio < MAX_DEBT_RATIO, detail: `${Math.round(debtRatio * 100)}%` },
    { key: 'no_active', label: 'No IPO already in progress', pass: !activeIpo },
  ];

  const sumRow = await db('company_shares').where({ company_id: companyId }).sum('shares as total').first();
  const actualShares = Number(sumRow?.total ?? TOTAL_SHARES) || TOTAL_SHARES;

  return {
    eligible: checks.every((c) => c.pass),
    checks,
    company_value: companyValue,
    filing_fee: IPO_FILING_FEE,
    min_price_floor: (companyValue / actualShares) * 0.5,
    available_cash: Number(finances?.available_cash ?? 0),
    active_ipo: activeIpo ?? null,
  };
}

export async function fileIpo(params: {
  companyId: string;
  characterId: string;
  priceMin: number;
  priceMax: number;
  floatPercent: number;   // 0.10 – 0.49
  useOfProceeds: string;
  lockupMonths: number;   // 3 – 12
}) {
  const { companyId, characterId, priceMin, priceMax, floatPercent, useOfProceeds, lockupMonths } = params;

  return db.transaction(async (trx) => {
    // Lock the company row to serialize any concurrent IPO filings
    await trx('companies').where({ id: companyId }).forUpdate().first();
    const { company, finances } = await loadFounderCompany(trx, companyId, characterId);
    const clock = await trx('world_clock').first();
    const curYear = clock?.current_year ?? 1;
    const curMonth = clock?.current_month ?? 1;

    // Re-validate eligibility inside the transaction
    if (company.legal_structure_id !== 'public-corporation') {
      throw new AppError('Company must be a Public Corporation to file an IPO', 400, 'NOT_PUBLIC');
    }
    if (company.is_exchange_listed) {
      throw new AppError('Company is already listed on the exchange', 400, 'ALREADY_LISTED');
    }
    const companyValue = Number(finances?.company_value ?? 0);
    const debt = Number(finances?.debt ?? 0);
    const ageMonths = monthsBetween(company.created_at_world_year, company.created_at_world_month, curYear, curMonth);
    if (companyValue < MIN_COMPANY_VALUE) throw new AppError(`Company value must be at least $${MIN_COMPANY_VALUE.toLocaleString()}`, 400, 'MIN_VALUE');
    if (ageMonths < MIN_COMPANY_AGE_MONTHS) throw new AppError(`Company must be at least ${MIN_COMPANY_AGE_MONTHS} months old`, 400, 'TOO_YOUNG');
    if (companyValue > 0 && debt / companyValue >= MAX_DEBT_RATIO) throw new AppError('Debt ratio too high to list', 400, 'TOO_MUCH_DEBT');

    const existing = await trx('ipo_listings')
      .where({ company_id: companyId })
      .whereIn('status', ['pending_review', 'book_building'])
      .first();
    if (existing) throw new AppError('An IPO is already in progress for this company', 400, 'IPO_IN_PROGRESS');

    // Prospectus validation
    const floor = (companyValue / TOTAL_SHARES) * 0.5;
    if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin <= 0 || priceMax <= 0) {
      throw new AppError('Invalid price range', 400, 'BAD_REQUEST');
    }
    if (priceMin < floor) throw new AppError(`Minimum price must be at least $${floor.toFixed(4)} (½ of book value per share)`, 400, 'PRICE_TOO_LOW');
    if (priceMax < priceMin) throw new AppError('Maximum price cannot be below the minimum price', 400, 'BAD_RANGE');
    if (!(floatPercent >= 0.10 && floatPercent <= 0.49)) throw new AppError('Float must be between 10% and 49%', 400, 'BAD_FLOAT');
    if (!(lockupMonths >= 3 && lockupMonths <= 12)) throw new AppError('Lockup must be 3–12 months', 400, 'BAD_LOCKUP');
    const proceeds = (useOfProceeds ?? '').slice(0, 500);

    if (Number(finances?.available_cash ?? 0) < IPO_FILING_FEE) {
      throw new AppError(`Insufficient company cash for the $${IPO_FILING_FEE.toLocaleString()} filing fee`, 400, 'INSUFFICIENT_FUNDS');
    }

    const sumRow = await trx('company_shares').where({ company_id: companyId }).sum('shares as total').first();
    const actualShares = Number(sumRow?.total ?? TOTAL_SHARES) || TOTAL_SHARES;
    const floatShares = Math.round(actualShares * floatPercent);
    
    // Verify the founder actually owns enough shares to float
    const founderHolding = await trx('company_shares').where({ company_id: companyId, holder_character_id: characterId }).first();
    const founderShares = Number(founderHolding?.shares ?? 0);
    if (founderShares < floatShares) {
      throw new AppError(`You must own at least ${floatShares.toLocaleString()} shares to float ${(floatPercent * 100).toFixed(0)}% of the company`, 400, 'INSUFFICIENT_SHARES');
    }

    const reviewEnd = addMonths(curYear, curMonth, REVIEW_MONTHS);

    await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', IPO_FILING_FEE);

    const [listing] = await trx('ipo_listings')
      .insert({
        company_id: companyId,
        status: 'pending_review',
        ipo_price_min: priceMin,
        ipo_price_max: priceMax,
        float_percent: floatPercent,
        float_shares: floatShares,
        use_of_proceeds: proceeds,
        lockup_months: lockupMonths,
        review_ends_year: reviewEnd.year,
        review_ends_month: reviewEnd.month,
        filing_fee_paid: true,
      })
      .returning('*');

    return listing;
  });
}

export async function withdrawIpo(companyId: string, characterId: string) {
  return db.transaction(async (trx) => {
    await loadFounderCompany(trx, companyId, characterId);
    const listing = await trx('ipo_listings')
      .where({ company_id: companyId })
      .whereIn('status', ['pending_review', 'book_building'])
      .forUpdate()
      .first();
    if (!listing) throw new AppError('No active IPO to withdraw', 404, 'NOT_FOUND');

    const pendingIois = await trx('ipo_indications').where({ ipo_id: listing.id, status: 'pending', is_npc: false }).forUpdate();
    for (const ioi of pendingIois) {
      const refund = Number(ioi.price_per_share) * Number(ioi.quantity_requested);
      await trx('character_finances').where({ character_id: ioi.character_id }).increment('cash_in_hand', refund);
    }

    await trx('ipo_indications').where({ ipo_id: listing.id, status: 'pending' }).update({ status: 'withdrawn', updated_at: trx.fn.now() });
    await trx('ipo_listings').where({ id: listing.id }).update({ status: 'withdrawn', updated_at: trx.fn.now() });
    return { withdrawn: true, fee_forfeited: IPO_FILING_FEE };
  });
}

export async function getCompanyIpo(companyId: string) {
  const listing = await db('ipo_listings')
    .where({ company_id: companyId })
    .orderBy('created_at', 'desc')
    .first();
  if (!listing) return null;

  const iois = await db('ipo_indications').where({ ipo_id: listing.id, status: 'pending' });
  const totalIoiShares = iois.reduce((s: number, i: any) => s + Number(i.quantity_requested), 0);
  return {
    ...listing,
    subscription_ratio: Number(listing.float_shares) > 0 ? totalIoiShares / Number(listing.float_shares) : 0,
    total_ioi_shares: totalIoiShares,
    ioi_count: iois.length,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// INDICATIONS OF INTEREST (book-building)
// ════════════════════════════════════════════════════════════════════════════

export async function submitIoi(params: { ipoId: string; characterId: string; pricePerShare: number; quantity: number }) {
  const { ipoId, characterId, pricePerShare, quantity } = params;
  if (!Number.isFinite(pricePerShare) || pricePerShare <= 0) throw new AppError('Invalid price', 400, 'BAD_REQUEST');
  if (!Number.isInteger(quantity) || quantity <= 0) throw new AppError('Invalid quantity', 400, 'BAD_REQUEST');

  const safePrice = Number(Number(pricePerShare).toFixed(4));

  return db.transaction(async (trx) => {
    // Lock character finances first to serialize IOI submissions for this player
    const fin = await trx('character_finances').where({ character_id: characterId }).forUpdate().first();
    if (!fin) throw new AppError('Character finances not found', 404, 'NOT_FOUND');

    const listing = await trx('ipo_listings').where({ id: ipoId }).first();
    if (!listing) throw new AppError('IPO not found', 404, 'NOT_FOUND');
    if (listing.status !== 'book_building') throw new AppError('This IPO is not accepting indications of interest', 400, 'NOT_OPEN');

    const company = await trx('companies').where({ id: listing.company_id }).first();
    if (company?.owner_character_id === characterId) throw new AppError('Founders cannot submit an IOI for their own IPO', 400, 'IS_FOUNDER');

    // One live IOI per player per IPO — replace any existing pending one.
    const existing = await trx('ipo_indications')
      .where({ ipo_id: ipoId, character_id: characterId, status: 'pending', is_npc: false })
      .forUpdate()
      .first();

    let availableCash = Number(fin.cash_in_hand);
    if (existing) {
      const refund = Number(existing.price_per_share) * Number(existing.quantity_requested);
      availableCash += refund; // Apply refund to available cash for this transaction
      await trx('character_finances').where({ character_id: characterId }).increment('cash_in_hand', refund);
      await trx('ipo_indications').where({ id: existing.id }).update({ status: 'withdrawn', updated_at: trx.fn.now() });
    }

    const cost = safePrice * quantity;
    if (availableCash < cost) {
      throw new AppError(`Insufficient cash to place this indication of interest. Requires $${cost.toFixed(2)}`, 400, 'INSUFFICIENT_FUNDS');
    }

    await trx('character_finances').where({ character_id: characterId }).decrement('cash_in_hand', cost);

    const [ioi] = await trx('ipo_indications')
      .insert({
        ipo_id: ipoId,
        character_id: characterId,
        is_npc: false,
        price_per_share: safePrice,
        quantity_requested: quantity,
        status: 'pending',
      })
      .returning('*');
    return ioi;
  });
}

export async function cancelIoi(ioiId: string, characterId: string) {
  return db.transaction(async (trx) => {
    const ioi = await trx('ipo_indications').where({ id: ioiId, character_id: characterId }).forUpdate().first();
    if (!ioi) throw new AppError('Indication not found', 404, 'NOT_FOUND');
    if (ioi.status !== 'pending') throw new AppError('Indication is no longer active', 400, 'NOT_PENDING');
    
    const refund = Number(ioi.price_per_share) * Number(ioi.quantity_requested);
    await trx('character_finances').where({ character_id: characterId }).increment('cash_in_hand', refund);
    
    await trx('ipo_indications').where({ id: ioiId }).update({ status: 'withdrawn', updated_at: trx.fn.now() });
    return { cancelled: true };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// READ MODELS (exchange UI)
// ════════════════════════════════════════════════════════════════════════════

export async function getPipeline(characterId: string) {
  const listings = await db('ipo_listings as ipo')
    .join('companies as c', 'c.id', 'ipo.company_id')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .whereIn('ipo.status', ['pending_review', 'book_building'])
    .orderBy('ipo.created_at', 'desc')
    .select(
      'ipo.*',
      'c.name as company_name',
      'c.industry_id',
      'c.owner_character_id',
      'f.company_value',
      'f.last_arc_profit'
    );

  const result = [];
  for (const l of listings) {
    const iois = await db('ipo_indications').where({ ipo_id: l.id, status: 'pending' });
    const totalIoiShares = iois.reduce((s: number, i: any) => s + Number(i.quantity_requested), 0);
    const myIoi = iois.find((i: any) => i.character_id === characterId && !i.is_npc) ?? null;
    result.push({
      ...l,
      subscription_ratio: Number(l.float_shares) > 0 ? totalIoiShares / Number(l.float_shares) : 0,
      total_ioi_shares: totalIoiShares,
      ioi_count: iois.filter((i: any) => !i.is_npc).length,
      is_founder: l.owner_character_id === characterId,
      my_ioi: myIoi,
    });
  }
  return result;
}

export async function getCompanyDetail(companyId: string) {
  const company = await db('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.id': companyId })
    .select('c.id', 'c.name', 'c.industry_id', 'c.subsector_id', 'c.country_id', 'f.company_value', 'f.last_arc_profit')
    .first();
  if (!company) throw new AppError('Company not found', 404, 'NOT_FOUND');

  const history = await db('share_price_history')
    .where({ company_id: companyId })
    .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
    .limit(52);

  const latest = history[0] ?? null;
  const prev = history[1] ?? null;
  const high52 = history.reduce((mx: number, r: any) => Math.max(mx, Number(r.high_price)), 0) || null;
  const low52 = history.length ? history.reduce((mn: number, r: any) => Math.min(mn, Number(r.low_price)), Number(history[0].low_price)) : null;

  const listing = await db('ipo_listings').where({ company_id: companyId, status: 'listed' }).orderBy('created_at', 'desc').first();

  const lastPrice = latest ? Number(latest.close_price) : null;
  const prevPrice = prev ? Number(prev.close_price) : null;
  const sumRow = await db('company_shares').where({ company_id: companyId }).sum('shares as total').first();
  const actualShares = Number(sumRow?.total ?? TOTAL_SHARES) || TOTAL_SHARES;

  return {
    ...company,
    last_price: lastPrice,
    prev_price: prevPrice,
    change_pct: lastPrice != null && prevPrice != null && prevPrice > 0 ? ((lastPrice - prevPrice) / prevPrice) * 100 : null,
    market_cap: latest ? Number(latest.market_cap) : lastPrice != null ? lastPrice * actualShares : null,
    pe_ratio: latest?.pe_ratio != null ? Number(latest.pe_ratio) : null,
    eps: latest ? Number(latest.eps) : null,
    volume: latest ? Number(latest.volume_shares) : 0,
    high_52: high52,
    low_52: low52,
    total_shares: actualShares,
    listing: listing ?? null,
  };
}

export async function getOhlc(companyId: string, months = 24) {
  const rows = await db('share_price_history')
    .where({ company_id: companyId })
    .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
    .limit(months);
  return rows.reverse();
}

export async function getEarnings(companyId: string, months = 12) {
  const sumRow = await db('company_shares').where({ company_id: companyId }).sum('shares as total').first();
  const actualShares = Number(sumRow?.total ?? TOTAL_SHARES) || TOTAL_SHARES;

  const rows = await db('share_price_history')
    .where({ company_id: companyId })
    .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
    .limit(months)
    .select('game_year', 'game_month', 'eps', 'analyst_estimate', 'profit_surprise_pct', 'close_price', 'pe_ratio');
  return rows.map((r: any) => ({
    ...r,
    implied_profit: Number(r.eps) * actualShares,
    estimate_profit: r.analyst_estimate != null ? Number(r.analyst_estimate) * actualShares : null,
  }));
}

export async function getDrxIndex() {
  const history = await db('drx_index_history')
    .orderBy([{ column: 'game_year', order: 'asc' }, { column: 'game_month', order: 'asc' }])
    .limit(60);
  const latest = history.length ? history[history.length - 1] : null;
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const value = latest ? Number(latest.index_value) : null;
  const prevValue = prev ? Number(prev.index_value) : null;
  return {
    value,
    change_pct: value != null && prevValue != null && prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : null,
    total_listed: latest ? Number(latest.total_listed) : 0,
    total_volume: latest ? Number(latest.total_volume) : 0,
    history: history.map((h: any) => ({ label: `Y${h.game_year} M${h.game_month}`, value: Number(h.index_value) })),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MONTH-TICK PIPELINE (runs inside the world-tick transaction)
// ════════════════════════════════════════════════════════════════════════════

/** NPC institutional appetite → a single refreshed IOI per IPO (15–60% of float). */
async function refreshNpcIoi(trx: any, listing: any, systemCharId: string) {
  const company = await trx('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.id': listing.company_id })
    .select('c.reputation', 'f.company_value', 'f.last_arc_profit')
    .first();
  if (!company) return;

  const companyValue = Number(company.company_value) || 1;
  const profit = Number(company.last_arc_profit) || 0;
  const reputationFactor = 0.5 + clamp(Number(company.reputation) || 50, 0, 100) / 100; // 0.5–1.5
  const rawScore = (companyValue / 1_000_000) * (1 + profit / companyValue) * reputationFactor;
  const score = clamp(rawScore, 0, 1);

  // Underwriters guarantee the minimum 50% float subscription so the IPO doesn't automatically fail.
  // Good companies will see up to 150% demand, driving the clearing price up.
  const fraction = clamp(0.50 + 1.0 * score, 0.50, 1.50);
  const sharesWanted = Math.round(Number(listing.float_shares) * fraction);
  const price = clamp(
    Number(listing.ipo_price_max) * (0.80 + 0.20 * score),
    Number(listing.ipo_price_min),
    Number(listing.ipo_price_max)
  );

  const existing = await trx('ipo_indications').where({ ipo_id: listing.id, is_npc: true, status: 'pending' }).first();
  if (existing) {
    await trx('ipo_indications').where({ id: existing.id }).update({
      price_per_share: price,
      quantity_requested: sharesWanted,
      updated_at: trx.fn.now(),
    });
  } else {
    await trx('ipo_indications').insert({
      ipo_id: listing.id,
      character_id: systemCharId,
      is_npc: true,
      price_per_share: price,
      quantity_requested: sharesWanted,
      status: 'pending',
    });
  }
}

/** Clearing algorithm → allocations, then physical listing (cash + shares transfer). */
async function clearAndList(trx: any, listing: any, curYear: number, curMonth: number, systemCharId: string) {
  const floatShares = Number(listing.float_shares);
  const priceMin = Number(listing.ipo_price_min);
  const priceMax = Number(listing.ipo_price_max);

  const allIois = await trx('ipo_indications')
    .where({ ipo_id: listing.id, status: 'pending' })
    .forUpdate();
  // Only IOIs willing to meet the floor participate.
  const eligible = allIois
    .filter((i: any) => Number(i.price_per_share) >= priceMin)
    .sort((a: any, b: any) =>
      Number(b.price_per_share) - Number(a.price_per_share) ||
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  const ineligible = allIois.filter((i: any) => Number(i.price_per_share) < priceMin);

  const totalDemand = eligible.reduce((s: number, i: any) => s + Number(i.quantity_requested), 0);

  // Undersubscribed below 50% → IPO fails, company stays private, fee already lost.
  if (totalDemand < floatShares * 0.5) {
    for (const i of allIois) {
      if (!i.is_npc) {
        const refund = Number(i.price_per_share) * Number(i.quantity_requested);
        await trx('character_finances').where({ character_id: i.character_id }).increment('cash_in_hand', refund);
      }
      await trx('ipo_indications').where({ id: i.id }).update({ status: 'failed', quantity_allocated: 0, updated_at: trx.fn.now() });
    }
    await trx('ipo_listings').where({ id: listing.id }).update({ status: 'failed', updated_at: trx.fn.now() });
    logger.info(`[ipo] ${listing.company_id} IPO FAILED — demand ${totalDemand}/${floatShares} (<50%)`);
    return;
  }

  const oversubscribed = totalDemand >= floatShares;
  const targetShares = Math.min(floatShares, totalDemand);

  // Determine clearing price.
  let clearingPrice: number;
  if (oversubscribed) {
    let cum = 0;
    let marginal = eligible[eligible.length - 1];
    for (const i of eligible) {
      cum += Number(i.quantity_requested);
      if (cum >= targetShares) { marginal = i; break; }
    }
    clearingPrice = clamp(Number(marginal.price_per_share), priceMin, priceMax);
  } else {
    clearingPrice = priceMin; // 50–99% subscribed → sell partial float at the floor
  }

  // Allocate: full fills above clearing, pro-rata at the clearing price.
  for (const i of ineligible) {
    if (!i.is_npc) {
      const refund = Number(i.price_per_share) * Number(i.quantity_requested);
      await trx('character_finances').where({ character_id: i.character_id }).increment('cash_in_hand', refund);
    }
    await trx('ipo_indications').where({ id: i.id }).update({ status: 'failed', quantity_allocated: 0, updated_at: trx.fn.now() });
  }

  let remaining = targetShares;
  const above = eligible.filter((i: any) => Number(i.price_per_share) > clearingPrice);
  const atClearing = eligible.filter((i: any) => Number(i.price_per_share) === clearingPrice);
  const below = eligible.filter((i: any) => Number(i.price_per_share) < clearingPrice);

  const allocations: Array<{ ioi: any; qty: number; proRated: boolean }> = [];
  for (const i of above) {
    const qty = Math.min(Number(i.quantity_requested), remaining);
    remaining -= qty;
    allocations.push({ ioi: i, qty, proRated: qty < Number(i.quantity_requested) });
  }
  const totalAtClearing = atClearing.reduce((s: number, i: any) => s + Number(i.quantity_requested), 0);
  if (remaining > 0 && totalAtClearing > 0) {
    let handed = 0;
    
    // First pass: Floored proportional allocation
    const initialAllocations = atClearing.map((i: any) => {
      const exact = (remaining * Number(i.quantity_requested)) / totalAtClearing;
      const qty = Math.min(Number(i.quantity_requested), Math.floor(exact));
      handed += qty;
      return { ioi: i, qty, remainder: exact - qty };
    });

    let leftover = remaining - handed;

    // Second pass: Largest Remainder Method (distribute 1 share to those with highest fractional remainder)
    if (leftover > 0) {
      initialAllocations.sort((a: any, b: any) => b.remainder - a.remainder);
      for (const item of initialAllocations) {
        if (leftover > 0 && item.qty < Number(item.ioi.quantity_requested)) {
          item.qty += 1;
          leftover -= 1;
        }
      }
    }

    for (const item of initialAllocations) {
      allocations.push({ ioi: item.ioi, qty: item.qty, proRated: item.qty < Number(item.ioi.quantity_requested) });
    }
  } else {
    for (const i of atClearing) allocations.push({ ioi: i, qty: 0, proRated: true });
  }
  for (const i of below) allocations.push({ ioi: i, qty: 0, proRated: false });

  // ── Listing day: transfer cash & shares ──
  let proceeds = 0;
  let totalAllocated = 0;
  const founderId = (await trx('companies').where({ id: listing.company_id }).first())?.owner_character_id;

  for (const { ioi, qty, proRated } of allocations) {
    const buyerId = ioi.character_id ?? systemCharId;
    
    if (qty <= 0) {
      if (!ioi.is_npc) {
        const refund = Number(ioi.price_per_share) * Number(ioi.quantity_requested);
        await trx('character_finances').where({ character_id: buyerId }).increment('cash_in_hand', refund);
      }
      await trx('ipo_indications').where({ id: ioi.id }).update({ status: 'failed', quantity_allocated: 0, updated_at: trx.fn.now() });
      continue;
    }

    const cost = clearingPrice * qty;

    if (!ioi.is_npc) {
      // Refund surplus if clearing price was lower than bid, or if pro-rated
      const escrowed = Number(ioi.price_per_share) * Number(ioi.quantity_requested);
      const refund = escrowed - cost;
      if (refund > 0) {
        await trx('character_finances').where({ character_id: buyerId }).increment('cash_in_hand', refund);
      }
    }

    const holding = await trx('company_shares')
      .where({ company_id: listing.company_id, holder_character_id: buyerId })
      .forUpdate()
      .first();
    if (holding) {
      const oldShares = Number(holding.shares);
      const newAvg = (oldShares * Number(holding.avg_cost_basis) + cost) / (oldShares + qty);
      await trx('company_shares')
        .where({ company_id: listing.company_id, holder_character_id: buyerId })
        .update({ shares: oldShares + qty, avg_cost_basis: newAvg, updated_at: trx.fn.now() });
    } else {
      await trx('company_shares').insert({
        company_id: listing.company_id,
        holder_character_id: buyerId,
        shares: qty,
        avg_cost_basis: clearingPrice,
      });
    }

    proceeds += cost;
    totalAllocated += qty;
    await trx('ipo_indications').where({ id: ioi.id }).update({
      status: proRated ? 'pro_rated' : 'allocated',
      quantity_allocated: qty,
      updated_at: trx.fn.now(),
    });
  }

  // Deduct allocated shares from the founder's holding.
  if (founderId && totalAllocated > 0) {
    await trx('company_shares')
      .where({ company_id: listing.company_id, holder_character_id: founderId })
      .decrement('shares', totalAllocated);
    await trx('company_shares')
      .where({ company_id: listing.company_id, holder_character_id: founderId })
      .update({ updated_at: trx.fn.now() });
  }

  // Credit proceeds to company cash.
  if (proceeds > 0) {
    await trx('company_finances')
      .where({ company_id: listing.company_id })
      .increment('available_cash', proceeds)
      .increment('company_value', proceeds);
  }

  // Lock up the founder's retained shares.
  const lockEnd = addMonths(curYear, curMonth, Number(listing.lockup_months));
  if (founderId) {
    await trx('company_shares')
      .where({ company_id: listing.company_id, holder_character_id: founderId })
      .update({ lockup_until_year: lockEnd.year, lockup_until_month: lockEnd.month, updated_at: trx.fn.now() });
  }

  await trx('ipo_listings').where({ id: listing.id }).update({
    status: 'listed',
    clearing_price: clearingPrice,
    proceeds_raised: proceeds,
    listing_year: curYear,
    listing_month: curMonth,
    updated_at: trx.fn.now(),
  });

  await trx('companies').where({ id: listing.company_id }).update({
    is_exchange_listed: true,
    updated_at: trx.fn.now()
  });

  const sumRow = await trx('company_shares').where({ company_id: listing.company_id }).sum('shares as total').first();
  const actualShares = Number(sumRow?.total ?? TOTAL_SHARES);

  // First OHLC bar (all four prices = clearing).
  await trx('share_price_history')
    .insert({
      company_id: listing.company_id,
      game_year: curYear,
      game_month: curMonth,
      open_price: clearingPrice,
      high_price: clearingPrice,
      low_price: clearingPrice,
      close_price: clearingPrice,
      volume_shares: 0,
      market_cap: clearingPrice * actualShares,
      eps: 0,
      pe_ratio: null,
    })
    .onConflict(['company_id', 'game_year', 'game_month'])
    .merge();

  // IPO pop: opening market-maker ask at clearing × 1.15, bid just under clearing.
  const spread = Math.max(0.01, clearingPrice * MM_SPREAD_PCT);
  await safeNpcOrder(trx, listing.company_id, systemCharId, 'sell', clearingPrice * IPO_POP, MM_ORDER_SIZE);
  await safeNpcOrder(trx, listing.company_id, systemCharId, 'buy', Math.max(0.01, clearingPrice - spread / 2), MM_ORDER_SIZE);

  logger.info(`[ipo] ${listing.company_id} LISTED @ $${clearingPrice.toFixed(2)} — ${totalAllocated} shares, $${proceeds.toFixed(0)} raised`);
}

/** Place an NPC order without letting a single failure abort the whole tick. */
async function safeNpcOrder(trx: any, companyId: string, systemCharId: string, side: 'buy' | 'sell', price: number, quantity: number) {
  try {
    await placeOrder({ companyId, characterId: systemCharId, side, price: Number(price.toFixed(4)), quantity, isNpc: true, existingTrx: trx });
  } catch (e: any) {
    // Insufficient MM inventory/cash for this quote — skip it silently.
    logger.warn(`[drx-mm] skipped ${side} ${quantity} @ ${price.toFixed(2)} for ${companyId}: ${e?.message || e}`);
  }
}

export async function processExchangeMonth(trx: any, year: number, month: number): Promise<void> {
  const systemCharId = await getSystemCharacterId(trx);
  if (!systemCharId) {
    logger.warn('[drx] no system market-maker character found — skipping exchange month');
    return;
  }

  // ── Step A: advance regulatory review → book-building ──
  const activeListings = await trx('ipo_listings')
    .whereIn('status', ['pending_review', 'book_building'])
    .forUpdate();
  for (const l of activeListings) {
    if (l.status === 'pending_review' && reached(l.review_ends_year, l.review_ends_month, year, month)) {
      const bookEnd = addMonths(year, month, BOOKBUILD_MONTHS);
      await trx('ipo_listings').where({ id: l.id }).update({
        status: 'book_building',
        bookbuild_ends_year: bookEnd.year,
        bookbuild_ends_month: bookEnd.month,
        updated_at: trx.fn.now(),
      });
    }
  }

  // ── Refresh NPC institutional interest for open book-building IPOs ──
  const booking = await trx('ipo_listings').where({ status: 'book_building' });
  for (const l of booking) {
    if (!reached(l.bookbuild_ends_year, l.bookbuild_ends_month, year, month)) {
      await refreshNpcIoi(trx, l, systemCharId);
    }
  }

  // ── Step B: close book-building → clear & list (or fail) ──
  const closing = await trx('ipo_listings').where({ status: 'book_building' });
  const justListed = new Set<string>();
  for (const l of closing) {
    if (reached(l.bookbuild_ends_year, l.bookbuild_ends_month, year, month)) {
      await clearAndList(trx, l, year, month, systemCharId);
      justListed.add(l.company_id);
    }
  }

  // ── Step C+D: monthly OHLC snapshot + earnings-driven mark for already-listed companies ──
  // Includes both player public-corporations AND NPC exchange-listed companies.
  const listedCompanies = await trx('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.status': 'active' })
    .where({ 'c.is_exchange_listed': true })
    .select('c.id', 'c.is_npc', 'f.last_arc_profit');

  for (const co of listedCompanies) {
    if (justListed.has(co.id)) continue; // opening bar already written this tick

    const prevBar = await trx('share_price_history')
      .where({ company_id: co.id })
      .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
      .first();
    if (!prevBar) continue; // not actually listed yet
    const already = await trx('share_price_history').where({ company_id: co.id, game_year: year, game_month: month }).first();
    if (already) continue;

    const prevClose = Number(prevBar.close_price);
    const trades = await trx('share_trades').where({ company_id: co.id, game_year: year, game_month: month });
    const volume = trades.reduce((s: number, t: any) => s + Number(t.quantity), 0);

    const sumRow = await trx('company_shares').where({ company_id: co.id }).sum('shares as total').first();
    const companyTotalShares = Number(sumRow?.total ?? TOTAL_SHARES) || TOTAL_SHARES;

    const profit = Number(co.last_arc_profit) || 0;
    const eps = profit / companyTotalShares;

    // Analyst estimate = trailing 3-month average profit (per share).
    const trailing = await trx('share_price_history')
      .where({ company_id: co.id })
      .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
      .limit(3);
    const estEps = trailing.length ? trailing.reduce((s: number, r: any) => s + Number(r.eps), 0) / trailing.length : eps;
    const analystEstimate = estEps * companyTotalShares;
    const surprise = estEps !== 0 ? (eps - estEps) / Math.abs(estEps) : 0;

    let open = prevClose;
    let high: number;
    let low: number;
    let close: number;

    if (trades.length > 0) {
      const prices = trades.map((t: any) => Number(t.price));
      const lastTrade = trades.slice().sort((a: any, b: any) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime())[0];
      high = Math.max(open, ...prices);
      low = Math.min(open, ...prices);
      close = Number(lastTrade.price);
    } else {
      // Calculate Intrinsic Book Value per share to anchor NPC sentiment
      const finRow = await trx('company_finances').where({ company_id: co.id }).first();
      const bookValue = Number(finRow?.company_value || 0);
      const bookValuePerShare = companyTotalShares > 0 ? (bookValue / companyTotalShares) : prevClose;

      // No volume → NPC sentiment marks the price by the earnings surprise impulse AND intrinsic value drift.
      const impulse = clamp(prevClose * surprise * IMPULSE_COEFF, -prevClose * IMPULSE_CLAMP, prevClose * IMPULSE_CLAMP);
      
      // Aggressive catch-up for deeply undervalued penny stocks
      let driftRate = 0.20;
      if (bookValuePerShare > prevClose * 3) {
        driftRate = 0.50; // Massively undervalued: close half the gap immediately (can yield 1000%+ monthly gains)
      } else if (bookValuePerShare > prevClose * 1.5) {
        driftRate = 0.30;
      }
      const drift = (bookValuePerShare - prevClose) * driftRate;

      close = Math.max(0.01, prevClose + impulse + drift);
      high = Math.max(open, close);
      low = Math.min(open, close);
    }

    // Attach bookValuePerShare to the company object so the MM can use it in Step F
    const finRowForMM = await trx('company_finances').where({ company_id: co.id }).first();
    const bv = Number(finRowForMM?.company_value || 0);
    co._bookValuePerShare = companyTotalShares > 0 ? (bv / companyTotalShares) : close;

    const pe = eps > 0 ? close / (eps * 12) : null;

    await trx('share_price_history')
      .insert({
        company_id: co.id,
        game_year: year,
        game_month: month,
        open_price: open,
        high_price: high,
        low_price: low,
        close_price: close,
        volume_shares: volume,
        market_cap: close * companyTotalShares,
        eps,
        pe_ratio: pe != null ? Number(pe.toFixed(2)) : null,
        analyst_estimate: Number(analystEstimate.toFixed(2)),
        profit_surprise_pct: Number((surprise * 100).toFixed(4)),
      })
      .onConflict(['company_id', 'game_year', 'game_month'])
      .merge();
  }

  // ── Step E: DRX market index ──
  const monthBars = await trx('share_price_history').where({ game_year: year, game_month: month });
  const totalMarketCap = monthBars.reduce((s: number, r: any) => s + Number(r.market_cap), 0);
  const totalVolume = monthBars.reduce((s: number, r: any) => s + Number(r.volume_shares), 0);

  if (monthBars.length > 0) {
    const cfg = await trx('drx_index_config').where({ id: 1 }).forUpdate().first();
    let divisor = cfg?.base_divisor != null ? Number(cfg.base_divisor) : null;
    const baseValue = cfg?.base_value != null ? Number(cfg.base_value) : DRX_BASE_VALUE;
    if (divisor == null || divisor === 0) {
      divisor = totalMarketCap / baseValue;
      if (divisor > 0) {
        await trx('drx_index_config').where({ id: 1 }).update({ base_divisor: divisor, updated_at: trx.fn.now() });
      }
    }
    const indexValue = divisor && divisor > 0 ? totalMarketCap / divisor : baseValue;
    await trx('drx_index_history')
      .insert({
        game_year: year,
        game_month: month,
        index_value: Number(indexValue.toFixed(4)),
        total_listed: monthBars.length,
        total_volume: totalVolume,
      })
      .onConflict(['game_year', 'game_month'])
      .merge();
  }

  // ── Step F: refresh NPC market-maker quotes (skip companies just listed this tick) ──
  for (const co of listedCompanies) {
    if (justListed.has(co.id)) continue;
    const bar = await trx('share_price_history').where({ company_id: co.id, game_year: year, game_month: month }).first();
    if (!bar) continue;
    const lastClose = Number(bar.close_price);

    // Cancel & refund stale NPC quotes.
    const staleNpc = await trx('share_orders').where({ company_id: co.id, is_npc: true, status: 'open' }).forUpdate();
    for (const o of staleNpc) {
      const unfilled = Number(o.quantity) - Number(o.filled_quantity);
      if (o.side === 'buy') {
        const refund = Number(o.escrow_amount);
        await trx('character_finances').where({ character_id: o.character_id }).increment('cash_in_hand', refund);
      } else {
        await trx('company_shares')
          .where({ company_id: co.id, holder_character_id: o.character_id })
          .increment('shares', unfilled);
      }
      await trx('share_orders').where({ id: o.id }).update({ status: 'cancelled', updated_at: trx.fn.now() });
    }

    // Determine MM anchor price
    let mmAnchor = lastClose;
    if (co.is_npc && co._bookValuePerShare) {
      const bvps = co._bookValuePerShare;
      let driftRate = 0.20;
      if (bvps > lastClose * 3) driftRate = 0.50;
      else if (bvps > lastClose * 1.5) driftRate = 0.30;
      
      if (bvps > lastClose) {
         mmAnchor = lastClose + (bvps - lastClose) * driftRate;
      }
    }

    const spread = Math.max(0.01, mmAnchor * MM_SPREAD_PCT);
    await safeNpcOrder(trx, co.id, systemCharId, 'buy', Math.max(0.01, mmAnchor - spread / 2), MM_ORDER_SIZE);
    await safeNpcOrder(trx, co.id, systemCharId, 'sell', mmAnchor + spread / 2, MM_ORDER_SIZE);
  }

  // ── Step H: NPC Treasury Brain — buyback / secondary offering decisions ──
  await processNpcEquityDecisions(trx, year, month, systemCharId);

  // ── Step I: Sweep system_npc cash_in_hand → company_finances.available_cash ──
  // When NPC sells treasury shares, cash lands in character_finances. Transfer it back.
  await sweepNpcCharacterCash(trx, systemCharId);

  // ── Step G: lockup expiry ──
  await trx('company_shares')
    .whereNotNull('lockup_until_year')
    .whereNotNull('lockup_until_month')
    .whereRaw('(lockup_until_year * 12 + lockup_until_month) <= (? * 12 + ?)', [year, month])
    .update({ lockup_until_year: null, lockup_until_month: null, updated_at: trx.fn.now() });

  // ── Step J: Capital Partners portfolio value recalculation ──
  // Update company_value for all finance firms = portfolio market value + firm cash.
  await recalcPortfolioValues(trx);
}

// ══════════════════════════════════════════════════════════════════════════════
// NPC TREASURY BRAIN
// ══════════════════════════════════════════════════════════════════════════════

const NPC_TREASURY_MAX_FLOAT_SHARES = 300_000;  // max 30% of 1,000,000 can be public
const NPC_BUYBACK_ORDER_SIZE        = 5_000;    // shares per buyback order
const NPC_SECONDARY_ORDER_SIZE      = 10_000;   // shares per secondary offering order
const NPC_OPERATING_RESERVE_MONTHS  = 2;        // cash buffer multiplier

/**
 * Each month, every NPC exchange-listed company decides whether to:
 *  - Do a share buyback (profitable + cash-rich + treasury has shares to buy back)
 *  - Do a secondary offering (cash-poor + treasury still has float capacity)
 *  - Do nothing (neutral — market-maker quotes in Step F are enough)
 */
async function processNpcEquityDecisions(
  trx: any,
  year: number,
  month: number,
  systemCharId: string
): Promise<void> {
  const npcCompanies = await trx('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.is_npc': true, 'c.is_exchange_listed': true, 'c.status': 'active' })
    .select('c.id', 'c.name', 'f.available_cash', 'f.last_arc_profit', 'f.company_value');

  for (const co of npcCompanies) {
    try {
      const profit = Number(co.last_arc_profit) || 0;
      const cash   = Number(co.available_cash)  || 0;

      // How many treasury shares does system_npc still hold?
      const treasuryHolding = await trx('company_shares')
        .where({ company_id: co.id, holder_character_id: systemCharId })
        .first();
      const treasuryShares = Number(treasuryHolding?.shares ?? 0);

      // Derive actual total shares for this NPC company from the cap table
      const sumRow = await trx('company_shares').where({ company_id: co.id }).sum('shares as total').first();
      const companyTotalShares = Number(sumRow?.total ?? TOTAL_SHARES);
      const maxFloatShares = Math.floor(companyTotalShares * 0.30); // max 30% public float

      const publicFloat = companyTotalShares - treasuryShares;

      // Last close price
      const lastBar = await trx('share_price_history')
        .where({ company_id: co.id })
        .orderBy([{ column: 'game_year', order: 'desc' }, { column: 'game_month', order: 'desc' }])
        .first();
      if (!lastBar) continue;
      const lastClose = Number(lastBar.close_price);

      // Rough operating cash reserve (capped to prevent hyper-offerings from brand value)
      const estimatedMonthlyCosts = Math.min(Number(co.company_value) * 0.03, 10_000_000);
      const operatingReserve = estimatedMonthlyCosts * NPC_OPERATING_RESERVE_MONTHS;

      // ── SECONDARY OFFERING: cash dangerously low, still has float capacity ──
      if (
        cash < operatingReserve &&
        treasuryShares > NPC_SECONDARY_ORDER_SIZE &&
        publicFloat < maxFloatShares
      ) {
        const sellQty = Math.min(NPC_SECONDARY_ORDER_SIZE, maxFloatShares - publicFloat);
        if (sellQty > 0) {
          // Offer shares at a 5% discount to attract liquidity, not a premium
          logger.info(`[drx-npc] ${co.name}: secondary offering ${sellQty} shares @ $${(lastClose * 0.95).toFixed(2)}`);
          await safeNpcOrder(trx, co.id, systemCharId, 'sell', Math.round(lastClose * 0.95 * 100) / 100, sellQty);
        }
        continue; // one action per month per company
      }

      // ── BUYBACK: profitable, cash-rich, treasury can absorb shares ──
      if (profit > 0 && cash > operatingReserve * 3 && treasuryShares < companyTotalShares) {
        const maxBuyable = Math.min(NPC_BUYBACK_ORDER_SIZE, companyTotalShares - treasuryShares);
        const orderCost  = lastClose * 0.98 * maxBuyable;
        if (maxBuyable > 0 && orderCost < cash * 0.05) {
          logger.info(`[drx-npc] ${co.name}: buyback ${maxBuyable} shares @ $${(lastClose * 0.98).toFixed(2)}`);
          await safeNpcBuyback(trx, co.id, systemCharId, Math.round(lastClose * 0.98 * 100) / 100, maxBuyable);
        }
      }
    } catch (err: any) {
      logger.warn(`[drx-npc] treasury decision failed for ${co.name}: ${err.message}`);
    }
  }
}

/**
 * NPC buyback: deducts cost from company_finances, funds character escrow,
 * then places a standard buy order through the existing matching engine.
 */
async function safeNpcBuyback(
  trx: any,
  companyId: string,
  systemCharId: string,
  price: number,
  quantity: number
): Promise<void> {
  const cost = price * quantity;
  const fin  = await trx('company_finances').where({ company_id: companyId }).forUpdate().first();
  if (!fin || Number(fin.available_cash) < cost) return;

  // Move company cash → character escrow
  await trx('company_finances').where({ company_id: companyId }).decrement('available_cash', cost);
  await trx('character_finances').where({ character_id: systemCharId }).increment('cash_in_hand', cost);

  try {
    await placeOrder({
      companyId,
      characterId: systemCharId,
      side: 'buy',
      price,
      quantity,
      isNpc: true,
      skipCircuitBreaker: true,
      existingTrx: trx,
    });
  } catch {
    // Roll back on order failure
    await trx('character_finances').where({ character_id: systemCharId }).decrement('cash_in_hand', cost);
    await trx('company_finances').where({ company_id: companyId }).increment('available_cash', cost);
  }
}

/**
 * After the exchange month, sweep any cash the system_npc character
 * accumulated from selling treasury shares back into company_finances.
 * Apportions by share of sell trade proceeds per company this month.
 */
async function sweepNpcCharacterCash(trx: any, systemCharId: string): Promise<void> {
  const charFin = await trx('character_finances').where({ character_id: systemCharId }).forUpdate().first();
  if (!charFin) return;
  const surplus = Number(charFin.cash_in_hand) || 0;
  if (surplus <= 0) return;

  // Find which NPC companies sold shares recently (last 30 trades)
  const sellTrades = await trx('share_trades as t')
    .join('companies as c', 'c.id', 't.company_id')
    .where({ 't.seller_character_id': systemCharId, 'c.is_npc': true })
    .orderBy('t.executed_at', 'desc')
    .limit(30)
    .select('t.company_id', 't.price', 't.quantity');

  const proceedsMap = new Map<string, number>();
  for (const t of sellTrades) {
    const prev = proceedsMap.get(t.company_id) ?? 0;
    proceedsMap.set(t.company_id, prev + Number(t.price) * Number(t.quantity));
  }

  if (proceedsMap.size === 0) return;

  const totalProceeds = [...proceedsMap.values()].reduce((a, b) => a + b, 0);
  if (totalProceeds <= 0) return;

  for (const [companyId, proceeds] of proceedsMap.entries()) {
    const share  = proceeds / totalProceeds;
    const amount = Math.floor(surplus * share);
    if (amount <= 0) continue;
    await trx('company_finances').where({ company_id: companyId }).increment('available_cash', amount);
    await trx('character_finances').where({ character_id: systemCharId }).decrement('cash_in_hand', amount);
  }
}
