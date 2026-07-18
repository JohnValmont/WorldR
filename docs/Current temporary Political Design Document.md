# WORLDr — Political Desk Game Design Document

> **Status:** GDD v0.5 — names simplified, AP economy finalized, bill flow locked, plus the first full spec tables (election example, Signature actions, ladders, Conditions, jurisdictions, and the Overview wireframe).
> Supersedes v0.4. Numbers are tunable defaults; the *shapes* are the proposal.
>
> **Nation:** Drennia · **Desk:** Political · **First jurisdiction:** Ironvale · **Multiplayer:** yes · **Cadence:** 1 in-game month = 8 real hours.

---

## 1. Vision & the one promise

Get **elected**, then **rule** — both earned. Vote share is a **computed output** of separate, causally-distinct inputs, never a single popularity slider. Every feature traces to seats, credibility, treasury, a Pillar, or a Jurisdiction Condition — nothing decorative.

- **No phases, no dead time.** Legislate, campaign, court voters, recruit, and govern *at any moment*. The only fixed clock is the monthly tick and the scheduled election date.
- **A reason to return every 8 hours** — fresh stakes each in-game month, never punishing a player who sleeps.
- **Sameness is quietly punished** through math, not arbitrary rules.

---

## 2. Names (plain & universal)

Everything uses common political vocabulary so non-English speakers aren't lost.

**Creeds (party ideologies you found on):** **Populist · Liberal · Conservative · Socialist · Progressive · Centrist.**
**Voter Blocs:** **Workers · Business · Middle Class · Professionals · Merchants.**
**Pillars (policy areas):** **Tax & Spending · State Role · Trade · Social Order · Reform Pace.**

---

## 3. Time, terms & jurisdictions

- **Unit:** in-game **Month → Year.** **1 month = 8 real hours** (1 year ≈ 4 real days).
- **State term = 2 in-game years.** Term length is a **law** (Constitutional bill, bounded 1–4 years).
- **No phases.** Always governing; an election is just a scheduled resolution moment. **Campaigning is an always-available action.**
- **Staggered clocks → a state election every 6 months** across the nation.

**Jurisdiction table:**
| Jurisdiction | Character | Seats | Majority | Election offset | Cycle |
|---|---|---|---|---|---|
| **Ironvale** | Industrial heartland | **100** | 51 | month 0 | 2 yr |
| **Drennport** | Capital & main port | 120 | 61 | +6 months | 2 yr |
| **Westport** | Trade port | 72 | 37 | +12 months | 2 yr |
| **Greenmere** | Rural / agricultural | 50 | 26 | +18 months | 2 yr |
| **National (Drennia)** | Federal assembly | 250 | 126 | — | 4 yr |

**Ironvale ships first**; the rest unlock as staggered clocks later.

---

## 4. The 8-hour engagement loop

Target: **~one check-in per in-game month (every ~8 real hours) is the sweet spot; missing one is forgiving.**

**Every month tick delivers:** the **Chronicle** digest (what changed) · **+12 AP** · a possible **floor vote** (free, multi-month window) · a possible **Governing Event** · refreshed **office Mandates** · and always-open actions (campaign, court a bloc, recruit, propose a law, executive move).

**The pull to return is competition & time-windows, not decay:** votes close on a timer, events expire, and in real-time multiplayer **rivals claim blocs while you're away** (Crowding, §9). AP accumulates so nothing is lost by sleeping — but standing still while others act is how you fall behind. Two countdowns sit in the top bar at all times: **next month tick** and **next election**.

---

## 5. Stat model (minimal · 0–10 · slow)

> **Support % is an OUTPUT**, recomputed live from the inputs below.

**Personal:** **Cash** (money) · **AP** (see §7) · **Reputation** 0–10 (candidate ranking, roster anchor, unlocks).
**Party:** **Treasury** (money) · **Platform** (5 Planks, 0–10 → **Fit**) · **Reach** 0–10 (breadth) · **Credibility** 0–10 (trust multiplier) · **Conviction** 0–10 (record-vs-Planks → gates roster ceiling, feeds Credibility).

