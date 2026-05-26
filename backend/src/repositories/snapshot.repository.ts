import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { HistoricalSnapshot } from '../types';

export class SnapshotRepository extends BaseRepository {
  public async create(snapshot: Omit<HistoricalSnapshot, 'id' | 'created_at'>, trx?: Knex.Transaction): Promise<HistoricalSnapshot> {
    const dataToInsert = {
      ...snapshot,
      snapshot_data: typeof snapshot.snapshot_data === 'string'
        ? snapshot.snapshot_data
        : JSON.stringify(snapshot.snapshot_data)
    };

    const [created] = await this.getDb(trx)('historical_snapshots').insert(dataToInsert).returning('*');
    return created;
  }

  public async findByNationId(nationId: string, limit: number = 36, trx?: Knex.Transaction): Promise<HistoricalSnapshot[]> {
    return this.getDb(trx)('historical_snapshots')
      .where({ nation_id: nationId })
      .orderBy('tick', 'desc')
      .limit(limit);
  }
}
export const snapshotRepository = new SnapshotRepository();
