# Nations Simulation

Status (2026-11-18): **layers 1-5 and the world rating are built** (see the "Built" sections
below). Layer 6 (exchange rates) is still design only. Every number lives in a constants file
(AGENTS.md).

## Goal

Make each nation a living country, not just a set of laws: people, jobs, sectors, buildings,
ministries with budgets, trade and treaties with other nations, and one **rating out of 100**
that places each nation in a world ranking (Superpower ... Minor state).

## What already exists (do not duplicate)

| Thing | Where |
|---|---|
| 9 national stats (prosperity, cost_of_living, fiscal_health, equity, human_development, order_safety, freedom_rights, bureaucracy, global_standing), lagged by policy | `constants/macroEconomy.ts`, `services/nationalEconomy.service.ts` |
| `raw_gdp`, `raw_population` on `pol_states` (written, barely used) | migration 0074 |
| 3-part nation power (economy, military, standing) shown on the Nation screen | `constants/nations.ts` "Nation power" |
| 5 ministries with portfolios | `CABINET_POSTS` |
| Car markets per region with a `country_id` | `manufacturing_region_markets` |
| Law catalogue incl. `tariffs`, `min_wage`, `immigration`, `defense` | `constants/policies.ts` |

The new rating REPLACES the 3-part power score (one rating, not two). It is READ-ONLY like the
World Influence Index: elections, votes and deals never read it.

## Layers (build order)

### L1 People and jobs
- Population changes monthly: births, deaths, migration. Migration reads the `immigration` law and
  prosperity. Growth capped (e.g. +/-0.4% a month).
- Labour force = share of population of working age. Jobs = sum of sector jobs. Unemployment =
  1 - jobs / labour force, clamped. This is the number every player will watch.
- Raw numbers go in `pol_states`; derived 0-100 scores are computed, never stored twice.

### L2 Sectors and buildings
Six sectors per nation: agriculture, manufacturing, construction, retail, services, energy.
Each has: output share of GDP, jobs, capacity (factories, stores, sites) and a wage.
- **Factories** feed manufacturing capacity. Player companies' factories (already in
  `manufacturing_factories`) count toward their nation's manufacturing jobs and output.
- **Stores/retail** scale with population x average income x cost_of_living.
- **Construction** is the shock absorber: government building programmes create jobs now and
  raise capacity later (uses the existing rollout/lag mechanics in `nationalEconomy.service.ts`).
- Sector output sums to GDP, so GDP stops being a loose number.

### L3 Ministries with budgets
Each existing minister gets a budget line (a share of tax revenue) and an effect:
Industry -> factory/construction subsidies; Welfare -> human_development and equity;
Interior -> order_safety; Defence -> military score; Finance -> sets the split.
A minister who is a human player can reallocate the split once a month (a real decision, with
trade-offs: more for one line means less for another; a test must enforce a trade-off).

### L4 Trade and tariffs
- Nations can export to each other's markets. Cars use the existing demand engine unchanged (the
  AGENTS.md rule stands: do not rewrite `simulateSalesDemand`); a foreign allocation is just an
  allocation in another country's market, plus a tariff added to price.
- Tariff comes from the importing nation's `tariffs` law. Revenue goes to that nation's budget.
- Other sectors trade in aggregate (net exports in GDP), not unit by unit.

### L5 Treaties and diplomacy
- Treaty types: trade deal (tariff cut), market access, embargo, defence pact.
- Proposed by a head of government or Defence minister. The other nation's parliament votes it
  with the SAME `billVotePlan` / `tallyBill` (AGENTS.md: one vote-counting rule).
- Relations score per nation pair (0-100). Moved by treaties, tariffs, embargoes, broken
  promises. Feeds `global_standing` and the Diplomacy pillar below.

### L6 Fluid economy (last, riskiest)
Exchange rates and a shared price level. Only after L1-L5 are stable. Every rate gets a hard cap
and a ratio-based test, because runaway feedback is exactly what the NPC price spiral was.

## The rating (0-100)

