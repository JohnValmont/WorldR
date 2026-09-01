/**
 * drennia.routes.ts
 *
 * Public routes for the Drennia district political map game.
 * Mounted at /api/v1/drennia
 *
 * POST  /actions        — queue a player action (rally/fundraiser)
 * GET   /districts      — full district list with support_json for map rendering
 * GET   /tick/next      — next tick timestamp for the countdown timer
 */

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { submitAction, getDistricts, getNextTick } from '../controllers/drennia.controller';

const router = Router();

// All drennia routes require authentication
router.use(authMiddleware);

// ── Action submission ─────────────────────────────────────────────────────
// POST /api/v1/drennia/actions
// Body: { action_type: 'rally'|'fundraiser', target_type: 'district'|'state', target_id: UUID }
router.post('/actions', submitAction);

// ── District state (for map coloring) ─────────────────────────────────────
// GET /api/v1/drennia/districts
// Returns all 151 districts with support_json, leading party, color_hex
router.get('/districts', getDistricts);

// ── Tick countdown ──────────────────────────────────────────────────────────
// GET /api/v1/drennia/tick/next
// Returns { next_tick_at, current_tick_window }
router.get('/tick/next', getNextTick);

export default router;
