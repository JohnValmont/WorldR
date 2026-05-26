import { Price, ActiveModifier } from '../../types';
import { ModifierResolver } from '../modifier.resolver';
import { InflationBalance } from '../../systems/balance/inflation.balance';

export class InflationEngine {
  public static calculate(
    prices: Price[],
    modifiers: ActiveModifier[],
    inflationDamping: number
  ): {
    updatedPrices: Price[];
    inflationFood: number;
    inflationFuel: number;
    inflationHousing: number;
    inflationCpi: number;
  } {
    const dampingFactor = inflationDamping || InflationBalance.damping;

    const updatedPrices = prices.map(price => {
      const priceMods = modifiers.filter(
        m => m.targetType === 'sector' && m.targetName === price.sector_name
      );

      const resolvedInflationRate = ModifierResolver.resolve(
        Number(price.inflation_rate),
        priceMods.filter(m => m.parameterName === 'inflation_rate')
      );

      // Damp inflation changes using the parameter coefficient
      const dampedRate = resolvedInflationRate * dampingFactor;
      const newPriceIndex = Number(price.price_index) * (1 + dampedRate);

      return {
        ...price,
        price_index: Number(newPriceIndex.toFixed(4)),
        inflation_rate: Number(dampedRate.toFixed(4))
      };
    });

    const foodPriceObj = updatedPrices.find(p => p.sector_name === 'Agriculture');
    const fuelPriceObj = updatedPrices.find(p => p.sector_name === 'Energy');
    const housingPriceObj = updatedPrices.find(p => p.sector_name === 'Construction');
    const servicesPriceObj = updatedPrices.find(p => p.sector_name === 'Services');
    const industryPriceObj = updatedPrices.find(p => p.sector_name === 'Industry');

    const inflationFood = foodPriceObj ? Number(foodPriceObj.inflation_rate) : 0.0200;
    const inflationFuel = fuelPriceObj ? Number(fuelPriceObj.inflation_rate) : 0.0200;
    const inflationHousing = housingPriceObj ? Number(housingPriceObj.inflation_rate) : 0.0200;

    // Use dynamic weights from InflationBalance
    const otherInflation = (
      (servicesPriceObj ? Number(servicesPriceObj.inflation_rate) : 0.02) +
      (industryPriceObj ? Number(industryPriceObj.inflation_rate) : 0.02)
    ) / 2;

    const inflationCpi =
      (inflationFood * InflationBalance.weights.food) +
      (inflationFuel * InflationBalance.weights.fuel) +
      (inflationHousing * InflationBalance.weights.housing) +
      (otherInflation * InflationBalance.weights.other);

    return {
      updatedPrices,
      inflationFood: Number(inflationFood.toFixed(4)),
      inflationFuel: Number(inflationFuel.toFixed(4)),
      inflationHousing: Number(inflationHousing.toFixed(4)),
      inflationCpi: Number(inflationCpi.toFixed(4))
    };
  }
}
