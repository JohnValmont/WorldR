/**
 * World API Routes — Multi-Nation World Layer
 *
 * Exposes world state, regional breakdowns, nation leaderboard,
 * and admin-only world tick trigger.
 *
 * All GET endpoints are public (read-only world data).
 * POST /tick is restricted to admin role.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { worldService } from '../../services/world.service';
import { authMiddleware } from '../middlewares/auth.middleware';
import { UnauthorizedError } from '../../utils/errors';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * GET /api/v1/world
 * Returns the full global world state:
 * - Total GDP, avg CPI, avg approval, avg stability, avg unemployment
 * - List of active regions with economic influence metrics
 * - Active migration pressures between nations
 * - Active global modifiers (commodity shocks, contagion events)
 * - Nations currently in crisis
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const worldState = await worldService.getWorldState();
    res.status(200).json(worldState);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/world/regions
 * Returns all active world regions with aggregate economic metrics.
 */
router.get('/regions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const regions = await worldService.getRegions();
    res.status(200).json({ regions });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/world/regions/:region
 * Returns all nations in a specific world region with their summary stats.
 * Region name must be URL-encoded if it contains spaces.
 *
 * Example: GET /api/v1/world/regions/Western%20Europe
 */
router.get('/regions/:region', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { region } = req.params;
    const decodedRegion = decodeURIComponent(region);
    const nations = await worldService.getNationsByRegion(decodedRegion);
    res.status(200).json({
      region: decodedRegion,
      nationCount: nations.length,
      nations
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/world/nations
 * Returns all nation summaries sorted by GDP descending (world leaderboard).
 * Includes: id, name, region, continent, gdp, approval, stability, inflation_cpi, current_tick
 */
router.get('/nations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const nations = await worldService.getAllNationSummaries();

    // Sort by GDP descending (leaderboard)
    const sorted = nations.slice().sort((a, b) => b.gdp - a.gdp);

    res.status(200).json({
      totalNations: sorted.length,
      nations: sorted
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/world/modifiers
 * Returns the current active global modifiers affecting all nations.
 * Useful for frontend overlays showing world events.
 */
router.get('/modifiers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const modifiers = await worldService.getGlobalModifiers();
    res.status(200).json({ modifiers });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/world/tick
 * Admin-only: Trigger a world tick cycle — enqueues BullMQ tick jobs for ALL active nations.
 *
 * This is the primary mechanism for advancing all nations forward simultaneously
 * in a synchronized world tick. Individual nation ticks can still be triggered
 * via POST /api/v1/nations/:nation_id/tick for testing.
 *
 * Returns: { nationCount, jobIds }
 */
router.post('/tick', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can trigger world tick cycles');
    }

    logger.info(`[WorldRoutes] World tick triggered by admin user: ${req.user?.id}`);

    const result = await worldService.scheduleWorldTick();

    res.status(202).json({
      message: 'World tick cycle enqueued successfully',
      nationCount: result.nationCount,
      jobIds: result.jobIds
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/world/state/refresh
 * Admin-only: Force-recompute and refresh the world state cache from live database data.
 * Use when the cache is stale or after bulk data imports.
 */
router.post('/state/refresh', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user?.role !== 'admin') {
      throw new UnauthorizedError('Only administrators can refresh the world state cache');
    }

    const worldState = await worldService.recomputeAndCacheWorldState();

    res.status(200).json({
      message: 'World state cache refreshed successfully',
      worldState
    });
  } catch (error) {
    next(error);
  }
});

export default router;
