# AI Staff Simulation Formulas

Mathematical equations driving the costs and benefits of political party AI staff.

## 1. Hiring and Salary Scaling
The recruitment fee ($F_{\text{hire}}$) and monthly salary ($S_{\text{staff}}$) scale with the seniority level:
$$F_{\text{hire}} = \text{baseRecruitmentFee} \times \text{SeniorityMultiplier}$$
$$S_{\text{staff}} = \text{baseStaffSalary} \times \text{SeniorityMultiplier}$$

Where $\text{SeniorityMultiplier}$ is defined as:
* Junior: $1.0$
* Mid: $1.8$
* Senior: $3.2$

## 2. Campaign and Fundraising Bonuses
AI Staff members provide bonuses to party activities (rallies, press campaigns, fundraising) based on their skill rating ($K_s \in [0, 1]$):
$$\text{ActivityCost} = \text{BaseCost} \times \left(1 - \sum_{m \in \text{Staff}} K_s(m) \times \text{recruitmentBonusCoefficient}\right)$$
$$\text{ActivityBoost} = \text{BaseBoost} \times \left(1 + \sum_{m \in \text{Staff}} K_s(m) \times \text{campaignBonusCoefficient}\right)$$
$$\text{FundraisingYield} = \text{FundraisingCost} \times \text{fundraiserDonationMultiplier} \times \left(1 + \sum_{m \in \text{Staff}} K_s(m) \times 0.25\right)$$

All cost reductions are clamped at a maximum discount of 50%.
