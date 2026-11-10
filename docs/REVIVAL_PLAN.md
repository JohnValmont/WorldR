# WORLDr Revival Plan

Drafted 2026-11-10 after reading the whole repo. Plain English. Every claim in "Diagnosis" points at real code or git history, so you can check it yourself.

---

## 1. The honest summary

WORLDr isn't dying because it lacks features. It has too many, they're unfinished, and they were built for a crowd of players that never showed up.

You have a deep car-manufacturing economy, a political system (parties, elections, bills, coalitions, bribery), a stock exchange, IPOs, banks, auctions and a district map game. But a new player who arrives today:

1. lands on a page showing **made-up live numbers**,
2. sits through a multi-step sign-up,
3. reaches a hub (the Chronicle) that is **mostly hard-coded fake text**,
4. faces a 4,500-line manufacturing screen that needs a 17-section guide,
5. then waits **16–24 real hours** to see a first car sell, in a world with **no other humans** to compete, vote or form coalitions with.

Nearly everyone leaves before step 5. Monetization can't fix that. The order has to be: **make it fun for one player in the first 30 minutes → make the world feel alive without other players → bring people in all at once (seasons) → only then sell cosmetics.**

### What realistic success looks like

- Persistent browser politics/economy sims are a **small niche**. The ones that last built their communities over years, not months.
- With no marketing budget, a good result for a solo dev **3–4 months after relaunch** is roughly **50–200 people playing each week**. Thousands would be an exceptional result, so don't plan around it.
- Cosmetics in a niche sim earn little. Rule of thumb: only a few percent of active players ever pay. At 200 weekly players that's maybe tens of dollars a month: enough to cover hosting, not a salary. Cosmetic revenue only matters once you have thousands of regular players.
- The good news: the hard engine work (demand model, NPC companies, election maths) is done and tested. Most of the job is **cutting, simplifying and connecting what already exists**, not building new things.

---

## 2. Diagnosis: why players leave (with evidence)

### 2.1 Time-to-fun is days, not minutes
- 1 game month = **8 real hours** (`real_seconds_per_month || 28800` in `backend/src/api/services/worldTick.service.ts`; also the GDD §3).
- A new car takes 2–3 game months to develop (`backend/src/api/constants/engineeringEngine.ts` ~line 337), so **16–24 real hours** pass before the first sale result.
- A state election comes every 6 game months (about 2 real days). A national election comes every 4 game years (about 16 real days).
- So your first session ends with nothing having happened. That's the single biggest retention killer.

### 2.2 The game shows fake data
- Landing page HUD: "Senate Seats Held 148", "National GDP $4.812T", "CYCLE 41" are hard-coded (`frontend/public/landing/index.html`).
- The post-login hub `frontend/src/app/drennia/chronicle/page.tsx` has `SECTOR_DEMAND` and `LEDGER_HEADLINES` as static arrays ("will be replaced by live API data").
- `frontend/src/lib/businessCore.ts` (1,635 lines) is a **localStorage fake business layer** ("Still backed by localStorage for v1") running next to the real backend. That means two sources of truth.
- Several nav destinations are just redirect stubs: `home`, `opportunities`, `rooms`, `company`, `contracts`, `registry`.
- Players notice fake data quickly, and once they do, they stop trusting the simulation. In a sim, trust is the product.

### 2.3 Onboarding state lives in the browser
- Whether you "have a character" is decided by localStorage keys (`worldr_selected_motherland`, `worldr_citizen_file_v1`, `worldr_living_world_entry_v1`) in `frontend/src/app/drennia/layout.tsx` and `frontend/src/lib/flow.ts`.
- If a player clears their browser, switches device or uses incognito, they get bounced into onboarding loops. The last commit before work stopped (2026-09-12) was a fix for guests getting stuck in onboarding, so this is a known weak point.

