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
    tax_haven: { stat_gdp: 1.004, stat_unemployment: -0.1, stat_tax_revenue: 0.98, stat_per_capita: 1.001, cond_budget: -1 },
    progressive: { stat_gdp: 0.998, stat_unemployment: 0.05, stat_tax_revenue: 1.02, stat_per_capita: 0.999, cond_budget: 1 },
    flat_tax: { stat_gdp: 1.001, stat_unemployment: 0, stat_tax_revenue: 1.005, stat_per_capita: 1.000 },
    standard: { stat_gdp: 1.0, stat_unemployment: 0, stat_tax_revenue: 1.0, stat_per_capita: 1.0 }
  },
  labor: {
    deregulated: { stat_unemployment: -0.2, stat_gdp: 1.003, stat_per_capita: 0.995, cond_jobs: 1 },
    strong_union: { stat_unemployment: 0.15, stat_per_capita: 1.008, stat_gdp: 0.998, cond_cohesion: 1.5, cond_prosperity: 0.5 },
    subsidized: { stat_unemployment: -0.3, stat_tax_revenue: 0.99, stat_per_capita: 1.002, cond_jobs: 0.5 },
    regulated: { stat_unemployment: 0, stat_gdp: 1.0, stat_per_capita: 1.0, cond_jobs: 0 }
  },
  environment: {
    green_new_deal: { stat_pollution: 0.96, stat_gdp: 0.995, stat_unemployment: 0.2, cond_prosperity: -1, cond_order: 0.5 },
    balanced: { stat_pollution: 0.99, stat_gdp: 0.999, stat_unemployment: 0, cond_prosperity: 0 },
    unrestricted: { stat_pollution: 1.05, stat_gdp: 1.006, stat_unemployment: 0, cond_order: -1.5 },
    standard: { stat_pollution: 1.0, stat_gdp: 1.0, stat_unemployment: 0, cond_prosperity: 0 }
  },
  welfare: {
    austerity: { stat_tax_revenue: 1.01, cond_budget: 2, stat_per_capita: 0.996, stat_unemployment: 0.1, cond_cohesion: -1.5 },
    universal_healthcare: { stat_tax_revenue: 0.975, stat_per_capita: 1.01, cond_cohesion: 2, cond_budget: -1.5 },
    standard: { stat_tax_revenue: 1.0, cond_budget: 0, stat_per_capita: 1.0, stat_unemployment: 0 }
  }
};
