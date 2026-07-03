# Devlog #1 — Political Desk Addictiveness + Month/Year Calendar + UI Pass

**Date:** July 3, 2026  
**Branch:** main  
**Commits:** 3ef968f · 9dce9f8 · 3500503 · d7111ab · 66008ce  
**Files touched:** 24 (7 new, 17 modified)  
**Lines:** +1,470 / −745

---

## What shipped

### 1. Political Desk — Addictiveness Pass

The Political Desk was functionally complete but emotionally flat. You could see polls and standings, but there was no tension, no momentum, no reason to come back between elections. This pass adds six engagement levers as a **pure feedback layer** — the election engine, marketing, NPC settle logic, and arc processor are completely untouched.

**New files:**

- **`politics.pulse.ts`** (backend, pure) — Turns a raw election projection into an "engagement pulse": seats-from-majority (near-miss tension), momentum (seat delta vs last month), a named chief rival, loss-aversion ("defend your seat"), per-segment status (winning/contested/losing) with delta arrows, and a single sharpest next-action prompt. No DB, no time, no randomness — just derivation from existing engine output.

- **`PoliticalPulse.tsx`** (frontend) — Renders the pulse as a tone-colored tension banner ("2 SEATS FROM POWER"), a majority progress bar, seat momentum (▲/▼ this month), a rival head-to-head card, a defend-your-seat warning, a call-to-action prompt, and a per-segment "ground you're gaining/losing" board with delta arrows. Wired into the top of the Polls tab.

- **`ArcDigest.tsx`** (frontend) — A "while you were away" ledger feed that pulls recent `pol_ledger_events` and renders them in newspaper voice. This is the return trigger — when a player opens the desk after time away, they immediately see what happened. Wired into the Overview tab as "Recent Movements."

**Modified files:**

- **`politics.controller.ts`** — `getPolls` now attaches `pulse` to its response. Momentum is computed by running the existing pure engine a second time at `arc − 1` via `buildEngineCandidates(maxArc)` — free, no snapshot table needed. Also resolves the requesting player's party/candidacy and held seats for loss-aversion. Response normalized to bare-object shape (was `{ status, data }` wrapper).

- **`constants/politics.ts`** — Added `POL_PULSE` block: `SEGMENT_WIN_MARGIN` (0.05), `SEGMENT_CONTESTED_MARGIN` (0.05), `NEAR_MISS_SEATS` (5), `RIVAL_MAX_SEAT_GAP` (8), `MOMENTUM_MIN_DELTA` (0.005). All thresholds centralised per the "no magic numbers" rule.

- **`OverviewTab.tsx`** — Added an Action Center: a phase-aware banner that tells the player exactly what to do right now ("FILING IS OPEN — declare candidacy", "CAMPAIGN IS LIVE — queue actions", "THE FLOOR IS YOURS — propose bills"). Keeps the long governing stretch between elections from feeling dead.

- **`PollsTab.tsx`** — Imports and renders `PoliticalPulse` at the top.

**The psychological loop it creates:** near-miss tension + visible momentum + a named nemesis + loss aversion + one always-obvious next action + a return-trigger digest. That's the stack that makes async political sims sticky.

---

### 2. Month/Year Calendar System

Replaced the confusing "Arc/Orbit" time terminology with a simple **Month/Year** system. The playable era starts in **January, Year 0**. Everything before that is **"The Old Years"** (lore).

**The core fix (a real bug):** The old `calendar.ts` only received the month-within-year (`arc`) and ignored `orbit` — so the **year was permanently stuck at 0**. The new `calendar.ts` is the single source of truth: `absoluteMonth(orbit, arc)` computes a monotonic month index, and `formatWorldDate(orbit, arc)` produces "January, Year 0" / "December, Year 3" / "The Old Years".

**What changed:**

- **`calendar.ts`** (rewritten) — `absoluteMonth()`, `formatGameDate()`, `formatGameDateShort()`, `formatWorldDate()`, `formatWorldDateShort()`. Uses `WORLD_TIME_CONFIG.startingOrbit` (842) and `arcsPerOrbit` (12) from config. Anything before epoch = "The Old Years".

- **`worldTime.ts`** — `formatWorldDate` / `formatCompactWorldDate` now pass both `orbit` and `arc` to the calendar (was only passing `arc` — the bug).

