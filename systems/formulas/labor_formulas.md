# Labor Simulation Formulas

Mathematical equations driving the WORLDr employment and wage engine.

## 1. Unemployment Rate
The national unemployment rate ($U$) is calculated monthly from base unemployment levels, overall GDP growth trends, and crisis layoffs:
$$U(t) = \max\left(0.01, \text{BaseUnemployment} + \text{CrisisSpikes}\right)$$

Where:
$$\text{BaseUnemployment} = \max\left(0.01, \text{UnemploymentBaseRate} - \text{AvgGrowth} \times \text{growthHiringCoefficient}\right)$$
$$\text{CrisisSpikes} = \text{RecessionLayoffFactor} \times \text{RecessionRisk} + \text{AutomationSpikes}$$

## 2. Wage Adjustments
Sector-specific wages ($W_s$) adjust based on sector productivity shifts and inflation pressure:
$$W_s(t) = W_s(t-1) \times \left(1 + \text{WageGrowth}_s(t)\right)$$

$$\text{WageGrowth}_s(t) = \text{ProductivityGrowth}_s \times \text{EconomyBalance.sectors}[s].wageElasticity + \text{Inflation}_{\text{CPI}} \times 0.25$$
