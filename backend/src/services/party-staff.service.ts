import { db } from '../config/database';
import {
  partyStaffRepository,
  PartyStaff,
  CreatePartyStaffData,
  STAFF_SALARIES,
  SENIORITY_MULTIPLIERS
} from '../repositories/party-staff.repository';
import { partyRepository } from '../repositories/party.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { NotFoundError, ValidationError, ConflictError, UnauthorizedError } from '../utils/errors';
import { Knex } from 'knex';

const MAX_STAFF_PER_PARTY = 12;

// Action effects by role (base multiplied by seniority)
const STAFF_ACTION_EFFECTS: Record<string, Record<string, any>> = {
  campaign_worker: {
    action: 'organize_rally',
    bloc_outreach_bonus: 0.015,      // % voter outreach improvement
    description: 'Organized a party rally in key district'
  },
  media_advisor: {
    action: 'press_campaign',
    urban_approval_bonus: 0.020,     // approval boost in urban blocs
    description: 'Ran press and social media campaign'
  },
  policy_economist: {
    action: 'draft_policy',
    law_quality_bonus: 0.030,        // improves law passage probability
    description: 'Drafted evidence-based policy proposal'
  },
  party_strategist: {
    action: 'voter_targeting',
    key_bloc_affinity_bonus: 0.020,  // bloc affinity improvement
    description: 'Executed targeted voter outreach strategy'
  },
  recruitment_officer: {
    action: 'member_drive',
    new_members: 10,                 // base members per tick
    description: 'Ran party membership recruitment drive'
  },
  fundraiser: {
    action: 'fundraise',
    funds_min: 250000,
    funds_max: 500000,               // KDM raised per tick
    description: 'Organized fundraising activities'
  },
  parliamentary_whip: {
    action: 'vote_discipline',
    discipline_bonus: 0.08,          // parliament vote discipline
    description: 'Maintained parliamentary discipline'
  }
};

export class PartyStaffService {
  /**
   * Get all active staff for a party.
   */
  public async getStaffForParty(partyId: string, nationId: string): Promise<{
    staff: PartyStaff[];
    totalMonthlyCost: number;
    maxStaff: number;
  }> {
    const party = await partyRepository.findById(partyId);
    if (!party) throw new NotFoundError('Party not found');
    if (party.nation_id !== nationId) throw new ValidationError('Party not in this nation');

    const staff = await partyStaffRepository.findByPartyId(partyId);
    const totalMonthlyCost = await partyStaffRepository.totalMonthlyCostForParty(partyId);

    return { staff, totalMonthlyCost, maxStaff: MAX_STAFF_PER_PARTY };
  }

  /**
   * Hire a new AI staff member for a party.
   * Deducts first month's salary from party funds immediately.
   */
  public async hireStaff(
    userId: string,
    partyId: string,
    nationId: string,
    data: {
      role: string;
      seniority: 'junior' | 'senior' | 'expert';
      name?: string;
    }
  ): Promise<PartyStaff> {
    const party = await partyRepository.findById(partyId);
    if (!party) throw new NotFoundError('Party not found');
    if (party.nation_id !== nationId) throw new ValidationError('Party not in this nation');

    // Validate role
    if (!STAFF_SALARIES[data.role]) {
      throw new ValidationError(`Invalid staff role: ${data.role}`);
    }

    // Check staff limit
    const existing = await partyStaffRepository.findByPartyId(partyId);
    if (existing.length >= MAX_STAFF_PER_PARTY) {
      throw new ConflictError(`Party has reached maximum staff limit of ${MAX_STAFF_PER_PARTY}`);
    }

    const salary = STAFF_SALARIES[data.role][data.seniority];

    // Check party has enough funds for first month
    const currentFunds = Number(party.funds || 0);
    if (currentFunds < salary) {
      throw new ValidationError(`Insufficient party funds. Need ${salary.toLocaleString()} KDM, have ${currentFunds.toLocaleString()} KDM.`);
    }

    const seniorityMultiplier = SENIORITY_MULTIPLIERS[data.seniority];
    const skillLevel = data.seniority === 'junior' ? 0.40 + Math.random() * 0.20
      : data.seniority === 'senior' ? 0.60 + Math.random() * 0.20
      : 0.80 + Math.random() * 0.15;

    return db.transaction(async (trx) => {
      // Deduct first month salary
      await partyRepository.update(partyId, {
        funds: currentFunds - salary,
        monthly_costs: Number(party.monthly_costs || 0) + salary
      }, trx);

      const staffData: CreatePartyStaffData = {
        party_id: partyId,
        nation_id: nationId,
        role: data.role,
        name: data.name || `${data.seniority.charAt(0).toUpperCase() + data.seniority.slice(1)} ${this.roleName(data.role)}`,
        seniority: data.seniority,
        is_ai: true,
        monthly_salary: salary,
        loyalty: 0.70 + Math.random() * 0.20,
        ideology_alignment: 0.65 + Math.random() * 0.25,
        skill_level: skillLevel,
      };

      const staff = await partyStaffRepository.create(staffData, trx);

      await notificationRepository.create({
        user_id: userId,
        nation_id: nationId,
        type: 'success',
        category: 'party',
        title: 'Staff Hired',
        message: `${staff.name} (${data.seniority} ${this.roleName(data.role)}) hired for ${salary.toLocaleString()} KDM/month.`,
        data: { staffId: staff.id, partyId }
      }, trx);

      return staff;
    });
  }

