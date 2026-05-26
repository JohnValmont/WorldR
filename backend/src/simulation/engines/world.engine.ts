/**
 * WorldEngine — Global Simulation Calculation Layer
 *
 * Responsible for:
 * - Aggregating all active nation states into world-level metrics
 * - Computing per-region economic and stability influence
 * - Calculating cross-nation migration pressure within regions
 * - Emitting global modifiers (e.g. commodity shocks) that affect all nations
 *
 * Design principles:
 * - Pure, deterministic, stateless calculations (no DB calls)
 * - Inputs come from WorldNationSummary[] fetched by WorldService
 * - Outputs are cached in Redis by WorldService
 */

import {
  WorldNationSummary,
  WorldState,
  RegionalEconomicInfluence,
  MigrationPressure,
  GlobalModifier,
  ActiveModifier
} from '../../types';

interface NationWithUnemployment extends WorldNationSummary {
  /** Unemployment rate from the latest historical snapshot (0.0–1.0) */
  unemployment_rate: number;
  /** Whether this nation has at least one active crisis this tick */
  hasActiveCrisis: boolean;
  /** GDP at previous tick (used for growth rate calculation) */
  prevGdp: number;
}

export class WorldEngine {
  /**
   * Aggregate all active nations into a global world state.
   * This is the top-level entry point called by WorldService after each world tick cycle.
   */
  public static computeGlobalState(nations: NationWithUnemployment[]): Omit<WorldState, 'regions' | 'migrationPressures' | 'globalModifiers'> {
    if (nations.length === 0) {
      return {
        computedAt: new Date().toISOString(),
        activeTick: 0,
        totalNations: 0,
        totalGdp: 0,
        avgCpi: 0,
        avgApproval: 0,
        avgStability: 0,
        avgUnemploymentRate: 0,
        crisisNations: []
      };
    }

    const totalGdp = nations.reduce((sum, n) => sum + n.gdp, 0);
    const avgCpi = nations.reduce((sum, n) => sum + n.inflation_cpi, 0) / nations.length;
    const avgApproval = nations.reduce((sum, n) => sum + n.approval, 0) / nations.length;
    const avgStability = nations.reduce((sum, n) => sum + n.stability, 0) / nations.length;
    const avgUnemploymentRate = nations.reduce((sum, n) => sum + n.unemployment_rate, 0) / nations.length;
    const activeTick = Math.max(...nations.map(n => n.current_tick));
    const crisisNations = nations.filter(n => n.hasActiveCrisis).map(n => n.id);

    return {
      computedAt: new Date().toISOString(),
      activeTick,
      totalNations: nations.length,
      totalGdp: Number(totalGdp.toFixed(2)),
      avgCpi: Number(avgCpi.toFixed(4)),
      avgApproval: Number(avgApproval.toFixed(4)),
      avgStability: Number(avgStability.toFixed(4)),
      avgUnemploymentRate: Number(avgUnemploymentRate.toFixed(4)),
      crisisNations
    };
  }

