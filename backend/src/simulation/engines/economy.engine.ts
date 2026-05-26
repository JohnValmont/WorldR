import { EconomicSector, ActiveModifier } from '../../types';
import { ModifierResolver } from '../modifier.resolver';
import { EconomyBalance } from '../../../../systems/balance/economy.balance';

export class EconomyEngine {
  public static calculate(
    sectors: EconomicSector[],
    modifiers: ActiveModifier[],
    taxElasticity: number
  ): EconomicSector[] {
    return sectors.map(sector => {
      const sectorMods = modifiers.filter(
        m => m.targetType === 'sector' && m.targetName === sector.name
      );

      const sectorConfig = EconomyBalance.sectors[sector.name as keyof typeof EconomyBalance.sectors] || {
        baseProductivity: 1.0,
        baseGrowth: 0.02,
        wageElasticity: 0.3,
        laborElasticity: 0.4
      };

      const resolvedProductivity = ModifierResolver.resolve(
        Number(sector.productivity),
        sectorMods.filter(m => m.parameterName === 'productivity')
      );

      const resolvedGrowth = ModifierResolver.resolve(
        Number(sector.growth),
        sectorMods.filter(m => m.parameterName === 'growth')
      );

      // Math: Output = output * (1 + growth) * productivity * tax penalty
      const growthMultiplier = 1 + resolvedGrowth;
      const elasticity = taxElasticity || EconomyBalance.taxElasticity;
      const taxPenalty = Math.max(0.7, 1 - elasticity);

      const newOutput = Number(sector.output) * growthMultiplier * (resolvedProductivity / Number(sector.productivity)) * taxPenalty;

      // Wages scale with output and productivity gains using sector-specific wage elasticity
      const newWages = Number(sector.wages) * (1 + (resolvedGrowth * sectorConfig.wageElasticity)) * (resolvedProductivity / Number(sector.productivity));

      // Worker employment grows/declines with output growth using sector-specific labor elasticity
      const workerGrowthRate = resolvedGrowth * sectorConfig.laborElasticity;
      const newWorkers = Number(sector.workers) * (1 + workerGrowthRate);

      return {
        ...sector,
        output: Number(newOutput.toFixed(2)),
        workers: Number(newWorkers.toFixed(2)),
        productivity: Number(resolvedProductivity.toFixed(4)),
        wages: Number(newWages.toFixed(2)),
        growth: Number(resolvedGrowth.toFixed(6))
      };
    });
  }
}