Six pillars, each 0-100, then weighted:

Weights below are what shipped (constants/nationSim.ts `PILLAR_WEIGHTS`).

| Pillar | Weight | Built from |
|---|---|---|
| Economy | 0.25 | log-scaled GDP, prosperity, fiscal_health |
| Industry | 0.15 | factory/capacity score, employment |
| People | 0.20 | human_development, equity, employment |
| Stability | 0.15 | order_safety, bureaucracy, freedom_rights |
| Military | 0.10 | defence law and defence budget |
| Diplomacy | 0.15 | global_standing, treaties |

GDP is log-scaled so a nation twice as rich scores +about 3 points overall, not double.

### Tiers are ABSOLUTE thresholds, not rank positions
With three nations, "top 10%" is meaningless (one nation would always be the superpower).

| Score | Tier |
|---|---|
| 80+ | Superpower |
| 65-79 | Great power |
| 55-64 | Regional power |
| 40-54 | Middle power |
| under 40 | Minor state |

(Regional power was 52 in the first draft. Moved to 55 so the three near-equal nations start in the
same tier, Middle power, and climb.)

A separate **rank** (1st, 2nd, 3rd) is shown beside the tier.

## Modelled results (first draft; superseded by "Built: layers 1-2")

- Start: Drennia 52.6, Westmark 53.2, Eryndor 52.5 (all within 1 point; the existing
  tests/floor.test.ts rule of "within 3 points" holds).
- GDP doubling adds about +3.1; GDP x4 adds about +6.2 (log scale works).
- Unemployment 15% instead of 6% drops Drennia from 52.6 to 46.1 (a tier lower).
- Three treaties plus better standing adds about +2.4.
- Every metric at 90 and GDP x4 gives 90.7: Superpower exists but needs near-perfect play.
- Implication: reaching Great power (65) takes about +12 points, meaning sustained gains across
  several pillars. This is deliberate, but unproven: tune after real play.

## Risks (honest)

1. **Scope.** This is 6 layers. REVIVAL_PLAN.md names scope creep as the main project risk and
   the closed-alpha gate (30 people finishing a season) is not met yet.
2. **Hidden cost per tick.** Each layer adds queries per nation per month. Measure tick time
   before and after L1 and L2; the plan already flags tick time as a risk.
3. **Business is Drennia-only today.** L2 and L4 need Westmark and Eryndor to have their own
   car markets first (prerequisite, "Slice 1").
4. **Players cannot feel it with few humans.** With 6 per nation most actors are computer-run.
   Computer-run ministers and treaty proposals must carry the world, with rule-based heuristics
   like the NPC company brain.
5. **Balance.** Weights above are modelled, never played.

## What must go right

- Each layer ships behind a flag, with ratio-based tests, before the next starts.
- Nation balance tests (within 3 points, approval within 3 of 50) stay green after every layer.
- Notices go through `notifyMany` inside the same transaction as the event (AGENTS.md).

## Proposed file map (nothing exists yet)

| What | File |
|---|---|
| All numbers | `backend/src/api/constants/nationSim.ts` |
| Pure rules (tested) | `services/nationSim.rules.ts`, tests in `tests/nationSim.test.ts` |
| Monthly step | `services/nationSim.service.ts`, called from the politics tick per nation |
| Treaties | `services/treaties.service.ts` (votes via floor.rules `tallyBill`) |
| Tables | one new migration in ROOT `database/migrations/` (sectors, budgets, treaties, relations) |
| Screen | new tab in the Nation view |

## Built: layers 1-2 (2026-11-18)

