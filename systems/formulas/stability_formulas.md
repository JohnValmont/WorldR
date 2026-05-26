# Stability Simulation Formulas

Mathematical equations driving national stability, protest buildup, and security tradeoffs.

## 1. National Stability
National stability ($S_n$) represents the cohesion of the state, determined by popular approval, institutional trust, and security friction:
$$S_n = \text{baseStability} + (\text{Approval}_{\text{weighted}} \times \text{approvalWeight}) - \text{CorruptionPenalty} - \text{BrutalityPenalty}$$

Where:
$$\text{CorruptionPenalty} = \text{CorruptionLevel} \times \text{corruptionPenaltyWeight}$$
$$\text{BrutalityPenalty} = \text{PoliceBrutalityRisk} \times \text{policeBrutalityPenaltyWeight}$$

## 2. Protest Pressure Buildup
Protest risk ($PR$) accumulates when national approval or stability falls below critical levels:
If $\text{Approval}_{\text{weighted}} < \text{protest\_approval\_threshold}$ or $S_n < \text{protest\_stability\_threshold}$:
$$PR(t) = PR(t-1) + \text{buildupSpeed} \times (1 - S_n)$$
Else:
$$PR(t) = \max\left(0, PR(t-1) \times \text{naturalDecayRate}\right)$$

## 3. Police Enforcement & Brutality Tradeoff
Police force efficiency scales with administration funding but risks backlash:
$$\text{BrutalityRisk} = \text{policing\_brutality\_base} + \text{PoliceStrength} \times \text{policing\_brutality\_budget\_impact} + (1 - S_n) \times \text{policing\_brutality\_unrest\_impact} - \text{PoliceTrust} \times 0.1$$
$$\text{LegitimacyTradeoff} = \text{BrutalityRisk} \times \text{PoliceStrength}$$
