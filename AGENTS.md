# WORLDr — Agent Context (read before every task)

## Architecture facts (verified):
- Demand engine ManufacturingController.simulateSalesDemand(marketAllocations[], brandMap,
  MARKETING_MULT, salesManagerBonus) groups by region_market_id and resolves competition
  across ALL allocations passed. It is ALREADY multi-company. Do NOT rewrite it.
- processManufacturingArc (POST /admin/manufacturing/process-company/:companyId) is
  single-company: it loads only one company's allocations/finances. NPCs must change this.
- There are NO reusable repositories for company/model/allocation — all inserts are inline
  knex (trx('table').insert) inside manufacturing.controller.ts.

## Key tables/columns:
- companies: owner_character_id NOT NULL, country_id, industry_id='manufacturing', name, status.
- company_finances: company_id, available_cash, debt, company_value, last_arc_profit.
- manufacturing_vehicle_models: sale_price, manufacturing_cost_per_unit, reliability_score,
  performance_score, fuel_efficiency_score, appeal_score, cargo_score, target_segment,
  vehicle_class, platform_type, power_unit_type, drivetrain_type, interior_tier, safety_tier.
- manufacturing_market_allocations: units_allocated, marketing_tier (UNIQUE company+model+market).
  PRICE IS NOT HERE — sale_price lives on the vehicle model.
- manufacturing_factories: lease_cost_per_arc, maintenance_cost_per_arc, capacity_per_arc.
- manufacturing_production_lines: assigned_vehicle_model_id, target_units_per_arc, status.
- manufacturing_sales_results: units_sold, sale_price, revenue, market_share_estimate (engine output).

## mainReasonCode values (exact): 'Balanced', 'Zero Demand', 'Low Brand Awareness',
  'Weak Distribution', 'Market Capacity Capped (Cannibalised)', 'Sold Out'.

## Locked systems — DO NOT rebuild:
- marketSegments.ts demand formula (FIT_EXP=4.0, VALUE_K=1.6, affordability steepness 2.0, /65 norm).
- marketing.ts (RETENTION=0.85, MAX_GAIN=17, HALF_SAT=30000; tiers none/local/regional/national
  cost 0/3500/12000/35000, mult 1.0/1.15/1.30/1.50; awarenessMult=0.35+0.65*(awareness/100)).
  Marketing is deducted ONCE in the arc — never double-charge.

## Engineering rules: root-cause not band-aid; ALL tunable numbers in constants files;
  behavior tests with RATIO-based assertions; model numbers before coding; keep .env* git-ignored.

## How to talk to me: solo non-coder directing AI. Plain English, no unexplained jargon,
  paste real code+paths, be direct not flattering.

## NPC v1 Complete
NPC competitors v1 is completely finished and validated. They use pooled sell on the player's tick, reuse the same tables as players, and use rule-based heuristics.

### Architectural Rules (DO NOT BREAK):
- "NPCs are strictly inventory-aware: The Ghost Car bug was fixed via a hard Math.min(demand, inventory_in_stock) clamp in settleForCompany."
- "NPC pricing is strictly capped at 2.5 * manufacturing_cost_per_unit under Rule B2 (Sold Out) to prevent infinite hyperinflation loops."
- "NPC Brain reactivity (Rule B1) uses explicit prevPrevArc market share comparisons to accurately gauge share drops without state-bleed."

## Phase 4 Complete
Phase 4 (Self-Analytics, Market Structure, and Paid Research) is completely finished and validated.

### Architectural Rules (DO NOT BREAK):
- "Paid Market Research (Phase 4c) relies on a strict DB transaction checking company_finances.available_cash before revealing competitor data. Tier 1 dynamically strips sale_price and engineering specs, while Tier 2 reveals all. Do not bypass this transaction for any UI or data fetching."

## Phase 0 (Revival) — Operational Rules (DO NOT BREAK)
- Plan of record: docs/REVIVAL_PLAN.md.
- Migrations that run automatically live in ROOT `database/migrations/` (the server resolves
  `<cwd>/../database` first). `backend/database/migrations/` is NOT run on boot — do not add files there.
