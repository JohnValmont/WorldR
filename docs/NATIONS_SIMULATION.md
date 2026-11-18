# Nations Simulation

Status (2026-11-18): **layers 1 and 2 and the world rating are built** (see "Built: layers 1-2"
below). Layers 3-6 are still design only. Every number lives in a constants file (AGENTS.md).

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
