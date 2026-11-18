# Nations Simulation — design (DRAFT, not built)

Status: design only. No code or migrations exist for this yet. Numbers below were modelled in a
throwaway script before writing this (see "Modelled results"); they are starting values to tune,
and every one must live in a constants file (AGENTS.md).

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
| 52-64 | Regional power |
| 40-51 | Middle power |
| under 40 | Minor state |

A separate **rank** (1st, 2nd, 3rd) is shown beside the tier.

## Modelled results (throwaway script, starting values)

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