**What it does each politics month, per nation** (`stepNationSim`, its own savepoint after the
nation's politics, so a failure never rolls the politics back; idempotent per month):
1. People: births and deaths (fall as development rises), migration (pulled by prosperity, pushed
   by unemployment, gated by the immigration law; a closed border does not stop people leaving a
   failing country). Never more than 0.4% change a month.
2. Jobs: each of 6 sectors wants workers = labour force x the nation's sector share x prosperity
   x laws (tariffs, minimum wage, company tax, interest rate). Jobs move 15% of the way to that
   target each month, so hiring and firing take time. Car factories in the country add jobs.
3. Output (GDP) = jobs x output per worker (rises with development and prosperity).
4. Buildings (farms, factories, sites, stores, offices, plants) follow each sector's workforce.
5. The rating out of 100, tier and rank.

**Starting point (fresh database, verified):**

| Nation | Rating | Tier | People | Jobless | GDP a year |
|---|---|---|---|---|---|
| Eryndor | 52.8 | Middle power | 11.0M | 5.6% | $358B |
| Drennia | 51.9 | Middle power | 10.0M | 5.7% | $328B |
| Westmark | 50.5 | Middle power | 9.0M | 5.7% | $291B |

**Modelled responses (Drennia, 24 months after the change):** recession (prosperity 30) takes
unemployment from 5.4% to 13% and costs about 8 points; a boom (prosperity 70) cuts it to 2% and
adds 15% output; a very high minimum wage costs about 7% of retail jobs; high tariffs trade shop
jobs for factory jobs; tight money cuts building jobs about 8%. Getting from Middle to Regional
power takes a sustained boom (tested: prosperity 70, development 60, open border, 3 years).

**Finding: founding laws never move the national stats.** They have no `pol_active_policies`
rows, so `calculateNationalEconomy` only applies laws Parliament has passed. Stats therefore stay
at each nation's base stats until a new law passes. Balance is checked on base stats (like the
existing power test). Founding laws DO move jobs here, through `getLawsInForce`. Whether founding
laws should also move stats is a separate politics decision; changing it would shift approval
and elections.

**Honest limits:**
- Player car factories are real but small next to a 10M-person economy: 2,000 cars a month of
  capacity is about 14,000 jobs, roughly 0.3% of the workforce. They show up, but they do not
  swing the nation. Only national policy does.
- Rating, unemployment and GDP are read-only: elections and approval do not read them yet.
  Wiring unemployment into approval is the obvious next link, but it changes elections, so it
  needs a decision and its own modelling.
- The old 3-part power score still exists: the World Influence Index uses it as its nation
  factor. The Nation screen now shows the new rating. Moving the Index onto the rating is a
  follow-up (it changes the Index weights in worldStage tests).
- Numbers are modelled, not played.

**Files:** constants `backend/src/api/constants/nationSim.ts`; rules
`services/nationSim.rules.ts`; tick and read view `services/nationSim.service.ts`; table
`database/migrations/0103_nation_sim.sql` (`nation_sim_months`); tests `tests/nationSim.test.ts`
(26, in the required CI list); API `GET /world/rankings` and `sim` on `GET /world/nations`;
screen `_floor/NationView.tsx` (World ranking cards and "The economy of ...").

## Built: layers 3-4 (2026-11-18)

### Layer 3: the national budget

Every month each nation keeps books (yearly rates, in dollars):

- **Money in** = GDP x tax take (set by the income tax and company tax laws, plus 6% other taxes)
  + tariff money from layer 4.
- **Money out** = what the spending laws commit (welfare, healthcare, schools, defence, as a share
  of GDP) + running the state (3%) + interest on debt (rate set by the interest-rate law)
  + the **programmes**: 3% of GDP that the government splits four ways.
- **Debt** grows by one twelfth of the yearly deficit each month. Above 90% of GDP it drags the
  Economy score (2 points per 10% above). Above 200% nobody lends: programmes get only what taxes
  leave over.

**The programmes** (Industry & building, Health & welfare, Police & courts, Armed forces). A quarter
each is neutral. More for one means less for the others, and money left unallocated is saved (it
cuts the deficit). Industry adds construction and factory jobs; the other three lift the People,
Stability and Military scores.

