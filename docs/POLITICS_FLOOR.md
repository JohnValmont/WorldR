# The Floor — politics redesign

Written 2026-11-17. Plain English. This replaces the nine-tab Political Desk.

## The idea in one paragraph

You are one politician. Every game month (4 real hours) you get a **hand of three decisions**, the
bills before Parliament need your **vote**, and you have **12 energy** to spend winning voters or
making deals. Everything you do moves one number, **support**: how much each of the five voter groups
backs your party (0 to 100). Support decides elections. Promises between parties are a real mechanic:
"vote my way and I owe you a favour" is recorded, can be called in later, and breaking it has a price.

## Why the old version was not fun (all checked in code)

1. **Only party leaders could vote.** Every other player with a seat had nothing to do in Parliament.
2. **Players could not join each other's parties**, and could not stand for a computer-run party.
   A "multiplayer" game where every human had to be a party of one.
3. **Nothing you did between elections moved the polls.** Interest groups, media, popularity,
   factions and campaign momentum were five separate systems that the election never read.
4. **Governments were 108-seat grand coalitions** that passed everything, so opposition, rebels
   and deals had no purpose.
5. **A new world had no Parliament for 12 months** (2 real days).
6. Nine tabs, two hidden currencies (AP and "political capital").

## What a player does now

| Screen | What is on it |
|---|---|
| **Desk** | What needs you: your three decisions, votes waiting, offers from other parties. Then rallies, fundraiser, ads. Poll and news at the side. |
| **Chamber** | Every bill with its whip count (who votes how, and why), your vote, "work the room" for votes, table a bill, favours owed both ways, the government. |
| **Voters** | Support of every party with every voter group, polls, state of the nation, districts, replay of election night. |
| **Party** | Join a party (you are seated at once), found your own, stand for election, challenge for the leadership. |

### The rules, briefly

- **Support.** Each party has a natural level with each voter group, from how well its platform
  fits them. Rallies (+2.5), ads (+1.5 everywhere), decisions, and the laws you vote for move it.
  Each month 12% of the gap fades back toward the natural level, so effort must be kept up.
- **Laws move voters.** When a bill passes, each voter group judges it. Parties that voted for it
  gain or lose support with that group; parties that voted against get half the opposite.
- **Votes.** A party leader's vote sets the line for all of the party's seats. Any other MP casts
  their own single seat and may rebel (costs 3 clout, earns 1 trust, makes the news).
- **Deals.** A leader can ask another party for its votes on a bill. The price is a favour, plus
  an optional donation. Computer-run parties say yes or no by a fixed, visible rule (how much they
  dislike the bill, your trust, how many favours you already owe them). Favours can be called in
  on a later bill. Keep your word: +2 trust. Break it: -10 trust, -3 support everywhere, and no
  computer-run party deals with you for 12 months.
- **Decisions.** 44 situations, dealt by who you are (citizen, MP, leader, minister, Premier) and
  what is happening (prices, approval, election season, bills). Odds and effects are shown before
  you choose. Only ministers and the Premier get decisions that nudge national statistics.
- **Parties are open.** Join any party. Human members take the party's seats before its
  computer-run MPs do. After six months in a party, with 45 clout, you can take its leadership;
  the leader of the governing party is Premier.
- **Governments** are now the smallest coalition that has a majority, so a handful of rebels or
  one unhappy partner can defeat a bill.
- **A new world** holds its founding election in month one.

## Three nations (added 2026-11-17)

The world now has three playable nations: **Drennia**, **Westmark** and **Eryndor** (Drennia's two
similar-sized neighbours on the map). Six players each.

- **Equal on purpose.** Each has 151 seats, 7,000,000 voters in 20 districts of the same sizes,
  the same starting statistics and the same laws. They differ in character only: where the
  workers, traders, owners, professionals and families live, and which four parties speak for them.
  A test fails if the nations ever stop being the same size.
