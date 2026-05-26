# Economy Simulation Formulas

Mathematical equations driving the WORLDr macroeconomic engine.

## 1. GDP Calculation
The national Gross Domestic Product (GDP) is computed as the sum of outputs from all economic sectors:
$$\text{GDP} = \sum_{s \in \text{Sectors}} \text{Output}_s$$

## 2. Sector Output Dynamics
For each tick (month), the sector output grows according to productivity increases, employment shifts, tax elasticity drag, and crisis multipliers:
$$\text{Output}_s(t) = \text{Output}_s(t-1) \times \left(1 + \text{Growth}_s(t)\right)$$

$$\text{Growth}_s(t) = \text{BaseGrowth}_s + (\Delta \text{Productivity}_s \times \text{LaborElasticity}_s) - \text{TaxDrag}_s + \sum \text{ModifierEffects}$$

### Tax Drag Formula
$$\text{TaxDrag}_s = \text{EconomyBalance.taxElasticity} \times \max(0, \text{CorporateTaxRate} - 0.15)$$

## 3. Recession Risk & Buildup
A recession is triggered when the overall growth rate falls below a threshold:
$$\text{AvgGrowth} = \frac{\text{GDP}(t) - \text{GDP}(t-1)}{\text{GDP}(t-1)}$$

If $\text{AvgGrowth} < \text{RecessionTriggerThreshold}$:
$$\text{RecessionRisk}(t) = \text{RecessionRisk}(t-1) + \text{RecessionBuildupSpeed} \times \left(\text{RecessionTriggerThreshold} - \text{AvgGrowth}\right)$$
Else:
$$\text{RecessionRisk}(t) = \max\left(0, \text{RecessionRisk}(t-1) - \text{RecessionRecoverySpeed}\right)$$
