export const BASE_PER_CAPITA = 0.2; // Yields 1,000,000 for a population of 5,000,000

export async function processMacroEconomy(trx: any, stateId: string, currentArc: number) {
  // 1. Get the state
  const state = await trx('pol_states').where({ id: stateId }).first();
  if (!state) return;

  // 2. Calculate baseline GDP from population (Background NPC economy)
  const baseGdp = state.raw_population * BASE_PER_CAPITA;

  // 3. Calculate active corporate output
  let corporateQuery = trx('company_finances')
    .join('companies', 'company_finances.company_id', 'companies.id')
    .where('companies.status', 'active');

  if (state.code === 'national') {
    // National state: include ALL companies in the country
    corporateQuery = corporateQuery.where('companies.country_id', state.country_id);
  } else {
    // Regional state: include only companies headquartered here
    const hqString = `${state.country_id}-${state.code}`;
    corporateQuery = corporateQuery.where('companies.headquarters_state_id', hqString);
  }

  const corporateResult = await corporateQuery.sum('company_finances.last_arc_revenue as total_revenue').first();

  // The sum could be null if no companies exist
  const corporateOutput = corporateResult?.total_revenue ? Number(corporateResult.total_revenue) : 0;

  // We can divide corporate output if it's stored in raw dollars and GDP is in millions
  // Assuming corporate revenue is in raw dollars (e.g. $10,000,000), we divide by 1,000,000 to add to raw_gdp
  const corporateGdpContribution = corporateOutput / 1000000;

  const newGdp = baseGdp + corporateGdpContribution;

  // 4. Update the state's raw_gdp
  await trx('pol_states')
    .where({ id: state.id })
    .update({ raw_gdp: newGdp });

  // 5. Update the Market's Economic Multiplier based on Prosperity
  if (state.code !== 'national') {
    const prosperity = Number(state.stat_prosperity || 50);
    let multiplier = 1.0;
    
    if (prosperity >= 85) {
      multiplier = 10.0;
    } else if (prosperity >= 20) {
      multiplier = 1.0 + ((prosperity - 20) / 65) * 9.0;
    } else {
      multiplier = Math.max(0.1, prosperity / 20);
    }

    await trx('manufacturing_region_markets')
      .where({ state_id: `${state.country_id}-${state.code}` })
      .update({ economic_multiplier: multiplier });
  }
}
