export type NationalStat = 
  | 'prosperity' 
  | 'cost_of_living' 
  | 'fiscal_health' 
  | 'equity' 
  | 'human_development' 
  | 'order_safety' 
  | 'freedom_rights' 
  | 'bureaucracy' 
  | 'global_standing';

export const NATIONAL_STATS: NationalStat[] = [
  'prosperity',
  'cost_of_living',
  'fiscal_health',
  'equity',
  'human_development',
  'order_safety',
  'freedom_rights',
  'bureaucracy',
  'global_standing'
];

export type StatLagClass = 'F' | 'B' | 'S' | 'D' | 'NONE';

export const STAT_LAG_CLASSES: Record<NationalStat, { class: StatLagClass, lagMonths: number }> = {
  fiscal_health: { class: 'F', lagMonths: 6 }, // 0.5y
  prosperity: { class: 'B', lagMonths: 24 }, // 2y (default)
  cost_of_living: { class: 'B', lagMonths: 18 }, // 1.5y
  equity: { class: 'B', lagMonths: 18 }, // 1.5y
  human_development: { class: 'S', lagMonths: 84 }, // 7y
  order_safety: { class: 'B', lagMonths: 24 }, // 2y
  freedom_rights: { class: 'S', lagMonths: 60 }, // 5y
  global_standing: { class: 'D', lagMonths: 18 }, // 1.5y
  bureaucracy: { class: 'NONE', lagMonths: 0 }, // Special handling
};

export type MechanismType = 
  | 'rate_law' 
  | 'rate_law_enforcement' 
  | 'central_bank' 
  | 'regulatory' 
  | 'spending_program' 
  | 'spending_overhaul' 
  | 'institutional_capacity';

export const MECHANISM_BASE_ROLLOUT: Record<MechanismType, number> = {
  rate_law: 6, // 0.5y
  rate_law_enforcement: 9, // 0.75y
  central_bank: 3, // 0.25y
  regulatory: 12, // 1y
  spending_program: 24, // 2y
  spending_overhaul: 36, // 3y
  institutional_capacity: 36, // 3y
};

export interface PolicyOptionDef {
  id: string;
  name: string;
  description?: string;
  tags: string[]; // Ideology tags
  effects: Partial<Record<NationalStat, number>>;
  specialLagOverride?: Partial<Record<NationalStat, number>>; // Lag in months
}

export interface PolicyCategoryDef {
  id: string;
  name: string;
  mechanism: MechanismType;
  options: PolicyOptionDef[];
}