### 2.4 Complexity wall
- `ManufacturingDeskTab.tsx` is 4,541 lines, `business/page.tsx` 3,591, `PartyScreen.tsx` 2,345, `politics.service.ts` 3,261, `manufacturing.controller.ts` 4,901.
- There are three separate clocks (business tick, politics tick, an 8-hour GitHub Actions "Drennia tick") and **three overlapping political systems**: the `pol_*` backend engine, the `drennia_*` rally/fundraiser district game, and an **unused** 839-line frontend `lib/electionEngine.ts` plus a 660-line `lib/voterBlocs.ts`.
- A new player can't tell what matters.

### 2.5 Stability ate the development time
- 1,029 commits: **489 "fix" vs 263 "feat"**. 124 commit messages mention crash / stuck / lock / deadlock / timeout.
- On every boot, `backend/src/server.ts` runs one-off database patches, including **adding $10M to "Aldrich Automobiles"**. That kind of change belongs in a migration that runs once, not in the startup code.
- About 384 loose debug scripts (`check_*.js`, `fix_*.js`, `query_*.ts`), SQLite files, `old.tsx` (520 KB) and `.bak` files are committed. The repo shows production being debugged by hand.
- Activity: 726 commits in July → 62 in August → 11 in September → **none since 2026-09-12**.

### 2.6 You're flying blind
- There's **no analytics** anywhere in the frontend (no PostHog, GA, Plausible etc.) and no error tracking. You can't currently tell where players drop off.

### 2.7 Security problems (must fix before taking anyone's money)
- Admin access is granted by **hard-coded email addresses** in `backend/src/api/middlewares/auth.middleware.ts`.
- `POST /exchange/admin/retroactive-ipo-fix` checks login but **not admin role** (`backend/src/api/routes/exchange.routes.ts` line 42). Any logged-in player can trigger it.
- The global error handler sends **stack traces to the browser** (`backend/src/app.ts`).
- CORS is `origin: '*'` with credentials.
- `.env.example` contains what looks like a real database password. If it's real anywhere, **rotate it**.

### 2.8 Hosting fights the design
- The tick scheduler is an in-process `setInterval` on Render. If the instance sleeps or restarts, ticks are missed and must "catch up" (up to 6). That's likely a root cause of many of the "stuck tick" fixes. (I inferred this from the code. I couldn't see your Render plan.)

---

## 3. The new design: what WORLDr should be

### One-line pitch
> **Build a company. Fund a party. Write the laws your rivals have to live under. Survive the scandal.**

That's the "politico-economic" hook, and only WORLDr can make it, because both halves already exist and are partly connected (national bills already change manufacturing costs and demand; see commit "national bills -> manufacturing bridge"). Today that link is buried. In the redesign it's the centre of the game.

### Five design pillars
1. **Fun solo, better together.** Every system must work with zero other humans. NPC parties, NPC politicians and NPC companies fill the world. Real players are a bonus, not a requirement.
2. **Something resolves every time you log in.** Each check-in shows results: sales, polls, votes, scandals, headlines.
3. **One loop, not desks.** Money → influence → laws → markets → money. Business and politics are two halves of one career, not two separate apps.
4. **Seasons, not forever.** Fixed-length worlds with a start date, a finale and a legacy hall. Late joiners aren't hopelessly behind, economy bugs get reset, and seasons give cosmetics a natural home.
5. **Only real data on screen.** If the simulation didn't produce it, don't show it.

### The core loop (one check-in, about 5–10 minutes)
1. Read your **Chronicle**: a real newspaper generated from last tick (your sales, rival moves, poll swings, bills passed, scandals).
2. **Business move**: adjust price, production or marketing; start a new model.
3. **Political move**: campaign in a district, court a voter bloc, propose or vote on a bill, donate to or bribe a party.
4. **React to an event**: a scandal, a strike or a market shock, each with a choice.
5. See the **countdown** to the next tick and the next election.