  /**
   * Compute regional economic influence groups.
   *
   * For each region, averages the GDP, CPI, stability, and approval of all member nations.
   * Derives soft modifier signals that nations within the region will receive on their next tick:
   *
   * - gdpGrowthMod: Positive if region is growing, negative if contracting (±0.02 max)
   * - inflationMod: Positive (upward pressure) if regional CPI is high (±0.05 max)
   * - stabilityMod: Positive if region is stable, negative if destabilized (±0.03 max)
   */
  public static computeRegionalInfluence(nations: NationWithUnemployment[]): RegionalEconomicInfluence[] {
    // Group nations by region
    const regionMap = new Map<string, NationWithUnemployment[]>();
    for (const nation of nations) {
      const region = nation.region ?? 'Custom';
      if (!regionMap.has(region)) regionMap.set(region, []);
      regionMap.get(region)!.push(nation);
    }

    const influences: RegionalEconomicInfluence[] = [];

    for (const [region, members] of regionMap.entries()) {
      if (members.length === 0) continue;

      const avgGdp = members.reduce((sum, n) => sum + n.gdp, 0) / members.length;

      // GDP growth rate based on prevGdp vs current gdp
      const avgGdpGrowthRate = members.reduce((sum, n) => {
        const growth = n.prevGdp > 0 ? (n.gdp - n.prevGdp) / n.prevGdp : 0;
        return sum + growth;
      }, 0) / members.length;

      const avgCpi = members.reduce((sum, n) => sum + n.inflation_cpi, 0) / members.length;
      const avgStability = members.reduce((sum, n) => sum + n.stability, 0) / members.length;
      const avgApproval = members.reduce((sum, n) => sum + n.approval, 0) / members.length;

      // Compute soft regional modifiers
      // gdpGrowthMod: regional growth momentum pushes/pulls sector growth (±0.02)
      const gdpGrowthMod = Number(Math.max(-0.02, Math.min(0.02, avgGdpGrowthRate * 0.3)).toFixed(4));

      // inflationMod: high regional CPI creates import price pressure (+0.05 max for CPI > 0.30)
      const inflationBaseline = 0.05; // neutral reference CPI
      const inflationMod = Number(Math.max(-0.02, Math.min(0.05, (avgCpi - inflationBaseline) * 0.5)).toFixed(4));

      // stabilityMod: regional destabilization spills over (±0.03)
      const stabilityBaseline = 0.60; // neutral reference stability
      const stabilityMod = Number(Math.max(-0.03, Math.min(0.03, (avgStability - stabilityBaseline) * 0.1)).toFixed(4));

      influences.push({
        region,
        avgGdp: Number(avgGdp.toFixed(2)),
        avgGdpGrowthRate: Number(avgGdpGrowthRate.toFixed(4)),
        avgCpi: Number(avgCpi.toFixed(4)),
        avgStability: Number(avgStability.toFixed(4)),
        avgApproval: Number(avgApproval.toFixed(4)),
        nationCount: members.length,
        gdpGrowthMod,
        inflationMod,
        stabilityMod
      });
    }

    return influences;
  }

  /**
   * Compute cross-nation migration pressure within each region.
   *
   * Migration pressure is directional (source → target). A nation with low income
   * and low stability is a source; a nation with high income and high stability is a target.
   *
   * pressureScore = 0.6 * incomeDifferential_norm + 0.4 * stabilityDifferential_norm
   *
   * Only pairs within the same region are evaluated (border-sharing assumption).
   * Only pressure scores > 0.05 are returned (noise floor filter).
   *
   * popTransferEstimate is bounded between 0.0% and 5.0% of poor+working class per tick.
   */
  public static computeMigrationPressure(nations: NationWithUnemployment[]): MigrationPressure[] {
    const pressures: MigrationPressure[] = [];

    // Group by region
    const regionMap = new Map<string, NationWithUnemployment[]>();
    for (const nation of nations) {
      const region = nation.region ?? 'Custom';
      if (!regionMap.has(region)) regionMap.set(region, []);
      regionMap.get(region)!.push(nation);
    }

    for (const [region, members] of regionMap.entries()) {
      if (members.length < 2) continue;

      // Compute income and stability bounds for normalization within this region
      const gdps = members.map(n => n.gdp);
      const minGdp = Math.min(...gdps);
      const maxGdp = Math.max(...gdps);
      const gdpRange = maxGdp - minGdp || 1;

      const stabilities = members.map(n => n.stability);
      const minStability = Math.min(...stabilities);
      const maxStability = Math.max(...stabilities);
      const stabilityRange = maxStability - minStability || 1;

      // Evaluate all ordered pairs (source → target)
      for (let i = 0; i < members.length; i++) {
        for (let j = 0; j < members.length; j++) {
          if (i === j) continue;

          const source = members[i];
          const target = members[j];

          // Normalized differentials (positive = target is better)
          const incomeDiff = (target.gdp - source.gdp) / gdpRange;
          const stabilityDiff = (target.stability - source.stability) / stabilityRange;

          // Only evaluate positive-direction pressure (people move to better conditions)
          if (incomeDiff <= 0 && stabilityDiff <= 0) continue;

          const pressureScore = Number(
            Math.max(0, Math.min(1.0, 0.6 * Math.max(0, incomeDiff) + 0.4 * Math.max(0, stabilityDiff)))
              .toFixed(4)
          );

          // Apply noise floor — ignore trivial differentials
          if (pressureScore < 0.05) continue;

          // Pop transfer estimate: up to 2% of poor+working class per tick at max pressure
          const popTransferEstimate = Number(Math.min(0.02, pressureScore * 0.02).toFixed(5));

          pressures.push({
            sourceNationId: source.id,
            targetNationId: target.id,
            region,
            pressureScore,
            incomeDifferential: Number(incomeDiff.toFixed(4)),
            stabilityDifferential: Number(stabilityDiff.toFixed(4)),
            popTransferEstimate
          });
        }
      }
    }

    // Sort by pressure score descending
    return pressures.sort((a, b) => b.pressureScore - a.pressureScore);
  }

