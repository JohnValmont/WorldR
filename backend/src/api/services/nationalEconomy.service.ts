import { db } from '../../config/database';
import { NationalStat, POLICY_CATALOG, MECHANISM_BASE_ROLLOUT, STAT_LAG_CLASSES } from '../constants/macroEconomy';

export interface ActivePolicy {
  id: string;
  state_id: string;
  category: string;
  option_id: string;
  enacted_month: number;
  base_rollout_months: number;
  natural_lag_months: number;
  target_effects: Record<string, number>;
  is_active: boolean;
}

export interface NationalStats {
  prosperity: number;
  cost_of_living: number;
  fiscal_health: number;
  equity: number;
  human_development: number;
  order_safety: number;
  freedom_rights: number;
  bureaucracy: number;
  global_standing: number;
}

export function readNationalStatsFromRow(row: any): NationalStats {
  if (!row) return { prosperity: 50, cost_of_living: 50, fiscal_health: 50, equity: 50, human_development: 50, order_safety: 50, freedom_rights: 50, bureaucracy: 50, global_standing: 50 };
  return {
    prosperity: Number(row.stat_prosperity || 50),
    cost_of_living: Number(row.stat_cost_of_living || 50),
    fiscal_health: Number(row.stat_fiscal_health || 50),
    equity: Number(row.stat_equity || 50),
    human_development: Number(row.stat_human_development || 50),
    order_safety: Number(row.stat_order_safety || 50),
    freedom_rights: Number(row.stat_freedom_rights || 50),
    bureaucracy: Number(row.stat_bureaucracy || 50),
    global_standing: Number(row.stat_global_standing || 50),
  };
}

/**
 * Calculates current values for all 9 stats based on the V1 Final Macro-Economy formulas.
 * Also handles Bureaucracy drift if explicitly called.
 */
export async function calculateNationalEconomy(trx: any, stateId: string, currentMonth: number, updateDb: boolean = false): Promise<NationalStats> {
  const state = await trx('pol_states').where({ id: stateId }).first();
  if (!state) throw new Error('State not found');

  // 1. Calculate current Bureaucracy first, since it determines fidelity(t)
  // Bureaucracy updates differently: Civil Service Stance drifts it over time.
  let bureaucracy = Number(state.base_bureaucracy) || 50;
  
  if (updateDb) {
    const stance = state.civil_service_stance || 'neglect';
    if (stance === 'patronage') {
      bureaucracy = Math.max(15, bureaucracy - (10 / 12)); // -10/yr, plus the -10 one-time shock applied at enactment
    } else if (stance === 'neglect') {
      bureaucracy = Math.max(15, bureaucracy - (1.5 / 12)); // -1.5/yr
    } else if (stance === 'merit') {
      bureaucracy = Math.min(80, bureaucracy + (3 / 12)); // +3/yr
    }
  }

  // 2. Compute fidelity(t) based on current Bureaucracy
  // fidelity(t) = 0.4 + Bureaucracy(t)/167
  const fidelity = 0.4 + (bureaucracy / 167.0);

  // 3. Load active policies
  const policies: ActivePolicy[] = await trx('pol_active_policies')
    .where({ state_id: stateId, is_active: true });

  // 4. Calculate contributions for each stat
  const contributions: Record<NationalStat, number> = {
    prosperity: 0, cost_of_living: 0, fiscal_health: 0, equity: 0,
    human_development: 0, order_safety: 0, freedom_rights: 0, bureaucracy: 0, global_standing: 0
  };

  for (const pol of policies) {
    const t = currentMonth - pol.enacted_month;
    const rollout = Number(pol.base_rollout_months);
    const lag = Number(pol.natural_lag_months);

    for (const [statKey, intendedEffect] of Object.entries(pol.target_effects)) {
      if (!intendedEffect) continue;
      
      const ceiling = (intendedEffect as number) * (statKey === 'freedom_rights' ? 1.0 : fidelity); 
      // Freedom/Rights doesn't scale with bureaucracy according to doc (cultural not administrative). But let's apply fidelity normally except where noted.

      let contribution = 0;
      if (t < rollout) {
        contribution = 0;
      } else if (t < rollout + lag) {
        contribution = ceiling * ((t - rollout) / lag);
      } else {
        contribution = ceiling;
      }
      contributions[statKey as NationalStat] += contribution;
    }
  }

  // 5. Compute base organic drift + contributions
  const stats: NationalStats = {
    prosperity: Number(state.base_prosperity) + contributions.prosperity,
    cost_of_living: Number(state.base_cost_of_living) + contributions.cost_of_living,
    fiscal_health: Number(state.base_fiscal_health) + contributions.fiscal_health,
    equity: Number(state.base_equity) + contributions.equity,
    human_development: Number(state.base_human_development) + contributions.human_development,
    order_safety: Number(state.base_order_safety) + contributions.order_safety,
    freedom_rights: Number(state.base_freedom_rights) + contributions.freedom_rights,
    bureaucracy: bureaucracy + contributions.bureaucracy,
    global_standing: Number(state.base_global_standing) + contributions.global_standing,
  };

  // Clamp 0-100
  for (const k of Object.keys(stats)) {
    const key = k as keyof NationalStats;
    stats[key] = Math.max(0, Math.min(100, stats[key]));
  }

  if (updateDb) {
    await trx('pol_states')
      .where({ id: stateId })
      .update({
        base_bureaucracy: bureaucracy, // save the drift
        stat_prosperity: stats.prosperity,
        stat_cost_of_living: stats.cost_of_living,
        stat_fiscal_health: stats.fiscal_health,
        stat_equity: stats.equity,
        stat_human_development: stats.human_development,
        stat_order_safety: stats.order_safety,
        stat_freedom_rights: stats.freedom_rights,
        stat_bureaucracy: stats.bureaucracy,
        stat_global_standing: stats.global_standing,
      });
  }

  return stats;
}

