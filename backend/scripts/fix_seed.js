const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../../database/seeds/0004_npc_drennia_seeds.sql');
let content = fs.readFileSync(file, 'utf8');

const oldCols = 'INSERT INTO companies (owner_character_id, country_id, industry_id, name, status, is_npc, npc_personality, reputation, reliability)';
const newCols = 'INSERT INTO companies (owner_character_id, world_instance_id, country_id, headquarters_state_id, industry_id, legal_structure_id, currency_id, name, status, is_npc, npc_personality, reputation, reliability, created_at_world_year, created_at_world_month, created_at_world_day)';

content = content.replace(new RegExp(oldCols.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g'), newCols);

content = content.replace(/VALUES \(v_sys_char_id, 'drennia', 'manufacturing', 'Valuecorp', 'active', TRUE, 'valuecorp', 50, 50\)/g, "VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'Valuecorp', 'active', TRUE, 'valuecorp', 50, 50, 0, 0, 0)");
content = content.replace(/VALUES \(v_sys_char_id, 'drennia', 'manufacturing', 'Veridian Motors', 'active', TRUE, 'veridian', 50, 50\)/g, "VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'Veridian Motors', 'active', TRUE, 'veridian', 50, 50, 0, 0, 0)");
content = content.replace(/VALUES \(v_sys_char_id, 'drennia', 'manufacturing', 'Apex Automobili', 'active', TRUE, 'apex', 50, 50\)/g, "VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'Apex Automobili', 'active', TRUE, 'apex', 50, 50, 0, 0, 0)");
content = content.replace(/VALUES \(v_sys_char_id, 'drennia', 'manufacturing', 'HaulPro', 'active', TRUE, 'haulpro', 50, 50\)/g, "VALUES (v_sys_char_id, 'pre-alpha-world-1', 'drennia', 'drennia-drennport', 'manufacturing', 'sole-trader', 'dollar', 'HaulPro', 'active', TRUE, 'haulpro', 50, 50, 0, 0, 0)");

fs.writeFileSync(file, content);
console.log('Fixed seeds.');
