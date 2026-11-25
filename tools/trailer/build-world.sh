#!/bin/bash
# Builds the filming world on a FRESH local database (backend on :4000, frontend on :3000,
# NODE_ENV not production so the 000000 verification bypass works). LOCAL ONLY.
set -e
cd "$(dirname "$0")/world"
node world.mjs                     # 11 players in 3 nations, parties, a new player party
node stage.mjs backdate && node step2.mjs   # Elena leads CSU (Drennia), Hugo leads HSU (Eryndor)
for i in 1 2 3; do node month.mjs; done    # founding election
node coalition.mjs && node month.mjs       # Marsh Administration takes office
node stage.mjs companies && node bills.mjs 0
for i in 1 2 3 4 5 6 7 8; do node month.mjs; if [ $((i % 2)) = 0 ]; then node bills.mjs $i; fi; done
node stage.mjs autorun
for i in 1 2 3 4; do node month.mjs; done  # sales history
node bills.mjs 1 && node deals.mjs && node stage.mjs budget
node stage.mjs admin-off                   # no admin buttons on screen while filming
echo "World ready. Film with: node film.cjs"
