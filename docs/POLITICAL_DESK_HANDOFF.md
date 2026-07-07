# WORLDr — Political Desk: AI Handoff & Next Steps

> **Read this first.** It tells the next AI what is done, where everything lives, and exactly what to build next. WORLDr is a deterministic economic/political roleplay sim. Nation = **Drennia**. This doc covers the **Political Desk** only.

---

## 0. TL;DR — current state

- The **front-end** of the Political Desk was rebuilt to the locked design (**GDD v0.5**) on branch **`feat/political-desk-gdd`** → open **PR #16**.
- Front-end **type-checks clean**: `cd frontend && npx tsc --noEmit` = 0 errors (`strict: true`).
- The **backend election engine is UNTOUCHED and still authoritative.** The new UI is a display/naming layer mapped onto existing wired IDs, plus live API calls. It works today against the current engine.
- **Two follow-ups remain** (see §5 and §6): (1) delete superseded dead files, (2) the **backend Phase-2 migration** that makes the deeper GDD mechanics real.

**Golden rule:** never change the tuned election math or the stable IDs casually. The UI renames are cosmetic; the engine keeps its internal names. Keep them in sync via `_lib/model.ts`.

---

## 1. Where to read the design (do this before coding)

1. **GDD v0.5 — the design bible.** `docs/Political Design Document.md`. Read §3 (time), §4 (8h loop), §5 (stats), §6 (Pillars/ladders), §7 (AP), §8 (blocs), §9 (Crowding/Fatigue), §11 (Conditions), §14 (worked election example).
2. **The display/config source of truth:** `frontend/src/app/drennia/politics/_lib/model.ts` — every plain name (Creeds, Blocs, Pillars), the federal jurisdiction table, and the AP model. Items the backend doesn't honor yet are commented `TARGET`.
3. **The engine source of truth (MATH):** `backend/src/api/constants/politics.ts`.

---

## 2. Repo map (monorepo: Turborepo + npm workspaces `frontend`, `backend`)

### Front-end — `frontend/src/app/drennia/politics/`
| File | Role |
|---|---|
| `page.tsx` | Desk shell: top bar (dual countdowns, AP, cash), sidebar, screen router. Fetches `me`, `politicsState`, `parties`, `ledger`, `myAp`. Passes `commonProps` to screens. |
| `OverviewScreen.tsx` | "This Month" home: Support gauge, bill-on-floor vote, Chronicle, recommended move. |
| `PartyScreen.tsx` | Founding flow (Creed grid + Tenet + Keystone + $25k) and party identity (Planks on ladders, roster, recruit). |
| `ElectionsScreen.tsx` | Electorate Map (bloc size/leaning/indicative Fit) + live projections. |
| `LegislatureScreen.tsx` | Active policies, floor bills + free vote, propose `industry_tax`. |
| `AssemblyScreen.tsx` | Chamber composition bar + legend from `getCouncil`. |
| `LobbyScreen.tsx` | Citizen donation, corporate petition (gated), procurement tenders. |
| `_components/PoliticsSidebar.tsx` | Nav. Exports `type PoliticsSection`. |
| `_components/JurisdictionSwitcher.tsx` | State switcher (kept from old code; props `{selected, onChange, meta}`). |
| `_lib/model.ts` | **Plain names + federal jurisdictions + AP model.** Start here. |
| `_lib/theme.ts` | The `T` palette + `MONO` + `stampStyle`. Use these for all styling. |
| `_lib/session.ts` | `JURISDICTIONS` list (id/name/isLocked/isActive), `DEFAULT_JURISDICTION_ID`. |

- **Shared UI:** `@/components/ui` (Card, Button, StatChip…). The new screens deliberately avoid it and use `T` + inline styles to stay self-contained.
- **API client:** `frontend/src/lib/api.ts` → `politicsApi` (~line 213), `characterApi` (~line 123).
- **Front-end engine constants (mirror of backend):** `frontend/src/lib/politicsConstants.ts` → `type Axis`, `AXES`, `SEGMENTS`.

