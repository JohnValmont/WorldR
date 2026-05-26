import { Knex } from 'knex';
import { BaseRepository } from './base.repository';
import { Party, PartyMembership } from '../types';

export class PartyRepository extends BaseRepository {
  // ── Parties ────────────────────────────────────────────────────────────────

  public async findByNationId(nationId: string, trx?: Knex.Transaction): Promise<Party[]> {
    return this.getDb(trx)('parties').where({ nation_id: nationId }).orderBy('seats', 'desc');
  }

  public async findById(id: string, trx?: Knex.Transaction): Promise<Party | null> {
    const party = await this.getDb(trx)('parties').where({ id }).first();
    return party || null;
  }

  public async findByName(name: string, nationId: string, trx?: Knex.Transaction): Promise<Party | null> {
    const party = await this.getDb(trx)('parties').where({ name, nation_id: nationId }).first();
    return party || null;
  }

  public async create(
    data: Omit<Party, 'id' | 'created_at' | 'updated_at'>,
    trx?: Knex.Transaction
  ): Promise<Party> {
    const [created] = await this.getDb(trx)('parties').insert(data).returning('*');
    return created;
  }

  public async update(
    id: string,
    data: Partial<Omit<Party, 'id' | 'created_at' | 'updated_at'>>,
    trx?: Knex.Transaction
  ): Promise<Party> {
    const [updated] = await this.getDb(trx)('parties')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return updated;
  }

  public async incrementMemberCount(partyId: string, delta: number, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)('parties')
      .where({ id: partyId })
      .increment('member_count', delta);
  }

  // ── Memberships ───────────────────────────────────────────────────────────

  public async findMembership(userId: string, nationId: string, trx?: Knex.Transaction): Promise<PartyMembership | null> {
    const membership = await this.getDb(trx)('party_memberships')
      .where({ user_id: userId, nation_id: nationId })
      .first();
    return membership || null;
  }

  public async findMembershipByParty(partyId: string, trx?: Knex.Transaction): Promise<PartyMembership[]> {
    return this.getDb(trx)('party_memberships').where({ party_id: partyId });
  }

  public async createMembership(
    data: Omit<PartyMembership, 'id' | 'joined_at' | 'updated_at'>,
    trx?: Knex.Transaction
  ): Promise<PartyMembership> {
    const [created] = await this.getDb(trx)('party_memberships').insert(data).returning('*');
    return created;
  }

  public async deleteMembership(userId: string, partyId: string, trx?: Knex.Transaction): Promise<void> {
    await this.getDb(trx)('party_memberships')
      .where({ user_id: userId, party_id: partyId })
      .delete();
  }

  /**
   * Return all party members with their user info joined in.
   */
  public async findMembersWithUsers(partyId: string, trx?: Knex.Transaction): Promise<any[]> {
    return this.getDb(trx)('party_memberships as pm')
      .join('users as u', 'u.id', 'pm.user_id')
      .where('pm.party_id', partyId)
      .select('pm.role', 'pm.joined_at', 'u.id as user_id', 'u.username', 'u.display_name');
  }
}

export const partyRepository = new PartyRepository();
