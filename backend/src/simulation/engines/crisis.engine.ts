import { ActiveModifier, EconomicSector, PopulationGroup, BudgetItem } from '../../types';

export interface CrisisState {
  type: string;
  name: string;
  severity: number;      // 0.0 to 1.0
  buildup: number;       // 0.0 to 1.0
  duration: number;      // months active
  status: 'buildup' | 'active' | 'resolved';
  protest?: {
    size: number;
    intensity: number;
    organization: number;
    ideology: string;
    isRiot: boolean;
  };
  banking?: {
    depositFlight: number;
    creditContraction: number;
    badLoanRatio: number;
  };
}

export class CrisisEngine {
  public static calculateCrises(
    sectors: EconomicSector[],
    populationGroups: PopulationGroup[],
    budgetItems: BudgetItem[],
    gdp: number,
    nationalApproval: number,
    nationalStability: number,
    lastSnapshot: any,
    currentInterestRate: number,
    corruptionLevel: number,
    scandals: number,
    policeStrength: number,
    policeBrutalityRisk: number,
    policeTrust: number,
    params: {
      recession_trigger_threshold: number;
      recession_buildup_speed: number;
      recession_recovery_speed: number;
      protest_approval_threshold: number;
      protest_stability_threshold: number;
      protest_buildup_speed: number;
      protest_repression_impact: number;
      protest_negotiation_impact: number;
      banking_stress_threshold: number;
      banking_buildup_speed: number;
      banking_recovery_speed: number;
      strike_approval_threshold: number;
      strike_buildup_speed: number;
      institutional_trust_threshold: number;
      institutional_buildup_speed: number;
      legitimacy_threshold: number;
      legitimacy_buildup_speed: number;
      scandal_threshold: number;
      scandal_buildup_speed: number;
      supply_shock_threshold: number;
      supply_shock_buildup_speed: number;
    }
  ): {
    crises: CrisisState[];
    modifiers: ActiveModifier[];
    adjustments: {
      unemploymentSpike: number;
      emergencySpending: number;
      interestRateSpike: number;
    };
  } {
    const lastPolitics = lastSnapshot?.snapshot_data?.politics || {};
    const lastCrises: CrisisState[] = lastPolitics.crises || [];

    const getPrevCrisis = (type: string): CrisisState | undefined => {
      return lastCrises.find(c => c.type === type);
    };

    // Helper to evaluate sector growth
    const growthRates = sectors.map(s => Number(s.growth));
    const avgGrowth = growthRates.length > 0 ? growthRates.reduce((sum, g) => sum + g, 0) / growthRates.length : 0;

    // Helper to evaluate institutional trusts
    const lastInst = lastPolitics.institutions || {};
    const courtsTrust = lastInst.courts?.trust !== undefined ? Number(lastInst.courts.trust) : 0.8;
    const civilServiceTrust = lastInst.civil_service?.trust !== undefined ? Number(lastInst.civil_service.trust) : 0.8;
    const avgInstTrust = (courtsTrust + civilServiceTrust) / 2;

    const governmentLegitimacy = lastPolitics.governmentLegitimacy !== undefined ? Number(lastPolitics.governmentLegitimacy) : 0.8;

    // Define crisis types and triggers
    const crisisDefinitions = [
      {
        type: 'recession',
        name: 'Economic Recession',
        triggered: avgGrowth < params.recession_trigger_threshold,
        buildupSpeed: params.recession_buildup_speed,
        recoverySpeed: params.recession_recovery_speed
      },
      {
        type: 'protests',
        name: 'Social Unrest Protests',
        triggered: nationalApproval < params.protest_approval_threshold || nationalStability < params.protest_stability_threshold,
        buildupSpeed: params.protest_buildup_speed,
        recoverySpeed: 0.15
      },
      {
        type: 'banking_crisis',
        name: 'Banking Liquidity Crisis',
        triggered: currentInterestRate > 0.07 || corruptionLevel > 0.50,
        buildupSpeed: params.banking_buildup_speed,
        recoverySpeed: params.banking_recovery_speed
      },
      {
        type: 'strike',
        name: 'Labor Strike',
        triggered: (populationGroups.find(p => p.name === 'Poor')?.approval || 0.5) < params.strike_approval_threshold || 
                   (populationGroups.find(p => p.name === 'Working')?.approval || 0.5) < params.strike_approval_threshold,
        buildupSpeed: params.strike_buildup_speed,
        recoverySpeed: 0.20
      },
      {
        type: 'institutional_crisis',
        name: 'Institutional Trust Collapse',
        triggered: avgInstTrust < params.institutional_trust_threshold || corruptionLevel > 0.60,
        buildupSpeed: params.institutional_buildup_speed,
        recoverySpeed: 0.10
      },
      {
        type: 'legitimacy_crisis',
        name: 'Constitutional Legitimacy Crisis',
        triggered: governmentLegitimacy < params.legitimacy_threshold,
        buildupSpeed: params.legitimacy_buildup_speed,
        recoverySpeed: 0.10
      },
      {
        type: 'media_panic',
        name: 'Narrative Media Panic',
        triggered: scandals > params.scandal_threshold,
        buildupSpeed: params.scandal_buildup_speed,
        recoverySpeed: 0.20
      },
      {
        type: 'supply_shock',
        name: 'Energy Supply Shock',
        triggered: (sectors.find(s => s.name === 'Energy')?.growth || 0) < params.supply_shock_threshold,
        buildupSpeed: params.supply_shock_buildup_speed,
        recoverySpeed: 0.25
      }
    ];

    const updatedCrises: CrisisState[] = [];
    const crisisModifiers: ActiveModifier[] = [];
    let unemploymentSpike = 0;
    let emergencySpending = 0;
    let interestRateSpike = 0;

    for (const def of crisisDefinitions) {
      const prev = getPrevCrisis(def.type);
      let buildup = prev ? prev.buildup : 0.0;
      let status = prev ? prev.status : 'buildup';
      let duration = prev ? prev.duration : 0;
      let severity = prev ? prev.severity : 0.0;

      if (def.triggered) {
        buildup += def.buildupSpeed;
      } else {
        buildup -= def.recoverySpeed;
      }
      buildup = Math.max(0.0, Math.min(1.0, buildup));

      // Trigger condition
      if (status === 'buildup' && buildup >= 1.0) {
        status = 'active';
        severity = 1.0;
        duration = 1;
      } else if (status === 'active') {
        duration += 1;
        // Severity scales with ongoing triggers
        if (def.triggered) {
          severity = Math.max(0.2, Math.min(1.0, severity + 0.1));
        } else {
          severity = Math.max(0.0, severity - def.recoverySpeed);
        }

        if (severity <= 0.0 || buildup <= 0.0) {
          status = 'resolved';
          severity = 0.0;
        }
      } else if (status === 'resolved') {
        // Naturally clear resolved state
        if (!def.triggered) {
          status = 'buildup';
          buildup = 0.0;
          duration = 0;
        } else {
          // Re-trigger buildup
          status = 'buildup';
          buildup = def.buildupSpeed;
          duration = 0;
        }
      }

      if (status === 'active') {
        const activeCrisis: CrisisState = {
          type: def.type,
          name: def.name,
          severity: Number(severity.toFixed(4)),
          buildup: Number(buildup.toFixed(4)),
          duration,
          status: 'active'
        };

        // Sub-system specific calculations
        if (def.type === 'protests') {
          // Welfare negotiation reduces intensity
          const welfareAllocation = Number(budgetItems.find(b => b.name === 'Welfare')?.allocation || 0);
          const welfareRatio = gdp > 0 ? (welfareAllocation / gdp) : 0.05;
          const negotiationMitigation = welfareRatio * params.protest_negotiation_impact;

          // Repression reduces protest size but fuels brutality risk and violence intensity
          const repressionMitigation = policeStrength * params.protest_repression_impact;
          
          const rawSize = Math.max(0.01, 0.12 * severity - repressionMitigation);
          const rawIntensity = Math.max(0.01, (1 - nationalStability) * severity + policeBrutalityRisk * 0.3 - negotiationMitigation);
          const rawOrganization = Math.max(0.1, 0.5 + 0.5 * (1 - nationalStability) - (policeStrength * 0.1));
          
          const isRiot = rawIntensity > 0.75;
          const size = Number(rawSize.toFixed(4));
          const intensity = Number(rawIntensity.toFixed(4));
          const organization = Number(rawOrganization.toFixed(4));

          activeCrisis.protest = {
            size,
            intensity,
            organization,
            ideology: (populationGroups.find(p => p.name === 'Poor')?.approval || 0.5) < 0.4 ? 'Socialist' : 'Populist',
            isRiot
          };

          // Modifiers for active protests
          crisisModifiers.push({
            targetType: 'nation',
            targetName: 'nation',
            parameterName: 'approval',
            modifierType: 'additive',
            modifierValue: Number((-0.08 * severity - (isRiot ? 0.05 : 0)).toFixed(4))
          });

          // Economic disruptions due to protests/riots
          sectors.forEach(s => {
            crisisModifiers.push({
              targetType: 'sector',
              targetName: s.name,
              parameterName: 'productivity',
              modifierType: 'multiplier',
              modifierValue: Number((1.0 - (isRiot ? 0.15 : 0.06) * severity).toFixed(4))
            });
          });
        }

        if (def.type === 'recession') {
          // Modifiers for economic recession
          sectors.forEach(s => {
            crisisModifiers.push({
              targetType: 'sector',
              targetName: s.name,
              parameterName: 'growth',
              modifierType: 'additive',
              modifierValue: Number((-0.04 * severity).toFixed(6))
            });
            crisisModifiers.push({
              targetType: 'sector',
              targetName: s.name,
              parameterName: 'productivity',
              modifierType: 'multiplier',
              modifierValue: Number((1.0 - 0.05 * severity).toFixed(4))
            });
          });

          populationGroups.forEach(p => {
            crisisModifiers.push({
              targetType: 'population_group',
              targetName: p.name,
              parameterName: 'approval',
              modifierType: 'additive',
              modifierValue: Number((-0.10 * severity).toFixed(4))
            });
          });

          unemploymentSpike += 0.06 * severity;
        }

        if (def.type === 'banking_crisis') {
          const depositFlight = Math.min(0.50, severity * 0.40);
          const creditContraction = Math.min(0.60, severity * 0.50 + depositFlight * 0.2);
          const badLoanRatio = Math.min(0.40, severity * 0.35 + (avgGrowth < 0 ? Math.abs(avgGrowth) * 2.0 : 0));

          activeCrisis.banking = {
            depositFlight: Number(depositFlight.toFixed(4)),
            creditContraction: Number(creditContraction.toFixed(4)),
            badLoanRatio: Number(badLoanRatio.toFixed(4))
          };

          // Banking stress affects sector growths directly by contracting credit
          sectors.forEach(s => {
            crisisModifiers.push({
              targetType: 'sector',
              targetName: s.name,
              parameterName: 'growth',
              modifierType: 'additive',
              modifierValue: Number((-0.05 * severity * creditContraction).toFixed(6))
            });
          });

          // Direct bailouts drain government treasury
          emergencySpending += gdp * 0.004 * severity; // 0.4% GDP bailout cost per tick
          interestRateSpike += 0.04 * severity; // Spikes national debt yield due to credit risk
        }

        if (def.type === 'strike') {
          // Labor strikes hit Industry and Construction productivity
          ['Industry', 'Construction', 'Services'].forEach(secName => {
            crisisModifiers.push({
              targetType: 'sector',
              targetName: secName as any,
              parameterName: 'productivity',
              modifierType: 'multiplier',
              modifierValue: Number((1.0 - 0.20 * severity).toFixed(4))
            });
          });

          crisisModifiers.push({
            targetType: 'nation',
            targetName: 'nation',
            parameterName: 'approval',
            modifierType: 'additive',
            modifierValue: Number((-0.04 * severity).toFixed(4))
          });
        }

        if (def.type === 'institutional_crisis') {
          // Decreases administration capacity and decays approval
          populationGroups.forEach(p => {
            crisisModifiers.push({
              targetType: 'population_group',
              targetName: p.name,
              parameterName: 'approval',
              modifierType: 'additive',
              modifierValue: Number((-0.05 * severity).toFixed(4))
            });
          });
        }

        if (def.type === 'legitimacy_crisis') {
          populationGroups.forEach(p => {
            crisisModifiers.push({
              targetType: 'population_group',
              targetName: p.name,
              parameterName: 'approval',
              modifierType: 'additive',
              modifierValue: Number((-0.12 * severity).toFixed(4))
            });
          });
        }

        if (def.type === 'media_panic') {
          // Accelerates voter fatigue and scandal decay
          populationGroups.forEach(p => {
            crisisModifiers.push({
              targetType: 'population_group',
              targetName: p.name,
              parameterName: 'approval',
              modifierType: 'additive',
              modifierValue: Number((-0.07 * severity).toFixed(4))
            });
          });
        }

        if (def.type === 'supply_shock') {
          // Agriculture and Industry get hit with energy shortage costs
          ['Agriculture', 'Industry', 'Services'].forEach(secName => {
            crisisModifiers.push({
              targetType: 'sector',
              targetName: secName as any,
              parameterName: 'productivity',
              modifierType: 'multiplier',
              modifierValue: Number((1.0 - 0.12 * severity).toFixed(4))
            });
          });
          interestRateSpike += 0.01 * severity;
        }

        updatedCrises.push(activeCrisis);
      } else {
        // Record pending buildup progress
        updatedCrises.push({
          type: def.type,
          name: def.name,
          severity: 0.0,
          buildup: Number(buildup.toFixed(4)),
          duration: 0,
          status: 'buildup'
        });
      }
    }

    return {
      crises: updatedCrises,
      modifiers: crisisModifiers,
      adjustments: {
        unemploymentSpike: Number(unemploymentSpike.toFixed(4)),
        emergencySpending: Number(emergencySpending.toFixed(2)),
        interestRateSpike: Number(interestRateSpike.toFixed(4))
      }
    };
  }
}
