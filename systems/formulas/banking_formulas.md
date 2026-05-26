# Banking and Debt Simulation Formulas

Mathematical equations driving interest rates, debt servicing, and banking system stress.

## 1. National Debt Interest Rate Surcharges
The interest rate on national debt ($r_{\text{debt}}$) increases dynamically when the Debt-to-GDP ratio climbs:
$$r_{\text{debt}} = \text{baseInterestRate} + \Delta r_{\text{risk}}$$

$$\Delta r_{\text{risk}} = \max\left(0, \left(\frac{\text{Debt}}{\text{GDP}} - 0.60\right) \times \text{debtToGdpSurchargeCoeff}\right)$$

## 2. Banking Stress Accumulation
Stress on the banking sector builds up when the public debt ratio exceeds a critical tolerance threshold:
If $\frac{\text{Debt}}{\text{GDP}} > \text{bankingStressThreshold}$:
$$\text{Stress}(t) = \text{Stress}(t-1) + \text{bankingBuildupSpeed} \times \left(\frac{\text{Debt}}{\text{GDP}} - \text{bankingStressThreshold}\right)$$
Else:
$$\text{Stress}(t) = \max\left(0, \text{Stress}(t-1) - \text{bankingRecoverySpeed}\right)$$

High banking stress leads to economic contraction, raising the likelihood of banking crisis modifiers.