  /**
   * Fire a staff member.
   */
  public async fireStaff(userId: string, staffId: string, partyId: string, nationId: string): Promise<void> {
    const staff = await partyStaffRepository.findById(staffId);
    if (!staff) throw new NotFoundError('Staff member not found');
    if (staff.party_id !== partyId) throw new ValidationError('Staff not in this party');

    const party = await partyRepository.findById(partyId);
    if (!party) throw new NotFoundError('Party not found');

    await db.transaction(async (trx) => {
      await partyStaffRepository.fire(staffId, trx);
      await partyRepository.update(partyId, {
        monthly_costs: Math.max(0, Number(party.monthly_costs || 0) - staff.monthly_salary)
      }, trx);

      await notificationRepository.create({
        user_id: userId,
        nation_id: nationId,
        type: 'info',
        category: 'party',
        title: 'Staff Dismissed',
        message: `${staff.name} has been dismissed from the party.`,
        data: { staffId, partyId }
      }, trx);
    });
  }

  /**
   * Execute monthly staff actions (called by tick engine).
   * Deducts salaries and applies staff effects.
   */
  public async executeMonthlyStaffActions(nationId: string, trx: Knex.Transaction): Promise<{
    partyEffects: Record<string, { fundsChange: number; membersChange: number; disciplineBonus: number; outreachBonus: number }>
  }> {
    const allStaff = await partyStaffRepository.findActiveByNationId(nationId, trx);
    const partyEffects: Record<string, any> = {};

    for (const staff of allStaff) {
      if (!partyEffects[staff.party_id]) {
        partyEffects[staff.party_id] = { fundsChange: 0, membersChange: 0, disciplineBonus: 0, outreachBonus: 0 };
      }

      const party = await partyRepository.findById(staff.party_id);
      if (!party) continue;

      const currentFunds = Number(party.funds || 0);
      const salary = Number(staff.monthly_salary);

      // Check if party can afford salary
      if (currentFunds - partyEffects[staff.party_id].fundsChange < salary) {
        // Auto-fire staff if can't pay
        await partyStaffRepository.fire(staff.id, trx);
        continue;
      }

      partyEffects[staff.party_id].fundsChange -= salary;

      // Apply staff action effect
      const baseEffect = STAFF_ACTION_EFFECTS[staff.role];
      if (baseEffect) {
        const multiplier = SENIORITY_MULTIPLIERS[staff.seniority] * Number(staff.skill_level) * Number(staff.ideology_alignment);

        if (staff.role === 'fundraiser') {
          const raised = (baseEffect.funds_min + Math.random() * (baseEffect.funds_max - baseEffect.funds_min)) * multiplier * 0.5;
          partyEffects[staff.party_id].fundsChange += raised;
        } else if (staff.role === 'recruitment_officer') {
          partyEffects[staff.party_id].membersChange += Math.round(baseEffect.new_members * multiplier);
        } else if (staff.role === 'parliamentary_whip') {
          partyEffects[staff.party_id].disciplineBonus += baseEffect.discipline_bonus * multiplier;
        } else if (staff.role === 'campaign_worker' || staff.role === 'party_strategist') {
          partyEffects[staff.party_id].outreachBonus += (baseEffect.bloc_outreach_bonus || baseEffect.key_bloc_affinity_bonus || 0) * multiplier;
        }

        await partyStaffRepository.recordAction(staff.id, baseEffect.action, { multiplier, effect: baseEffect }, trx);
      }
    }

    // Apply all party effects
    for (const [partyId, effects] of Object.entries(partyEffects)) {
      const party = await partyRepository.findById(partyId);
      if (!party) continue;

      await partyRepository.update(partyId, {
        funds: Math.max(0, Number(party.funds || 0) + effects.fundsChange),
        member_count: Math.max(1, Number(party.member_count || 1) + effects.membersChange),
      }, trx);
    }

    // Increment experience for all active staff
    await partyStaffRepository.incrementExperience(nationId, trx);

    return { partyEffects };
  }

  private roleName(role: string): string {
    const names: Record<string, string> = {
      campaign_worker: 'Campaign Worker',
      media_advisor: 'Media Advisor',
      policy_economist: 'Policy Economist',
      party_strategist: 'Party Strategist',
      recruitment_officer: 'Recruitment Officer',
      fundraiser: 'Fundraiser',
      parliamentary_whip: 'Parliamentary Whip',
    };
    return names[role] || role;
  }
}

export const partyStaffService = new PartyStaffService();
