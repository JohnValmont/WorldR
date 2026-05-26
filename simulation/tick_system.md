# WORLDr Simulation Tick - Implementation Details & Pseudocode

This document defines the mathematical equations and database integration pseudocode for the monthly simulation tick in Phase 1 of WORLDr.

---

## 1. Subsystem Mathematical Formulas

All equations are parameterized. Standard variable names refer to values loaded from the `parameters` table or resolved via active law modifiers.

### Step 1: Sector Production & GDP
For each sector $s \in \{\text{Agriculture}, \text{Industry}, \text{Services}, \text{Energy}, \text{Construction}\}$:
1. **Resolved Productivity**:
   $$P_s = P_{s,\text{base}} \times M_{P,s}$$
   *Where $P_{s,\text{base}}$ is the base sector productivity parameter, and $M_{P,s}$ is the resolved law multiplier.*
2. **Sector Output**:
   $$O_s = W_s \times P_s$$
   *Where $W_s$ is the number of active workers in sector $s$.*
3. **National GDP**:
   $$\text{GDP} = \sum_{s} O_s$$

---

### Step 2: Wages & Unemployment
1. **Sector Wages**:
   $$w_s = w_{s,\text{base}} \times M_{w,s} \times P_s$$
   *Wages scale with productivity index changes and law-based wage multipliers.*
2. **Labor Force & Total Employment**:
   $$\text{Population} = \sum_{c} \text{size}_c$$
   $$\text{Labor Force (LF)} = \text{Population} \times \text{participation\_rate}$$
   $$\text{Employed (E)} = \sum_{s} W_s$$
3. **National Unemployment Rate**:
   $$U = \frac{\text{LF} - \text{E}}{\text{LF}}$$
   *Enforced constraint: $0.0 \le U \le 1.0$. If workforce demand exceeds labor force, hiring is scaled down proportionally to ensure $U \ge 0.0$.*

---

### Step 3: Inflation & CPI
1. **Sector Price Indices**:
   Inflation in key sectors depends on output growth relative to consumption demand (population size):
   $$\pi_s = \text{base\_inflation} + \left( \frac{\text{Population} \times \text{consumption\_rate}_s}{O_s} - 1.0 \right) \times \text{scarcity\_multiplier}_s$$
   *Ensures price spikes when production output falls behind demand.*
2. **Consumer Price Index (CPI)**:
   $$\pi_{\text{cpi}} = \omega_{\text{food}} \pi_{\text{Agriculture}} + \omega_{\text{fuel}} \pi_{\text{Energy}} + \omega_{\text{housing}} \pi_{\text{Construction}} + \omega_{\text{other}} \pi_{\text{Services}}$$
   *Where weights $\omega_i$ sum to 1.0.*

---

### Step 4: Budget & Treasury
1. **Tax Revenue**:
   - **Income Tax**: $R_{\text{income}} = \text{rate}_{\text{income}} \times \sum_{s} (W_s \times w_s)$
   - **Corporate Tax**: $R_{\text{corporate}} = \text{rate}_{\text{corporate}} \times \sum_{s} \max(0, O_s - (W_s \times w_s))$
   - **Sales Tax**: $R_{\text{sales}} = \text{rate}_{\text{sales}} \times \text{GDP} \times \text{consumer\_propensity}$
   - **Total Tax Revenue**: $R = R_{\text{income}} + R_{\text{corporate}} + R_{\text{sales}} + R_{\text{tariffs}}$
2. **Spending Allocation**:
   $$S = \sum_{b} \text{allocation}_b$$
3. **Deficit & Treasury Update**:
   $$\Delta T = R - S$$
   $$T_{\text{new}} = T_{\text{old}} + \Delta T$$
4. **National Debt Update**:
   If treasury falls below a minimum threshold ($T_{\text{min}}$):
   $$\text{Deficit Financing} = T_{\text{min}} - T_{\text{new}}$$
   $$\text{Debt}_{\text{new}} = \text{Debt}_{\text{old}} + \text{Deficit Financing}$$
   $$T_{\text{new}} = T_{\text{min}}$$

---

