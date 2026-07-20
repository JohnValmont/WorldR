export type PolicyCategory = "taxation" | "labor" | "environment" | "welfare";

export interface PolicyModifier {
  stat_gdp?: number; // multiplier, e.g. 1.05
  stat_unemployment?: number; // delta, e.g. -1
  stat_tax_revenue?: number; // multiplier
  stat_per_capita?: number; // multiplier
  stat_pollution?: number; // multiplier
  cond_jobs?: number; // delta
  cond_prosperity?: number; // delta
  cond_order?: number; // delta
  cond_cohesion?: number; // delta
  cond_budget?: number; // delta
}

export const POLICY_DEFINITIONS: Record<PolicyCategory, Record<string, PolicyModifier>> = {
  taxation: {
    tax_haven: { stat_gdp: 1.05, stat_unemployment: -1, stat_tax_revenue: 0.85, stat_per_capita: 1.02 },
    progressive: { stat_gdp: 0.99, stat_unemployment: 0.5, stat_tax_revenue: 1.20, stat_per_capita: 0.97 },
    flat_tax: { stat_gdp: 1.01, stat_unemployment: 0, stat_tax_revenue: 1.05, stat_per_capita: 1.00 },
    standard: { stat_gdp: 1.0, stat_unemployment: 0, stat_tax_revenue: 1.0, stat_per_capita: 1.0 }
  },
  labor: {
    deregulated: { stat_unemployment: -2, stat_gdp: 1.04, stat_per_capita: 0.95, cond_jobs: 10 },
    strong_union: { stat_unemployment: 1.5, stat_per_capita: 1.08, stat_gdp: 0.98, cond_cohesion: 15 },
    subsidized: { stat_unemployment: -3, stat_tax_revenue: 0.90, stat_per_capita: 1.02, cond_jobs: 0 },
    regulated: { stat_unemployment: 0, stat_gdp: 1.0, stat_per_capita: 1.0, cond_jobs: 0 }
  },
  environment: {
    green_new_deal: { stat_pollution: 0.60, stat_gdp: 0.95, stat_unemployment: 2, cond_prosperity: -10 },
    balanced: { stat_pollution: 0.90, stat_gdp: 0.99, stat_unemployment: 0, cond_prosperity: 0 },
    unrestricted: { stat_pollution: 1.50, stat_gdp: 1.06, stat_unemployment: 0, cond_order: -15 },
    standard: { stat_pollution: 1.0, stat_gdp: 1.0, stat_unemployment: 0, cond_prosperity: 0 }
  },
  welfare: {
    austerity: { stat_tax_revenue: 1.10, cond_budget: 20, stat_per_capita: 0.96, stat_unemployment: 1 },
    universal_healthcare: { stat_tax_revenue: 0.75, stat_per_capita: 1.10, cond_cohesion: 20, cond_budget: -15 },
    standard: { stat_tax_revenue: 1.0, cond_budget: 0, stat_per_capita: 1.0, stat_unemployment: 0 }
  }
};
