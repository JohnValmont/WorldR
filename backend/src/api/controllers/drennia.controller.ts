/**
 * drennia.controller.ts
 *
 * Handles the action-submission API (Section 2) and the internal tick
 * endpoint (Section 4) for the Drennia district political map game.
 *
 * Public routes:
 *   POST   /api/v1/drennia/actions       — queue a player action
 *   GET    /api/v1/drennia/districts     — current district state for map rendering
 *   GET    /api/v1/drennia/tick/next     — next tick timestamp for countdown
 *
 * Internal routes (shared-secret protected):
 *   POST   /internal/drennia-tick        — resolve queued actions, update districts
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../../config/database';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { resolveTick, ResolvedDistrictState } from '../services/drenniaTick.service';

// ── Action costs ────────────────────────────────────────────────────────────
const ACTION_AP_COST: Record<string, number> = {
  rally:      1,
  fundraiser: 0,    // free — earns treasury gold instead
};

// Fundraiser treasury reward (credited at tick-resolution time)
const FUNDRAISER_TREASURY_REWARD = 200;

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getCharacterForUser(userId: string) {
  const char = await db('characters').where({ user_id: userId }).first();
  if (!char) throw new AppError('No character found for this user', 404, 'NOT_FOUND');
  return char;
}

async function getApForCharacter(characterId: string) {
  const ap = await db('pol_character_ap').where({ character_id: characterId }).first();
  if (!ap) throw new AppError('AP record not found. Make sure you are a registered politician.', 404, 'NOT_FOUND');
  return ap;
}

async function getPartyForCharacter(characterId: string) {
  const membership = await db('pol_party_members').where({ character_id: characterId }).first();
  if (!membership) throw new AppError('You must be in a party to take political actions.', 400, 'BAD_REQUEST');
  return membership;
}

async function getCurrentTickWindow(): Promise<number> {
  const clock = await db('world_clock').first();
  if (!clock) throw new AppError('World clock not found', 500, 'INTERNAL');
  return (clock.pol_current_year ?? 0) * 12 + (clock.pol_current_month ?? 1);
}

// ── POST /actions ────────────────────────────────────────────────────────────
/**
 * Queue a player action (rally or fundraiser) targeting a district or state.
 * Validates AP, deducts cost, inserts into drennia_pending_actions.
 * Does NOT modify district state — that only happens at tick time.
 */