- Never put one-off data/schema patches in server.ts boot code. Write an idempotent migration.
- `CREATE TABLE IF NOT EXISTS` does NOT reshape a table that already exists with other columns (0097 kept an old pol_cabinet_posts without post_key; fixed by 0108). When a table may already exist, check its columns and repair it in the migration.
- Admin rights come only from users.role. Grant via the ADMIN_EMAILS env var or
  `npx tsx backend/scripts/set-admin.ts <email>`. Never hard-code emails.
- Never hard-code connection strings or secrets in any file, including throwaway scripts.
  Read DATABASE_URL from backend/.env. Ad-hoc scripts at the repo/backend root are git-ignored.
- Production 500 responses must not include stack traces (app.ts error handler).
- `/health` = liveness (always 200). `/health/ticks` = world clock on schedule (503 when overdue).
- Error tracking: backend/src/utils/errorTracking.ts (SENTRY_DSN). Analytics: frontend/src/lib/analytics.ts
  (NEXT_PUBLIC_POSTHOG_KEY); static landing pages use window.worldrTrack → /analytics-event.
  Never send emails or other personal data to analytics.
- CI (.github/workflows/ci.yml): a test file joins the required list only once it passes.

## Phase 2 (Politics rebuild) — Operational Rules (DO NOT BREAK)
- Seeds in database/seeds run on EVERY boot. A seed must never DELETE or reset live game rows (0005 used to delete all NPC parties each restart).
- A nation's identity, constitution, districts, cabinet posts and political tuning live in backend/src/api/constants/nations.ts. Districts are synced into pol_constituencies by syncNationDistricts; don't hand-edit them in SQL.
- Elections are district proportional (electionEngine.allocateSeatsDHondt). Polls (statecraft.projectElection / pollParties) must use the same inputs as the real election (districts, effort incl. NPC_MACHINE_EFFORT, approval multiplier).
- The politics month runs in ONE transaction per nation. Never wrap a failing query in a bare try/catch inside it; use a savepoint (trx.transaction(...)) or the whole month is rolled back.
- pol_parties.popularity is NUMERIC; pol_active_policies has one row per (state, category); write it with an upsert.
- NPC lawmaking/voting/cabinet rules are pure functions in statecraft.service.ts with tests in tests/statecraft.test.ts.

## The Floor (politics redesign) — Operational Rules (DO NOT BREAK)
- Design and file map: docs/POLITICS_FLOOR.md. The politics screens read ONE endpoint, GET /politics/desk (desk.service.ts).
- SUPPORT (pol_support: party x voter group, 0-100) is the one number campaigning, laws, promises and decisions move, and the election reads. Do not add a parallel "popularity"-style number; wire new features into support.
- Polls and the real election must use the same inputs: buildEngineCandidates (politics.service.ts) and pollParties (statecraft.service.ts) both add NPC_MACHINE_EFFORT + support effort for every candidate. Change one, change the other.
- There is ONE vote-counting rule: billVotePlan (floor.service.ts) + tallyBill (floor.rules.ts). The monthly tick and the on-screen whip count both use it. Never count votes anywhere else.
- A party's line is: its human leader's vote, else a promise it made on that bill (pact or called favour), else ideology. MPs who hold a seat and are not the leader cast one seat each.
- Rules are pure functions in floor.rules.ts / support.rules.ts with tests in tests/floor.test.ts. floor.service.ts must NOT import politics.service.ts (circular import).
- All Floor numbers live in constants/floor.ts; situations are data in constants/situations.ts. Only ministers and the Premier may get a card with a `stat` effect (a test enforces it).
- A member who is not the leader never spends party funds: party costs come out of their own cash (payMoney).
- Computer-led governments form the SMALLEST winning coalition. Do not go back to inviting every compatible party.

