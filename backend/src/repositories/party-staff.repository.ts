import { db } from '../config/database';
import { Knex } from 'knex';

export interface PartyStaff {
  id: string;
  party_id: string;
  nation_id: string;
  role: string;
  name: string;
  seniority: 'junior' | 'senior' | 'expert';
  is_ai: boolean;
  monthly_salary: number;
  loyalty: number;
  ideology_alignment: number;
  skill_level: number;
  experience_months: number;
  last_action: string | null;
  last_action_result: Record<string, any> | null;
  is_active: boolean;
  hired_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePartyStaffData {
  party_id: string;
  nation_id: string;
  role: string;
  name: string;
  seniority: 'junior' | 'senior' | 'expert';
  is_ai: boolean;
  monthly_salary: number;
  loyalty: number;
  ideology_alignment: number;
  skill_level: number;
}

// Monthly salary lookup by role and seniority
export const STAFF_SALARIES: Record<string, Record<string, number>> = {
  campaign_worker:     { junior: 45000,  senior: 67500,  expert: 99000 },
  media_advisor:       { junior: 95000,  senior: 142500, expert: 209000 },
  policy_economist:    { junior: 120000, senior: 180000, expert: 264000 },
  party_strategist:    { junior: 160000, senior: 240000, expert: 352000 },
  recruitment_officer: { junior: 65000,  senior: 97500,  expert: 143000 },
  fundraiser:          { junior: 80000,  senior: 120000, expert: 176000 },
  parliamentary_whip:  { junior: 75000,  senior: 112500, expert: 165000 },
};

// Effectiveness multipliers by seniority
export const SENIORITY_MULTIPLIERS: Record<string, number> = {
  junior: 1.0,
  senior: 1.5,
  expert: 2.2,
};

export class PartyStaffRepository {
  private table = 'party_staff';

  public async findByPartyId(partyId: string, trx?: Knex.Transaction): Promise<PartyStaff[]> {
    return (trx || db)(this.table).where({ party_id: partyId, is_active: true }).orderBy('role');
  }

  public async findActiveByNationId(nationId: string, trx?: Knex.Transaction): Promise<PartyStaff[]> {
    return (trx || db)(this.table).where({ nation_id: nationId, is_active: true });
  }

  public async findById(id: string, trx?: Knex.Transaction): Promise<PartyStaff | null> {
    return (trx || db)(this.table).where({ id }).first() || null;
  }

  public async create(data: CreatePartyStaffData, trx?: Knex.Transaction): Promise<PartyStaff> {
    const [staff] = await (trx || db)(this.table).insert(data).returning('*');
    return staff;
  }

  public async fire(id: string, trx?: Knex.Transaction): Promise<void> {
    await (trx || db)(this.table).where({ id }).update({ is_active: false, updated_at: new Date() });
  }

  public async recordAction(id: string, action: string, result: Record<string, any>, trx?: Knex.Transaction): Promise<void> {
    await (trx || db)(this.table).where({ id }).update({
      last_action: action,
      last_action_result: JSON.stringify(result),
      experience_months: db.raw('experience_months + 1'),
      updated_at: new Date()
    });
  }

  public async totalMonthlyCostForParty(partyId: string, trx?: Knex.Transaction): Promise<number> {
    const result = await (trx || db)(this.table)
      .where({ party_id: partyId, is_active: true })
      .sum('monthly_salary as total');
    return Number(result[0]?.total || 0);
  }

  public async incrementExperience(nationId: string, trx?: Knex.Transaction): Promise<void> {
    await (trx || db)(this.table)
      .where({ nation_id: nationId, is_active: true })
      .update({ experience_months: db.raw('experience_months + 1'), updated_at: new Date() });
  }
}

export const partyStaffRepository = new PartyStaffRepository();
