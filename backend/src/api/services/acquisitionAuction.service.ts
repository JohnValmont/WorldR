import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

// ── Constants ─────────────────────────────────────────────────────────────────
const REGISTRATION_MONTHS = 6;   // Registration phase duration
const BIDDING_MONTHS      = 3;   // Bidding phase duration
const MIN_BID_INCREMENT   = 0.05; // Each new bid must exceed current top by 5%
const RESERVE_PRICE_PCT   = 0.10; // Reserve = 10% of book value

// ── Month arithmetic ──────────────────────────────────────────────────────────
function addMonths(year: number, month: number, n: number): { year: number; month: number } {
  const total = (year - 1) * 12 + (month - 1) + n;
  return { year: Math.floor(total / 12) + 1, month: (total % 12) + 1 };
}

function monthsElapsed(fromYear: number, fromMonth: number, toYear: number, toMonth: number): number {
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

// ── Open a new auction when a company becomes distressed ──────────────────────
export async function openAuction(companyId: string, trx: any): Promise<void> {
  // Check no active auction already exists for this company
  const existing = await trx('company_acquisitions')
    .where({ company_id: companyId })
    .whereIn('status', ['registration', 'bidding'])
    .first();
  if (existing) return; // already has an open auction

  const company = await trx('companies as c')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .where({ 'c.id': companyId })
    .select('c.world_instance_id', 'f.company_value')
    .first();
  if (!company) return;

  const clock = await trx('world_clock').first();
  const year  = clock.current_year;
  const month = clock.current_month;

  const biddingStart = addMonths(year, month, REGISTRATION_MONTHS);
  const biddingEnd   = addMonths(year, month, REGISTRATION_MONTHS + BIDDING_MONTHS);

  const reservePrice = Math.max(1, Math.round(Number(company.company_value) * RESERVE_PRICE_PCT));

  await trx('company_acquisitions').insert({
    company_id:               companyId,
    world_instance_id:        company.world_instance_id,
    status:                   'registration',
    reserve_price:            reservePrice,
    registration_open_year:   year,
    registration_open_month:  month,
    bidding_start_year:       biddingStart.year,
    bidding_start_month:      biddingStart.month,
    bidding_end_year:         biddingEnd.year,
    bidding_end_month:        biddingEnd.month,
  });

  logger.info(`[Auction] Opened registration for ${companyId}. Bidding: Y${biddingStart.year}M${biddingStart.month} – Y${biddingEnd.year}M${biddingEnd.month}`);
}

// ── Get all active auctions (registration + bidding) ─────────────────────────
export async function getActiveAuctions() {
  const auctions = await db('company_acquisitions as a')
    .join('companies as c', 'c.id', 'a.company_id')
    .join('company_finances as f', 'f.company_id', 'c.id')
    .whereIn('a.status', ['registration', 'bidding'])
    .select(
      'a.id', 'a.status', 'a.reserve_price',
      'a.registration_open_year', 'a.registration_open_month',
      'a.bidding_start_year', 'a.bidding_start_month',
      'a.bidding_end_year', 'a.bidding_end_month',
      'c.id as company_id', 'c.name', 'c.country_id', 'c.industry_id', 'c.is_npc',
      'f.available_cash', 'f.debt', 'f.company_value', 'f.last_arc_profit'
    )
    .orderBy('a.bidding_start_year')
    .orderBy('a.bidding_start_month');

  const clock = await db('world_clock').first();

  const result = [];
  for (const a of auctions) {
    // Current top bid
    const topBid = await db('company_acquisition_bids')
      .where({ acquisition_id: a.id })
      .orderBy('bid_amount', 'desc')
      .select('bid_amount', 'character_id')
      .first();

    // Bid count
    const bidCountRow = await db('company_acquisition_bids')
      .where({ acquisition_id: a.id })
      .count('id as c')
      .first();

    // Active models for the company
    const models = await db('manufacturing_vehicle_models')
      .where({ company_id: a.company_id, status: 'active' })
      .select('name', 'target_segment', 'sale_price');

    const monthsToStart  = monthsElapsed(clock.current_year, clock.current_month, a.bidding_start_year, a.bidding_start_month);
    const monthsToEnd    = monthsElapsed(clock.current_year, clock.current_month, a.bidding_end_year, a.bidding_end_month);
    const debtRatio      = Number(a.company_value) > 0 ? Number(a.debt) / Number(a.company_value) : null;
    const minNextBid     = topBid
      ? Math.ceil(Number(topBid.bid_amount) * (1 + MIN_BID_INCREMENT))
      : Number(a.reserve_price);

    result.push({
      ...a,
      current_top_bid:    topBid ? Number(topBid.bid_amount) : null,
      top_bidder_id:      topBid?.character_id ?? null,
      bid_count:          parseInt(bidCountRow?.c as string) || 0,
      min_next_bid:       minNextBid,
      debt_ratio:         debtRatio,
      active_models:      models,
      months_to_bidding_start: Math.max(0, monthsToStart),
      months_to_bidding_end:   Math.max(0, monthsToEnd),
    });
  }
  return result;
}

// ── Get a character's bids across all active auctions ────────────────────────
export async function getMyBids(characterId: string) {
  const bids = await db('company_acquisition_bids as b')
    .join('company_acquisitions as a', 'a.id', 'b.acquisition_id')
    .join('companies as c', 'c.id', 'a.company_id')
    .where({ 'b.character_id': characterId })
    .whereIn('a.status', ['registration', 'bidding', 'completed'])
    .select(
      'b.id', 'b.bid_amount', 'b.game_year', 'b.game_month',
      'a.id as auction_id', 'a.status as auction_status',
      'a.winner_character_id', 'a.winning_bid_amount',
      'a.bidding_end_year', 'a.bidding_end_month',
      'c.name as company_name', 'c.id as company_id'
    )
    .orderBy('b.updated_at', 'desc');

  return bids.map((b: any) => ({
    ...b,
    is_winning: b.winner_character_id === characterId,
    is_top_bidder: false, // filled below if needed
  }));
}

// ── Place or raise a bid ──────────────────────────────────────────────────────
export async function placeBid({
  auctionId,
  characterId,
  amount,
}: {
  auctionId: string;
  characterId: string;
  amount: number;
}): Promise<any> {
  return db.transaction(async (trx) => {
    const auction = await trx('company_acquisitions').where({ id: auctionId }).first();
    if (!auction) throw new AppError('Auction not found.', 404, 'NOT_FOUND');
    if (auction.status !== 'bidding') {
      throw new AppError(
        auction.status === 'registration'
          ? 'Bidding has not opened yet. The auction is still in the registration phase.'
          : 'This auction is no longer accepting bids.',
        400, 'AUCTION_PHASE_ERROR'
      );
    }

    // Top bid check
    const topBid = await trx('company_acquisition_bids')
      .where({ acquisition_id: auctionId })
      .whereNot({ character_id: characterId }) // exclude own previous bid
      .orderBy('bid_amount', 'desc')
      .first();

    const floor = topBid
      ? Math.ceil(Number(topBid.bid_amount) * (1 + MIN_BID_INCREMENT))
      : Number(auction.reserve_price);

    if (amount < floor) {
      throw new AppError(
        `Bid too low. Minimum bid is $${floor.toLocaleString()} (${topBid ? `5% above current top bid` : 'reserve price'}).`,
        400, 'BID_TOO_LOW'
      );
    }

    // Character funds check
    const charFin = await trx('character_finances').where({ character_id: characterId }).first();
    if (!charFin || Number(charFin.cash_in_hand) < amount) {
      throw new AppError(
        `Insufficient funds. You have $${Number(charFin?.cash_in_hand ?? 0).toLocaleString()} available.`,
        400, 'INSUFFICIENT_FUNDS'
      );
    }

    const clock = await trx('world_clock').first();

    // Upsert bid (raise existing bid or create new)
    const existing = await trx('company_acquisition_bids')
      .where({ acquisition_id: auctionId, character_id: characterId })
      .first();

    if (existing) {
      if (amount <= Number(existing.bid_amount)) {
        throw new AppError('New bid must be higher than your existing bid.', 400, 'BID_TOO_LOW');
      }
      await trx('company_acquisition_bids')
        .where({ id: existing.id })
        .update({ bid_amount: amount, game_year: clock.current_year, game_month: clock.current_month, updated_at: trx.fn.now() });
    } else {
      await trx('company_acquisition_bids').insert({
        acquisition_id: auctionId,
        character_id:   characterId,
        bid_amount:     amount,
        game_year:      clock.current_year,
        game_month:     clock.current_month,
      });
    }

    logger.info(`[Auction] Character ${characterId} bid $${amount} on auction ${auctionId}`);

    return {
      success:      true,
      auction_id:   auctionId,
      your_bid:     amount,
      is_top_bidder: !topBid || amount > Number(topBid.bid_amount),
    };
  });
}

// ── World tick processor — advances auction phases and settles completed ones ─
export async function processAuctions(trx: any, year: number, month: number): Promise<void> {
  // 1. Advance registration → bidding when bidding_start reached
  const toOpen = await trx('company_acquisitions')
    .where({ status: 'registration' })
    .where((q: any) => {
      q.where('bidding_start_year', '<', year)
       .orWhere((q2: any) => {
         q2.where('bidding_start_year', '=', year)
           .where('bidding_start_month', '<=', month);
       });
    });

  for (const a of toOpen) {
    await trx('company_acquisitions').where({ id: a.id }).update({
      status: 'bidding', updated_at: trx.fn.now()
    });
    logger.info(`[Auction] ${a.id} → BIDDING OPENED (Y${year}M${month})`);
  }

  // 2. Settle bidding → completed when bidding_end passed
  const toSettle = await trx('company_acquisitions')
    .where({ status: 'bidding' })
    .where((q: any) => {
      q.where('bidding_end_year', '<', year)
       .orWhere((q2: any) => {
         q2.where('bidding_end_year', '=', year)
           .where('bidding_end_month', '<', month); // strictly past
       });
    });

  for (const a of toSettle) {
    await settleAuction(trx, a, year, month);
  }
}

// ── Internal: settle a single ended auction ───────────────────────────────────
async function settleAuction(trx: any, auction: any, year: number, month: number): Promise<void> {
  const topBid = await trx('company_acquisition_bids')
    .where({ acquisition_id: auction.id })
    .orderBy('bid_amount', 'desc')
    .first();

  if (!topBid || Number(topBid.bid_amount) < Number(auction.reserve_price)) {
    // No valid bids — cancel auction, inject emergency capital into company
    await trx('company_acquisitions').where({ id: auction.id }).update({
      status: 'cancelled', updated_at: trx.fn.now()
    });
    // Emergency bailout: inject 500k cash
    await trx('company_finances').where({ company_id: auction.company_id }).update({
      available_cash: trx.raw('available_cash + 500000'),
      debt: trx.raw('debt + 500000'),
      updated_at: trx.fn.now()
    });
    logger.info(`[Auction] ${auction.id} CANCELLED (no valid bids). Bailout injected.`);
    return;
  }

  const winningAmount = Number(topBid.bid_amount);
  const winnerId      = topBid.character_id;

  // Deduct winning bid from character
  const charFin = await trx('character_finances').where({ character_id: winnerId }).first();
  if (!charFin || Number(charFin.cash_in_hand) < winningAmount) {
    // Winner can't pay — fall to second bidder or cancel
    logger.warn(`[Auction] Winner ${winnerId} can't pay $${winningAmount}. Cancelling.`);
    await trx('company_acquisitions').where({ id: auction.id }).update({
      status: 'cancelled', updated_at: trx.fn.now()
    });
    return;
  }

  await trx('character_finances')
    .where({ character_id: winnerId })
    .decrement('cash_in_hand', winningAmount);

  // Transfer company to winner
  await trx('companies').where({ id: auction.company_id }).update({
    owner_character_id: winnerId,
    status:             'active',
    is_npc:             false,
    npc_personality:    null,
    updated_at:         trx.fn.now(),
  });

  // Clear company debt (distressed acquisition perk)
  await trx('company_finances').where({ company_id: auction.company_id }).update({
    debt:        0,
    updated_at:  trx.fn.now(),
  });

  // Mark auction complete
  await trx('company_acquisitions').where({ id: auction.id }).update({
    status:               'completed',
    winner_character_id:  winnerId,
    winning_bid_amount:   winningAmount,
    updated_at:           trx.fn.now(),
  });

  logger.info(`[Auction] ${auction.id} SETTLED. Winner: ${winnerId}, Amount: $${winningAmount}. Company ${auction.company_id} transferred.`);
}