## Three starter nations — Operational Rules (DO NOT BREAK)
- Drennia, Westmark and Eryndor are DIFFERENT BUT BALANCED: own government type, parliament size, term, founding laws, starting stats and NationRules, but overall power within 3 points and starting approval within 3 of 50 (tests/floor.test.ts enforces it). Any change to a nation's baseStats, foundingLaws or rules must keep those tests green; give a strength only with a matching weakness.
- Nation-specific rules (pass margin, coalition distance, fundraise/donation multipliers, decree length) are read with nationRules(code). Never hard-code a nation check like `code === 'eryndor'` in services.
- The head of government's title differs per nation (headOfGovernmentTitle). Do not write "Premier" in new player-facing text; use the title, or rely on localisePlaces for card/news text.
- NATION_PLAYER_CAP (8) and the other nation numbers live in constants/nations.ts. Nation choice at sign-up goes through assignNation (nations.service.ts); never insert a character with a motherland directly.
- A politics request runs in the player's own nation via withPlayerNation (services/playerNation.ts). Never default a politics query to 'national' (Drennia); use currentPolStateCode().
- A new nation = a NationSpec in STARTER_NATIONS (with rules, foundingLaws, baseStats, traits) + a JURISDICTIONS entry (politics.ts) whose seats/majority/term match + NATION_PLACES + a migration with its countries / pol_states / parties rows and starting stats. Nothing else.
- Decrees are data in constants/decrees.ts: each must be a trade-off (a test enforces it), one per office-holder per month.
- Card and news text is written with Drennia's place names and passed through localisePlaces for other nations. Do not hard-code another nation's towns in situations.ts.

## Character creation — Operational Rules (DO NOT BREAK)
- Backgrounds, edge tokens and starting numbers live in constants/characterCreation.ts; the server computes stats with startingProfile (services/character.rules.ts). Never accept stat numbers from the client.
- Every background must be worth BACKGROUND_POINTS and have a weakness (tests/floor.test.ts enforces it). Only the party fixer starts at or above LEADERSHIP_MIN_CLOUT.
- Sign-up reads nations, parties and creation options from GET /world/nations. Do not hard-code nation facts in onboarding.js (onboarding_data.js is only the list of locked future nations).

## Corridors (multiplayer) — Operational Rules (DO NOT BREAK)
- Chat channels are resolved on the server (chat.controller resolveChannel): 'world', 'private', 'nation', 'party'. Never let a client name a raw room like 'party:<id>'.
- Personal deals are pol_handshakes. Vote promises are judged ONLY in settleHandshakes, from the same BillVotePlan the tally uses. Do not judge them anywhere else.
- Corridors lists real players only: exclude system accounts (users.password_hash = 'no_login_allowed').

## World stage (ladder, Meridian Wire, inbox, contests) — Operational Rules (DO NOT BREAK)
- Design and file map: docs/WORLD_STAGE.md. One game month = 8 real hours (both clocks; migration 0102, seed 0001). Energy carries over: +AP_MONTHLY_GRANT a month up to AP_BANK_CAP (bankedAp in floor.rules.ts).
- All ladder, Index and Wire numbers live in constants/worldStage.ts; rules are pure functions in services/worldStage.rules.ts with tests in tests/worldStage.test.ts.
- The World Influence Index is READ-ONLY: elections, votes, deals and support must never read it. It summarises existing numbers; do not turn it into a second "popularity".
- The career rung comes from careerRung only. World statesman needs a top-STATESMAN_RANK world rank AND real power (head, minister, or leader of a seated party).
- The Meridian Wire edition is published once per politics month by publishEdition, in its own savepoint at the end of runPoliticsTick (after every nation). It is idempotent per arc. Never publish it from a request.
- Dispatches are plain text, rendered as text (never as HTML). Limits, energy cost and moderation thresholds are constants; admins moderate via POST /agency/dispatches/:id/moderate.
- Write a player_notices row (notify / notifyMany in notices.service.ts) inside the same transaction as the event it reports. Never include another player's private data in a notice.
- Challenging a HUMAN party leader opens a contest (pol_leadership_contests) decided by contestResult in resolveContests (monthly tick). Only a computer-run leader can be replaced instantly. Leader changes go through installLeader.
- A handshake must include at least one vote promise (no money-for-money).
- AGENCY_DISCORD_WEBHOOK_URL is optional and gets public edition news only, posted after the tick commits.

## Political map — Operational Rules (DO NOT BREAK)
- Map geography is generated in frontend/src/app/drennia/politics/_floor/mapGeo.ts. A new nation or region needs a REGION_LAYOUT entry; do not hand-draw district shapes.
- The map's "Poll today" uses projectElection's per-district output: the same inputs as the real election. Do not compute a separate map poll.