### Step 5: Approval & Stability
1. **Population Class Approval** ($A_c$ for class $c$):
   Approval changes based on real wage growth, CPI inflation, and unemployment:
   $$\Delta A_c = \text{base\_approval\_drift} + \left( \frac{\Delta \text{Real Wage}_c}{\text{Wage}_c} \right) \times \gamma_{w,c} - \pi_{\text{cpi}} \times \gamma_{\pi,c} - U \times \gamma_{u,c}$$
   $$A_{c,\text{new}} = \text{clamp}(A_{c,\text{old}} + \Delta A_c, 0.0, 1.0)$$
   *Where $\gamma$ constants represent group-specific sensitivities.*
2. **National Approval**:
   $$A_{\text{nation}} = \sum_{c} \left( \frac{\text{size}_c}{\text{Population}} \right) A_{c,\text{new}}$$
3. **National Stability**:
   $$\Delta St = \text{base\_stability\_drift} - U \times \alpha_u - \pi_{\text{cpi}} \times \alpha_{\pi} - \left( \frac{\text{Debt}}{\text{GDP}} \right) \times \alpha_d + \left( \frac{S_{\text{welfare}}}{S} \right) \times \alpha_w$$
   $$St_{\text{new}} = \text{clamp}(St_{\text{old}} + \Delta St, 0.0, 1.0)$$

---

## 2. Master Tick Execution Pseudocode

