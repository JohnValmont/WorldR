// Domain Model Interfaces for WORLDr Phase 1

export interface Nation {
  id: string;
  name: string;
  region: string | null;
  continent: string | null;
  continent_id?: string | null;
  governance_system?: string | null;
  parliament_seats?: number;
  election_cycle_months?: number;
  monarch_title?: string | null;
  monarch_name?: string | null;
  monarch_family?: string | null;
  head_of_government_title?: string | null;
  flag_description?: string | null;
  flag_colors?: string | null;
  motto?: string | null;
  currency_name?: string | null;
  currency_code?: string | null;
  population_size?: number;
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
  governance_data?: any;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin' | 'moderator';
  nation_id: string | null;
  is_verified: boolean;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}



export interface EconomicSector {
  id: string;
  nation_id: string;
  name: 'Agriculture' | 'Industry' | 'Services' | 'Energy' | 'Construction';
  output: number;
  workers: number;
  productivity: number;
  wages: number;
  growth: number;
  created_at: Date;
  updated_at: Date;
}

export interface PopulationGroup {
  id: string;
  nation_id: string;
  name: 'Poor' | 'Working' | 'Middle' | 'Wealthy' | 'Elite';
  size: number;
  income: number;
  approval: number;
  ideology: string | null;
  inflation_sensitivity: number;
  unemployment_sensitivity: number;
  created_at: Date;
  updated_at: Date;
}

export interface Tax {
  id: string;
  nation_id: string;
  name: 'Income Tax' | 'Corporate Tax' | 'Sales Tax' | 'Property Tax' | 'Tariffs';
  rate: number;
  revenue: number;
  created_at: Date;
  updated_at: Date;
}

export interface BudgetItem {
  id: string;
  nation_id: string;
  name: 'Education' | 'Healthcare' | 'Infrastructure' | 'Welfare' | 'Administration';
  allocation: number;
  created_at: Date;
  updated_at: Date;
}

export interface Law {
  id: string;
  nation_id: string;
  title: string;
  description: string | null;
  status: 'passed' | 'proposed' | 'repealed';
  created_at: Date;
  updated_at: Date;
}

export interface LawEffect {
  id: string;
  law_id: string;
  target_type: 'sector' | 'population_group' | 'tax' | 'budget_item' | 'nation';
  target_name: string;
  parameter_name: string;
  modifier_type: 'multiplier' | 'additive';
  modifier_value: number;
  created_at: Date;
  updated_at: Date;
}

