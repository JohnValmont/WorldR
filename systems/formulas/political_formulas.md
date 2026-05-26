# Political Simulation Formulas

Mathematical equations driving the WORLDr voter behaviors, party standings, and election coalitions.

## 1. Voter Bloc Approval Dynamics
The monthly approval rating ($A_b$) for each of the 12 voter blocs is calculated by moving toward an equilibrium value based on economic conditions and ideological matches:
$$A_b(t) = A_b(t-1) \times 0.85 + \text{Equilibrium}_b \times 0.15$$

Where:
$$\text{Equilibrium}_b = 0.50 - \text{InflationPenalty}_b - \text{UnemploymentPenalty}_b + \text{WelfareBonus}_b + \text{GoverningPartyBonus}_b$$

$$\text{InflationPenalty}_b = \text{CPI\_Inflation} \times \text{InflationSensitivity}_b \times 0.8$$
$$\text{UnemploymentPenalty}_b = \text{UnemploymentRate} \times \text{UnemploymentSensitivity}_b \times 0.6$$
$$\text{WelfareBonus}_b = \text{WelfareIndex} \times \text{WelfareDependence}_b \times 0.15$$

$$\text{GoverningPartyBonus}_b = \min\left(0.10, \sum_{p \in \text{GoverningParties}} \text{Affinity}(b, p) \times 0.05\right)$$

## 2. Dynamic Party Standings (Support Share)
A party's popularity (support share $S_p$) is calculated from voter blocs' sizes, approvals, and their specific affinity for the party:
$$\text{RawSupport}_p = \sum_{b \in \text{Blocs}} \text{PopulationShare}_b \times \text{Turnout}_b \times \frac{\text{Affinity}(b, p)}{\sum_{q} \text{Affinity}(b, q)}$$

$$\text{SupportShare}_p = \frac{\text{RawSupport}_p}{\sum_k \text{RawSupport}_k}$$

## 3. Coalition Ideological Compatibility
When forming governing coalitions, the compatibility between two parties' ideologies is determined using a 3-tier matrix:
$$\text{Comp}(i_1, i_2) \in \{+2 \text{ (Compatible)}, +1 \text{ (Neutral)}, -1 \text{ (Incompatible)}\}$$

A coalition is viable if its combined seats exceed $50\% + 1$ and the compatibility scores between member parties are non-negative.
$$ \text{CoalitionSeats} = \sum_{p \in \text{Coalition}} \text{Seats}_p \ge \text{MajorityThreshold} $$
$$ \forall p_1, p_2 \in \text{Coalition}, \text{Comp}(p_1, p_2) \ge 0 $$