- **`businessCore.ts`** — `formatGameDate()` now calls `formatCalendarWorldDate(d.worldYear, d.worldMonth)` instead of `formatCalendarDate(d.worldMonth)`.

- **Manufacturing, Business, Analytics, Politics** — All composite date displays converted from "Orbit X Arc Y" / "O/A" / "arc.orbit" to the Month/Year formatter. 115 player-facing string replacements (whole-word, case-sensitive — internal identifiers like `current_arc`, `capacity_per_arc`, `.arc` untouched).

- **`manufacturing.controller.ts`** — Rollover unified to 12 months/year (was 8). User-facing error messages say "Month" instead of "Arc".

**What was NOT changed (deliberately):** Internal DB columns (`current_orbit`, `current_arc`, `world_orbit`, `game_arc`, etc.) and code identifiers. These are invisible to players, and renaming them would require a migration + full test run against a live Postgres — too risky to do blind.

**Verified:** Calendar math checked: `(842,1)` = January Year 0, `(842,12)` = December Year 0, `(843,1)` = January Year 1, `(841,12)` = The Old Years. Frontend `tsc --noEmit` clean. Backend `tsc --noEmit` clean.

---

### 3. Party Building — Always Open

The PartyTab had a hard phase gate: you could only found/join/leave parties, edit platforms, and declare candidacy during the **Filing** phase (3 months out of every 48-month term). This meant players had to wait ~45 months to even start playing politics. Bad.

**What changed:**

- **`PartyTab.tsx`** (fully rewritten) — Founding, joining, leaving, and platform editing are now available in **any phase**. Candidacy declaration is open except while an election is actively resolving (polling/formation). The blocking "Filing only" notice is replaced with an informative election-status strip that tells the player what's happening and what they can do.

- **Backend** already allowed most of these actions regardless of phase — the gate was purely frontend. No backend changes needed.

---

### 4. Manufacturing & Debug Cleanup

- **`manufacturing.controller.ts`** — Removed 3 leftover debug `console.log` blocks (hardcoded company ID `767c2273...`, "Arc 4" checks, "Player Corp 2" name checks). ~1,180 chars of debug cruft removed.

- **`ManufacturingDeskTab.tsx`** — Added a **momentum row** to "Latest Month Results": shows "▲ +₹12,000" or "▼ −₹5,000" comparing net profit to the previous month. Fixed "an Month" grammar artifacts from the arc→month swap.

---

### 5. Chronicle Hero Banner

- **`chronicle/page.tsx`** — Added a hero banner at the top of the Chronicle (the daily-return hub). Shows: player name, current game date, net worth with **month-over-month delta** (▲/▼ + percentage), a mini sparkline, and a single clear CTA button ("Open your desk" or "Start your company"). This is the first thing a player sees when they log in — it gives them a reason to care and a direction to go.

---

## Commits

| Commit | Description | Files | +/− |
|--------|-------------|-------|-----|
| `3ef968f` | Political Desk addictiveness pass | 7 | +596/−9 |
| `9dce9f8` | Month/Year calendar refactor | 16 | +199/−164 |
| `3500503` | PartyTab always-open + debug cleanup | 2 | +105/−154 |
| `d7111ab` | Chronicle hero + Mfg momentum + grammar | 17 | +366/−378 |
| `66008ce` | (content push confirmation) | 0 | 0/0 |

---

## What's NOT in this devlog (saved for next)

- **Tick system** (1 month = 8 real hours) — you said this is last priority
- **Multiplayer visibility** — seeing other players' companies/campaigns
- **Onboarding flow** — guided first-time experience
- **Logistics depth** — routes, fuel, cargo types, fleet management UI
- **Design system unification** — consistent colors/components across all surfaces
- **Notifications system** — bell icon, event feed
- **Governing phase events** — scandals, strikes, opportunity cards
- **Remaining 3 states** — Drennport, Westport, Greenmere
- **Sound and juice** — audio feedback, micro-animations

---

## Guardrails respected

- ✅ Election engine untouched (pure, no DB/time/RNG)
- ✅ Demand engine untouched (locked)
- ✅ Marketing system untouched (locked)
- ✅ NPC settle logic untouched (locked)
- ✅ All tunables in constants files
- ✅ No DB migrations needed
- ✅ Both projects type-check clean
- ✅ Internal DB columns not renamed