/**
 * Enact a new policy from the catalog. Replaces any existing active policy in that category.
 */
export async function enactPolicy(trx: any, stateId: string, categoryId: string, optionId: string, currentMonth: number) {
  const category = POLICY_CATALOG.find(c => c.id === categoryId);
  if (!category) throw new Error(`Category ${categoryId} not found`);
  const option = category.options.find(o => o.id === optionId);
  if (!option) throw new Error(`Option ${optionId} not found`);

  // Deactivate old policy in this category
  await trx('pol_active_policies')
    .where({ state_id: stateId, category: categoryId })
    .update({ is_active: false });

  const state = await trx('pol_states').where({ id: stateId }).first();
  const currentBur = Number(state.stat_bureaucracy) || 50;
  
  // Apply one-time shock for Patronage
  if (categoryId === 'civil_service') {
    await trx('pol_states').where({ id: stateId }).update({ civil_service_stance: optionId });
    if (optionId === 'patronage') {
      await trx('pol_states').where({ id: stateId }).update({ base_bureaucracy: Math.max(15, currentBur - 10) });
    }
  }

  const bureaucracyMult = Math.max(0.5, 1.5 - (currentBur / 200));
  const rolloutMonths = Math.round(MECHANISM_BASE_ROLLOUT[category.mechanism] * bureaucracyMult);
  
  // Calculate max lag across all effects to simplify (or just use 12 if none)
  let maxLag = 12;
  const effects = option.effects;
  for (const stat of Object.keys(effects)) {
    const s = stat as NationalStat;
    const l = option.specialLagOverride?.[s] ?? STAT_LAG_CLASSES[s].lagMonths;
    if (l > maxLag) maxLag = l;
  }

  await trx('pol_active_policies').insert({
    state_id: stateId,
    category: categoryId,
    option_id: optionId,
    enacted_month: currentMonth,
    base_rollout_months: rolloutMonths,
    natural_lag_months: maxLag,
    target_effects: JSON.stringify(effects)
  });
}
