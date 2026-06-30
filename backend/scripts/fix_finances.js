const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../database/seeds/0004_npc_drennia_seeds.sql');
let content = fs.readFileSync(file, 'utf8');

const oldFinances = 'INSERT INTO company_finances (company_id, available_cash, debt, company_value, last_arc_profit)';
const newFinances = 'INSERT INTO company_finances (company_id, currency_id, available_cash, debt, company_value, last_arc_profit)';

content = content.replace(new RegExp(oldFinances.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g'), newFinances);

content = content.replace(/VALUES \(v_company_id, 1500000, 0, 1500000, 0\)/g, "VALUES (v_company_id, 'drennian-mark', 1500000, 0, 1500000, 0)");
content = content.replace(/VALUES \(v_company_id, 2500000, 0, 2500000, 0\)/g, "VALUES (v_company_id, 'drennian-mark', 2500000, 0, 2500000, 0)");
content = content.replace(/VALUES \(v_company_id, 2000000, 0, 2000000, 0\)/g, "VALUES (v_company_id, 'drennian-mark', 2000000, 0, 2000000, 0)");

fs.writeFileSync(file, content);
console.log('Fixed finances seeds.');