### Back-end — `backend/src/api/`
| File | Role |
|---|---|
| `constants/politics.ts` | **All tunables**: AXES, SEGMENTS, election params, AP system, roster bands, DOCTRINE_*, governing events. Has a runtime self-check (segment sizes sum to 1.0; priorities sum to 1.0) — keep it valid. |
| `services/politics.service.ts` | AP helpers (`computeApCap` ~54, `getOrCreateCharacterAp` ~71, `spendAp` ~90, `regenApForCharacter` ~111, `refreshApCap` ~125), roster, recruit. |
| `services/politics.processor.ts` | Per-tick cycle processing (phases, regen call ~line 330 with `currentMonth`). |
| `services/electionEngine.ts` | Deterministic Fit×Reach×Turnout → D'Hondt seat allocation. |
| `services/governingEvents.ts` | Governing-phase events. |
| `services/politics.pulse.ts` | Feedback/"pulse" layer (does NOT affect the pure engine). |
| `controllers/politics.controller.ts` | HTTP handlers. AP endpoint ~1123. |
| `routes/politics.routes.ts` | Route table. |

---

## 3. The naming map (display ⇄ engine) — DO NOT break these IDs

The engine keeps stable internal IDs; the UI shows plain names via `_lib/model.ts`.

**Creeds** (UI name → engine `doctrine_id`): Populist→`forge_accord` · Liberal→`the_ledger` · Conservative→`the_homestead` · Socialist→`the_commons` · Progressive→`the_vanguard` · Centrist→`the_compact`.

**Voter Blocs** (UI name → engine `SEGMENTS[].key`): Workers→`industrial_workers` · Merchants→`logistics_trade_workers` · Business→`factory_business_owners` · Professionals→`civic_professionals` · Middle Class→`suburban_families`.

**Pillars** (UI name → engine `Axis`): Tax & Spending→`taxation` · Workers & Jobs→`labour` · State Investment→`investment` · Trade→`trade` · Order & Reform→`stability`. Engine values use the **20 / 50 / 80** three-rung scale.

If you add/rename anything in the UI, update `_lib/model.ts` only. Never rename the engine IDs/keys without a coordinated migration.

---

## 4. Live API contracts (verified against `frontend/src/lib/api.ts` + current usage)

- `getState()` → cycle/overview (has `activeState`, `cycle`, etc.).
- `getParties(stateId)` → `[{ id, name, leader_character_id, platform: Record<Axis,number>, popularity?, doctrine_id?, member_count? }]`.
- `foundParty({ name, doctrine_id, tenet_id }, stateId)` — **this is the founding contract.**
- `setDoctrine(id, doctrine_id, tenet_id, platform)`, `setTenet(id, tenet_id)`, `updatePlatform(id, platform)`.
- `getBills(stateId)` → `{ bills: [{ id, title?, name?, status?, ayes?, nays? }], activePolicy: { industry_tax_rate, infrastructure_level } }`.
- `proposeBill('industry_tax', { rate: 0.20 }, stateId)`, `voteBill(id, 'aye'|'nay')` (vote is free, 0 AP).
- `getCouncil(stateId)` → `{ partySeats: [{ name, seats, partyId }], premier, government: { members: [partyId] } }`.
- `getPolls(stateId)`, `getTenders(stateId)`, `donateToParty(partyId, amount)`, `petitionParty(partyId, issue, amount)`, `recruitNpc(stateId)`, `getMyAp()` → `{ current_ap, ap_cap }`.

---

## 5. Follow-up 1 — delete superseded files (cleanup)

These are now unreferenced dead code (build stays green with them, but remove for cleanliness). On the branch:
```
cd frontend/src/app/drennia/politics
git rm ArcDigest.tsx CampaignTab.tsx CouncilTab.tsx OverviewTab.tsx PartyTab.tsx PollsTab.tsx \
       WarRoomScreen.tsx PoliticalPulse.tsx GeneralActionsPanel.tsx BillsPanel.tsx LobbyTendersTab.tsx
git rm _components/ActionCard.tsx _components/ApBadge.tsx _components/DivisionTally.tsx \
       _components/DoctrineGallery.tsx _components/Hemicycle.tsx _components/Masthead.tsx \
       _components/PartyCrest.tsx _components/PartyStanding.tsx _components/PersonaCard.tsx \
       _components/PhaseTimeline.tsx _components/PlatformBars.tsx _components/PlatformPicker.tsx \
       _components/JurisdictionEmptyState.tsx
git rm _lib/doctrines.ts _lib/identity.ts _lib/platformLabels.ts
```
**Keep:** `page.tsx`, the 6 screens, `_components/{PoliticsSidebar,JurisdictionSwitcher}.tsx`, `_lib/{session,theme,model}.ts`. After deleting, re-run `cd frontend && npx tsc --noEmit` to confirm 0 errors.

---

## 6. Follow-up 2 — backend Phase-2 migration (do in this order)

Each task: keep the engine deterministic, keep IDs stable, and after each change run `cd frontend && npx tsc --noEmit` and the backend's typecheck/tests. Do ONE task per PR.

