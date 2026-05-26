import { Tax, BudgetItem, ActiveModifier } from '../../types';
import { ModifierResolver } from '../modifier.resolver';

export class BudgetEngine {
  public static calculate(
    taxes: Tax[],
    budgetItems: BudgetItem[],
    gdp: number,
    treasury: number,
    debt: number,
    interestRate: number,
    modifiers: ActiveModifier[]
  ): {
    updatedTaxes: Tax[];
    updatedBudgetItems: BudgetItem[];
    newTreasury: number;
    newDebt: number;
    totalRevenue: number;
    totalSpending: number;
  } {
    let totalRevenue = 0;
    const updatedTaxes = taxes.map(tax => {
      const taxMods = modifiers.filter(
        m => m.targetType === 'tax' && m.targetName === tax.name
      );

      const resolvedRate = ModifierResolver.resolve(
        Number(tax.rate),
        taxMods.filter(m => m.parameterName === 'rate')
      );

      // Monthly tax revenue: (GDP / 12) * resolvedRate
      const monthlyRevenue = (gdp / 12) * resolvedRate;
      totalRevenue += monthlyRevenue;

      return {
        ...tax,
        rate: Number(resolvedRate.toFixed(4)),
        revenue: Number(monthlyRevenue.toFixed(2))
      };
    });

    let totalSpending = 0;
    const updatedBudgetItems = budgetItems.map(item => {
      const budgetMods = modifiers.filter(
        m => m.targetType === 'budget_item' && m.targetName === item.name
      );

      const resolvedAllocation = ModifierResolver.resolve(
        Number(item.allocation),
        budgetMods.filter(m => m.parameterName === 'allocation')
      );

      // Monthly expenditure budget allocation: resolvedAllocation / 12
      const monthlySpending = resolvedAllocation / 12;
      totalSpending += monthlySpending;

      return {
        ...item,
        allocation: Number(resolvedAllocation.toFixed(2))
      };
    });

    // Monthly interest payments on national debt
    const monthlyInterest = debt * (interestRate / 12);
    totalSpending += monthlyInterest;

    let newTreasury = treasury + totalRevenue - totalSpending;
    let newDebt = debt;

    if (newTreasury < 0) {
      newDebt += Math.abs(newTreasury);
      newTreasury = 0;
    }

    return {
      updatedTaxes,
      updatedBudgetItems,
      newTreasury: Number(newTreasury.toFixed(2)),
      newDebt: Number(newDebt.toFixed(2)),
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalSpending: Number(totalSpending.toFixed(2))
    };
  }
}