**Who decides.** The head of government or the finance minister (a player) sets the split on the
Nation screen: one change a month, effective when the month closes, written to the news. It stays
in force while its author holds one of those offices. Otherwise the lead party of the government
decides by its platform (workers' parties lean to welfare, parties of order to police and defence,
pro-investment parties to industry), held within 0.15 of an even split (`npcSplit`).

**Starting books** (fresh database): Drennia runs a 1.7% deficit with 50% debt; Westmark a 1.4%
surplus with 58% debt (low welfare and defence); Eryndor a 3.6% deficit with 42% debt (its high
defence law costs money). Left alone for ten years, Eryndor's debt reaches about 83% (still under
the 90% line), Drennia's 69%, and Westmark's falls to 40%.

**Modelled:** putting the whole programme budget into industry cuts Drennia's unemployment from
6.1% to 5.1% but costs People, Stability and Military, for a rating change near zero (a test keeps
it within 1 point, so no split is a free win). Saving everything turns the deficit into a surplus
but costs about 3.6 rating points. Universal basic income with no income tax runs a 27% deficit,
passes 200% debt within ten years and drops Drennia to Minor state (37.7).

### Layer 4: trade between nations

Farm goods, factory goods and energy are traded. Each nation uses its share of the world's output
(by GDP); what it lacks it buys from nations with spare, shared out by how much spare each has.

- **Tariffs** (the Trade Tariffs law: free trade 0%, moderate 10%, targeted 20% on factory goods,
  high 25%) mean fewer imports bought (1.5 x tariff fewer, never below 20% of the shortfall). The
  rest is made at home (more jobs there), suppliers lose those sales (fewer jobs there), and the
  importer collects tariff money.
- **Costs at home** come only from goods the nation actually lacks: shoppers pay the tariff on the
  whole shortfall (shop and service jobs fall), and protected work is less efficient (output per
  worker falls). A tariff on goods a nation does not import does nothing.
- Every effect is measured against the nation's **founding** tariffs, so the starting numbers are
  unchanged and only later changes move jobs.

**At the start:** Westmark imports about $36B a year (factory goods, food, energy), Eryndor exports
about $34B, and Drennia is roughly balanced. The world's trade adds up to zero.

**Modelled (24 months):** Westmark going to high tariffs adds 18% factory jobs there (unemployment
6.6% to 4.9%) and $5.6B a year in tariff money, and costs Eryndor 6% of its factory jobs
(unemployment 6.1% to 8.7%). That is a real beggar-thy-neighbour weapon. Passing the law also
costs Westmark prosperity and global standing through the law's existing stat effects. Eryndor
going to free trade changes nothing, because it imports none of these goods.

**Seen on a fresh database:** the computer-run parliaments changed tariffs on their own (Drennia
passed Free Trade 79-72 in month 3) and trade responded: Drennia's tariff money fell to zero, its
farm and energy jobs fell about 2% from extra imports, and Eryndor's exports rose.

### Not done, and why

- **Car companies do not export yet.** Car sales still use Drennia's markets only; Westmark and
  Eryndor have no car markets. Trade here is national (aggregate), not company by company.
  Company exports need per-nation car markets first and must go through the locked demand engine
  without rewriting it.
- **Treaties and relations (layer 5).** There is no way yet to agree lower tariffs with one nation
  only, or to retaliate except by changing your own tariff law. Tariffs apply to everyone equally.
- **Still read-only.** Budget, debt and trade feed the rating, not approval or elections.
- **Numbers are modelled, not played.**

### Files (layers 3-4)

Constants: `constants/nationSim.ts` (layer 3 and layer 4 sections). Rules: `services/nationSim.rules.ts`
(`budgetMonth`, `npcSplit`, `validateSplit`, `computeTrade`). Monthly step for all nations together
and the budget decision: `services/nationSim.service.ts` (`stepNationSims`, `setBudget`). Endpoint
`POST /politics/budget`. Table changes: `database/migrations/0104_nation_budget_trade.sql`
(`nation_budgets`, and `debt`, `budget`, `trade` on `nation_sim_months`). Tests:
`tests/nationSim.test.ts` (48). Screen: Budget and Trade panels in `_floor/NationView.tsx`.

