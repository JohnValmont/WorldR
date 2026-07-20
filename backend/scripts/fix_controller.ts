import * as fs from 'fs';
const polConstantsPath = '../src/api/constants/politics.ts';
let polConstants = fs.readFileSync(polConstantsPath, 'utf8');
if (!polConstants.includes('DOCTRINE_IDENTITIES')) {
  polConstants = polConstants.replace('export const DOCTRINE_SIGNATURE_ACTION', 'export const DOCTRINE_IDENTITIES: Record<DoctrineId, { tagline: string, blurb: string, color: string }> = {
    forge_accord:  { tagline: ''Workers first'', blurb: ''Industry built by the state, jobs protected, borders guarded.'', color: ''#F59E0B'' },
    the_ledger:    { tagline: ''Free markets'', blurb: ''Low taxes, a small state, and open trade.'', color: ''#3B82F6'' },
    the_homestead: { tagline: ''Order & tradition'', blurb: ''Balanced books, protected industry, and law and order.'', color: ''#10B981'' },
    the_commons:   { tagline: ''Redistribute & reform'', blurb: ''Redistribution, public investment, and bold reform.'', color: ''#EF4444'' },
    the_vanguard:  { tagline: ''Reform & openness'', blurb: ''Open trade, pragmatic investment, and bold institutional change.'', color: ''#8B5CF6'' },
    the_compact:   { tagline: ''The balanced path'', blurb: ''Balanced on every issue. Defined by its record.'', color: ''#6366f1'' },
    the_syndicate: { tagline: ''Power to creators'', blurb: ''Strong unions, collective ownership, and a worker-first economy.'', color: ''#EC4899'' },
    the_directory: { tagline: ''Efficiency & growth'', blurb: ''State-led investment and data-driven governance.'', color: ''#14B8A6'' },
  };

export const DOCTRINE_SIGNATURE_ACTION');
  fs.writeFileSync(polConstantsPath, polConstants);
}
const polControllerPath = '../src/api/controllers/politics.controller.ts';
let polController = fs.readFileSync(polControllerPath, 'utf8');
if (!polController.includes('DOCTRINE_IDENTITIES')) {
  polController = polController.replace('DOCTRINE_PLATFORMS,
  DOCTRINE_SIGNATURE_ACTION', 'DOCTRINE_PLATFORMS,
  DOCTRINE_IDENTITIES,
  DOCTRINE_SIGNATURE_ACTION');
  polController = polController.replace('color: ''#6C7A89'',
        monogram: fallbackMonogram,
        leader: character.name || ''Party Leader'',
        motto: ''A new voice in the Council.'',
        blurb: ''Player-founded party.''', 'color: DOCTRINE_IDENTITIES[doctrine_id as keyof typeof DOCTRINE_IDENTITIES]?.color || ''#6C7A89'',
        monogram: fallbackMonogram,
        leader: character.name || ''Party Leader'',
        motto: DOCTRINE_IDENTITIES[doctrine_id as keyof typeof DOCTRINE_IDENTITIES]?.tagline || ''A new voice in the Council.'',
        blurb: DOCTRINE_IDENTITIES[doctrine_id as keyof typeof DOCTRINE_IDENTITIES]?.blurb || ''Player-founded party.''');
  fs.writeFileSync(polControllerPath, polController);
}
console.log('Fixed properly!');