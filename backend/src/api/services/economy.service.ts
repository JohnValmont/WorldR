export const BASE_PER_CAPITA = 0.01; // Yields 50,000 (50 Billion) for a population of 5,000,000

export async function processMacroEconomy(trx: any, stateId: string, currentArc: number) {
  try {
    // 1. Get the state
    const state = await trx('pol_states').where({ id: stateId }).first();
    if (!state) return;

    // 2. Update the Market's Economic Multiplier based on Prosperity
    if (state.code !== 'national') {
      const prosperity = Number(state.cond_prosperity ?? state.stat_prosperity ?? 50);
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
  } catch (err) {
    // Non-blocking fallback
    console.error(`[economy] Failed processMacroEconomy for state ${stateId}:`, err);
  }
}