### Clock change (tunable constants, not hard-coded)
| Thing | Now | Proposed |
|---|---|---|
| Tick length | 8 h | **4 h** (6 ticks/day) |
| New car development | 2–3 ticks (16–24 h) | 1–2 ticks (4–8 h); a "template" starter car is ready instantly |
| State election | every ~2 days | every ~2 days (staggered, so there's always one coming) |
| National election | every ~16 days | **once a week** |
| Season length | none (forever) | **4 weeks** = 4 national elections, then finale + reset |

Only one clock. Business and politics tick together. The separate GitHub Actions Drennia tick goes away.

### The first 30 minutes (this is where you win or lose)
- **Guest play first, sign-up later.** Play immediately; ask for email only when the player wants to keep progress or buy something.
- **Practice World** (single-player, private). A copy of Drennia where the player presses "Advance Month" instead of waiting. A scripted 15-minute tutorial: found a company with a template car → see first sales → found a party → win a seat → pass a bill that helps your company → handle a scandal. Then "graduate" into the live season.
  - It's feasible because the demand engine already takes everything it needs as inputs and has tests, and `world_instances` already exists. **Risk:** a tick can currently take minutes (`TICK_MAX_DURATION_MS = 5 min`), so a private-world tick must be profiled and made fast (target under 3 seconds). Verify this first. If it can't be made fast, the fallback is a fully scripted tutorial.
- **Server-side progress.** Character and onboarding state come from the database, never from localStorage.

---

### Starter nations: small competitive nations of 10 players (owner decision)

Each nation holds **10 human players**, competing for its companies, parties and parliament. Small groups give a stronger competitive feel: you know your rivals by name, and every election and market share matters. New nations open as players arrive.

**How it works** (all numbers in a constants file, tunable):

1. **Nation size: 10 human players.** New players join the open nation with the most free spots. That fills nations one at a time rather than spreading people thin.
2. **Next nation opens when every open nation is full.** Drennia first, then the next starter nation, and so on.
3. **Computer-controlled actors fill everything else.** NPC parties, politicians and companies make up the rest of each parliament and market, so a nation of 10 humans still has a full 100-seat parliament and real competition. *This is required:* 10 humans can't run a nation alone.
4. **Inactive players free up their spot.** A player not seen for **14 days** (`users.last_seen_at`, tracked since Phase 1) stops counting toward the 10. Their character and company stay, but run on autopilot, until they return. Without this, nations fill with absent players and feel dead.
5. **Seasons rebalance.** At each season start, players are re-sorted into nations of 10 (friends can choose to stay together), so nobody is stuck in an emptied nation. Legacy titles carry over; nation membership doesn't.
6. **Cross-border play is what makes multiple nations interesting.** Exporting cars to other nations' markets, tariffs and treaties voted by each parliament, foreign investment, and a nation-vs-nation leaderboard. The demand engine already groups sales by market, so foreign markets are an extension, not a rewrite.
7. **Second-nation design:** one with a contrasting economy or politics to Drennia (for example resource-rich, or more authoritarian), so nations feel different to play.

**Risks to watch:**
- **Empty-feeling nations:** if many of the 10 go quiet mid-season, rule 4 plus NPC autopilot has to keep things moving. Track it with the "active players per nation" number.
- **Too many half-empty nations:** never open a new nation while an existing one has free spots.
- **Server cost:** each nation adds simulation work per tick. Measure tick time (already a Phase 1 task) before opening nation 3+.

**When:** after Phases 1–3. The first concrete step is making the world tick and the snapshot work per nation (today almost everything assumes Drennia).

## 4. What to keep, freeze and delete

The frozen systems are a **content backlog**: already built, switched back on in later seasons when there are enough players to make them meaningful.

| System | Decision | Why |
|---|---|---|
| Demand engine, marketing, NPC company brain | **Keep, don't touch** (locked in AGENTS.md) | Tested, it's the core |
| Manufacturing | **Keep, simplify the UI**: a "simple mode" with template cars and 5 key numbers; the full engineering screen becomes "advanced" | Depth is good; the wall in front of it isn't |
| Parties, elections, bills, coalitions (`pol_*`) | **Keep as the one political engine** | Deepest and has tests |
| Bribery / scandals | **Keep and feature it** | It's the politics↔business link and creates drama |
| Hex district map | **Keep as the visual** for `pol_*` election results | Looks good; shouldn't have its own separate rules |
| `drennia_*` rally/fundraiser tick + GitHub Action | **Merge into `pol_*`** campaign actions, then remove | Third clock, second rule set |
| Frontend `electionEngine.ts`, `voterBlocs.ts` | **Delete** | Unused |
| `businessCore.ts` localStorage layer | **Delete** after moving anything live to API calls | Second source of truth |
| Chronicle | **Rebuild on real tick data** | It's the main screen |
| Stock exchange, IPOs, acquisition auctions | **Freeze (hide)** → return in Season 2–3 | Needs many players to mean anything |
| Banks, capital partners, logistics contracts | **Freeze (hide)** | Complexity before fun |
| Career / family / network / rooms / opportunities stubs | **Remove from navigation** | Empty pages hurt trust |
| Chat | **Keep**, add moderation basics | Community matters |
| Root/backend debug scripts, SQLite files, `old.tsx`, `.bak`, `scratch/` | **Delete from git** | Noise for you and for AI agents |

---

## 5. Phased roadmap

Timings assume you directing AI part-time and are honest estimates. Each phase ends with a **gate**: don't move on until it's met.

### Phase 0: Stop the bleeding and start measuring (1–2 weeks)
- Fix the security issues in §2.7. Move admin to a DB role. Add `requireAdmin` to every admin route. Hide stack traces in production. Lock CORS to your domain. Rotate secrets.
- Move the boot-time patches in `server.ts` into real migrations.
- Delete committed junk (scripts, SQLite DBs, backups) and add a `tools/` folder for the few scripts worth keeping.
- Add **analytics** (PostHog free tier or Plausible) with a funnel: landing → started play → finished tutorial → came back next day → came back after 7 days.
- Add **error tracking** (Sentry free tier) on frontend and backend.
- Make ticks reliable: an external scheduler calls a protected tick endpoint (you already do this for Drennia), or move to a host that doesn't sleep. Add a `/health` check that alerts you if the tick is overdue.
- Run the existing tests (`node:test` in `backend/tests/`) in GitHub Actions on every push.
- **Gate:** no known exploits; you can see the funnel on a dashboard; a week of ticks with zero manual fixes.

### Phase 1: A great first hour (3–4 weeks)
- Remove all fake data (landing HUD shows real world numbers or nothing; Chronicle built from real tick results).
- Server-side onboarding state; guest play → optional account upgrade.
- Remove stub pages from navigation; one clear left-hand menu: **Chronicle · Company · Party · Parliament · Map · Leaderboard**.
- Manufacturing "simple mode" with template starter cars.
- Practice World + 15-minute scripted tutorial (profile tick speed first; see §3).
- Switch to one 4-hour clock (constants file, not hard-coded).
- **Gate (targets, tune once you see real data):** at least 60% of people who start the tutorial finish it; at least 25% of finishers come back the next day. Test with 5–10 friends or Discord members first.

### Phase 2: A world that's alive without players (3–4 weeks)
- **NPC politicians and parties** that campaign, propose bills, vote, form coalitions and react to the economy. NPC company logic already exists; politics NPCs need the same "brain" treatment, with rule-based decisions and constants in a file.
- Make the **economy ↔ politics loop visible**: when a bill passes, the Chronicle shows who won and lost ("Tariff Act passes, imported car prices up 12%, Aldrich stock +8%"). When unemployment rises, the Chronicle shows the voter mood shift.
- **Scandal system as the drama engine**: bribes, donations and conflicts of interest raise exposure risk; NPC journalists "investigate".
- Merge the `drennia_*` district game into `pol_*`; one clock.
- **Gate:** a solo tester plays 3 real days in the live world and says it felt like things were happening; next-day return stays at 25% or higher.

### Phase 3: Seasons and relaunch (2–3 weeks + launch)
- Season structure: start date, 4 weeks, finale screen, **Legacy Hall** (permanent record of season winners: richest tycoon, longest-serving premier, most bills passed, biggest scandal survived).
- Leaderboards per season. Titles and badges carry over between seasons; money and companies don't.
- **Closed playtest season** first (Discord, 10–30 people, 2 weeks). Fix what breaks.
- **Public Season 1** on an announced date, so players arrive together. An empty server on launch day is the worst outcome, and a date concentrates people.
- Where to announce (honest about scale): your Discord, Reddit communities for web/browser/indie and strategy games (read each subreddit's self-promotion rules), an itch.io page, a short gameplay video, a devlog. Weekly "Drennia Times" posts generated from real Chronicle headlines make cheap, ongoing content.
- **Gate:** at least 30 people actively finish Season 1, and 7-day return is at least 8–10%. **If you can't get 30 people through a season, pricing isn't the problem: go back to Phases 1–2.**

### Phase 4: Monetization (start only after Phase 3's gate) (2–3 weeks)
See §6.

### Phase 5: Bring back the frozen content as season features
- Season 2: stock exchange and IPOs return (needs enough companies).
- Season 3: banks and capital partners, or a second industry.
- Later: a second nation, if player numbers justify it.

**Realistic total to public Season 1: about 3 months. Monetization starts around month 4.**

---

## 6. Monetization: cosmetics only, never pay-to-win

In a politics/economy game, selling money, AP or votes kills the game. Every win would feel bought, and the community would turn on it. Keep it strictly cosmetic or supporter-based.

### Where cosmetics are seen by other players (that's what makes them sell)
Cosmetics only sell if others see them, so first build places where players' identities show up:
- **Party identity:** emblem, colour palette and banner, shown on the hex map, the parliament hemicycle and ballots.
- **Leader portrait:** outfits, backgrounds and frames on profiles, debates and Chronicle stories.
- **Company brand:** logo, showroom backdrop and car liveries on the leaderboard and market screens.
- **Chronicle flair:** a custom front-page style when your party wins or your company tops the market.
- **Victory moments:** election-win and IPO celebrations (confetti already exists).
- **Titles and badges:** season titles stay earned, never sold; a supporter badge is fine.

### Products, in order
1. **Supporter tier, about $3–5/month (launch first).** Supporter badge, chat name colour, an extra portrait/emblem set each month, custom emblem upload (needs moderation), early access to playtest seasons. No gameplay advantage.
2. **One-off cosmetic packs, about $2–8.** Themed emblem/livery/portrait sets.
3. **Season pass (only once you have roughly 500+ weekly players).** Free and paid cosmetic tracks earned by playing.

### Prerequisites before taking money
- Phase 0 security done. Guest accounts must become real accounts before purchase.
- Use a **merchant-of-record** payment provider (e.g. Paddle or Lemon Squeezy) rather than raw Stripe. They handle global sales tax/VAT, which matters a lot for a solo developer.
- Terms of service, privacy policy, refund policy, and moderation for uploaded emblems and names.

### Revenue expectations (rule of thumb, not a promise)
- 200 weekly players × 2–5% paying × about $4 ≈ **$16–40/month**.
- 2,000 weekly players ≈ a few hundred dollars a month.
- Plan for monetization to **cover hosting first**. Treat anything more as a bonus that only shows up if the game grows.

---

## 7. Engineering rules for the rebuild

- Respect the locked systems in `AGENTS.md`; the demand formula and marketing stay as they are.
- All tunable numbers (tick length, season length, election spacing, NPC behaviour) go in constants files.
- No more one-off production patches in startup code. Database changes are migrations.
- Break up the giant screens as you touch them, so no file passes about 800 lines. Don't do one big rewrite.
- Every phase ships behind a flag where possible, so you can switch things back off.
- Before coding a balance change, model the numbers first (already your rule).

---

## 8. Decisions only you can make

1. **Seasons with resets vs. one forever-world.** I recommend seasons. A forever-world with near-zero players and old economy bugs is very hard to revive.
2. **Which political engine survives.** I recommend `pol_*` as the rules and the hex map as the visual, and retiring the separate `drennia_*` rally game.
3. **Guest-first play.** I recommend yes. Sign-up walls kill browser games.
4. **Freezing exchange/IPO/banks for Season 1.** I recommend yes, even though a lot of work went into them. They come back later.
5. **Budget.** Can you spend about $20–50/month on hosting that doesn't sleep, plus maybe $50–200 on a launch push? If not, the plan still works but growth will be slower.

---

## 9. Biggest risks

- **Running out of energy mid-plan.** Activity stopped in September. Smaller phases with visible wins (Phase 0–1) matter more than a perfect design.
- **Tick performance** may block the Practice World. Profile it early.
- **Nobody comes to Season 1.** Mitigation: closed playtest first, launch date announced 2+ weeks ahead, build the Discord before launch.
- **Scope creep again.** New features before the Phase 3 gate is met = repeat of July–September.
- **Moderation load** once chat, names and uploads grow, especially in a political game where people roleplay real-world politics.

---

## 10. What I did NOT verify

- I didn't run the game locally or look at the live site, so the UX claims come from reading code.
- I couldn't see production data (real player counts, your Render plan, tick timings).
- Before Phase 1 starts, someone should play through the live onboarding end-to-end and record every point of friction.

---

## Phase 0 status (2026-11-10)

**Done in code:**
- Admin rights now come from `users.role` only. The hard-coded admin emails were removed (backend and frontend). New `ADMIN_EMAILS` env var promotes accounts on boot.
- `POST /exchange/admin/retroactive-ipo-fix` now requires admin.
- Production 500 errors no longer send stack traces or internal messages.
- CORS is restricted to `CORS_ORIGINS` when set (it stays permissive, with a warning, when unset, so nothing breaks before you configure it).
- The one-off boot patches in `server.ts` moved into `database/migrations/0091_consolidate_boot_patches.sql` (idempotent, runs once).
- Removed about 1,600 committed junk files: debug scripts, SQLite files, a committed local Postgres data folder (`data_pg/`), `scratch/`, `.bak` files, `old.tsx` and the stale root `landing/` copy. `.gitignore` now blocks them.
- Sentry error tracking (backend), off until `SENTRY_DSN` is set. Failed tick subsystems are reported.
- PostHog analytics with funnel events (landing → sign-up/guest → character → world → pages), off until `NEXT_PUBLIC_POSTHOG_KEY` is set. No emails are sent to analytics.
- `/health/ticks` endpoint + `tick-health.yml` workflow (every 30 min; a failed run emails you).
- `ci.yml`: backend type-check, 5 required tests, frontend type-check and production build on every push. All other tests run in an "informational" job.
- Page title and description changed from "Secure Auth Gateway" to a real game description (SEO).

**Owner actions (only you can do these):**
1. **Rotate the Supabase database password now.** A production connection string with its password was committed in about 140 files. Deleting the files doesn't remove them from git history. If the GitHub repo is or ever was public, assume the password is compromised. After rotating, update `DATABASE_URL` on Render.
2. On Render, set `NODE_ENV=production`, `ADMIN_EMAILS=<your admin emails>`, `CORS_ORIGINS=<your Vercel URL>` and optionally `SENTRY_DSN`.
3. On Vercel, optionally set `NEXT_PUBLIC_POSTHOG_KEY` (and `NEXT_PUBLIC_POSTHOG_HOST` if you use the EU region).
4. Make sure the GitHub repo secret `RENDER_BACKEND_URL` exists (the tick-health workflow uses it).

**Known gaps carried into Phase 1:**
- 14 of 19 backend test files fail: some need a real database, some import files that no longer exist, and some are out of date with the current game-code signatures. They should be repaired and added to the required CI list one by one.
- `backend/database/migrations/` holds 35 SQL files that never run automatically (several were applied to production by hand). They should be reconciled with the live `database/migrations/` folder against the production schema, not blindly moved.
- Ticks still depend on the server staying awake. A host that doesn't sleep (or an external tick trigger for the main world tick) is still recommended.