```
Platform + Blocs ─► FIT ─┐
Reach ───────────────────┤
Turnout (× Conditions) ──┼─► VOTES ─► (÷ Crowding) ─► D'Hondt ─► SEATS ─► OFFICE
Credibility (×) ─────────┘
Record vs Platform ─► CONVICTION ─► Credibility & roster ceiling
Policies ─► CONDITIONS ─► bloc turnout/mood + crisis events
```

---

## 6. Pillars → policy ladders

Each Pillar is a **ladder**; a bill moves a policy one rung; the rung sets the 0–10 Pillar value and applies **Condition** effects (full table in §16).

| Pillar (plain name) | Rungs 0 → 10 |
|---|---|
| **Tax & Spending** | Austere · Lean · Balanced · Generous · Lavish |
| **State Role** | Free Market · Light-Touch · Mixed · Directed · State-Run |
| **Trade** | Closed · Protected · Managed · Open · Free Trade |
| **Social Order** | Strict · Firm · Balanced · Liberal · Open |
| **Reform Pace** | Fixed · Steady · Measured · Reforming · Radical |

---

## 7. AP economy & office Mandates

### 7a. AP — plentiful, accumulating, weighted
- **+12 AP every in-game month. No cap — AP accumulates.** Voting is always **0 AP**.

**Action cost table (weighted by impact):**
| Action | AP |
|---|---|
| Vote on a bill | 0 |
| Campaign (build Reach, small push) | 2 |
| Scout a rival | 2 |
| Whip one target | 2 |
| Propose a law → committee | 3 |
| Court a bloc (targeted Statement) | 3 |
| **Expedite** a bill to the floor now | 4 |
| Recruit a candidate | 4 (+Treasury) |
| Executive Order (minor Pillar nudge) | 5 |
| Signature action (Creed-locked) | 6 |

### 7b. Office Mandates — the marquee per-office move
Each office grants **1 Mandate action per month, banking up to 2** (forgiving): **Governor** → major Executive action; **Minister** → portfolio Initiative (permanent Condition boost); **Committee Chair** → prioritize the next floor bill; **Party Leader (always)** → a Statement or Signature action.

---

## 8. Party identity — Creed · Keystone · Planks

One party = one human Leader; benches are NPC-only. Founding costs **Cash** ($25,000): pick a **Creed**, lock **one Pillar as your Keystone** (only movable via a rare, costly **Realignment**), name the party. Each Creed grants **2 Tenets** (Intensify a Pillar / Broaden Fit to a bloc) and **one Signature action** (§15).

**Conviction** (earned, not spent): record-vs-Planks; Keystone counts double; gates roster ceiling + feeds Credibility. **Creed Evolution** at term end: **Recommit** or **Evolve** (cost scaled by how sudden the flip looks; Keystone = full Realignment).

**Creed starting Planks** — Pillar order **[Tax, State, Trade, Order, Reform]**, 0–10:
| Creed | Tax | State | Trade | Order | Reform | Natural Keystone |
|---|---|---|---|---|---|---|
| **Populist** | 8 | 8 | 2 | 4 | 4 | Trade (Protected) |
| **Liberal** | 2 | 2 | 9 | 6 | 4 | Tax (Austere) |
| **Conservative** | 4 | 4 | 3 | 2 | 2 | Social Order |
| **Socialist** | 9 | 8 | 5 | 7 | 8 | Tax (Lavish) |
| **Progressive** | 6 | 5 | 8 | 8 | 9 | Reform Pace |
| **Centrist** | 5 | 5 | 5 | 5 | 5 | player picks |

---

## 9. Anti-copycat — Crowding & Fatigue

- **Crowding:** parties near the same bloc's ideal **split that bloc's vote** (proportional to Fit). Owning an underserved position = near-full capture. Copying is self-defeating by math.
- **Fatigue:** repeating the same action type in a short window gives **diminishing returns**. Varied play stays full-strength.
- Result: a **self-diversifying** multiplayer meta — win by owning space nobody else holds.

---

## 10. Electorate — Voter Blocs (visible & courtable)

The **Electorate Map** shows each bloc's size, leaning, your Fit, and Crowding pressure.

