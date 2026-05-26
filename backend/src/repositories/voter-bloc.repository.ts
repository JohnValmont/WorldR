import { db } from '../config/database';
import { Knex } from 'knex';

export interface VoterBloc {
  id: string;
  nation_id: string;
  code: string;
  name: string;
  population_share: number;
  age_profile: string | null;
  primary_ideology: string | null;
  secondary_ideology: string | null;
  income_min: number;
  income_max: number;
  geography: string | null;
  inflation_sensitivity: number;
  unemployment_sensitivity: number;
  welfare_dependence: number;
  turnout_rate: number;
  approval: number;
  issue_priorities: string[];
  created_at: string;
  updated_at: string;
}

export interface VoterBlocPartyAffinity {
  id: string;
  voter_bloc_id: string;
  party_id: string;
  nation_id: string;
  base_affinity: number;
  current_affinity: number;
}

export class VoterBlocRepository {
  private table = 'voter_blocs';
  private affinityTable = 'voter_bloc_party_affinity';

  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<VoterBloc[]> {
    const q = (trx || db)(this.table).where({ nation_id: nationId }).orderBy('code');
    return q;
  }

  public async findById(id: string, trx?: Knex.Transaction): Promise<VoterBloc | null> {
    const q = (trx || db)(this.table).where({ id }).first();
    return q || null;
  }

  public async findByCode(nationId: string, code: string, trx?: Knex.Transaction): Promise<VoterBloc | null> {
    const q = (trx || db)(this.table).where({ nation_id: nationId, code }).first();
    return q || null;
  }

  public async updateApproval(id: string, approval: number, trx?: Knex.Transaction): Promise<void> {
    await (trx || db)(this.table)
      .where({ id })
      .update({ approval: Math.min(1, Math.max(0, approval)), updated_at: new Date() });
  }

  public async updateManyApprovals(updates: Array<{ id: string; approval: number }>, trx?: Knex.Transaction): Promise<void> {
    const now = new Date();
    for (const u of updates) {
      await (trx || db)(this.table)
        .where({ id: u.id })
        .update({ approval: Math.min(1, Math.max(0, u.approval)), updated_at: now });
    }
  }

  public async findAffinitiesForNation(nationId: string, trx?: Knex.Transaction): Promise<VoterBlocPartyAffinity[]> {
    return (trx || db)(this.affinityTable).where({ nation_id: nationId });
  }

  public async findAffinitiesForParty(partyId: string, trx?: Knex.Transaction): Promise<VoterBlocPartyAffinity[]> {
    return (trx || db)(this.affinityTable).where({ party_id: partyId });
  }

  public async updateAffinity(blocId: string, partyId: string, currentAffinity: number, trx?: Knex.Transaction): Promise<void> {
    await (trx || db)(this.affinityTable)
      .where({ voter_bloc_id: blocId, party_id: partyId })
      .update({ current_affinity: Math.min(1, Math.max(0, currentAffinity)), updated_at: new Date() });
  }
}

export const voterBlocRepository = new VoterBlocRepository();