## Built: layer 5, diplomacy (2026-11-18)

### Relations
Every pair of nations has relations from 0 to 100 (50 neutral). Each month they drift 3% of the way
back to neutral; treaties in force warm them (trade pact +0.6 a month, defence pact +0.8), an
embargo freezes them (-1.5 a month), and a nation with high tariffs (average above 15%) sours them
with everyone. Events move them at once: a treaty signed (+8 / +10), an embargo (-20), a treaty
rejected (-3), walking out of a pact (-10), lifting an embargo (+5).

The Diplomacy score is now 70% global standing and 30% average relations, plus treaty bonuses
(trade pact +3, defence pact +4, embargo -4). A defence pact also adds 6 to Military.

### Treaties
| Treaty | What it does | Who must ratify |
|---|---|---|
| Trade pact | No tariffs between the two on farm goods, factory goods and energy | The other nation's parliament |
| Defence pact | Military and Diplomacy bonuses for both | The other nation's parliament |
| Embargo | No trade at all, either way; ends any pact between them | Your own parliament |

- Only the head of government proposes (3 energy) or ends a treaty (walk out of a pact, lift an
  embargo you imposed). Pacts need relations of at least 25 and none under an embargo. After a
  rejection, wait 6 months to try the same treaty again.
- **Ratification is an ordinary bill**: category `treaty`, option `<kind>:<partner>`. The same vote
  rule (billVotePlan + tallyBill) counts it, players vote on it in the Chamber, and pacts and
  favours work on it. Parties judge it by their platform (`treatyLiking`): free traders like trade
  pacts, parties of order like defence pacts, nobody likes embargoes much.
- **Computer-led governments** (no player holds the top office) propose their lead party's
  favourite allowed treaty with a 10% chance a month: pacts only with nations at 45+ relations,
  embargoes only below 20.
- In trade, a pact sets the tariff between the two to zero; an embargo blocks the flow both ways,
  and goods that cannot be bought count as if under a 50% tariff for shoppers and efficiency.
  Trade diversion (buying more from someone else) is not modelled.

### Seen on a fresh database (16 months, three computer governments and one player head of government)
The computer governments offered three pacts and a fourth was pending: Westmark-Drennia trade pact
(passed 79-72), Drennia-Eryndor trade pact (passed), Eryndor-Westmark defence pact (passed); Eryndor
rejected a Drennia defence pact. The player embargoed Drennia through Westmark's parliament: it
ended the existing pact, cut Westmark's imports by $6.6B a year, put Drennia's trade into deficit,
dropped relations from 50 to 38 and cost both nations about a rating point. Lifting it worked. A
proposal to a nation without a government yet was refused, costing no energy.

### Where things are on screen
The Nation tab is split into five short sections instead of one long page (each fits in about one
desktop screen): **Standing** (world ranking, state of the nation, how it works), **Economy**
(people, jobs, sectors), **Budget** (books and programmes), **Foreign affairs** (relations,
treaties, trade) and **Government** (decrees, cabinet). A dot marks a section that wants something
from you. The Desk shows reminders that jump to the right section: set this month's budget, or a
treaty offered to your nation (whip the vote in the Chamber, where treaty bills sit with the
others). The last section you opened is remembered on your device.

### Files (layer 5)
Constants `constants/diplomacy.ts`; rules `services/diplomacy.rules.ts`; service
`services/diplomacy.service.ts` (`proposeTreaty`, `withdrawTreaty`, `resolveTreatyVote`,
`stepDiplomacy`, `diplomacyInputs`, `foreignViews`); hooks in `politics.service.ts` (treaty bill
passed or failed) and `statecraft.service.ts` (`billTitle`, `changeDesirability`); endpoints
`POST /politics/treaties`, `POST /politics/treaties/:id/withdraw`; table changes
`database/migrations/0105_diplomacy.sql`; tests `tests/diplomacy.test.ts` (26, required in CI).
