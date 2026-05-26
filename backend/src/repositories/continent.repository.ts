import { db } from '../config/database';

export interface Continent {
  id: string;
  name: string;
  description: string | null;
  political_identity: string | null;
  economic_characteristics: string | null;
  climate_regions: string | null;
  demographic_tendencies: string | null;
  geopolitical_tendencies: string | null;
  created_at: string;
}

export interface GovernanceSystem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  executive_authority_score: number;
  parliament_authority_score: number;
  coalition_threshold: number | null;
  confidence_vote: boolean;
  default_election_cycle_months: number;
  law_passage_threshold: number;
  constitutional_change_threshold: number;
  stability_modifier: number;
  corruption_modifier: number;
  efficiency_modifier: number;
  voter_participation_bonus: number;
  freedom_modifier: number;
  special_rules: Record<string, any>;
  created_at: string;
}

export class ContinentRepository {
  public async findAll(): Promise<Continent[]> {
    return db('continents').orderBy('name');
  }

  public async findById(id: string): Promise<Continent | null> {
    return db('continents').where({ id }).first() || null;
  }

  public async findByName(name: string): Promise<Continent | null> {
    return db('continents').where({ name }).first() || null;
  }
}

export class GovernanceSystemRepository {
  public async findAll(): Promise<GovernanceSystem[]> {
    return db('governance_systems').orderBy('name');
  }

  public async findByCode(code: string): Promise<GovernanceSystem | null> {
    return db('governance_systems').where({ code }).first() || null;
  }

  public async findById(id: string): Promise<GovernanceSystem | null> {
    return db('governance_systems').where({ id }).first() || null;
  }
}

export const continentRepository = new ContinentRepository();
export const governanceSystemRepository = new GovernanceSystemRepository();