## Nations simulation (people, jobs, sectors, world rating) — Operational Rules (DO NOT BREAK)
- Design and status: docs/NATIONS_SIMULATION.md. All numbers in constants/nationSim.ts; rules are pure functions in services/nationSim.rules.ts with tests in tests/nationSim.test.ts.
- The world rating (0-100) and tier are READ-ONLY: elections, approval, votes, deals and support must never read them.
- Owner decision (2026-11-18): the economy people feel moves approval. Unemployment, yearly GDP growth and debt (from nation_sim_months) feed approval ONLY through economyApprovalAdjustment, inside computeApproval(stats, economy). Numbers in ECONOMY_APPROVAL (constants/nations.ts).
- liveApproval(conn, stateRow) (statecraft.service.ts) is THE approval: the real election, the monthly poll snapshot, the map's poll, every screen and the legacy poll endpoint all use it. Never call computeApproval(stats) alone where approval reaches voters or a poll.
- One row per nation per month in nation_sim_months, written only by stepNationSim from runPoliticsTick, in its own savepoint after the nation's politics. Never write it from a request.
- Tiers are absolute score thresholds (RATING_TIERS), not rank positions.
- The three nations' starting ratings must stay within RATING_BALANCE_TOLERANCE and in the same tier (tests enforce it), measured on base stats: founding laws have no pol_active_policies rows and do not move stats.
- A nation's sector shares are NATION_ECONOMIES (keyed by pol_states.code). A new nation needs an entry there too.
- The world steps together (stepNationSims): trade needs every nation at once. Each nation is still written in its own savepoint.
- Tariffs move jobs ONLY through the trade model (computeTrade). Never add tariff effects to LAW_JOB_EFFECTS (that would count them twice). Trade and tariff effects are measured against each nation's founding tariffs.
- Only the head of government or the finance minister (BUDGET_MINISTER_POST) sets the budget split, once a month (setBudget). A stored split applies only while its author holds one of those offices; otherwise npcSplit from the lead party's platform. Computer splits stay within NPC_BUDGET_MAX_SHIFT of even.
- Budget programmes must stay a trade-off: a test keeps an all-in split within 1 rating point of the even split.

## Diplomacy (relations, treaties) — Operational Rules (DO NOT BREAK)
- Design and status: docs/NATIONS_SIMULATION.md (layer 5). Numbers in constants/diplomacy.ts; pure rules in services/diplomacy.rules.ts with tests in tests/diplomacy.test.ts.
- A treaty is ratified ONLY through an ordinary pol_bills row (type 'treaty', params.category TREATY_CATEGORY, option '<kind>:<partner code>'), counted by billVotePlan + tallyBill. Never count treaty votes anywhere else. politics.service calls resolveTreatyVote (in a savepoint) when the bill is decided.
- billTitle and changeDesirability (statecraft.service.ts) understand treaty bills; route any new bill-like thing through them the same way instead of special-casing call sites.
- Only the head of government proposes or ends treaties. diplomacy.service must not import politics.service.
- Relations are written only by diplomacy.service (stepDiplomacy once per month, and treaty events). stepDiplomacy runs before stepNationSims so trade sees this month's treaties.
- Treaty effects on trade go through TradeEntry.links in computeTrade; on the rating through DiplomacyInput. Do not add a second path.

## Nation tab layout — Operational Rules (DO NOT BREAK)
- The Nation tab is sections (Overview, Economy, Budget, Foreign affairs, Government, Coalition, History), not one long page. New nation features go in the section they belong to; if one section grows past about one desktop screen, split it rather than stacking more panels.
- Decisions that need a player (budget, treaties offered) get a Desk reminder that jumps to the section with go('nation:<section>'); the decision itself stays in its section.

