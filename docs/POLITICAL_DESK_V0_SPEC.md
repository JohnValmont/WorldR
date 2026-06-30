# WORLDr — Political Desk v0.1 Spec (Single-State: Ironvale)

**For:** Antigravity IDE build sessions
**Author intent:** Solo non-coder directing AI. Plain English, no unexplained jargon. Root-cause not band-aid. All tunable numbers live in a constants file. Behaviour tests use RATIO-based assertions. Model the numbers before coding.
**Status:** v0.1 — DECISION-COMPLETE. Pre-alpha target: Manufacturing + Logistics + Politics in ONE state (Ironvale).
**Canon:** Drennia is a Constitutional Monarchy + parliamentary nation on the Varelia Continent, four states (Drennport, Ironvale, Westport, Greenmere). v0 activates **Ironvale only**.

---

## 0. One-paragraph summary

The Political Desk lets players contest **Ironvale**, Drennia's industrial state: found/join a **Party**, run as a **Councillor candidate**, campaign across **arcs**, win seats in the **61-seat State Council**, form a **Government** under a **State Premier**, and pass **bills + procurement tenders** that change the numbers in the Manufacturing and Logistics sims. Politics runs entirely on the four existing player factors (**Credibility, Charisma, Influence, Cash ₯**) — no new currency. The election engine reuses the same "segments + fit + reach + competition" shape as the manufacturing demand engine so it feels native. Only Ironvale is live; Drennport, Westport, Greenmere, the national Parliament and the Crown render **"Coming Soon."**

---

## 1. Design pillars (do not violate)

1. **No frozen-module baggage.** Clean build. New DB tables prefixed `pol_`. Backend routes under `/politics`. Frontend route `/drennia/politics`. Do **not** import, reference, or revive the deleted party-dashboard / parliament / ministries / tap-action / `/varelia` code, and do **not** read old localStorage politics keys.
2. **Reuse existing factors only.** Credibility, Charisma, Influence, Cash ₯. "Resources" stays a hidden weighting factor.
3. **Engine consistency with Manufacturing.** Election support is computed like demand: group by **voter segment**, score each candidate's **fit × reach × credibility**, then **resolve competition across ALL candidates in that segment** (normalise to shares). Mirrors `simulateSalesDemand` grouping by `region_market_id` and resolving across all allocations.
4. **Async, arc-driven.** All campaign actions queue and resolve on **arc ticks**. The election resolves on a single polling arc. No real-time loops.
5. **Always contested.** NPC parties + NPC candidates fill the field (rule-based, deterministic, reuse the same tables as players — NPC v1 philosophy).
6. **Single state, switchable.** `POL_ACTIVE_STATE_CODE = "ironvale"` defines the live state. A second state is data, not code.
7. **Business is the stakes.** Winning power measurably changes the business sim (industry tax, procurement tenders, infrastructure, subsidies). That is why a manufacturing/logistics player cares about politics.
8. **Tunables in constants.** Every number lives in `backend/src/api/constants/politics.ts`. No magic numbers in controllers.
9. **Respect the locked systems.** The demand engine, marketing, and NPC settle logic are LOCKED. Politics hooks into business ONLY via the existing arc-processing transaction or as a separate settlement (procurement tender) — never by editing `simulateSalesDemand`.

---

## 2. Scope

### IN (v0.1)
- **Ironvale** active: one **State Council** (61 seats) + a **State Premier** (head of the governing party/coalition).
- Parties: found, join, leave, one-party-per-player, party treasury, party platform.
- Candidacy: a player or NPC stands as a Councillor candidate in the active cycle.
- Full **election cycle** on arcs: Filing → Campaign → Polling → **Government Formation** → Term.
- A voter-segment **election engine** (the core math).
- **Government formation** with realistic coalitions.
- **Bills**: small fixed set with concrete business-sim effects. v0.1 fully wires **Industry Tax** + **Government Procurement Tender**; stubs the rest behind a flag.
- **Lobby**: donations (any citizen) + bill petitions/tender bids (registered Ironvale company).
- Factor feedback: winning/holding office and passing bills move Influence/Credibility/Charisma.
- **Political Ledger** events feeding the Chronicle.
- NPC parties + candidates with a rule-based campaign brain.
- **Living-world hooks (read-only consume):** civic rooms, political favours, and character background traits feed campaign effort/Influence (see §12).

