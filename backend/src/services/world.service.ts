/**
 * WorldService — Multi-Nation World Orchestration Layer
 *
 * Responsibilities:
 * - Maintain and update the global world state cache in Redis
 * - Provide world, region, and nation summary data to the API layer
 * - Trigger bulk world tick scheduling via QueueService
 * - Expose global modifiers to simulation engines (future integration)
 *
 * World state is cached in Redis under 'world:state' with a configurable TTL.
 * It is recomputed on demand or after each world tick cycle.
 */

import { redis } from '../config/redis';
import { worldRepository } from '../repositories/world.repository';
import { queueService } from './queue.service';
import { WorldEngine } from '../simulation/engines/world.engine';
import { WorldState, WorldNationSummary, RegionalEconomicInfluence, GlobalModifier } from '../types/index';
import { logger } from '../utils/logger';

const WORLD_STATE_CACHE_KEY = 'world:state';
const WORLD_STATE_CACHE_TTL_SECONDS = 300; // 5 minutes

export class WorldService {
  /**
   * Get the current world state.
   *
   * Returns cached Redis value if available.
   * Falls back to full computation from the database if cache is stale or missing.
   */
  public async getWorldState(): Promise<WorldState> {
    try {
      const cached = await redis.get(WORLD_STATE_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as WorldState;
      }
    } catch (err) {
      logger.warn('[WorldService] Failed to read world state cache — recomputing', err);
    }

    return this.recomputeAndCacheWorldState();
  }

  /**
   * Recompute world state from live database data and update Redis cache.
   * Called after world tick batches complete or when cache expires.
   */
  public async recomputeAndCacheWorldState(): Promise<WorldState> {
    logger.info('[WorldService] Recomputing world state from database...');

    // 1. Fetch all nation summaries
    const nationSummaries = await worldRepository.findAllNationSummaries();

    // 2. Fetch latest snapshot metrics (prevGdp, unemployment_rate, crisis state)
    const snapshotMetrics = await worldRepository.findLatestSnapshotMetrics();
    const snapshotMap = new Map(snapshotMetrics.map(s => [s.nation_id, s]));

    // 3. Enrich nation summaries with snapshot data
    const enrichedNations = nationSummaries.map(nation => {
      const snap = snapshotMap.get(nation.id);
      const hasActiveCrisis = this.detectActiveCrisis(snap?.snapshot_data);
      const prevGdp = snap ? snap.gdp : nation.gdp; // use prev snapshot GDP as baseline
      const unemployment_rate = snap ? snap.unemployment_rate : 0.05;

      return {
        ...nation,
        unemployment_rate,
        hasActiveCrisis,
        prevGdp
      };
    });

    // 4. Compute world-level avg GDP growth rate
    const avgGdpGrowthRate = enrichedNations.length > 0
      ? enrichedNations.reduce((sum, n) => {
          const growth = n.prevGdp > 0 ? (n.gdp - n.prevGdp) / n.prevGdp : 0;
          return sum + growth;
        }, 0) / enrichedNations.length
      : 0;

    // 5. Build complete world state
    const worldState = WorldEngine.buildWorldState(enrichedNations, avgGdpGrowthRate);

    // 6. Cache in Redis
    await this.updateWorldCache(worldState);

    logger.info(`[WorldService] World state computed: ${worldState.totalNations} nations, ` +
      `GDP=${worldState.totalGdp.toFixed(0)}, avgCPI=${(worldState.avgCpi * 100).toFixed(2)}%`);

    return worldState;
  }

  /**
   * Persist the computed world state to Redis with TTL.
   */
  public async updateWorldCache(worldState: WorldState): Promise<void> {
    try {
      await redis.set(
        WORLD_STATE_CACHE_KEY,
        JSON.stringify(worldState),
        'EX',
        WORLD_STATE_CACHE_TTL_SECONDS
      );
    } catch (err) {
      logger.error('[WorldService] Failed to update world state cache:', err);
    }
  }

