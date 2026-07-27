import re

with open(r"d:\WorldR\backend\src\api\controllers\politics.controller.ts", "r", encoding="utf-8") as f:
    content = f.read()

# 1. proposeBill
content = re.sub(
    r"(const currentMonth = worldClockToArc\(clock\);)",
    r"\1\n\n      await spendAp(trx, char.id, 2);\n      await spendPc(trx, char.id, 2);",
    content
)

# 2. setDoctrine
content = re.sub(
    r"(if \(party.leader_character_id !== character.id\) \{\s*return next\(new AppError\('Only the party leader can set the doctrine', 403, 'FORBIDDEN'\)\);\s*\})",
    r"\1\n\n      await spendAp(db, character.id, 5);\n      await spendPc(db, character.id, 5);",
    content
)

# 3. setTenet
content = re.sub(
    r"(if \(party.leader_character_id !== character.id\) \{\s*return next\(new AppError\('Only the party leader can change the tenet', 403, 'FORBIDDEN'\)\);\s*\})",
    r"\1\n\n      await spendAp(db, character.id, 1);\n      await spendPc(db, character.id, 1);",
    content
)

# 4. setCampaignStrategyHandler
content = re.sub(
    r"(await setCampaignStrategy\(trx, membership.party_id, cycle.id, character.id, strategy, currentArc\);)",
    r"\1\n\n      await spendAp(trx, character.id, 2);",
    content
)

# 5. doOutreach
content = re.sub(
    r"(// Optionally make a policy commitment)",
    r"await spendAp(trx, character.id, 3);\n\n      \1",
    content
)

# 6. doRallySupport
content = re.sub(
    r"(// Update relationship\s+const existing = await trx\('pol_party_interest_groups'\))",
    r"await spendPc(trx, character.id, 2);\n\n      \1",
    content
)

# 7. doExclusiveInterviewHandler
content = re.sub(
    r"(// Add momentum\s+await trx\('pol_parties'\)\.where\(\{ id: membership.party_id \}\)\.increment\('momentum', 5\);)",
    r"await spendAp(trx, character.id, 3);\n\n      \1",
    content
)

# 8. doPressConferenceHandler
content = re.sub(
    r"(// Boost all existing relationships slightly)",
    r"await spendAp(trx, character.id, 2);\n\n      \1",
    content
)

with open(r"d:\WorldR\backend\src\api\controllers\politics.controller.ts", "w", encoding="utf-8") as f:
    f.write(content)