### OUT (v0.1 — render "Coming Soon," never broken)
- Drennport, Westport, Greenmere states.
- National Parliament, the Crown/Monarch (ceremonial NPC backdrop only).
- Cabinets/ministries, judiciary, scandals system, paid opinion polling product.
- Cross-state campaigning, redistricting, by-elections.
- Coalitions beyond the single formation phase rules in §8.5.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **State** | A province of Drennia. Ironvale is active in v0.1. |
| **Arc** | Existing game time unit (month). All politics resolves on arc ticks. |
| **Cycle** | One election period: a full Council term, `POL_TERM_LENGTH_ARCS` (48). |
| **State Council** | Ironvale's elected legislature, `POL_COUNCIL_SEATS` seats (61). |
| **Councillor** | An elected member of the State Council. |
| **State Premier** | Head of Ironvale's government; leader of the party/coalition holding > 50% of seats. |
| **Party** | A player-foundable organisation candidates run under. |
| **Platform** | A stance vector over 5 issue axes (§6). |
| **Segment** | A bloc of Ironvale voters with size + issue priorities. |
| **Reach** | How much of a segment a campaign has touched (analog of marketing awareness). |
| **Bill** | An enactable policy changing business-sim numbers. |
| **Tender** | A government procurement contract manufacturers bid for. |

---

## 4. Ironvale — the active state (constants, lore-grounded)

```
POL_ACTIVE_STATE_CODE   = "ironvale"
POL_ACTIVE_STATE_NAME   = "Ironvale"
POL_STATE_POPULATION    = 2_400_000          // industrial heart of Drennia
POL_REGISTERED_VOTERS   = 1_600_000          // notional; only ratios matter
POL_BASE_TURNOUT        = 0.58               // industrial, politically active electorate
POL_COUNCIL_SEATS       = 61                 // realistic for ~2.4M (cf. Welsh Senedd / mid US state)
POL_MAJORITY_SEATS      = 31                 // > 50% of 61
```

The other three states + national Parliament + Crown exist as **inactive data** and render "Coming Soon."

