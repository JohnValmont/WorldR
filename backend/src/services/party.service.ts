import { db } from '../config/database';
import { partyRepository } from '../repositories/party.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { nationRepository } from '../repositories/nation.repository';
import { Party, IdeologyType } from '../types';
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from '../utils/errors';

export class PartyService {
  /**
   * Get all parties for a nation with enriched member counts.
   */
  public async getPartiesForNation(nationId: string): Promise<Party[]> {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');
    return partyRepository.findByNationId(nationId);
  }

  /**
   * Get a single party with its member list.
   */
  public async getPartyDetails(partyId: string): Promise<{ party: Party; members: any[] }> {
    const party = await partyRepository.findById(partyId);
    if (!party) throw new NotFoundError('Party not found');
    const realMembers = await partyRepository.findMembersWithUsers(partyId);

    // Dynamic but stable/deterministic AI names based on partyId
    const FIRST_NAMES = [
      'Enver', 'Dorian', 'Bora', 'Skerdilaid', 'Ardit', 'Besart', 'Fisnik', 'Valon', 'Luan', 'Driton',
      'Artan', 'Armend', 'Ardian', 'Viktor', 'Edon', 'Genci', 'Ilir', 'Ylli', 'Arben', 'Gent'
    ];
    const LAST_NAMES = [
      'Bala', 'Ferati', 'Rama', 'Kurti', 'Dervishi', 'Gjoka', 'Murati', 'Hoti', 'Prenga', 'Duka',
      'Vane', 'Krasniqi', 'Gashi', 'Hoxha', 'Shehu', 'Leka', 'Alimi', 'Pacolli', 'Basha', 'Berisha'
    ];

    function getDeterministicName(pId: string, roleName: string): string {
      let hash = 0;
      const str = pId + roleName;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const firstIdx = Math.abs(hash) % FIRST_NAMES.length;
      const lastIdx = Math.abs(hash >> 2) % LAST_NAMES.length;
      return `${FIRST_NAMES[firstIdx]} ${LAST_NAMES[lastIdx]}`;
    }

    const allRoles = [
      'leader',
      'deputy_leader',
      'secretary_general',
      'treasurer',
      'campaign_manager',
      'policy_chief',
      'media_manager',
      'whip'
    ];

    const filledRoles = realMembers.map(m => m.role);
    const formattedMembers = realMembers.map(m => ({
      user_id: m.user_id,
      username: m.username,
      display_name: m.display_name,
      role: m.role,
      joined_at: m.joined_at,
      is_ai: false
    }));

    for (const role of allRoles) {
      if (!filledRoles.includes(role)) {
        const name = getDeterministicName(partyId, role);
        formattedMembers.push({
          user_id: `ai-${role}-${partyId}`,
          username: `ai_${role}`,
          display_name: name,
          role: role,
          joined_at: party.created_at,
          is_ai: true
        });
      }
    }

    return { party, members: formattedMembers };
  }

  /**
   * Get the user's current party membership for a nation.
   */
  public async getUserParty(userId: string, nationId: string): Promise<{ party: Party | null; membership: any | null }> {
    const membership = await partyRepository.findMembership(userId, nationId);
    if (!membership) return { party: null, membership: null };
    const party = await partyRepository.findById(membership.party_id);
    return { party, membership };
  }