  /**
   * Compute global economic event modifiers.
   *
   * These are world-level shocks or booms that affect all nations on a given tick.
   * Currently modeled as deterministic (derived from world state thresholds).
   *
   * Future: pluggable event system for admin-triggered world events.
   */
  public static computeGlobalModifiers(globalState: {
    avgCpi: number;
    avgStability: number;
    avgGdpGrowthRate: number;
    crisisNationCount: number;
    totalNations: number;
  }): GlobalModifier[] {
    const modifiers: GlobalModifier[] = [];

    const crisisFraction = globalState.totalNations > 0
      ? globalState.crisisNationCount / globalState.totalNations
      : 0;

    // 1. Global commodity inflation shock — triggered when world avg CPI > 0.12
    if (globalState.avgCpi > 0.12) {
      const severity = Math.min(1.0, (globalState.avgCpi - 0.12) / 0.08); // 0.0 at CPI=0.12, 1.0 at CPI=0.20
      const energyImpact = Number((0.03 * severity).toFixed(4));
      const agriImpact = Number((0.02 * severity).toFixed(4));

      const activeModifiers: ActiveModifier[] = [
        {
          targetType: 'sector',
          targetName: 'Energy',
          parameterName: 'output_multiplier',
          modifierType: 'multiplier',
          modifierValue: 1 + energyImpact
        },
        {
          targetType: 'sector',
          targetName: 'Agriculture',
          parameterName: 'output_multiplier',
          modifierType: 'multiplier',
          modifierValue: 1 + agriImpact
        }
      ];

      modifiers.push({
        name: 'global_commodity_price_shock',
        description: `Global CPI pressure (${(globalState.avgCpi * 100).toFixed(1)}%) driving commodity inflation`,
        activeModifiers
      });
    }

    // 2. Global instability contagion — triggered when >40% of nations have active crises
    if (crisisFraction > 0.40) {
      const contagionStrength = Math.min(1.0, (crisisFraction - 0.40) / 0.30);
      const stabilityHit = Number((-0.02 * contagionStrength).toFixed(4));

      modifiers.push({
        name: 'global_instability_contagion',
        description: `${(crisisFraction * 100).toFixed(0)}% of nations are in crisis — global instability spillover`,
        activeModifiers: [
          {
            targetType: 'nation',
            targetName: '*',
            parameterName: 'stability_modifier',
            modifierType: 'additive',
            modifierValue: stabilityHit
          }
        ]
      });
    }

    // 3. Global growth recession — triggered when world avg GDP growth < -0.01
    if (globalState.avgGdpGrowthRate < -0.01) {
      const recessionDepth = Math.min(1.0, Math.abs(globalState.avgGdpGrowthRate + 0.01) / 0.05);
      const outputHit = Number((-0.015 * recessionDepth).toFixed(4));

      modifiers.push({
        name: 'global_growth_recession',
        description: `World GDP contracting at ${(globalState.avgGdpGrowthRate * 100).toFixed(2)}% — global demand collapse`,
        activeModifiers: [
          {
            targetType: 'sector',
            targetName: 'Industry',
            parameterName: 'output_multiplier',
            modifierType: 'multiplier',
            modifierValue: 1 + outputHit
          },
          {
            targetType: 'sector',
            targetName: 'Services',
            parameterName: 'output_multiplier',
            modifierType: 'multiplier',
            modifierValue: 1 + outputHit * 0.5
          }
        ]
      });
    }

    return modifiers;
  }

  /**
   * Build the complete WorldState object from computed components.
   * Called by WorldService to assemble final world state for Redis caching.
   */
  public static buildWorldState(
    nations: NationWithUnemployment[],
    avgGdpGrowthRate: number
  ): WorldState {
    const globalBase = WorldEngine.computeGlobalState(nations);
    const regions = WorldEngine.computeRegionalInfluence(nations);
    const migrationPressures = WorldEngine.computeMigrationPressure(nations);
    const globalModifiers = WorldEngine.computeGlobalModifiers({
      avgCpi: globalBase.avgCpi,
      avgStability: globalBase.avgStability,
      avgGdpGrowthRate,
      crisisNationCount: globalBase.crisisNations.length,
      totalNations: globalBase.totalNations
    });

    return {
      ...globalBase,
      regions,
      migrationPressures,
      globalModifiers
    };
  }
}