## Coalitions (talks, deals, unity) — Operational Rules (DO NOT BREAK)
- Design, numbers and the first live results: docs/COALITIONS.md. Numbers in constants/coalition.ts; pure rules in services/coalition.rules.ts with tests in tests/coalition.test.ts; database work in services/coalition.service.ts (it must NOT import politics.service or floor.service).
- After an election, any party leader with seats may offer (pol_coalition_offers kind 'form'); between elections only the head of government's party may ('join'). Computer-run parties answer ONLY at month end (npcDecide), taking their best offer by offerScore. The forecast a player sees must use the same scoreOffer.
- politics.service.processGovernmentFormation owns the moment a government takes office (takeOffice: recordDeal, closeTalks, namePremierAndEmitLedger, rollover). A player's acceptance calls it in 'check' mode. Do not form governments anywhere else.
- Unity is pol_coalition_agreements.health (base_unity = starting level). It changes only through coalition.rules unityAfterMonth (stepCoalitionMonth, coalitionAfterVote). It reaches votes ONLY as whipScale inside partyVoteScore. Never add a second whip or vote path. Unity is not voter support: elections must never read it.
- The cabinet honours the deal's portfolio_allocation (statecraft.formCabinet); posts not promised go to the formateur's party. A head-of-government concession makes the partner coalition.lead_party_id.
- One coalition deal is active per nation; recordDeal dissolves older ones.

## Administrations, caretaker governments, Nation/World tabs — Operational Rules (DO NOT BREAK)
- Design: docs/NATIONS_SIMULATION.md ("Administrations"). Numbers/words in constants/administrations.ts; pure rules in services/administration.rules.ts with tests in tests/administration.test.ts.
- A nation is always governed by someone. A lead party in a formed/minority coalition = elected government, named after its head ("Dumb Administration"). Otherwise the head of state (NationSpec.headOfState) leads a caretaker government ("Ostrin Caretaker Government") until one forms. Never write "No government" in player-facing text; show the caretaker.
- pol_administrations is written ONLY by syncAdministrations, once a month from runPoliticsTick in its own savepoint after stepNationSims. Never write it from a request. Screens before the first sync use the live identity (currentIdentity), without writing.
- Administrations are READ-ONLY history: elections, votes, deals, support and approval must never read them.
- Election timing for screens comes from electionOutlook (administration.rules.ts). During formation it is the next term's election, flagged as an estimate; never show "Election in 0 months".
- GET /politics/chronicle is the one source for Nation/World charts (nation_sim_months + approval from pol_poll_snapshots + administrations). Do not add per-chart endpoints.
- Nation tab = the player's own nation (Overview, Economy, Budget, Foreign affairs, Government, Coalition, History). World tab = all nations side by side. Comparison of nations goes in World, not Nation.
- Nation chart colours are fixed per nation (NATION_COLOR in _floor/worldKit.tsx, validated for colour-blind separation). A new nation needs a colour there; colour follows the nation, never its rank.
- Admin accounts (users.role='admin') see the one-line reason of a 500 error (app.ts). Players never do, and no one sees stack traces in production.

## Your race (candidacy) and the politics shell — Operational Rules (DO NOT BREAK)
- Design: docs/POLITICS_FLOOR.md ("Your race"). Pure rules in services/candidacy.rules.ts with tests in tests/candidacy.test.ts; database work in services/candidacy.service.ts (it must NOT import politics.service).
- Owner decision: features that exist but are not available yet stay VISIBLE and locked (LockedBtn in _floor/kit.tsx). Clicking says why and when they open. Do not hide such controls.
- Standing or changing district happens ONLY in filing, through standInDistrict (POST /politics/candidacy). The reason text comes from standWindow; screens show it, never their own.
- District chances use the same projection as polls and the map (projectElection + pollParties). Do not compute a separate district poll.
- ensureCandidates creates computer placeholders only (character_id null). Players are never drafted into an arbitrary district. Owner decision (2026-11-19): nobody waits without a district. draftUnfiledMembers puts an unplaced party member in their party's best open district, with a notice, whenever an election lies ahead (placesUnfiledMembers: governing, filing, campaign): on joining or founding a party (placeNewMember) and at every month end (runs after government formation, so players are placed the month a new term opens). They can change district during filing. Only placeholders are ever deleted to make room.
- An election is done only once pol_council_seats exist (electionEngine.electionStep). Never key election idempotency on pol_results.
- The politics pages are full width (max 1720px) with a left navigation rail on xl screens and top tabs below that. Do not go back to a narrow centred column.