- **Six players per nation.** Sign-up shows the places left in each. A full nation is refused with
  the names of the ones that have room. A player not seen for 14 days stops counting. If all three
  are full, a newcomer still gets in, to the least crowded one (switch `NATION_OVERFLOW_WHEN_ALL_FULL`
  off to refuse instead).
- **Your politics happens in your own nation.** Every politics request runs in the nation of the
  player's character; nothing on the screens needs to choose.
- **Elections are staggered.** All three hold a founding election in month one; after that their
  elections fall 16 months apart, so one is always coming somewhere in the world.
- **Nation power.** Three scores out of 100, shown side by side on the new **Nation** screen:
  Economy (prosperity and public finances), Military (the defence law in force) and Influence
  (global standing). All start at 50. There is no war system; military strength is a number
  Parliament can raise by voting for defence spending, at a cost to the budget.
- **Powers of office (decrees).** The Premier and each of the five ministers may issue one decree a
  month without Parliament (4 energy): a nudge to national statistics that lasts 8 months and
  always helps one thing and hurts another. The Premier also appoints the cabinet from players
  in the governing parties.
- **One set of stories, three sets of place names.** Decision cards and news were written with
  Drennia's towns; for the other nations the same text is shown with their own towns.

Files: nation data and caps in `constants/nations.ts`; decrees in `constants/decrees.ts`;
`services/nations.service.ts` (cap, comparison); `services/playerNation.ts` (which nation a
request is about); `database/migrations/0099_starter_nations.sql`; screen `_floor/NationView.tsx`.

**Limits to know about**
- Business is still Drennia-only. A Westmark or Eryndor player who opens the Business desk is in
  Drennia's car market. Giving each nation its own economy is a separate, larger job.
- Nations do not yet act on each other (no treaties, tariffs between them, or war). They are
  compared, not connected.
- The game screens still live under the web address `/drennia/...` for every nation.

## Where the code is

| What | File |
|---|---|
| All tunable numbers | `backend/src/api/constants/floor.ts` |
| The 44 situations (data) | `backend/src/api/constants/situations.ts` |
| Rules, pure and unit-tested | `backend/src/api/services/floor.rules.ts`, `support.rules.ts` |
| Database side | `backend/src/api/services/floor.service.ts`, `support.store.ts` |
| One read model for the screens | `backend/src/api/services/desk.service.ts` (`GET /politics/desk`) |
| Tables | `database/migrations/0098_politics_floor.sql` |
| Tests | `backend/tests/floor.test.ts` (34 tests, in the required CI list) |
| Screens | `frontend/src/app/drennia/politics/page.tsx` and `_floor/` |

Changes to existing code: `politics.service.ts` (election effort includes support; one shared
vote-counting rule; minimal coalitions), `statecraft.service.ts` (polls use the same inputs),
`nationalEconomy.service.ts` (temporary stat nudges), `politics.controller.ts` (open parties,
individual votes, no hidden second currency when tabling a bill), `macroEconomy.ts` (a free press
is no longer tagged as a "bold reform", which made governments table state media first).

## What was removed

29 frontend files (about 8,000 lines): the eleven old screens, the five Capitol tabs, the
seven-step party creation wizard and their helpers. Their backend endpoints still exist and still
tick (factions, interest groups, media, scandals, legacy, tenders, lobbying) but no screen shows
them. They are a backlog to re-surface one at a time, each wired into support, or to delete.

## Honest limits

- This is a strong core loop, not a finished "AAA" game. Balance numbers are modelled and
  unit-tested but have never met real players. Expect to tune `floor.ts` after the first playtest.
- Verified on a fresh local database with two scripted players (see the status note in
  `docs/REVIVAL_PLAN.md`), and once in a real browser at desktop and phone width (join a party,
  decide a card, rally, vote, all four screens, election replay: no errors). Not yet run against
  production data.
- No sound, no animation beyond the election replay, no tutorial. The first-session guidance is
  the Desk's "what needs you" list.
- With ten humans per nation most MPs are still computer-run, so player-to-player deals will be
  rarer than player-to-machine deals until nations fill.