export interface Parameter {
  id: string;
  category: string;
  name: string;
  value: number;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Price {
  id: string;
  nation_id: string;
  sector_name: 'Agriculture' | 'Industry' | 'Services' | 'Energy' | 'Construction';
  price_index: number;
  base_price: number;
  inflation_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface HistoricalSnapshot {
  id: string;
  nation_id: string;
  tick: number;
  gdp: number;
  inflation_food: number;
  inflation_fuel: number;
  inflation_housing: number;
  inflation_cpi: number;
  unemployment_rate: number;
  approval: number;
  stability: number;
  treasury: number;
  debt: number;
  revenue: number;
  spending: number;
  snapshot_data: Record<string, any>;
  created_at: Date;
}

export interface NationParameterOverride {
  id: string;
  nation_id: string;
  category: string;
  name: string;
  value: number;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  token_hash: string;
  user_id: string;
  expires_at: Date;
  is_revoked: boolean;
  created_at: Date;
}

export interface NationTemplate {
  id: string;
  name: string;
  description: string | null;
  treasury: number;
  debt: number;
  gdp: number;
  inflation_food: number;
  inflation_fuel: number;
  inflation_housing: number;
  inflation_cpi: number;
  approval: number;
  stability: number;
  template_data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AuditLog {
  id: string;
  nation_id: string | null;
  user_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  created_at: Date;
}

// DTO and Simulation helper types
export interface ActiveModifier {
  targetType: 'sector' | 'population_group' | 'tax' | 'budget_item' | 'nation';
  targetName: string;
  parameterName: string;
  modifierType: 'multiplier' | 'additive';
  modifierValue: number;
}

// Multi-Nation World Layer types

export interface WorldNationSummary {
  id: string;
  name: string;
  region: string | null;
  continent: string | null;
  gdp: number;
  approval: number;
  stability: number;
  inflation_cpi: number;
  current_tick: number;
}

export interface RegionalEconomicInfluence {
  region: string;
  avgGdp: number;
  avgGdpGrowthRate: number;
  avgCpi: number;
  avgStability: number;
  avgApproval: number;
  nationCount: number;
  // Modifiers emitted to member nations
  gdpGrowthMod: number;      // additive growth nudge to sectors
  inflationMod: number;      // additive CPI pressure
  stabilityMod: number;      // additive stability pressure
}

export interface MigrationPressure {
  sourceNationId: string;
  targetNationId: string;
  region: string;
  pressureScore: number;         // 0.0–1.0. Higher = stronger pull from source to target
  incomeDifferential: number;    // positive = target has higher avg income
  stabilityDifferential: number; // positive = target has higher stability
  popTransferEstimate: number;   // fractional % of poor+working pop to migrate (0.0–0.05)
}

export interface GlobalModifier {
  name: string;
  description: string;
  activeModifiers: ActiveModifier[];
}

export interface WorldState {
  computedAt: string;                          // ISO timestamp of last computation
  activeTick: number;                          // Max current_tick across all nations
  totalNations: number;
  totalGdp: number;
  avgCpi: number;
  avgApproval: number;
  avgStability: number;
  avgUnemploymentRate: number;
  regions: RegionalEconomicInfluence[];
  migrationPressures: MigrationPressure[];
  globalModifiers: GlobalModifier[];
  crisisNations: string[];                     // Nation IDs with active crises
}

export type WorldRegion =
  | 'Western Europe'
  | 'Eastern Europe'
  | 'North America'
  | 'Latin America'
  | 'Sub-Saharan Africa'
  | 'North Africa'
  | 'Middle East'
  | 'South Asia'
  | 'East Asia'
  | 'Southeast Asia'
  | 'Oceania'
  | 'Central Asia'
  | 'Custom';

// ============================================================================
// Vertical Slice — Party, Profile, Notification, Email Verification Types
// ============================================================================

export type IdeologyType =
  | 'far_left' | 'left' | 'centre_left' | 'centrist'
  | 'centre_right' | 'right' | 'far_right'
  | 'libertarian' | 'authoritarian' | 'green' | 'nationalist';

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  is_used: boolean;
  created_at: Date;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  ideology: IdeologyType;
  avatar_code: string;
  created_at: Date;
  updated_at: Date;
}

export interface Party {
  id: string;
  nation_id: string;
  name: string;
  abbreviation: string;
  ideology: IdeologyType;
  description: string | null;
  slogan?: string | null;
  manifesto?: string | null;
  color: string;
  leader_user_id: string | null;
  member_count: number;
  support_share: number;
  seats: number;
  is_governing: boolean;
  is_ai_controlled: boolean;
  founded_tick: number;
  founded_year?: number | null;
  hq_region?: string | null;
  economic_stance?: string | null;
  social_stance?: string | null;
  funds?: number;
  monthly_income?: number;
  monthly_costs?: number;
  created_at: Date;
  updated_at: Date;
}

export interface PartyMembership {
  id: string;
  user_id: string;
  party_id: string;
  nation_id: string;
  role: 'leader' | 'deputy_leader' | 'whip' | 'member';
  joined_at: Date;
  updated_at: Date;
}

export type NotificationType = 'info' | 'warning' | 'danger' | 'success';
export type NotificationCategory =
  | 'system' | 'economy' | 'politics' | 'law' | 'election' | 'party' | 'crisis' | 'tick';

export interface Notification {
  id: string;
  user_id: string;
  nation_id: string | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  data: Record<string, any> | null;
  is_read: boolean;
  created_at: Date;
  updated_at: Date;
}

