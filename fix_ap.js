const fs = require('fs');

const path = 'd:/WorldR/backend/src/api/controllers/politics.controller.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. proposeBill
content = content.replace(
    /(const currentMonth = worldClockToArc\(clock\);)/,
    "$1\n\n      await spendAp(trx, char.id, 2);\n      await spendPc(trx, char.id, 2);"
);

// 2. setDoctrine
content = content.replace(
    /(if \(party\.leader_character_id !== character\.id\) \{\s*return next\(new AppError\('Only the party leader can set the doctrine', 403, 'FORBIDDEN'\)\);\s*\})/,
    "$1\n\n      await spendAp(db, character.id, 5);\n      await spendPc(db, character.id, 5);"
);

// 3. setTenet
content = content.replace(
    /(if \(party\.leader_character_id !== character\.id\) \{\s*return next\(new AppError\('Only the party leader can change the tenet', 403, 'FORBIDDEN'\)\);\s*\})/,
    "$1\n\n      await spendAp(db, character.id, 1);\n      await spendPc(db, character.id, 1);"
);

// 4. setCampaignStrategyHandler
content = content.replace(
    /(await setCampaignStrategy\(trx, membership\.party_id, cycle\.id, character\.id, strategy, currentArc\);)/,
    "$1\n\n      await spendAp(trx, character.id, 2);"
);

// 5. doOutreach
content = content.replace(
    /(\/\/ Optionally make a policy commitment)/,
    "await spendAp(trx, character.id, 3);\n\n      $1"
);

// 6. doRallySupport
content = content.replace(
    /(\/\/ Update relationship\s+const existing = await trx\('pol_party_interest_groups'\))/,
    "await spendPc(trx, character.id, 2);\n\n      $1"
);

// 7. doExclusiveInterviewHandler
content = content.replace(
    /(\/\/ Add momentum\s+await trx\('pol_parties'\)\.where\(\{ id: membership\.party_id \}\)\.increment\('momentum', 5\);)/,
    "await spendAp(trx, character.id, 3);\n\n      $1"
);

// 8. doPressConferenceHandler
content = content.replace(
    /(\/\/ Boost all existing relationships slightly)/,
    "await spendAp(trx, character.id, 2);\n\n      $1"
);

fs.writeFileSync(path, content, 'utf8');