  /**
   * Create a new political party.
   * The creating user automatically becomes the leader.
   */
  public async createParty(
    userId: string,
    nationId: string,
    data: {
      name: string;
      abbreviation: string;
      ideology: IdeologyType;
      description?: string;
      color?: string;
    }
  ): Promise<Party> {
    const nation = await nationRepository.findById(nationId);
    if (!nation) throw new NotFoundError('Nation not found');

    // Ensure user doesn't already have a party membership in this nation
    const existingMembership = await partyRepository.findMembership(userId, nationId);
    if (existingMembership) {
      throw new ConflictError('You are already a member of a political party in this nation');
    }

    // Limit to max 6 political parties per nation
    const existingParties = await partyRepository.findByNationId(nationId);
    if (existingParties.length >= 6) {
      throw new ValidationError('This nation has reached the maximum of 6 political parties.');
    }

    // Check name uniqueness
    const existing = await partyRepository.findByName(data.name, nationId);
    if (existing) {
      throw new ConflictError(`Party name "${data.name}" is already taken in this nation`);
    }

    if (!data.name || data.name.length < 3 || data.name.length > 100) {
      throw new ValidationError('Party name must be between 3 and 100 characters');
    }
    if (!data.abbreviation || data.abbreviation.length < 1 || data.abbreviation.length > 10) {
      throw new ValidationError('Abbreviation must be between 1 and 10 characters');
    }

    return db.transaction(async (trx) => {
      // Create the party — include all non-nullable DB columns
      const party = await partyRepository.create({
        nation_id: nationId,
        name: data.name,
        abbreviation: data.abbreviation.toUpperCase(),
        ideology: data.ideology,
        description: data.description || null,
        color: data.color || '#6b7280',
        leader_user_id: userId,
        member_count: 1,
        support_share: 0,
        seats: 0,
        is_governing: false,
        is_ai_controlled: false,
        economic_stance: 'centre',
        social_stance: 'centre',
        funds: 500000,
        founded_tick: nation.current_tick
      }, trx);

      // Create leader membership
      await partyRepository.createMembership({
        user_id: userId,
        party_id: party.id,
        nation_id: nationId,
        role: 'leader'
      }, trx);

      // Notify the user
      await notificationRepository.create({
        user_id: userId,
        nation_id: nationId,
        type: 'success',
        category: 'party',
        title: 'Party Founded',
        message: `You have founded the ${party.name} (${party.abbreviation}). You are now the party leader.`,
        data: { partyId: party.id }
      }, trx);

      return party;
    });
  }

  /**
   * Join an existing party.
   */
  public async joinParty(userId: string, partyId: string, nationId: string): Promise<void> {
    const party = await partyRepository.findById(partyId);
    if (!party) throw new NotFoundError('Party not found');
    if (party.nation_id !== nationId) throw new ValidationError('Party does not belong to this nation');

    const existingMembership = await partyRepository.findMembership(userId, nationId);
    if (existingMembership) {
      throw new ConflictError('You are already a member of a party in this nation. Leave your current party first.');
    }

    // Limit to max 2 real players per party
    const existingMembers = await partyRepository.findMembershipByParty(partyId);
    if (existingMembers.length >= 2) {
      throw new ValidationError('This party is already full (maximum 2 real players allowed).');
    }

    await db.transaction(async (trx) => {
      await partyRepository.createMembership({
        user_id: userId,
        party_id: partyId,
        nation_id: nationId,
        role: 'member'
      }, trx);

      await partyRepository.incrementMemberCount(partyId, 1, trx);

      await notificationRepository.create({
        user_id: userId,
        nation_id: nationId,
        type: 'info',
        category: 'party',
        title: 'Joined Party',
        message: `You have joined the ${party.name} (${party.abbreviation}).`,
        data: { partyId: party.id }
      }, trx);
    });
  }

  /**
   * Leave a party.
   */
  public async leaveParty(userId: string, nationId: string): Promise<void> {
    const membership = await partyRepository.findMembership(userId, nationId);
    if (!membership) throw new NotFoundError('You are not a member of any party in this nation');

    const party = await partyRepository.findById(membership.party_id);
    if (!party) throw new NotFoundError('Party not found');

    // Leaders cannot leave if they have members — must transfer leadership first
    if (membership.role === 'leader' && party.member_count > 1) {
      throw new ValidationError('As party leader, you must transfer leadership before leaving');
    }

    await db.transaction(async (trx) => {
      await partyRepository.deleteMembership(userId, membership.party_id, trx);

      if (party.member_count > 1) {
        await partyRepository.incrementMemberCount(membership.party_id, -1, trx);
      }

      // If leader leaves and they were last member, party still exists but leaderless
      if (membership.role === 'leader' && party.member_count === 1) {
        await partyRepository.update(membership.party_id, { leader_user_id: null }, trx);
      }
    });
  }
}

export const partyService = new PartyService();
