// Direct data edits used to stage the filming world (LOCAL ONLY). node world/stage.mjs <step>
//   backdate     — Elena and Hugo count as 6-month party members, so they may challenge for leadership
//   companies    — hand three rival car makers to players (renamed), so the protagonists own businesses
//   autorun      — let the computer run those companies' production (players would buy components monthly)
//   admin-on/off — Elena turns months (admin) while building; off before filming (no admin buttons on screen)
//   budget       — a sensible Drennia budget split
import { sql } from './lib.mjs';
const STEPS = {
  backdate: `update pol_party_members set joined_arc = joined_arc - 6 where character_id in (select id from characters where name in ('Elena Marsh','Hugo Crane'))`,
  companies: [
    `update companies set is_npc=false, name='Marsh Motor Works', owner_character_id=(select id from characters where name='Elena Marsh') where country_id='drennia' and npc_personality='veridian'`,
    `update companies set is_npc=false, name='Hale Industries', owner_character_id=(select id from characters where name='Victor Hale') where country_id='drennia' and npc_personality='valuecorp'`,
    `update companies set is_npc=false, name='Brannow Automotive', owner_character_id=(select id from characters where name='Oscar Brannow') where country_id='westmark' and npc_personality='veridian'`,
    `update manufacturing_vehicle_models set name='Marsh Meridian' where company_id=(select id from companies where name='Marsh Motor Works')`,
    `update manufacturing_vehicle_models set name='Hale Workhorse' where company_id=(select id from companies where name='Hale Industries')`,
    `update manufacturing_vehicle_models set name='Brannow Tidesman' where company_id=(select id from companies where name='Brannow Automotive')`,
  ],
  autorun: `update companies set is_npc=true where name in ('Marsh Motor Works','Hale Industries','Brannow Automotive')`,
  'admin-on': `update users set role='admin' where email='elena.marsh@example.com'`,
  'admin-off': `update users set role='user' where email='elena.marsh@example.com'`,
  budget: `update nation_budgets set split='{"industry":0.35,"welfare":0.25,"interior":0.2,"defence":0.2}' where state_id=(select id from pol_states where code='national')`,
};
const step = process.argv[2];
if (!STEPS[step]) { console.error('steps:', Object.keys(STEPS).join(', ')); process.exit(1); }
for (const q of [].concat(STEPS[step])) sql(q);
console.log('done', step);