export async function submitAction(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    const { action_type, target_type, target_id } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!action_type || !target_type || !target_id) {
      return next(new AppError('action_type, target_type, and target_id are required', 400, 'BAD_REQUEST'));
    }
    if (!['rally', 'fundraiser'].includes(action_type)) {
      return next(new AppError(`Unknown action_type: ${action_type}. Valid: rally, fundraiser`, 400, 'BAD_REQUEST'));
    }
    if (!['district', 'state'].includes(target_type)) {
      return next(new AppError(`Unknown target_type: ${target_type}. Valid: district, state`, 400, 'BAD_REQUEST'));
    }

    // ── Verify target exists ────────────────────────────────────────────────
    if (target_type === 'district') {
      const district = await db('drennia_districts').where({ id: target_id }).first();
      if (!district) return next(new AppError(`District ${target_id} not found`, 404, 'NOT_FOUND'));
    } else {
      const state = await db('drennia_states').where({ id: target_id }).first();
      if (!state) return next(new AppError(`State ${target_id} not found`, 404, 'NOT_FOUND'));
    }

    // ── Character, AP and party lookup ─────────────────────────────────────
    const character = await getCharacterForUser(userId);
    const ap        = await getApForCharacter(character.id);
    const membership = await getPartyForCharacter(character.id);

    const apCost = ACTION_AP_COST[action_type] ?? 1;

    if (ap.current_ap < apCost) {
      return next(new AppError(
        `Not enough Action Points. You have ${ap.current_ap} AP, this action costs ${apCost} AP.`,
        400,
        'INSUFFICIENT_AP',
      ));
    }

    const tickWindow = await getCurrentTickWindow();

    // ── Transactional: deduct AP + insert pending action ───────────────────
    const action = await db.transaction(async (trx) => {
      if (apCost > 0) {
        await trx('pol_character_ap')
          .where({ character_id: character.id })
          .decrement('current_ap', apCost);
      }

      const [inserted] = await trx('drennia_pending_actions')
        .insert({
          player_id:   character.id,
          party_id:    membership.party_id,
          action_type,
          target_type,
          target_id,
          ap_cost:     apCost,
          tick_window: tickWindow,
          resolved:    false,
        })
        .returning('*');

      return inserted;
    });

    logger.info(`[Drennia] Action queued: ${action_type} by char ${character.id} → ${target_type}:${target_id} (tick ${tickWindow})`);

    return res.status(201).json({
      message: 'Action queued successfully. It will be resolved at the next tick.',
      action,
      ap_remaining: ap.current_ap - apCost,
      tick_window: tickWindow,
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /districts ────────────────────────────────────────────────────────────
/**
 * Returns all 151 districts with current support_json and leading party info.
 * Used by the frontend map to color districts.
 */
export async function getDistricts(req: Request, res: Response, next: NextFunction) {
  try {
    const districts = await db('drennia_districts as d')
      .leftJoin('pol_parties as p', 'd.current_leading_party_id', 'p.id')
      .leftJoin('drennia_states as s', 'd.state_id', 's.id')
      .select(
        'd.id',
        'd.district_number',
        'd.name',
        'd.state_id',
        's.name as state_name',
        's.code as state_code',
        'd.support_json',
        'd.prev_support_json',
        'd.current_leading_party_id',
        'p.name as leading_party_name',
        'p.color_hex as leading_party_color',
        'd.population',
        'd.last_updated_tick',
      )
      .orderBy('d.district_number', 'asc');

    return res.json({ districts, count: districts.length });
  } catch (err) {
    next(err);
  }
}

// ── GET /tick/next ────────────────────────────────────────────────────────────
/**
 * Returns the timestamp of the next scheduled tick.
 * Used by the frontend countdown timer.
 */
export async function getNextTick(req: Request, res: Response, next: NextFunction) {
  try {
    const clock = await db('world_clock').first();
    if (!clock) return next(new AppError('World clock not found', 500, 'INTERNAL'));

    return res.json({
      next_tick_at: clock.pol_next_arc_close_at,
      current_tick_window: (clock.pol_current_year ?? 0) * 12 + (clock.pol_current_month ?? 1),
      pol_current_year:  clock.pol_current_year,
      pol_current_month: clock.pol_current_month,
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /internal/drennia-tick ───────────────────────────────────────────────
/**
 * Section 4: Internal tick endpoint.
 * Protected by X-Tick-Secret header matching TICK_SECRET env var.
 * Loads all pending actions for the current tick window, calls resolveTick(),
 * writes results to DB, inserts tick_history row, clears resolved actions.
 */
export async function processDrenniaTick(req: Request, res: Response, next: NextFunction) {
  try {
    // ── Secret guard ───────────────────────────────────────────────────────
    const secret = req.headers['x-tick-secret'];
    if (!secret || secret !== process.env.TICK_SECRET) {
      return res.status(401).json({ error: 'Unauthorized — invalid or missing X-Tick-Secret' });
    }

    const clock = await db('world_clock').first();
    if (!clock) return res.status(500).json({ error: 'World clock not found' });

    const tickWindow = (clock.pol_current_year ?? 0) * 12 + (clock.pol_current_month ?? 1);
    const tickNumber = tickWindow; // same concept, different name for clarity in history

    logger.info(`[Drennia] Processing tick #${tickNumber} for window ${tickWindow}`);

    // ── Load current districts ──────────────────────────────────────────────
    const districtRows = await db('drennia_districts').orderBy('district_number', 'asc');

    if (districtRows.length === 0) {
      return res.json({
        status: 'skipped',
        reason: 'no_districts',
        message: 'No districts in drennia_districts table. Run the seed data first.',
      });
    }

    // ── Load pending actions for this tick window ──────────────────────────
    const pendingRows = await db('drennia_pending_actions')
      .where({ tick_window: tickWindow, resolved: false });

    logger.info(`[Drennia] Tick #${tickNumber}: ${districtRows.length} districts, ${pendingRows.length} pending actions`);

    // ── Resolve ────────────────────────────────────────────────────────────
    const resolved: ResolvedDistrictState[] = resolveTick(
      districtRows.map(r => ({
        id: r.id,
        district_number: r.district_number,
        state_id: r.state_id,
        name: r.name,
        support_json: r.support_json ?? {},
        current_leading_party_id: r.current_leading_party_id,
        prev_support_json: r.prev_support_json,
        last_updated_tick: r.last_updated_tick ?? 0,
      })),
      pendingRows.map(r => ({
        id: r.id,
        player_id: r.player_id,
        party_id: r.party_id,
        action_type: r.action_type,
        target_type: r.target_type,
        target_id: r.target_id,
      })),
      tickNumber,
      /* applyNoise= */ true,
    );

    // Track leadership changes for summary
    const changes: Array<{ district_number: number; old_leader: string | null; new_leader: string | null }> = [];
    for (let i = 0; i < resolved.length; i++) {
      const old = districtRows[i];
      const nw = resolved[i];
      if (old.current_leading_party_id !== nw.current_leading_party_id) {
        changes.push({
          district_number: nw.district_number,
          old_leader: old.current_leading_party_id,
          new_leader: nw.current_leading_party_id,
        });
      }
    }

    // ── Persist results ────────────────────────────────────────────────────
    await db.transaction(async (trx) => {
      // Update each district
      for (const d of resolved) {
        await trx('drennia_districts')
          .where({ id: d.id })
          .update({
            support_json:             JSON.stringify(d.support_json),
            prev_support_json:        JSON.stringify(d.prev_support_json ?? {}),
            current_leading_party_id: d.current_leading_party_id,
            last_updated_tick:        tickNumber,
          });
      }

      // Mark pending actions as resolved
      if (pendingRows.length > 0) {
        await trx('drennia_pending_actions')
          .where({ tick_window: tickWindow, resolved: false })
          .update({ resolved: true });
      }

      // Handle fundraiser treasury credits
      const fundraisers = pendingRows.filter(r => r.action_type === 'fundraiser');
      for (const f of fundraisers) {
        await trx('pol_parties')
          .where({ id: f.party_id })
          .increment('treasury', FUNDRAISER_TREASURY_REWARD);
      }

      // Insert tick history snapshot
      await trx('drennia_tick_history').insert({
        tick_number:   tickNumber,
        resolved_at:   new Date().toISOString(),
        actions_count: pendingRows.length,
        snapshot_json: JSON.stringify(
          resolved.map(d => ({
            districtId:      d.id,
            districtNumber:  d.district_number,
            leadingPartyId:  d.current_leading_party_id,
            supportJson:     d.support_json,
          })),
        ),
        summary_json: JSON.stringify(changes),
      });
    });

    logger.info(`[Drennia] Tick #${tickNumber} complete. Changes: ${changes.length} leadership flips.`);

    return res.json({
      status:          'ok',
      tick_number:     tickNumber,
      districts_updated: resolved.length,
      actions_resolved: pendingRows.length,
      fundraiser_credits: pendingRows.filter(r => r.action_type === 'fundraiser').length,
      leadership_changes: changes.length,
      changes,
    });
  } catch (err) {
    logger.error('[Drennia] processDrenniaTick error:', err);
    next(err);
  }
}