| Bloc | Who | Ideal [Tax,State,Trade,Order,Reform] | Ironvale size | Turnout |
|---|---|---|---|---|
| **Workers** | Industrial labour | 8,7,3,5,5 | 24% | 0.60 |
| **Business** | Owners & industry capital | 2,2,5,6,3 | 16% | 0.85 |
| **Middle Class** | Homeowners, salaried | 4,4,5,3,3 | 26% | 0.80 |
| **Professionals** | Educated white-collar, reformers | 6,5,8,8,9 | 18% | 0.65 |
| **Merchants** | Trade, shipping, logistics | 4,3,9,6,5 | 16% | 0.55 |

**Courting** a bloc lifts Fit/turnout with them but usually costs Fit elsewhere. **Conditions** also move bloc turnout/mood (§11, §16).

---

## 11. Jurisdiction Conditions (governing that matters)

Five state indicators (0–10, plus money **Budget**) that policies move, which shift bloc turnout/mood and trigger crisis events at thresholds:
**Prosperity · Jobs · Order · Cohesion · Budget.** Low Budget → **Debt Crisis**; low Jobs → angry Workers → **Civil Unrest**; low Order/Cohesion → **Unrest/Extremism**.

---

## 12. Legislature — ladders, committee, live votes

**Propose a Law** (3 AP): pick policy → pick rung → live preview (Pillar + Condition + seat/bloc impact) → **send to committee**. Committee endorses; **Chair prioritizes**. Then either the bill **reaches the floor automatically on its scheduled month (one/month queue)**, or you **spend 4 AP to expedite it to the floor now**. **Floor voting is free**, open for up to **3 in-game months**, resolving when the window closes *or* the outcome is mathematically locked. **Whip** (2 AP/target), up to **2 clauses** per bill, magnitude tiers Minor→Constitutional.

---

## 13. Executive, Events & Coalitions

**Executive:** Executive Order (reversible nudge, Legislature can **Rebuke**), Portfolio Initiative (permanent Condition boost), Appoint, Address, Emergency Response, Reshuffle. Portfolios: **Treasury · Education · Health · Infrastructure · Justice.**
**Governing Events:** ≤1/month, each must move a real number; **crises fire from Condition thresholds**, never scripted.
**Coalitions:** no majority → Formation weighted by seats + Credibility, with a **Coalition Strength** meter that decays when partners' Planks clash.

---

## 14. Worked election example (Ironvale, 3 parties)

Using §10 blocs (1,000 voters → 693 turn out) and three parties — **A: Populist** (Reach 5, Cred 6), **B: Liberal** (Reach 4, Cred 5), **C: Progressive** (Reach 3, Cred 4). Within each bloc, a party's share ∝ **Fit × ReachFactor × CredMult**.

**Resulting votes:** A ≈ 255 (36.8%) · B ≈ 240 (34.6%) · C ≈ 198 (28.5%).
- Workers break hard for A (Fit .90). Business & Merchants break for B (Fit .90/.92). Professionals go fully to C (Fit 1.00). Middle Class splits A/B.

**D'Hondt** → **A 4 · B 4 · C 3.** No majority → **coalition Formation.**

---

## 15. The six Signature actions

One Creed-locked marquee action each (6 AP or a Party Mandate; ~6-month cooldown):
| Creed | Signature | Effect |
|---|---|---|
| **Populist** | **Rally the Workers** | Big Reach push + temporary Workers turnout boost; small Business Fit hit |
| **Liberal** | **Deregulate** | Free one-rung nudge on State Role→Free Market or Trade→Open (no vote); pleases Business/Merchants, small Cohesion dip |
| **Conservative** | **Restore Order** | +Order & +Cohesion conditions, nudge Social Order→Firm; steadies Middle Class turnout |
| **Socialist** | **Redistribute** | Nudge Tax→Generous, +Cohesion, −Budget; strong Workers + Professionals courting |
| **Progressive** | **Reform Drive** | Nudge Reform→Reforming & Order→Liberal; strong Professionals courting; small Credibility risk |
| **Centrist** | **Broker a Deal** | Temporary Crowding immunity + Coalition Strength boost; Centrist's edge is flexibility |

