# Housing Simulation Formulas

Mathematical equations driving housing affordability, rents, and real estate market pressures.

## 1. Housing Price Index
The housing price index ($P_{\text{house}}$) tracks construction capacity versus population growth:
$$P_{\text{house}}(t) = P_{\text{house}}(t-1) \times \left(1 + \text{HousingInflation}(t)\right)$$

$$\text{HousingInflation}(t) = \text{Damping} \times \text{HousingInflation}(t-1) + (1 - \text{Damping}) \times \text{AffordabilityPressure}$$

## 2. Affordability Pressure
Affordability pressure is computed as:
$$\text{AffordabilityPressure} = \frac{\text{PopulationSize} \times \text{Income}_{\text{average}}}{\text{Output}_{\text{Construction}}} \times 0.05 - 1.0$$

When construction output is low relative to population and income, housing inflation spikes, causing approval rates for "Poor", "Working", and "Middle" classes to drop.