// PART 5 - Policy Catalog
export const POLICY_CATALOG: PolicyCategoryDef[] = [
  {
    id: 'income_tax',
    name: 'Income Tax',
    mechanism: 'rate_law',
    options: [
      { id: 'none', name: 'No Income Tax', effects: { fiscal_health: -8, prosperity: 3, equity: -10 }, tags: ['LOW TAXES', 'PRIVATE-LEAN'] },
      { id: 'flat_low', name: 'Low Flat Tax (10%)', effects: { fiscal_health: 4, prosperity: 1, equity: -4 }, tags: ['LOW TAXES'] },
      { id: 'flat_med', name: 'Medium Flat Tax (20%)', effects: { fiscal_health: 8, prosperity: 0, equity: 0 }, tags: [] },
      { id: 'flat_high', name: 'High Flat Tax (35%)', effects: { fiscal_health: 12, prosperity: -3, equity: 3 }, tags: [] },
      { id: 'prog_mod', name: 'Progressive (Moderate)', effects: { fiscal_health: 9, prosperity: -1, equity: 7 }, tags: ['TAX THE WEALTHY'] },
      { id: 'prog_steep', name: 'Progressive (Steep)', effects: { fiscal_health: 13, prosperity: -4, equity: 14, global_standing: -1 }, tags: ['TAX THE WEALTHY'] }
    ]
  },
  {
    id: 'corp_tax',
    name: 'Corporate Tax',
    mechanism: 'rate_law',
    options: [
      { id: 'holiday', name: 'Tax Holiday (Targeted)', effects: { fiscal_health: -2, prosperity: 2, global_standing: 1 }, tags: ['LOW TAXES'] },
      { id: 'low', name: 'Low (12%)', effects: { fiscal_health: 2, prosperity: 2, global_standing: 2 }, tags: ['LOW TAXES', 'PRIVATE-LEAN'] },
      { id: 'med', name: 'Medium (22%)', effects: { fiscal_health: 5, prosperity: 0, global_standing: 0 }, tags: [] },
      { id: 'high', name: 'High (32%)', effects: { fiscal_health: 7, prosperity: -2, global_standing: -1 }, tags: ['TAX THE WEALTHY'] },
      { id: 'high_loophole', name: 'High + Loophole Closure', effects: { fiscal_health: 9, prosperity: -2, global_standing: -1, bureaucracy: 1 }, tags: ['TAX THE WEALTHY', 'BOLD REFORM'] }
    ]
  },
  {
    id: 'tariffs',
    name: 'Trade Tariffs',
    mechanism: 'rate_law_enforcement',
    options: [
      { id: 'free_trade', name: 'Free Trade', effects: { prosperity: 3, order_safety: -1, global_standing: 5 }, tags: ['OPEN MARKETS'] },
      { id: 'moderate', name: 'Moderate Tariffs (10%)', effects: { prosperity: 0, order_safety: 1, global_standing: 0 }, tags: [] },
      { id: 'high', name: 'High Protectionism (25%+)', effects: { prosperity: -3, order_safety: 2, global_standing: -4, cost_of_living: -1 }, tags: ['PROTECT INDUSTRY'] },
      { id: 'targeted', name: 'Selective/Targeted', effects: { prosperity: -1, order_safety: 1, global_standing: -1 }, tags: ['PROTECT INDUSTRY'] }
    ]
  },
  {
    id: 'min_wage',
    name: 'Minimum Wage',
    mechanism: 'regulatory',
    options: [
      { id: 'none', name: 'None', effects: { cost_of_living: -2, equity: -5, prosperity: 1 }, tags: ['EMPLOYER-LED'] },
      { id: 'low', name: 'Low (30% median)', effects: { cost_of_living: 0, equity: 1, prosperity: 0 }, tags: [] },
      { id: 'med', name: 'Moderate (50% median)', effects: { cost_of_living: 3, equity: 5, prosperity: -1 }, tags: [] },
      { id: 'high', name: 'High (65% median)', effects: { cost_of_living: 5, equity: 8, prosperity: -3 }, tags: ['WORKER-FIRST'] },
      { id: 'very_high', name: 'Very High (80%+)', effects: { cost_of_living: 8, equity: 10, prosperity: -6 }, tags: ['WORKER-FIRST'] }
    ]
  },
  {
    id: 'welfare',
    name: 'Welfare / Unemployment',
    mechanism: 'spending_program',
    options: [
      { id: 'minimal', name: 'Minimal safety net', effects: { equity: -3, cost_of_living: -2, fiscal_health: 2 }, tags: ['LOW TAXES', 'EMPLOYER-LED'] },
      { id: 'standard', name: 'Standard UI', effects: { equity: 0, cost_of_living: 0, fiscal_health: 0 }, tags: [] },
      { id: 'expanded', name: 'Expanded welfare state', effects: { equity: 6, cost_of_living: 5, fiscal_health: -4 }, tags: ['TAX THE WEALTHY', 'WORKER-FIRST'] },
      { id: 'ubi_pilot', name: 'UBI Pilot (regional)', effects: { equity: 4, cost_of_living: 4, fiscal_health: -3 }, tags: ['BOLD REFORM'] },
      { id: 'ubi_full', name: 'UBI Full National', effects: { equity: 10, cost_of_living: 8, fiscal_health: -12 }, tags: ['BOLD REFORM', 'TAX THE WEALTHY'] }
    ]
  },
  {
    id: 'healthcare',
    name: 'Healthcare System',
    mechanism: 'spending_overhaul',
    options: [
      { id: 'market', name: 'Market-only (4% GDP)', effects: { human_development: 2, fiscal_health: 3 }, tags: ['PRIVATE-LEAN'] },
      { id: 'hybrid', name: 'Public-private hybrid (6%)', effects: { human_development: 6, fiscal_health: 0 }, tags: [] },
      { id: 'universal', name: 'Universal single-payer (9%)', effects: { human_development: 10, fiscal_health: -6 }, tags: ['TAX THE WEALTHY', 'BOLD REFORM'] }
    ]
  },
  {
    id: 'education',
    name: 'Education Funding',
    mechanism: 'spending_program',
    options: [
      { id: 'low', name: 'Low (3% GDP)', effects: { human_development: 1, fiscal_health: 2, equity: 0 }, tags: [], specialLagOverride: { human_development: 84, equity: 84 } },
      { id: 'med', name: 'Medium (5% GDP)', effects: { human_development: 4, fiscal_health: 0, equity: 2 }, tags: [], specialLagOverride: { human_development: 84, equity: 84 } },
      { id: 'high', name: 'High (7.5% GDP)', effects: { human_development: 7, fiscal_health: -4, equity: 5 }, tags: [], specialLagOverride: { human_development: 84, equity: 84 } },
      { id: 'voucher', name: 'Voucher/School-choice', effects: { human_development: 3, fiscal_health: 0, equity: 0 }, tags: ['PRIVATE-LEAN', 'BOLD REFORM'], specialLagOverride: { human_development: 84, equity: 84 } }
    ]
  },
  {
    id: 'interest_rate',
    name: 'Interest Rate',
    mechanism: 'central_bank',
    options: [
      { id: 'loose', name: 'Loose (1%)', effects: { cost_of_living: -2, prosperity: 2 }, tags: [] },
      { id: 'neutral', name: 'Neutral (4%)', effects: { cost_of_living: 0, prosperity: 0 }, tags: [] },
      { id: 'tight', name: 'Tight (8%)', effects: { cost_of_living: 3, prosperity: -2 }, tags: [] }
    ]
  },
  {
    id: 'immigration',
    name: 'Immigration Policy',
    mechanism: 'regulatory',
    options: [
      { id: 'closed', name: 'Closed Borders', effects: { prosperity: -1, cost_of_living: 0, global_standing: -2 }, tags: [] },
      { id: 'skilled', name: 'Restricted/Skilled-only', effects: { prosperity: 1, cost_of_living: 0, global_standing: 0 }, tags: [] },
      { id: 'moderate', name: 'Moderate/Points-based', effects: { prosperity: 2, cost_of_living: -1, global_standing: 1 }, tags: [] },
      { id: 'open', name: 'Open Immigration', effects: { prosperity: 3, cost_of_living: -1, global_standing: 2 }, tags: [] }
    ]
  },
  {
    id: 'defense',
    name: 'Defense Spending',
    mechanism: 'spending_program',
    options: [
      { id: 'minimal', name: 'Minimal (1% GDP)', effects: { global_standing: -2, fiscal_health: 2, order_safety: 0 }, tags: [] },
      { id: 'moderate', name: 'Moderate (2.5% GDP)', effects: { global_standing: 0, fiscal_health: 0, order_safety: 0 }, tags: [] },
      { id: 'high', name: 'High (4.5% GDP)', effects: { global_standing: 3, fiscal_health: -4, order_safety: 1 }, tags: [] },
      { id: 'very_high', name: 'Very High Buildup (6%+)', effects: { global_standing: 5, fiscal_health: -7, order_safety: 1 }, tags: [] }
    ]
  },
  {
    id: 'policing',
    name: 'Policing & Criminal Justice',
    mechanism: 'regulatory',
    options: [
      { id: 'reduced', name: 'Reduced funding/redirect', effects: { order_safety: 1, equity: 2, freedom_rights: 1, fiscal_health: 1 }, tags: ['BOLD REFORM'] },
      { id: 'standard', name: 'Standard', effects: { order_safety: 0, equity: 0, freedom_rights: 0, fiscal_health: 0 }, tags: [] },
      { id: 'tough', name: 'Tough-on-crime', effects: { order_safety: 3, equity: -2, freedom_rights: -2, fiscal_health: -3 }, tags: ['LAW & ORDER'] },
      { id: 'community', name: 'Community/Rehab', effects: { order_safety: 2, equity: 2, freedom_rights: 1, fiscal_health: -2 }, tags: ['BOLD REFORM'] }
    ]
  },
  {
    id: 'civil_service',
    name: 'Civil Service Stance',
    mechanism: 'institutional_capacity',
    options: [
      { id: 'patronage', name: 'Patronage / Active Purge', effects: {}, tags: [] },
      { id: 'neglect', name: 'Neglect / Status Quo', effects: {}, tags: [] },
      { id: 'merit', name: 'Merit-Based Civil Service', effects: { fiscal_health: -2 }, tags: ['BOLD REFORM'] },
      { id: 'anti_corruption', name: 'Anti-Corruption Commission', effects: { bureaucracy: 12, fiscal_health: -1 }, tags: [], specialLagOverride: { bureaucracy: 60 } },
      { id: 'egov', name: 'E-Government Digitization', effects: { bureaucracy: 15, fiscal_health: -2 }, tags: [], specialLagOverride: { bureaucracy: 60 } },
      { id: 'judicial', name: 'Judicial Independence', effects: { freedom_rights: 10, bureaucracy: 5, fiscal_health: -1 }, tags: [] }
    ]
  },
  {
    id: 'media',
    name: 'Press & Media Law',
    mechanism: 'regulatory',
    options: [
      { id: 'state', name: 'State-controlled', effects: { freedom_rights: -20, bureaucracy: -5, global_standing: -8 }, tags: [], specialLagOverride: { freedom_rights: 60 } },
      { id: 'licensed', name: 'Regulated/licensed', effects: { freedom_rights: -8, bureaucracy: -2, global_standing: -2 }, tags: [], specialLagOverride: { freedom_rights: 60 } },
      { id: 'free', name: 'Free press', effects: { freedom_rights: 10, bureaucracy: 3, global_standing: 3 }, tags: ['BOLD REFORM'], specialLagOverride: { freedom_rights: 60 } },
      { id: 'deregulated', name: 'Fully deregulated', effects: { freedom_rights: 15, bureaucracy: 2, global_standing: 2, order_safety: -1 }, tags: ['BOLD REFORM'], specialLagOverride: { freedom_rights: 60 } }
    ]
  },
  {
    id: 'fiscal_rule',
    name: 'Fiscal Rule / Debt Ceiling',
    mechanism: 'rate_law',
    options: [
      { id: 'balanced', name: 'Balanced budget mandate', effects: { fiscal_health: 6, prosperity: -1 }, tags: [] },
      { id: 'deficit_limit', name: 'Deficit within limit', effects: { fiscal_health: 2, prosperity: 1 }, tags: [] },
      { id: 'no_limit', name: 'No fiscal constraint', effects: { fiscal_health: -4, prosperity: 2 }, tags: [] }
    ]
  }
];
