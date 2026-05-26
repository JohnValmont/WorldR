/**
 * WorldRepository — Cross-Nation Database Queries for World Layer
 *
 * Provides lightweight bulk queries over all nations for:
 * - World state aggregation (WorldEngine inputs)
 * - Region filtering
 * - Nation ID enumeration for bulk tick scheduling
 *
 * All queries are read-only and optimized for the world tick cycle.
 */

import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { WorldNationSummary } from '../types/index';

export class WorldRepository extends BaseRepository {
  /**
   * Return lightweight summaries of ALL nations for world aggregation.
   * Does not lock rows — read-only operation.
   */
  public async findAllNationSummaries(trx?: Knex.Transaction): Promise<WorldNationSummary[]> {
    return this.getDb(trx)('nations').select(
      'id',
      'name',
      'region',
      'continent',
      'gdp',
      'approval',
      'stability',
      'inflation_cpi',
      'current_tick'
    );
  }

  /**
   * Return nation summaries filtered by region.
   */
  public async findNationSummariesByRegion(
    region: string,
    trx?: Knex.Transaction
  ): Promise<WorldNationSummary[]> {
    return this.getDb(trx)('nations')
      .select('id', 'name', 'region', 'continent', 'gdp', 'approval', 'stability', 'inflation_cpi', 'current_tick')
      .where({ region });
  }

  /**
   * Return only nation IDs for bulk tick scheduling.
   */
  public async findAllNationIds(trx?: Knex.Transaction): Promise<string[]> {
    const rows = await this.getDb(trx)('nations').select('id');
    return rows.map((r: { id: string }) => r.id);
  }

  /**
   * Return distinct regions and their nation counts.
   */
  public async findRegionSummaries(trx?: Knex.Transaction): Promise<{ region: string | null; count: number }[]> {
    const rows = await this.getDb(trx)('nations')
      .select('region')
      .count('id as count')
      .groupBy('region');
    return rows.map((r: any) => ({
      region: r.region,
      count: Number(r.count)
    }));
  }

  /**
   * Return latest historical snapshot for each nation (for prevGdp and unemployment_rate).
   * Uses a subquery to get the most recent snapshot per nation.
   */
  public async findLatestSnapshotMetrics(trx?: Knex.Transaction): Promise<{
    nation_id: string;
    gdp: number;
    unemployment_rate: number;
    snapshot_data: Record<string, any>;
  }[]> {
    const db = this.getDb(trx);

    // Use DISTINCT ON to get latest snapshot per nation (PostgreSQL specific)
    const rows = await db.raw(`
      SELECT DISTINCT ON (nation_id)
        nation_id,
        gdp,
        unemployment_rate,
        snapshot_data
      FROM historical_snapshots
      ORDER BY nation_id, tick DESC
    `);

    return rows.rows.map((r: any) => ({
      nation_id: r.nation_id,
      gdp: Number(r.gdp),
      unemployment_rate: Number(r.unemployment_rate),
      snapshot_data: typeof r.snapshot_data === 'string'
        ? JSON.parse(r.snapshot_data)
        : r.snapshot_data
    }));
  }
}

export const worldRepository = new WorldRepository();
