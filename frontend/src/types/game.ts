'use client';
// Shared game types for frontend

export interface Party {
  id: string;
  nation_id: string;
  name: string;
  abbreviation: string;
  ideology: string;
  description: string | null;
  color: string;
  leader_user_id: string | null;
  member_count: number;
  support_share: number;
  seats: number;
  is_governing: boolean;
  founded_tick: number;
}

export interface PartyMembership {
  id: string;
  user_id: string;
  party_id: string;
  nation_id: string;
  role: 'leader' | 'deputy_leader' | 'whip' | 'member';
  joined_at: string;
}

export interface EconomicSector {
  id: string;
  name: string;
  output: number;
  workers: number;
  productivity: number;
  wages: number;
  growth: number;
}

export interface PopulationGroup {
  id: string;
  name: string;
  size: number;
  income: number;
  approval: number;
  ideology: string;
  inflation_sensitivity: number;
  unemployment_sensitivity: number;
}

export interface Tax {
  id: string;
  name: string;
  rate: number;
  revenue: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  allocation: number;
}

export interface Price {
  id: string;
  sector_name: string;
  price_index: number;
  base_price: number;
  inflation_rate: number;
}

export interface Law {
  id: string;
  title: string;
  description: string;
  status: 'proposed' | 'passed' | 'repealed';
  created_at: string;
  effects?: LawEffect[];
}

export interface LawEffect {
  target_type: string;
  target_name: string;
  parameter_name: string;
  modifier_type: 'multiplier' | 'additive';
  modifier_value: number;
}

export interface NationState {
  id: string;
  name: string;
  region: string | null;
  continent: string | null;
  treasury: number;
  debt: number;
  gdp: number;
  inflation_food: number;
  inflation_fuel: number;
  inflation_housing: number;
  inflation_cpi: number;
  approval: number;
  stability: number;
  current_tick: number;
}

export interface ElectionStatus {
  currentTick: number;
  electionCycle: number;
  nextElectionTick: number;
  ticksUntilNext: number;
  totalSeats: number;
  lastElection: any;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'danger' | 'success';
  category: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