  /**
   * Get all regions with their economic summaries.
   * Uses cached world state if available, otherwise recomputes.
   */
  public async getRegions(): Promise<RegionalEconomicInfluence[]> {
    const worldState = await this.getWorldState();
    return worldState.regions;
  }

  /**
   * Get all nation summaries for a specific region.
   */
  public async getNationsByRegion(region: string): Promise<WorldNationSummary[]> {
    return worldRepository.findNationSummariesByRegion(region);
  }

  /**
   * Get lightweight summaries of all nations (leaderboard / world map data).
   */
  public async getAllNationSummaries(): Promise<WorldNationSummary[]> {
    return worldRepository.findAllNationSummaries();
  }

  /**
   * Get current global modifiers from the cached world state.
   * Returns an empty array if no world state is cached.
   */
  public async getGlobalModifiers(): Promise<GlobalModifier[]> {
    try {
      const worldState = await this.getWorldState();
      return worldState.globalModifiers;
    } catch {
      return [];
    }
  }

  /**
   * Trigger a world tick cycle — enqueue BullMQ jobs for ALL active nations.
   *
   * This is an admin/system-level operation. It:
   * 1. Fetches all nation IDs
   * 2. Bulk-enqueues tick jobs via QueueService
   * 3. Invalidates the world state cache (will be recomputed after ticks complete)
   *
   * @returns The number of nations enqueued and their job IDs
   */
  public async scheduleWorldTick(): Promise<{ nationCount: number; jobIds: string[] }> {
    logger.info('[WorldService] Initiating world tick cycle...');

    const nationIds = await worldRepository.findAllNationIds();
    if (nationIds.length === 0) {
      logger.warn('[WorldService] No nations found for world tick.');
      return { nationCount: 0, jobIds: [] };
    }

    // Enqueue all nation ticks
    const jobIds = await queueService.enqueueWorldTick(nationIds);

    // Invalidate cached world state — it will be recomputed after jobs complete
    await redis.del(WORLD_STATE_CACHE_KEY);

    logger.info(`[WorldService] World tick cycle scheduled: ${nationIds.length} nations, ${jobIds.length} jobs enqueued`);

    return {
      nationCount: nationIds.length,
      jobIds
    };
  }

  /**
   * Detect whether a nation has at least one active crisis in its latest snapshot.
   */
  private detectActiveCrisis(snapshotData: Record<string, any> | undefined): boolean {
    if (!snapshotData) return false;
    const crises = snapshotData?.politics?.crises;
    if (!crises || typeof crises !== 'object') return false;

    // A crisis is active if any crisis object has status === 'active'
    return Object.values(crises).some((c: any) => c?.status === 'active');
  }

  /**
   * Record that an automatic world tick has just fired.
   * Stores the timestamp in Redis for the tick-status endpoint.
   */
  public async recordTickFired(): Promise<void> {
    try {
      await redis.set('world:last_tick_at', Date.now().toString(), 'EX', 86400 * 7); // 7-day TTL
      logger.info('[WorldService] Recorded tick fired timestamp in Redis.');
    } catch (err) {
      logger.warn('[WorldService] Failed to record tick timestamp:', err);
    }
  }

  /**
   * Get tick timing status for the frontend countdown display.
   */
  public async getTickStatus(tickIntervalMs: number): Promise<{
    lastTickAt: number | null;
    nextTickAt: number | null;
    tickIntervalMs: number;
  }> {
    let lastTickAt: number | null = null;
    try {
      const raw = await redis.get('world:last_tick_at');
      if (raw) lastTickAt = parseInt(raw, 10);
    } catch {
      // Redis unavailable — fall back gracefully
    }

    const nextTickAt = lastTickAt ? lastTickAt + tickIntervalMs : null;

    return { lastTickAt, nextTickAt, tickIntervalMs };
  }
}

export const worldService = new WorldService();