## Politics speed — Operational Rules (DO NOT BREAK)
- In production every query is a network round trip to the database (Render to Supabase). One screen used to run 235 queries one after another (about 7 seconds at 30 ms each). Load independent parts with Promise.all; never add a new per-nation or per-row `await` loop to a read path.
- GET requests under the politics router get a per-request memo (services/readCache.ts, readCacheForGets). Shared facts (getGovernment, getLawsInForce, approvalEconomy, resolveSplit) go through cachedRead, so each is fetched once per request. It only memoises reads on the global `db`, never on a transaction, and never outside a GET. Do not mutate what a memoised helper returns.
- Screens show an action's result as soon as the server answers and reload the desk in the background (page.tsx act). Tabs' own data is preloaded once the desk is on screen; its key and fetcher live in _floor/tabData.ts (one source for the tab and the preload).

## Chamber sections, Cabinet tab, parliament integrity — Operational Rules (DO NOT BREAK)
- The Chamber tab is sections: Bills (before Parliament + Table a bill), Laws in force (every law grouped by ministry, each with "Propose a change"), Parties (EVERY party of the nation, seated or not), Treaties (treaty votes + Foreign from NationView). go('chamber:<section>') opens one.
- "Table a bill" is always visible. When locked it shows me.tableBillLock, the reason computed on the server (capitol.service). Do not hide it or write a second reason client-side.
- Cabinet is a top-level tab (CabinetView.tsx): head of government, every ministry with holder, party and the laws it steers, appoint controls for the head, and Powers (decrees). Nation → Government shows the compact CabinetList and links there. Powers/CabinetList live in CabinetView.tsx only.
- A party that holds seats in a nation's parliament MUST have that nation's pol_parties.state_id. The desk and billVotePlan list parties by state; a party filed elsewhere is drawn as empty seats AND casts no vote (migration 0110 fixed Drennia's PDP).
- A deleted character holds nothing: deleteMe calls releaseCharacterPolitics (floor.service.ts). Seats, posts and candidacies stay with the party; a party they led becomes computer-run.

## World clock and districts — Operational Rules (DO NOT BREAK)
- Players see ONE month: the business and politics ticks must turn at the same moment. Both ticks pick their next close with alignedNextClose (services/worldClock.rules.ts, tests/worldClock.test.ts); admin resume/speed reschedule BOTH clocks. Never schedule one clock without the other.
- The hub countdown says "Next month in", not "biz tick".
- Districts are synced from constants/nations.ts at server start (syncAllNationDistricts, after migrations and seeds) and every politics month. A fresh or reset world must show its districts and seats before the first month turns.
- The election calendar (filing, campaign, election day) comes ONLY from electionCalendar (candidacy.rules.ts); derivePhase, the race card, the Desk's next goal and the draft all use it. Never compute `polling_arc - POL_CAMPAIGN_WINDOW_MONTHS - ...` at a call site. A founding election that opens less than the full windows before polling day is compressed: filing opens the month the cycle opens, so players can stand in it.
- A nation with no head of government shows its caretaker government (administration.name) on every screen, including the hub; never "vacant".

## Bank loans, nation scoping, test safety — Operational Rules (DO NOT BREAK)
- Every bank loan is repaid: the economy tick (processEconomyMonth, step 1b) collects interest + principal from banking_active_loans and character_debt_facilities via settleMonth (services/banking.rules.ts, tests/banking.test.ts). Numbers live in constants/banking.ts. A new kind of loan must be added to that step, or it is free money.
- Taking a loan validates the amount with parseLoanAmount and writes the cash AND the loan row in ONE transaction with the balance row locked. Never credit cash before the loan row exists, and never write `balance + amount` from request input (a string amount concatenates).
- A politics write (POST/PUT/PATCH/DELETE) always happens in the player's own nation: resolve the state with requestedPolState (playerNation.ts), never straight from req.body.stateId / req.query.stateId. Reads may look at another nation. Joining a party checks party.state_id is the player's nation.
- Look up the player's character with `status: 'active'` (a user can have deleted characters).
- Raw SQL inserts into tables with a NOT NULL world_instance_id must include it. One failing insert inside processCountryMonth rolls back the WHOLE country's business month for every company.
- Tests that touch a database must check DATABASE_URL is on localhost (and skip when no local database is reachable), delete only the rows they created, and restore anything shared (e.g. world_clock). Never run a test that deletes or rewrites shared tables (pol_cycles, world_clock, ...) — the old politics-p3..p5/smoke tests did and were removed.
