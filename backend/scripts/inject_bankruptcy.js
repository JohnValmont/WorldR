const fs = require('fs');

const txt = fs.readFileSync('src/api/controllers/manufacturing.controller.ts', 'utf8');

const anchor = `         // 5. SETTLE (per participant)
         for (const pState of participantStates) {
            const compResults = pooledSalesResults.filter((r: any) => r.alloc.company_id === pState.company.id);
            await ManufacturingController.settleForCompany(trx, pState, compResults, clock, brandMap);
         }`;

const block = `
         // 6. BANKRUPTCY HANDLING (NPCs only)
         // Death-spiral guard: 
         // When an NPC respawns, it gets full seedCapital (e.g. 1.5M - 2.5M).
         // The brain's heuristics (PRODUCTION_BUFFER bounds new production to recent sales or capacity, 
         // and MARKETING_REVENUE_PCT strictly limits marketing to 5% of prior revenue)
         // ensures it scales conservatively and will not instantly burn through its seed capital
         // in a single month, preventing an infinite bankruptcy/respawn loop.
         for (const company of participants) {
            if (company.is_npc) {
               const fin = await trx('company_finances').where({ company_id: company.id }).first();
               if (fin && parseFloat(fin.available_cash) < BANKRUPTCY_FLOOR) {
                  // Retire the old NPC
                  await trx('companies').where({ id: company.id }).update({ status: 'bankrupt' });
                  await trx('manufacturing_factories').where({ company_id: company.id }).update({ status: 'inactive' });
                  await trx('manufacturing_production_lines').where({ company_id: company.id }).update({ status: 'inactive' });
                  await trx('manufacturing_market_allocations').where({ company_id: company.id }).del();
                  
                  // Re-seed a FRESH NPC of the same personality
                  await spawnNpc(trx, company.npc_personality, company.country_id, clock);
                  
                  console.log(\`[NPC Bankruptcy] \${company.name} (\${company.id}) went bankrupt with \${fin.available_cash} cash. Respawned fresh \${company.npc_personality}!\`);
               }
            }
         }
`;

if (txt.includes(anchor)) {
    if (!txt.includes('6. BANKRUPTCY HANDLING')) {
        const newTxt = txt.replace(anchor, anchor + '\n' + block);
        fs.writeFileSync('src/api/controllers/manufacturing.controller.ts', newTxt);
        console.log('Injected successfully!');
    } else {
        console.log('Already injected.');
    }
} else {
    console.log('Anchor not found!');
}