**Why Ironvale:** manufacturing (automobiles) and logistics already live here, the electorate is labour-heavy, and the living world already stages worker political forums here (e.g. Councillor Sera Dunne's open forums). Maximum business↔politics loop with zero lore stretch.

---

## 5. Player factors used (no new currency)

| Factor | Role in politics |
|---|---|
| **Credibility** | Trust multiplier on vote support; gate to propose/pass bills. |
| **Charisma** | Boosts campaign reach per action (rallies, debates). |
| **Influence** | Endorsement weight, lobbying/tender pull, coalition pull; grows from office. |
| **Cash ₯** | Pays campaign actions + party founding; donated to treasuries. |

Read factors from the existing character/citizen record by `character_id`. **Never duplicate factor values into politics tables.**

---

## 6. Issue axes & voter segments (engine inputs, tuned for Ironvale)

### Issue axes (5) — mapped to the faction concerns in canon (taxes, investment climate, trade, stability, labour)
Each axis 0–100. Platform = a point; segment = an *ideal* point + *priority weights* (sum 1).

```
AXES = [
  "taxation",     // 0 = high-tax / redistributive, 100 = low-tax / pro-business
  "labour",       // 0 = austerity, 100 = strong worker protection & welfare
  "investment",   // 0 = minimal industrial/infra spend, 100 = aggressive investment & public works
  "trade",        // 0 = protectionist, 100 = open / export-friendly
  "stability"     // 0 = reformist/disruptive, 100 = institutional law-order & stability
]
```

### Ironvale segments (5; sizes sum to 1.0)
| Segment | size | ideal (tax, labour, invest, trade, stability) | priorities |
|---|---|---|---|
| Industrial Workers | 0.34 | (30, 85, 75, 55, 55) | labour .40, invest .25, tax .15, stability .12, trade .08 |
| Logistics & Trade Workers | 0.18 | (45, 65, 70, 80, 55) | trade .35, invest .25, labour .20, tax .12, stability .08 |
| Factory & Business Owners | 0.12 | (88, 30, 70, 75, 60) | tax .45, invest .20, trade .20, stability .10, labour .05 |
| Civic Professionals | 0.20 | (60, 55, 65, 60, 70) | stability .30, invest .25, tax .20, labour .15, trade .10 |
| Suburban Families | 0.16 | (55, 55, 55, 55, 75) | stability .35, tax .25, labour .20, invest .12, trade .08 |

> Business tie-in: **Factory & Business Owners** are small but rich and pro-business (your manufacturing owners) — the Lobby lever. **Logistics & Trade Workers** tie the logistics sim to votes.

---

## 7. The election engine (core math — model before coding)

A pure, separately-tested function, exactly like the demand engine.

### 7.1 Per-segment fit
```
dist_g_c = sqrt( Σ_axis  priority[g][axis] * ((platform[c][axis] - ideal[g][axis]) / 100)^2 )
fit_g_c  = (1 - dist_g_c) ^ POL_FIT_EXP
```

### 7.2 Campaign reach (saturating; analog of marketing awareness)
```
effort_g_c    = Σ (action_weight * charisma_mult)  targeted at segment g, accumulated over arcs
charisma_mult = 0.6 + 0.4 * (charisma / 100)
reach_g_c     = POL_REACH_MIN + (POL_REACH_MAX - POL_REACH_MIN) * (effort_g_c / (effort_g_c + POL_REACH_HALF_SAT))
```
Money buys reach **sublinearly** (HALF_SAT), mirroring `marketing.ts`.

### 7.3 Credibility & incumbency
```
cred_mult       = 0.5 + 0.5 * (credibility / 100)
incumbency_mult = is_incumbent ? POL_INCUMBENCY_BONUS : 1.0
```

### 7.4 Raw support → resolve competition within the segment
```
raw_g_c   = fit_g_c * reach_g_c * cred_mult * incumbency_mult
share_g_c = raw_g_c / Σ_over_all_candidates_k ( raw_g_k )
turnout_g = POL_BASE_TURNOUT * (0.8 + 0.4 * avg_reach_in_segment_g)
votes_c   = Σ_segments ( size[g] * POL_REGISTERED_VOTERS * turnout_g * share_g_c )
```

### 7.5 Seat allocation (party-list proportional, D'Hondt)
1. Party total = Σ its candidates' votes.
2. Allocate `POL_COUNCIL_SEATS` (61) by **D'Hondt** on party totals.
3. Within a party, seats fill by candidate vote rank. NPC candidates can win seats.
4. Government formation in §8.5.

### 7.6 Determinism
Pure & deterministic given inputs (no RNG in v0.1; `POL_VOTE_JITTER = 0`). Stabilises ratio tests; matches NPC determinism.

---

## 8. Election lifecycle (arc-driven state machine)

**Term:** `POL_TERM_LENGTH_ARCS = 48` (4 in-game years). **First cycle accelerated:** `POL_FIRST_CYCLE_ARCS = 12` so pre-alpha testers reach an election within ~1 in-game year.

Windows within a term (counted backward from polling):
```
POL_FILING_WINDOW_ARCS    = 3   // candidacy / party / platform set
POL_CAMPAIGN_WINDOW_ARCS  = 6   // actions accumulate reach
POL_FORMATION_WINDOW_ARCS = 2   // coalition negotiation after polling
```

| Phase | When | What players can do |
|---|---|---|
| **Term / Governing** | most of the term | ruling bloc passes bills + tenders; effects apply each arc; opposition lobbies. |
| **Filing** | 3 arcs before polling | found/join party, declare candidacy, set/nudge platform. |
| **Campaign** | final 6 arcs before polling | queue campaign actions; spend cash; receive donations; lobby; live polls. |
| **Polling** | one arc | engine runs once → votes → seats. |
| **Government Formation** | 2 arcs after polling | coalition negotiation → Premier named → new Term begins. |

### 8.5 Government formation (realistic)
1. If a party holds ≥ `POL_MAJORITY_SEATS` (31): it governs alone; its leader is **State Premier**.
2. Else the **largest party** gets first attempt: it may invite ideologically-near parties (smallest platform distance) into a coalition until combined seats ≥ 31.
   - Player-led parties choose via UI during the Formation window; NPC parties auto-accept if platform distance < `POL_COALITION_MAX_DISTANCE` and they aren't already governing-averse.
3. If the largest party fails within the window, the **second-largest** gets one attempt.
4. If no majority coalition forms: a **minority government** led by the largest party (can still propose bills but needs cross-bench votes to pass them).
5. **State Premier** = leader of the largest party in the governing bloc.

Arc processor:
```
politics.service.ts -> processPoliticalArc(stateId, arcNumber)
  - advance phase on boundary
  - Campaign: apply queued actions to reach; run NPC campaign brain
  - Polling arc: run engine, write results + seats
  - Formation: resolve coalitions (§8.5), name Premier, emit Ledger
  - Term: apply active bill/tender effects hook (§10); bank factor changes (§12)
```
**Integration point:** call from the existing world/arc advance flow (same place manufacturing arcs advance). No separate scheduler.

---

## 9. Campaign actions (mechanics + starting numbers)

Queued during Campaign; cost cash and may target a segment. Effort → reach via §7.2.

| Action | Cost ₯ | Effort | Targeting | Notes |
|---|---|---|---|---|
| Canvass / Ground Game | 1,500 | 8 | one segment | cheap, focused |
| Public Rally | 5,000 | 22 | one segment | scales with charisma |
| Media Ad Buy | 12,000 | 30 | all segments (split) | broad reach |
| Televised Debate | 0 (1/cycle) | 18 | all segments | gated: Credibility ≥ 40 |
| Endorsement Drive | spends Influence | 15 | one segment | uses Influence not cash |
| Fundraiser | raises ₯ | 0 | — | converts Influence + Charisma into party treasury |

All costs/effort/curves in `politics.ts`. **Money deducted once per arc when an action resolves — never double-charge** (marketing.ts rule).

---

## 10. Governance — bills, tenders & business hooks (the stakes)

The governing bloc proposes; the State Council votes (seat-weighted, > 50% passes); passed measures set **state policy** the business sim reads each arc.

### v0.1 fully wired (2)
1. **Industry Tax Rate** — sets `pol_state_policy.industry_tax_rate` (0.10–0.35). Hook: applied to company profit during manufacturing/logistics **arc processing** for Ironvale companies (`company_finances`), inside the existing transaction.
2. **Government Procurement Tender** — the government commits to buy `units` of a vehicle class for `n` arcs. Mechanic:
   - Government posts a **tender** (class, spec floor, units, max price, duration).
   - Registered Ironvale manufacturers **bid** (offer price + a model meeting the spec floor).
   - Award rule: lowest qualifying bid wins (Influence can break ties — `POL_TENDER_INFLUENCE_TIEBREAK`).
   - Winner gets **guaranteed sales** of `units` at the agreed price each arc for `n` arcs, **settled OUTSIDE `simulateSalesDemand`** as a direct purchase that adds revenue/clears inventory before the open market runs. The locked demand engine is untouched.
   - This is the deepest manufacturing↔politics loop: winning power literally creates a guaranteed customer, and manufacturers compete for it.

### v0.1 stubbed behind a flag (render, don't wire)
3. Infrastructure Spend → future logistics cost/capacity modifier.
4. Manufacturing / EV Subsidy → future per-unit or R&D cost reduction.
5. Labour Policy → future staff-cost modifier.

> Stubs show intended effect + "Effect coming soon" and mutate nothing.

**Hard rule:** business numbers change only through the existing arc-processing transaction (tax) or the explicit procurement settlement (tender) — never via UI-side math, never by editing the locked engine. (Same discipline as the Phase 4 paid-research transaction.)

---

## 11. NPC parties & candidates (always contested — Ironvale field)

Seed **3 NPC parties** + 1 independent:
- **Ironvale Labour Front** — platform (tax 30, labour 90, invest 70, trade 50, stability 50).
- **Industrial Progress Party** — (tax 85, labour 35, invest 75, trade 80, stability 60).
- **Civic Stability Union** — (tax 55, labour 55, invest 60, trade 60, stability 80).
- 1 Independent — moderate, low treasury.

NPC campaign brain (rule-based, deterministic, NPC v1 style):
- Allocate treasury to actions proportional to where they trail in polls, comparing the **previous arc's** poll (avoid state-bleed — NPC Brain Rule B1 caution).
- Cap spend per arc at `treasury * POL_NPC_MAX_SPEND_FRAC` (0.25).
- Never go negative: `Math.min(spend, treasury)` (Ghost-Car clamp analog).
- NPCs reuse the **same** `pol_*` tables + the **same** engine. No parallel code path.
- In formation, NPCs coalition by platform proximity (< `POL_COALITION_MAX_DISTANCE`).

---

## 12. Living-world & character integration (read-only consume)

The desk **reads** existing systems; it does not rebuild them.
- **Background traits** (e.g. "Political Household" → starting Influence/network; "Local Councillor" → starts owing a favour): read at candidacy to seed starting Influence and a per-cycle effort bonus. Do not alter character creation.
- **Political favours** (owed by/to NPCs like Jonas Kest): a favour can be spent for a one-off Influence/effort boost in a chosen segment. Reference existing favour records; don't duplicate.
- **Civic rooms** (e.g. `political_observation` forums in Ironvale): attending grants Influence/effort that can be spent on campaigns. Read participation from existing room history; surface "earned from civic activity" in the Campaign tab.

## 12b. Factor feedback (progression loop)
Applied end of relevant arc, banked transactionally (caps 0–100, all tunable):

| Event | Effect |
|---|---|
| Win a Council seat | Influence +6, Credibility +3 |
| Become State Premier | Influence +12, Credibility +6, Charisma +3 |
| Pass a bill / award a tender | Credibility +4 |
| Lose a held seat | Influence −5 |
| Failed bill you proposed | Credibility −3 |
| Active campaigning (≥3 actions/cycle) | Charisma +2 |

---

## 13. Backend — files, routes, schema

Mirror the manufacturing structure (controllers + routes + services + constants). Inline knex inserts in the controller are fine (existing pattern), but keep the **engine pure and separate**.

### Files
```
backend/src/api/routes/politics.routes.ts
backend/src/api/controllers/politics.controller.ts
backend/src/api/services/politics.service.ts          # arc orchestration + formation + tender settlement
backend/src/api/services/electionEngine.ts            # PURE, no DB, fully tested
backend/src/api/constants/politics.ts                 # ALL tunables
backend/database/migrations/0006_politics_v0.sql
backend/tests/electionEngine.behaviour.test.ts        # ratio-based
```
Register routes in `backend/src/api/routes/index.ts`.

### REST endpoints (state-scoped to Ironvale)
```
GET    /politics/state                 -> active state, phase, cycle, arc countdown, "coming soon" states
GET    /politics/parties               -> parties + standings
POST   /politics/parties               -> found party (cost ₯, one-per-player)
POST   /politics/parties/:id/join      -> join (Filing only)
POST   /politics/parties/:id/leave
PUT    /politics/parties/:id/platform   -> set platform (Filing only, leader only)
POST   /politics/candidacy             -> declare candidacy
GET    /politics/cycle                  -> phase + key arcs
POST   /politics/campaign/actions      -> queue action (Campaign only)
GET    /politics/polls                   -> live per-segment projection (read-only engine run)
GET    /politics/council                  -> seat composition, Premier, governing bloc
POST   /politics/formation/coalition       -> accept/propose coalition (Formation only)
GET    /politics/bills                       -> bills + status
POST   /politics/bills                        -> propose bill (govt only)
POST   /politics/bills/:id/vote               -> council member votes
GET    /politics/tenders                       -> open/awarded tenders
POST   /politics/tenders                        -> post tender (govt only)
POST   /politics/tenders/:id/bid                -> manufacturer bid (registered Ironvale company)
POST   /politics/lobby/donate                    -> any citizen -> party treasury (Influence gain)
POST   /politics/lobby/petition                  -> registered company petitions for a bill/tender
```

### DB schema (`0006_politics_v0.sql`)
```
pol_states           (id, code, name, is_active, country_id, population, registered_voters, base_turnout)
pol_parties          (id, state_id, name, leader_character_id, platform JSONB, treasury, is_npc, created_arc)
pol_party_members    (party_id, character_id, role['leader','member'], joined_arc)  UNIQUE(character_id)
pol_cycles           (id, state_id, cycle_number, phase, start_arc, polling_arc, formation_end_arc, status)
pol_candidates       (id, cycle_id, party_id, character_id NULL, is_npc, platform JSONB, is_incumbent)
pol_campaign_actions (id, cycle_id, candidate_id, action_type, target_segment NULL, cash_spent, effort, resolved_arc)
pol_results          (id, cycle_id, candidate_id, votes, seat_rank, won_seat bool)
pol_council_seats    (id, state_id, cycle_id, party_id, character_id NULL, is_npc)
pol_offices          (id, state_id, office['premier'], holder_character_id NULL, party_id, since_arc)
pol_coalitions       (id, cycle_id, lead_party_id, member_party_ids JSONB, total_seats, status)
pol_bills            (id, state_id, proposed_by_party_id, type, params JSONB, status['proposed','passed','failed','active'], proposed_arc)
pol_bill_votes       (bill_id, character_id, vote['yea','nay'])
pol_tenders          (id, state_id, vehicle_class, spec_floor JSONB, units_per_arc, max_price, duration_arcs, status['open','awarded','active','closed'], awarded_company_id NULL, awarded_price NULL, posted_arc)
pol_tender_bids      (id, tender_id, company_id, model_id, bid_price, created_arc)
pol_state_policy     (state_id PK, industry_tax_rate, infrastructure_level, subsidy JSONB, updated_arc)
pol_ledger_events    (id, state_id, arc, kind, headline, body)   -- feeds Chronicle
```
- Money/precision consistent with `company_finances`.
- `character_id` / `company_id` / `model_id` reference existing tables — never copy values in.

---

## 14. Frontend — the Political Desk

Route: `frontend/src/app/drennia/politics/` (beside `business/`). Add **Politics** to active nav (lockable until the player is in Ironvale, like Business locks until company registration).

### Tabs
1. **Overview** — your offices, party, four factors, cycle phase + arc countdown, Ironvale summary; a state map where Drennport/Westport/Greenmere + national Parliament + the Crown are disabled "Coming Soon" cards.
2. **Party** — found/join/leave; members; treasury; platform editor (5 axis sliders), leader-only, Filing-only.
3. **Campaign** — your candidacy; queue actions; per-segment effort/reach bars; cash spent; "civic activity earned" (from §12 hooks).
4. **Election / Polls** — live per-segment projection, party standings, seat projection (Recharts), updates each arc.
5. **Council & Government** — seat donut, Premier, governing bloc/coalition, bill list, propose/vote UI; Formation-phase coalition UI when active.
6. **Lobby & Tenders** — business-facing: donate (any citizen), petition (company), and the **tender board** (post if govt; bid if registered Ironvale manufacturer).

### UX rules
- Reuse the existing WorldR component system / Chronicle-Business theme — no new visual language.
- Read `phase` and disable actions outside the legal window.
- Other states/national/Crown: attractive **"Coming Soon"** state, never an error or dead link.

### Chronicle integration
- `pol_ledger_events` render in the Chronicle **Ledger** in newspaper voice ("Labour Front sweeps Industrial Workers; new Premier named", "Government awards ₯-tender to ...", "Industry tax cut passes Council"). Election results, Premier changes, bills, and tender awards each emit an event.

---

## 15. Constants file (single source of truth)

`backend/src/api/constants/politics.ts` holds: AXES, SEGMENTS, all §4 state constants, term/window arcs, POL_FIRST_CYCLE_ARCS, POL_FIT_EXP, POL_REACH_MIN/MAX/HALF_SAT, charisma/cred/incumbency multipliers, action costs/effort, fundraiser curve, coalition distance, NPC spend cap, tender tiebreak, factor-feedback deltas, bill ranges, party founding cost. **No politics number anywhere else.**

Starting values (tune later):
```
POL_FIT_EXP              = 3.5
POL_REACH_MIN            = 0.05
POL_REACH_MAX            = 1.0
POL_REACH_HALF_SAT       = 120
POL_INCUMBENCY_BONUS     = 1.15
POL_BASE_TURNOUT         = 0.58
POL_TERM_LENGTH_ARCS     = 48
POL_FIRST_CYCLE_ARCS     = 12
POL_FILING_WINDOW_ARCS   = 3
POL_CAMPAIGN_WINDOW_ARCS = 6
POL_FORMATION_WINDOW_ARCS= 2
POL_COUNCIL_SEATS        = 61
POL_MAJORITY_SEATS       = 31
POL_COALITION_MAX_DISTANCE = 0.30   // normalised platform distance NPCs accept
POL_NPC_MAX_SPEND_FRAC   = 0.25
POL_TENDER_INFLUENCE_TIEBREAK = true
PARTY_FOUNDING_COST      = 25_000
POL_VOTE_JITTER          = 0
```

---

## 16. Behaviour tests (RATIO-based)

`electionEngine.behaviour.test.ts` — assert ratios/ordering, not absolute counts:
1. **Fit dominates:** platform == segment ideal beats a far platform at equal reach, in that segment.
2. **Reach diminishing returns:** doubling effort raises share by > 1× but < 2× (HALF_SAT).
3. **Credibility bounded:** 50→100 credibility raises share within ~1.1×–1.6×.
4. **Zero-sum segment:** Σ shares in a segment == 1.0 (±ε).
5. **D'Hondt sanity:** a party with ~2× votes gets ≥ the other's seats, never fewer; total == 61.
6. **Determinism:** identical inputs → identical outputs.
7. **NPC clamp:** NPC arc spend ≤ treasury × 0.25; treasury never negative.
8. **Turnout monotonic:** higher avg segment reach never lowers that segment's turnout.
9. **Coalition reaches majority:** formation only declares a government when bloc seats ≥ 31 (or marks minority).
10. **Tender award:** lowest qualifying bid wins; tie broken by Influence when enabled.

---

## 17. Build order (phases)

- **P0 — Schema + constants.** Migration `0006`, `politics.ts`, seed Ironvale + segments + 3 NPC parties + 1 independent. No UI.
- **P1 — Pure election engine + tests.** `electionEngine.ts` + all §16 tests green. No DB, no UI. **Do not proceed until green.**
- **P2 — Parties & candidacy.** Found/join/leave, platform, declare candidacy. Routes + Party/Overview UI. Filing gating.
- **P3 — Campaign + arc processing.** Queue actions, `processPoliticalArc`, reach accumulation, live polls, NPC brain, living-world effort hooks. Campaign + Polls UI.
- **P4 — Polling, seats, formation.** Engine on polling arc, D'Hondt, coalition formation, Premier, Council UI, Ledger → Chronicle.
- **P5 — Governance + business hooks.** Bills (propose/vote), wire Industry Tax into arc processing; build the tender board + bid + procurement settlement outside the engine. Stub the other 3 bills. Lobby tab.
- **P6 — Factor feedback + polish.** Win/office/bill/tender factor changes, "Coming Soon" states, Chronicle copy pass.

Pre-alpha = P0–P5 working in Ironvale; P6 ideally included.

---

## 18. Guardrails (repeat for the agent)
- Never revive deleted political code or old localStorage keys.
- Keep `electionEngine.ts` pure (no DB, no time, no randomness in v0.1).
- All numbers in `politics.ts`.
- Business numbers change only via the existing arc-processing transaction (tax) or explicit procurement settlement (tender) — never edit `simulateSalesDemand`, marketing, or NPC settle logic.
- NPCs reuse player tables + engine; clamp spend; never go negative.
- Every out-of-scope feature renders "Coming Soon," never a broken screen.
- Ratio-based tests must pass before wiring UI to the engine.

---

## 19. Decisions locked (was: open questions)
1. **Active state:** **Ironvale** (industrial heart; manufacturing + logistics + live labour politics).
2. **Cycle:** 4-year terms (`POL_TERM_LENGTH_ARCS = 48`); accelerated first cycle (`POL_FIRST_CYCLE_ARCS = 12`) for pre-alpha.
3. **Assembly:** **61-seat State Council** (realistic for ~2.4M; proportional list scales with player count).
4. **Coalitions:** realistic government-formation phase (§8.5) — largest party first, ideological-proximity coalitions, minority fallback.
5. **Procurement:** **tender settled outside the locked demand engine** (manufacturers bid; guaranteed sales to the winner).
6. **Lobby access:** donations open to any citizen; bill petitions + tender bids require a registered Ironvale company.

### Still to confirm with John (non-blocking)
- Exact in-world names for the 3 NPC parties (placeholders above are fine to ship).
- Whether the State Premier title should instead be "First Councillor" to match civic voice.
- Real arc cadence (how fast arcs advance in pre-alpha) — affects whether 12-arc first cycle feels right.
