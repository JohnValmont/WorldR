# WORLDr — Political Desk: NEW NEW Politics Handoff

> Read this first. Captures the Political Desk after the "Living Desk" + "Playable
> Loop" + "Nation Stats" work. Deterministic economic/political sim; first
> jurisdiction = **Ironvale**. Shipped on branch
> **`feat/political-desk-living-elections`** (PR #32).

---

## 0. TL;DR — what changed

1. **Election feel** — parliament **Hemicycle**, ranked **vote bars**, per-bloc
   **electorate map**, and an animated **Election Night** overlay.
2. **Playable loop** — new **Campaign / War Room** screen: stand for election, work
   the campaign trail, spend AP on instant moves + your Creed Signature action.
   Every action moves a live scoreboard.
3. **Redesigned Create Party** — guided founding flow: rich Creed cards (platform
   preview, keystone, signature, blocs courted), live party crest, sticky founding bar.
4. **Nation tab + stats that respond to legislation** — new **Nation** screen: five
   Jurisdiction Conditions, laws in force, how policy moves the nation, dispatches.
   Passing a bill updates the legislated policy and the stats drift toward it.

The backend election engine + tuned math are **unchanged**. Everything is a
display/agency layer plus one small additive backend change (bills → nation stats).

---

## 1. Repo map — `frontend/src/app/drennia/politics/`

| File | Role |
|---|---|
| `page.tsx` | Desk shell: top bar, sidebar, screen router; fetches me/state/parties/ledger/ap. |
| `_components/PoliticsSidebar.tsx` | Nav + `type PoliticsSection`: overview · party · campaign · elections · legislature · **nation** · policy · assembly · lobby. |
| `_components/Viz.tsx` | Shared viz: `partyColor`, `Hemicycle`, `PartyBars`, `BlocContest`, `Momentum`. |
| `_components/ElectionNight.tsx` | Animated results overlay (seat-fill, counting bars, blocs called, verdict). |
| `_components/DeskUI.tsx` | Primitives: `Panel`, `Stamp`, `StatTile`, `Meter`. |
| `_lib/theme.ts` | `T` palette + `MONO` + `stampStyle`. |
| `_lib/model.ts` | `CREEDS`, `PILLARS`, `PILLAR_BY_AXIS`, `BLOC_NAME_BY_KEY`, `JURISDICTION_MODEL`. |
| `OverviewScreen.tsx` | This Month: Support gauge + mini chamber (live projection), conditions strip, floor vote, Chronicle. |
| `PartyScreen.tsx` | Redesigned founding flow + party identity. |
| `CampaignScreen.tsx` | War Room: candidacy, campaign trail, instant AP actions + Signature. |
| `ElectionsScreen.tsx` | Countdown, projected chamber, electorate map, Run Election Night. |
| `LegislatureScreen.tsx` | Bills: propose `industry_tax`, floor vote. |
| `NationScreen.tsx` | State of the Nation: five condition dials, laws in force, how laws move the nation, dispatches. |

### Backend — `backend/src/api/`
- `constants/politics.ts` — tunables incl. `POL_POLICY_CONDITION_EFFECTS`, crisis thresholds. Runtime self-check.
- `services/electionEngine.ts` — Fit×Reach×Turnout → D'Hondt; outputs `perParty`, `segmentShares`.
- `services/conditions.ts` — `computeConditionTargets`, `driftConditions`, `conditionTurnoutMultiplier`, `detectCrises`.
- `services/politics.service.ts` — tick: candidacy, campaign resolution, formation, `resolveBills`, `applyConditionDrift`.

---

## 2. Nation Stats ← Legislation (new causal chain)

**Stats are an output, never set by decree.**

```
Bill passes (Legislature)
  → pol_state_policy.policy_platform[axis]   (LAW IN FORCE; industry_tax → taxation axis)
  → applyConditionDrift() each month:
       effective = { ...governingPartyPlatform, ...legislatedPolicyPlatform }
       targets   = computeConditionTargets(effective)   // GDD §16 ladder deltas
       conditions= driftConditions(current, targets)     // POL_CONDITION_DRIFT_RATE
  → pol_states.cond_{prosperity,jobs,order,cohesion,budget}  (0..10)
  → bloc turnout + crisis events
```

**Where it lives:**
- Migration `database/migrations/0056_state_policy_platform.sql` — `policy_platform JSONB` on `pol_state_policy`.
- `resolveBills()` — on `industry_tax` pass: map rate → `taxation` axis, write `policy_platform`, log a `bill_passed` ledger event naming the stat effects.
- `applyConditionDrift()` — blends governing platform with legislated `policy_platform` (laws override individual pillars).

Effects are gradual (drift), so governance is a multi-month arc. `NationScreen` renders current stats + a "how laws move the nation" table (GDD §16) + dispatches.

---

## 3. Playable loop (end to end)

1. **Found a party** (Creed = identity + starting platform + Signature; $25,000).
2. **Stand & campaign** — declare candidacy; cash on the trail (queued, resolve next tick) + AP War Room moves. Scoreboard reacts.
3. **Read the room** — electorate map (bloc owner, your Fit, crowding); Run Election Night.
4. **Election** — D'Hondt on Election Day; majority → govern, hung → coalition.
5. **Govern** — pass laws → watch nation stats move → defend your record next cycle.

---

## 4. Live data contracts

- `getState()` → `{ activeState, cycle:{cycleNumber,currentArc,electionArc,monthsToElection}, conditions:{prosperity,jobs,order,cohesion,budget} }`.
- `getParties(stateId)` → `[{ id,name,abbreviation,leader_character_id,doctrine_id,platform,treasury,member_count }]`.
- `getPolls(stateId)` → `{ perParty:[{partyId,votes,seats}], segmentShares:{segKey:{partyId:share}}, pulse:{title?,detail?} }`.
- `getBills(stateId)` → `{ bills:[…], activePolicy:{industry_tax_rate,infrastructure_level,policy_platform?} }`.
- `getLedger(limit, stateId)` → `[{id,month,kind,headline,body}]` (kinds incl. `bill_passed`).
- Actions: `declareCandidacy` · `queueCampaignAction({action_type,target_segment?})` · `doGeneralAction(type,{})` · `proposeBill` · `voteBill` · `getMyAp`.

Party colours: always `partyColor(party,index)` from `Viz.tsx`.

---

## 5. Guardrails

- Styling: `{ T, MONO, stampStyle }` from `_lib/theme`. Dark/sharp/gold; mint=+, red=−.
- Null-safe screens (optional chaining, `Array.isArray`, SWR `.catch`).
- Land engine changes behind existing API shapes.
- Do NOT edit `DOCTRINE_PLATFORMS`, `POL_FIT_EXP`, `SEGMENTS`, or the constants self-check without intent.
- Verify: `cd frontend && npx tsc --noEmit && npm run build`; backend typecheck; apply migration 0056.

---

## 6. Highest-value next steps

- **Crowding & Fatigue in the engine** (GDD §9) — visualised but not enforced. Biggest depth win.
- **AP cost on campaign-trail actions** — trail vs War Room compete for AP.
- **More bill types → more pillars** so every stat has a legislative lever (only Tax today).
- **Legislature 2.0** — committee → floor → whip → expedite → clauses; executive orders + Mandates.
- **Multi-jurisdiction** — unlock Drennport/Westport/Greenmere + National on staggered clocks.

---

## 7. Quick-start for the next AI

1. Read this + `docs/Political Design Document.md` + `_lib/model.ts`.
2. Skim `backend/src/api/constants/politics.ts`.
3. Import viz from `_components/Viz.tsx`; never hand-roll colours/charts.
4. Deterministic engine, stable IDs, changes behind existing API shapes.
5. After changes: `npx tsc --noEmit` + backend typecheck; apply pending migrations.