### Task A — AP: 12/month, no cap  *(start here — most contained)*
- **Now:** `AP_BASE_CAP=4` (+office bonuses), `AP_REGEN_PER_ARC=1`, regen clamps to cap. Table `pol_character_ap(current_ap, ap_cap, last_regen_arc)`.
- **Target (GDD §7 / `model.ts` AP_MODEL):** grant **+12 per month**, **no cap** (accumulates); weighted costs (vote 0, campaign 2, propose 3, expedite 4, recruit 4, signature 6…).
- **Edits:** `constants/politics.ts` add `AP_MONTHLY_GRANT=12` (+ a large `AP_NO_CAP_SENTINEL`). `politics.service.ts`: `getOrCreateCharacterAp` init `current_ap=AP_MONTHLY_GRANT`; `regenApForCharacter` → `newAp = current_ap + AP_MONTHLY_GRANT` (remove `Math.min` cap); `refreshApCap` → set sentinel, **do not clamp** `current_ap`. Align per-action AP costs with `model.ts` COSTS.
- **Gotcha:** regen is called per tick with `currentMonth`; confirm 1 tick = 1 in-game month (8 real hours) so it's truly +12/month.

### Task B — Per-jurisdiction seats + staggered federal terms
- **Now:** single `POL_COUNCIL_SEATS=61`, `POL_MAJORITY_SEATS=31`, `POL_TERM_LENGTH_MONTHS=48`.
- **Target (`model.ts` JURISDICTION_MODEL):** Ironvale 100/51 · Drennport 120/61 · Westport 72/37 · Greenmere 50/26 · National 250/126. State term 24mo staggered every 6mo; National 48mo.
- **Edits:** turn seat/majority/term constants into a per-jurisdiction lookup keyed by state code; `electionEngine.ts` D'Hondt must read the jurisdiction's seat count. **Investigate first** how states are stored in the DB and how `activeState`/cycle is scoped (only Ironvale is `isActive` today). This unlocks the other states in `_lib/session.ts` (`isLocked: true → false`).

### Task C — Remove phases (campaign anytime)
- **Now:** `politics.processor.ts` gates by `cycle.phase`; `controllers` gate propose by `phase==='governing'`.
- **Target (GDD §3–4):** no phase ceremony — always governing; election is a scheduled resolution. Campaigning/propose available anytime. Audit every `cycle.phase` check.

### Task D — Crowding + Fatigue (multiplayer anti-copycat, GDD §9)
- **Crowding:** in `electionEngine.ts`, split a bloc's support among parties clustered near its ideal (divisor by relative Fit) so copycats bleed out.
- **Fatigue:** in action handlers, diminishing returns for the same action type repeated within a window.

### Task E — Jurisdiction Conditions (GDD §11)
- Add 5 indicators (Prosperity, Jobs, Order, Cohesion, Budget) moved by policies/bills; feed `governingEvents.ts` crisis thresholds and bloc turnout. New state fields + wiring.

---

## 7. Conventions & guardrails

- **Styling:** import `{ T, MONO, stampStyle }` from `_lib/theme.ts`. Dark, sharp, gold accent, mint=positive, red=negative, 2–4px radius, generous padding. No bright/generic web colors.
- **Data safety:** screens must handle `null`/loading without crashing (optional chaining, `Array.isArray` guards, `useSWR` fetchers with `.catch(() => fallback)`).
- **Non-breaking principle:** the front-end must keep compiling and rendering against the CURRENT engine at every step; land engine changes behind the existing API shape.
- **Do NOT edit** `DOCTRINE_PLATFORMS` values, `POL_FIT_EXP`, `SEGMENTS` sizes/priorities, or the constants self-check without deliberate design intent — they're tuned and validated at runtime.
- **Verify:** `cd frontend && npx tsc --noEmit` (must be 0 errors). Then `cd frontend && npm run build`. For backend, run its build/tests.
- **Workflow:** one concern per branch/PR; base off `main` (or the merged desk branch). Keep `_lib/model.ts` the single source of truth for names/config.

---

## 8. Quick-start checklist for the next AI
1. Read `docs/Political Design Document.md` (GDD v0.5) + `_lib/model.ts`.
2. Skim `backend/src/api/constants/politics.ts` to see the real engine values.
3. If PR #16 not merged: review it, run the §5 `git rm`, `npx tsc --noEmit`, merge.
4. Start **Task A (AP)** as its own PR. Then B, C, D, E in order.
5. After every change: `npx tsc --noEmit` (frontend) + backend typecheck; keep IDs stable; keep it deterministic.