```typescript
class TickEngine {
  private trx: Transaction;
  private nationId: string;

  constructor(trx: Transaction, nationId: string) {
    this.trx = trx;
    this.nationId = nationId;
  }

  public async executeTick(): Promise<void> {
    // 1. Fetch live state (Row lock acquired via FOR UPDATE in Knex)
    const nation = await this.trx('nations').where({ id: this.nationId }).first().forUpdate();
    const sectors = await this.trx('economic_sectors').where({ nation_id: this.nationId });
    const populationGroups = await this.trx('population_groups').where({ nation_id: this.nationId });
    const taxes = await this.trx('taxes').where({ nation_id: this.nationId });
    const budgetItems = await this.trx('budget_items').where({ nation_id: this.nationId });
    const activeLaws = await this.trx('laws').where({ nation_id: this.nationId, status: 'passed' });

    // 2. Fetch parameters and active law modifiers
    const params = await ParameterService.loadAll();
    const modifiers = await LawService.resolveModifiers(activeLaws);

    // 3. Stage 1: Economy & GDP
    let newGDP = 0;
    const resolvedSectors = sectors.map(sec => {
      const productivity = ModifierResolver.resolve(sec.productivity, modifiers);
      const output = sec.workers * productivity;
      newGDP += output;
      return { ...sec, output, productivity, growth: (output - sec.output) / (sec.output || 1.0) };
    });

    // 4. Stage 2: Wages & Unemployment
    let totalWorkers = 0;
    const population = populationGroups.reduce((acc, grp) => acc + Number(grp.size), 0);
    const laborForce = population * params.participation_rate;

    const resolvedSectorsWithWages = resolvedSectors.map(sec => {
      const wages = sec.wages * ModifierResolver.resolve(1.0, modifiers); // Resolve wage adjustments
      totalWorkers += sec.workers;
      return { ...sec, wages };
    });
    const unemploymentRate = Math.max(0.0, (laborForce - totalWorkers) / laborForce);

    // 5. Stage 3: Inflation & CPI
    let cpiNumerator = 0;
    let cpiDenominator = 0;
    const resolvedSectorsWithPrices = resolvedSectorsWithWages.map(sec => {
      const scarcity = (population * params[`consumption_rate_${sec.name.toLowerCase()}`]) / (sec.output || 1.0);
      const inflation = params.base_inflation + (scarcity - 1.0) * params[`scarcity_multiplier_${sec.name.toLowerCase()}`];
      
      const weight = params[`weight_${sec.name.toLowerCase()}`];
      cpiNumerator += inflation * weight;
      cpiDenominator += weight;

      return { ...sec, inflation };
    });
    const newCPI = cpiNumerator / (cpiDenominator || 1.0);

    // 6. Stage 4: Budget, Revenue & Treasury
    let taxRevenue = 0;
    const resolvedTaxes = taxes.map(tax => {
      const rate = ModifierResolver.resolve(tax.rate, modifiers);
      let base = 0;
      if (tax.name === 'Income Tax') base = resolvedSectorsWithPrices.reduce((a, s) => a + (s.workers * s.wages), 0);
      else if (tax.name === 'Corporate Tax') base = resolvedSectorsWithPrices.reduce((a, s) => a + Math.max(0, s.output - (s.workers * s.wages)), 0);
      else if (tax.name === 'Sales Tax') base = newGDP * params.consumer_propensity;
      
      const revenue = base * rate;
      taxRevenue += revenue;
      return { ...tax, rate, revenue };
    });

    const totalSpending = budgetItems.reduce((acc, b) => acc + Number(b.allocation), 0);
    let newTreasury = Number(nation.treasury) + taxRevenue - totalSpending;
    let newDebt = Number(nation.debt);

    if (newTreasury < params.min_treasury_reserve) {
      const deficitFinancing = params.min_treasury_reserve - newTreasury;
      newDebt += deficitFinancing;
      newTreasury = params.min_treasury_reserve;
    }

    // 7. Stage 5: Approval & Stability
    let aggregatedApproval = 0;
    const resolvedPopGroups = populationGroups.map(grp => {
      const wageChange = 0.02; // Placeholder or calculated real wage change
      const deltaApp = params.base_approval_drift + wageChange * grp.income_sensitivity - newCPI * grp.inflation_sensitivity - unemploymentRate * grp.unemployment_sensitivity;
      const approval = Math.min(1.0, Math.max(0.0, Number(grp.approval) + deltaApp));
      aggregatedApproval += approval * (Number(grp.size) / population);
      return { ...grp, approval };
    });

    const welfareAllocation = budgetItems.find(b => b.name === 'Welfare')?.allocation || 0;
    const deltaStability = params.base_stability_drift - unemploymentRate * params.alpha_u - newCPI * params.alpha_pi - (newDebt / newGDP) * params.alpha_d + (welfareAllocation / totalSpending) * params.alpha_w;
    const newStability = Math.min(1.0, Math.max(0.0, Number(nation.stability) + deltaStability));

    // 8. Commit Updates to Database
    await this.trx('nations').where({ id: this.nationId }).update({
      treasury: newTreasury,
      debt: newDebt,
      gdp: newGDP,
      inflation_cpi: newCPI,
      approval: aggregatedApproval,
      stability: newStability,
      current_tick: nation.current_tick + 1,
      updated_at: new Date()
    });

    for (const s of resolvedSectorsWithPrices) {
      await this.trx('economic_sectors').where({ id: s.id }).update({ output: s.output, productivity: s.productivity, wages: s.wages, growth: s.growth });
    }
    for (const p of resolvedPopGroups) {
      await this.trx('population_groups').where({ id: p.id }).update({ approval: p.approval });
    }
    for (const t of resolvedTaxes) {
      await this.trx('taxes').where({ id: t.id }).update({ revenue: t.revenue, rate: t.rate });
    }

    // 9. Write Monthly Snapshot Record
    const snapshotData = {
      sectors: resolvedSectorsWithPrices.map(s => ({ name: s.name, output: s.output, workers: s.workers, wages: s.wages })),
      population_groups: resolvedPopGroups.map(p => ({ name: p.name, size: p.size, approval: p.approval })),
      taxes: resolvedTaxes.map(t => ({ name: t.name, rate: t.rate, revenue: t.revenue })),
      budget_items: budgetItems.map(b => ({ name: b.name, allocation: b.allocation }))
    };

    await this.trx('historical_snapshots').insert({
      nation_id: this.nationId,
      tick: nation.current_tick,
      gdp: newGDP,
      inflation_food: resolvedSectorsWithPrices.find(s => s.name === 'Agriculture')?.inflation || 0,
      inflation_fuel: resolvedSectorsWithPrices.find(s => s.name === 'Energy')?.inflation || 0,
      inflation_housing: resolvedSectorsWithPrices.find(s => s.name === 'Construction')?.inflation || 0,
      inflation_cpi: newCPI,
      unemployment_rate: unemploymentRate,
      approval: aggregatedApproval,
      stability: newStability,
      treasury: newTreasury,
      debt: newDebt,
      revenue: taxRevenue,
      spending: totalSpending,
      snapshot_data: JSON.stringify(snapshotData)
    });
  }
}
```
