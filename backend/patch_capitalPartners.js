const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/api/services/capitalPartners.service.ts');
let content = fs.readFileSync(file, 'utf8');

// 1. getPortfolio
const oldGet = `  // Holdings: all shares held by owner character EXCLUDING their own companies
  // Use a subquery for latest price to avoid complex knex leftJoin+andOn issues with db.raw()
  const holdings = await db('company_shares as cs')
    .join('companies as co', 'co.id', 'cs.company_id')
    .join('company_finances as cf', 'cf.company_id', 'cs.company_id')
    .where({ 'cs.holder_character_id': company.owner_character_id })
    .where('cs.shares', '>', 0)
    .whereNot({ 'co.owner_character_id': company.owner_character_id }) // exclude own companies`;

const newGet = `  // Holdings: shares held directly by the Capital Partners firm
  // Use a subquery for latest price to avoid complex knex leftJoin+andOn issues with db.raw()
  const holdings = await db('company_shares as cs')
    .join('companies as co', 'co.id', 'cs.company_id')
    .join('company_finances as cf', 'cf.company_id', 'cs.company_id')
    .where({ 'cs.holder_company_id': companyId })
    .where('cs.shares', '>', 0)`;

content = content.replace(oldGet, newGet);

// 2. recalcPortfolioValues
const oldRecalc = `    // Correlated subquery for latest close price — identical pattern to getPortfolio above
    const row = await trx('company_shares as cs')
      .join('companies as co', 'co.id', 'cs.company_id')
      .where({ 'cs.holder_character_id': firm.owner_character_id })
      .where('cs.shares', '>', 0)
      // Exclude the firm's OWN companies (their own manufacturing co / the finance firm itself)
      .whereNot({ 'co.owner_character_id': firm.owner_character_id })`;

const newRecalc = `    // Correlated subquery for latest close price — identical pattern to getPortfolio above
    const row = await trx('company_shares as cs')
      .join('companies as co', 'co.id', 'cs.company_id')
      .where({ 'cs.holder_company_id': firm.id })
      .where('cs.shares', '>', 0)`;

content = content.replace(oldRecalc, newRecalc);

// 3. getDividendHistory
const oldDivHistory = `  const history = await db('dividend_payments as dp')
    .join('companies as co', 'co.id', 'dp.company_id')
    .where({ 'dp.holder_character_id': company.owner_character_id })`;

const newDivHistory = `  const history = await db('dividend_payments as dp')
    .join('companies as co', 'co.id', 'dp.company_id')
    .where({ 'dp.holder_company_id': companyId })`;

content = content.replace(oldDivHistory, newDivHistory);

fs.writeFileSync(file, content);
console.log('Successfully patched capitalPartners.service.ts');
