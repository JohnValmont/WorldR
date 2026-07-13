const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/api/services/economyTick.service.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. Dividends
const oldDiv = `    for (const holder of holders) {
      const amount = Math.floor((pool * Number(holder.shares)) / totalShares * 100) / 100;
      if (amount <= 0) continue;

      // If the holder has a Capital Partners firm, credit the FIRM instead of personal cash.
      // This is the core mechanic: the firm "receives" dividends from its investment portfolio.
      const capitalFirm = await trx('companies')
        .where({ owner_character_id: holder.holder_character_id, industry_id: 'finance', status: 'active', is_npc: false })
        .first('id');

      if (capitalFirm) {
        // Credit the firm's treasury
        await trx('company_finances')
          .where({ company_id: capitalFirm.id })
          .increment('available_cash', amount)
          .increment('company_value', amount);
      } else {
        // Normal path: credit personal wallet
        await trx('character_finances')
          .where({ character_id: holder.holder_character_id })
          .increment('cash_in_hand', amount);
      }

      await trx('dividend_payments').insert({
        company_id: policy.company_id,
        holder_character_id: holder.holder_character_id,
        game_year: year,
        game_month: month,
        shares_held: holder.shares,
        amount,
      });`;

const newDiv = `    for (const holder of holders) {
      const amount = Math.floor((pool * Number(holder.shares)) / totalShares * 100) / 100;
      if (amount <= 0) continue;

      if (holder.holder_company_id) {
        // Credit the firm's treasury directly
        await trx('company_finances')
          .where({ company_id: holder.holder_company_id })
          .increment('available_cash', amount)
          .increment('company_value', amount);
      } else if (holder.holder_character_id) {
        // Normal path: credit personal wallet
        await trx('character_finances')
          .where({ character_id: holder.holder_character_id })
          .increment('cash_in_hand', amount);
      }

      await trx('dividend_payments').insert({
        company_id: policy.company_id,
        holder_character_id: holder.holder_character_id || null,
        holder_company_id: holder.holder_company_id || null,
        game_year: year,
        game_month: month,
        shares_held: holder.shares,
        amount,
      });`;

content = content.replace(oldDiv, newDiv);

// 2. Net worth
// I need to change how net worth calculates equity.
// Currently it loops over:
/*
    const shares = await trx('company_shares as cs')
      .join('companies as c', 'c.id', 'cs.company_id')
      .join('company_finances as cf', 'cf.company_id', 'c.id')
      .where({ 'cs.holder_character_id': char.id, 'c.status': 'active' })
...
*/
// It only considers holder_character_id. This is correct for PERSONAL equity value!
// But wait, the firm's value is also calculated into net worth!
// Where does the firm's value get added to net worth?
// Wait, the above query:
// 'cs.holder_character_id': char.id, 'c.status': 'active'
// It gets ALL shares held by the character, which includes the 1,000,000 shares of the Capital Partners firm itself!
// So the Capital Partners firm's company_value is added to the character's equity_value.
// AND the firm's company_value is recomputed by recalcPortfolioValues which sums the value of its holdings.
// So no changes are needed to the Net Worth logic! It's already perfectly structured!

fs.writeFileSync(file, content);
console.log('Successfully patched economyTick.service.ts');
