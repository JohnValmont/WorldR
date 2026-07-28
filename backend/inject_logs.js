import * as fs from 'fs';

const p = 'd:\\WorldR\\backend\\src\\api\\controllers\\manufacturing.controller.ts';
let code = fs.readFileSync(p, 'utf-8');

// Find processCountryMonth
const search = `  public static async processCountryMonth(trx: any, countryId: string, clock: any): Promise<{ processedCompanies: number }> {`;
const replace = search + `
        console.log('[DEBUG] processCountryMonth START', countryId);
`;
code = code.replace(search, replace);

code = code.replace(
  `        for (const company of participants) {`,
  `        console.log('[DEBUG] Loop participants...');
        for (const company of participants) {`
);

code = code.replace(
  `        // 2. DECIDE (NPCs only)`,
  `        console.log('[DEBUG] Step 2: Decide NPCs');
        // 2. DECIDE (NPCs only)`
);

code = code.replace(
  `        // 3. PRODUCE (per participant)`,
  `        console.log('[DEBUG] Step 3: Produce');
        // 3. PRODUCE (per participant)`
);

code = code.replace(
  `        // 4. SELL (pooled, per market)`,
  `        console.log('[DEBUG] Step 4: Sell');
        // 4. SELL (pooled, per market)`
);

code = code.replace(
  `        // 5. SETTLE (finances, reputation)`,
  `        console.log('[DEBUG] Step 5: Settle');
        // 5. SETTLE (finances, reputation)`
);

fs.writeFileSync(p, code);
console.log('Injected logs.');
