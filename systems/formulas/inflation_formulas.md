# Inflation Simulation Formulas

Mathematical equations driving the WORLDr price index engine.

## 1. Sector Price Indices
Each economic sector tracks a monthly price index ($P_s$) which evolves based on modifier pressures, wage inflation, and cost-push factors:
$$P_s(t) = P_s(t-1) \times \left(1 + \text{Inflation}_s(t)\right)$$

## 2. Sector Inflation Rate
The inflation rate for a specific sector is simulated as:
$$\text{Inflation}_s(t) = \text{Damping} \times \text{Inflation}_s(t-1) + (1 - \text{Damping}) \times \text{TargetInflation}_s$$

$$\text{TargetInflation}_s = \text{DemandPressure}_s \times \text{DemandInflationFactor} + \text{WageGrowth}_s \times \text{WageInflationFactor} + \text{EnergyPressure} \times \text{EnergyPressureFactor} + \sum \text{Modifiers}$$

## 3. CPI (Consumer Price Index) Inflation
The national inflation rate is computed as a weighted average of individual sector inflations (using the consumer basket weights):
$$\text{Inflation}_{\text{CPI}} = w_{\text{food}} \cdot \text{Inflation}_{\text{Agriculture}} + w_{\text{fuel}} \cdot \text{Inflation}_{\text{Energy}} + w_{\text{housing}} \cdot \text{Inflation}_{\text{Construction}} + w_{\text{other}} \cdot \text{Avg}(\text{Inflation}_{\text{Industry}}, \text{Inflation}_{\text{Services}})$$

Where weights $w$ are defined in `InflationBalance.weights`.
