import { Knex } from 'knex';
import { BaseRepository } from './base.repository';

export interface Election {
  id: string;
  nation_id: string;
  tick: number;
  status: 'pending' | 'running' | 'completed';
  total_votes: number;
  turnout_rate: number;
  winning_party_id: string | null;
  coalition_formed: boolean;
  created_at: Date;
}

export interface ElectionResult {
  id: string;
  election_id: string;
  party_id: string;
  party_name: string;
  party_abbreviation: string;
  party_color: string;
  votes: number;
  vote_share: number;
  seats: number;
  seat_share: number;
  is_governing: boolean;
  created_at: Date;
}

export class ElectionRepository extends BaseRepository {
  public async findLatestByNationId(nationId: string, trx?: Knex.Transaction): Promise<Election | null> {
    const election = await this.getDb(trx)('elections')
      .where({ nation_id: nationId, status: 'completed' })
      .orderBy('tick', 'desc')
      .first();
    return election || null;
  }

  public async findByNationId(nationId: string, limit = 10, trx?: Knex.Transaction): Promise<Election[]> {
    return this.getDb(trx)('elections')
      .where({ nation_id: nationId, status: 'completed' })
      .orderBy('tick', 'desc')
      .limit(limit);
  }

  public async findWithResultsByNationId(nationId: string, limit = 5, trx?: Knex.Transaction): Promise<Array<Election & { results: ElectionResult[] }>> {
    const elections = await this.findByNationId(nationId, limit, trx);
    const result = await Promise.all(
      elections.map(async (election) => {
        const results = await this.findResultsByElectionId(election.id, trx);
        return { ...election, results };
      })
    );
    return result;
  }

  public async findResultsByElectionId(electionId: string, trx?: Knex.Transaction): Promise<ElectionResult[]> {
    return this.getDb(trx)('election_results')
      .where({ election_id: electionId })
      .orderBy('seats', 'desc');
  }

  public async createElection(data: Omit<Election, 'id' | 'created_at'>, trx?: Knex.Transaction): Promise<Election> {
    const [created] = await this.getDb(trx)('elections').insert(data).returning('*');
    return created;
  }

  public async updateElection(id: string, data: Partial<Omit<Election, 'id' | 'created_at'>>, trx?: Knex.Transaction): Promise<Election> {
    const [updated] = await this.getDb(trx)('elections').where({ id }).update(data).returning('*');
    return updated;
  }

  public async createResult(data: Omit<ElectionResult, 'id' | 'created_at'>, trx?: Knex.Transaction): Promise<ElectionResult> {
    const [created] = await this.getDb(trx)('election_results').insert(data).returning('*');
    return created;
  }
}

export const electionRepository = new ElectionRepository();