---

## 16. Ladder → Condition effect tables

Effects apply when a policy sits on that rung (Pillar value in brackets).
**Tax & Spending:** Austere[0] Budget +2, Prosperity −1, Cohesion −1 · Lean[3] Budget +1 · Balanced[5] — · Generous[7] Prosperity +1, Cohesion +1, Budget −1 · Lavish[10] Prosperity +1, Cohesion +2, Jobs +1, Budget −2.
**State Role:** Free Market[0] Prosperity +1, Jobs −1 · Light[3] — · Mixed[5] — · Directed[7] Jobs +1 · State-Run[10] Jobs +2, Prosperity −1, Budget −1.
**Trade:** Closed[0] Jobs +2, Prosperity −2 · Protected[2] Jobs +1, Prosperity −1 · Managed[5] — · Open[8] Prosperity +1, Jobs −1 · Free[10] Prosperity +2, Jobs −2.
**Social Order:** Strict[0] Order +2, Cohesion −1 · Firm[3] Order +1 · Balanced[5] — · Liberal[7] Cohesion +1, Order −1 · Open[10] Cohesion +1, Order −2.
**Reform Pace:** Fixed[0] Cohesion +1 · Steady[3] — · Measured[5] — · Reforming[7] Prosperity +1, Cohesion −1 · Radical[10] Prosperity +1, Order −1, Cohesion −2.

---

## 17. Overview "This Month" wireframe

```
┌───────────────────────────────────────────────────────────────────────────┐
│ IRONVALE ▾   REP 4 · CRED 5 · REACH 3 · CONV 6   $9.4M  AP 12              │
│                              ⏱ next month 05:12:44   🗳 election in 7 mo    │
├───────────┬───────────────────────────────────────────────────────────────┤
│ ▸ Overview│  THIS MONTH — MAY, YEAR 3                                       │
│   Party   │  ┌─────────────────────────┐  ┌──────────────────────────────┐ │
│   Elections│ │  SUPPORT  ◉ 36.8%        │  │ ON THE FLOOR                 │ │
│   Legisl. │  │  ▲ +1.2 since last month │  │ Trade → Open (Managed→Open)  │ │
│   Assembly│  │  [ live gauge dial ]     │  │ Aye 5 · Nay 4 · 2 mo left    │ │
│   Lobby   │  └─────────────────────────┘  │ [ VOTE AYE ]   [ VOTE NAY ]  │ │
│           │                                └──────────────────────────────┘ │
│           │  CHRONICLE                     YOUR MANDATES (2)                 │
│           │  • Bill "Jobs Act" passed →    • Leader: Statement / Signature  │
│           │    Jobs +1, Workers warming    • Governor: Executive Order      │
│           │  • Event: Trade Shock (Budget) RECOMMENDED MOVE                 │
│           │  • Rival "B" courting Merchants→ Court WORKERS (open niche, 3AP)│
│           │                                [ DO IT ]                        │
└───────────┴───────────────────────────────────────────────────────────────┘
```

---

## 18. Scope & roadmap (Ironvale-first)

1. Lock model → 2. Identity (Creed/Keystone/Planks/Conviction, roster) → 3. Electorate Map + courting → 4. Election engine (Fit×Reach×Turnout÷Crowding → D'Hondt + live Support) → 5. Legislature (ladders, committee, monthly floor + expedite, Whip) → 6. Conditions + Events → 7. Executive + Mandates → 8. Overview "This Month" + Chronicle + dual countdowns → 9. Creed Evolution + Coalitions → 10. Multi-state rollout (staggered clocks, National, Lobby bridge).

---

## 19. Open decisions for v0.6

- **D1 — Fit curve:** linear or steeper?
- **D2 — Fatigue window:** over how many months does a repeated action recover to full strength?
- **D3 — Coalition rules:** who gets first offer — largest party, or highest Credibility?
- **D4 — Signature cooldown:** 6 months right, or tie to term instead?
- **D5 — v0.6 priority:** build the **Founding flow** first, or the **Overview "This Month"** screen first?

---

*End of GDD v0.5.*
