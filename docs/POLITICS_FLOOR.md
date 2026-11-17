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

## Three nations (added 2026-11-17, revised the same day)

The world has three playable nations, six players each: **Drennia**, **Westmark** and **Eryndor**
(Drennia's neighbours on the map). They are **different countries that start on level terms**:
each is ahead somewhere and behind somewhere else, so nobody starts with the better country.

| | Drennia | Westmark | Eryndor |
|---|---|---|---|
| Government | Federal parliamentary republic | Merchant republic | Constitutional monarchy |
| Head of government | Premier | Chancellor | Prime Minister |
| Head of state | President (ceremonial) | Lord Warden, chosen by the guilds | King Aldric IV |
| Parliament | 151 seats, every 4 years | 101 seats, every 3 years | 131 seats, every 5 years |
| Voters | 7.0 million | 4.9 million | 8.8 million |
| Special rule | none: the baseline | Money talks: fundraisers +50%, donations count 1.5× in deals; parties ally easily | The King returns bills passed by fewer than 5 votes; parties rarely ally (minority governments are common); decrees last 12 months |
| Founding laws | the defaults | free trade, minimal welfare, deregulated press, minimal defence, open borders | high tariffs, tough policing, high defence, closed borders, licensed press, moderate minimum wage |
| Strong at | balanced | wealth, foreign influence, freedoms | order, fairness, public finances, defence |
| Weak at | balanced | cost of living, inequality, defence | wealth, foreign influence, freedoms |
| Power (economy / military / influence) | 50 / 50 / 50 | 52 / 40 / 58 | 50 / 60 / 42 |
| Starting approval | 50% | 49% | 51% |

Tests fail if overall power drifts more than 3 points apart, if any nation's starting approval is
more than 3 from 50, or if a nation stops having both a strength and a weakness.

Other rules:
- **Six players per nation.** Sign-up shows the places left in each. A full nation is refused with
  the names of the ones that have room. A player not seen for 14 days stops counting. If all three
  are full, a newcomer still gets in, to the least crowded one (switch `NATION_OVERFLOW_WHEN_ALL_FULL`
  off to refuse instead).
- **Your politics happens in your own nation.** Every politics request runs in the nation of the
  player's character; nothing on the screens needs to choose.
- **Elections are staggered.** All three hold a founding election in month one; their first full
  terms are 48, 24 and 30 months, then 4, 3 and 5 years, so an election is always coming somewhere.
- **Nation power.** Economy (prosperity and public finances), Military (the defence law in force)
  and Influence (global standing), on the **Nation** screen. There is no war system.
- **Powers of office (decrees).** The head of government and each of the five ministers may issue
  one decree a month without Parliament (4 energy). Each is a trade-off.
- **One set of stories, three sets of names.** Decision cards and news are written with Drennia's
  towns and its "Premier"; other nations see their own towns and their own title.

Files: nation data, rules (`NationRules`) and caps in `constants/nations.ts`; decrees in `constants/decrees.ts`;
`services/nations.service.ts` (cap, comparison); `services/playerNation.ts` (which nation a
request is about); `database/migrations/0099_starter_nations.sql`; screen `_floor/NationView.tsx`.

**Limits to know about**
- Business is still Drennia-only. A Westmark or Eryndor player who opens the Business desk is in
  Drennia's car market. Giving each nation its own economy is a separate, larger job.
- Nations do not yet act on each other (no treaties, tariffs between them, or war). They are
  compared, not connected.
- The game screens still live under the web address `/drennia/...` for every nation.

## Character creation (added 2026-11-17)

Sign-up (`frontend/public/landing/onboarding.html` + `onboarding.js`) is: account, verify (then logged in
automatically), **who you are**, **beliefs**, **nation**, papers. New characters land on the politics Desk.

- **Background** (`constants/characterCreation.ts`): six pasts (union organiser, harbour trader, factory heir,
  senior civil servant, community leader, party fixer). Each sets the four numbers The Floor uses (charisma,
  trust, clout, money) and a **home voter group** whose rallies go 25% further. Every background is worth the
  same 35 points and has a weakness (a test enforces it). Only the party fixer starts able to lead a party.
- **Edge**: 4 tokens on top, each +5 to a stat or +$250k.
- **Beliefs**: four questions on the same axes as party platforms. The page shows the closest party in each
  nation; the Party tab shows "N% your views" on every party.
- **Nation**: the three nations side by side with live data from `GET /world/nations` (leader, parliament,
  approval, power, places left, parties, how it works).
- The server recomputes every number from the ids sent (`character.rules.ts` `startingProfile`). The old
  slider `attributes` field is ignored: it let a client ask for unlimited money.
- The Desk's **Road to power** card shows the five steps (join a party, hold a seat, lead your party, enter
  government, head of government) and the one thing that gets you to the next.

## Corridors: the multiplayer layer (added 2026-11-17)

The **Corridors** tab (`_floor/CorridorsView.tsx`, `GET /politics/corridors`, `corridors.service.ts`) is where
players deal with each other.

- **Who's who:** every player in your nation (role, party, seat, trust, clout, when last seen) and their
  **word record**: deals kept and broken. Computer-run party leaders are listed too. Click a name for their
  recent votes and broken promises, then **Message** or **Propose a deal**.
- **Rooms:** Nation (all citizens of your nation), Party room (members only), and private messages. They use
  the chat API: the server turns `nation` / `party` into the right room from who you are, and refuses any
  other channel name, so nobody can read a room by guessing its name.
- **Handshakes** (`pol_handshakes`, migration 0101): a personal deal between any two politicians of the same
  nation. Each side can promise a vote on a bill and/or pay up to $250k of their own money. Money moves on the
  handshake; vote promises are judged when the bill is counted (`settleHandshakes` in `floor.service.ts`, using
  the same vote plan as the tally; rules `countedVoteOf` / `judgePromise` in `floor.rules.ts`). Broken: −10
  trust, −3 clout and a news story. Kept: +1 trust, at most once a month. Offering costs 1 energy; 5 open
  offers at most. Numbers in `constants/floor.ts`.
- The Desk shows a card when someone has offered you a deal, and counts it in the Desk badge.

## The political map (added 2026-11-17)

The **Map** tab (`_floor/MapView.tsx`, `GET /politics/map`, `map.service.ts`) draws the three nations on one
continent with all 60 districts.

- **Layers:** Countries (each nation in its own colour with region shading; the default), Strongholds (who won the most seats at the last election; deeper colour = tighter grip), Poll
  today (who would win each district now, from `projectElection`'s new per-district output, the same inputs as
  the real election), Voters (largest voter group), and One party (that party's strength everywhere).
- **Click a district:** last vote and poll now per party, seats, who lives there, and which players sit there.
  Without a selection the side panel lists the nation's parties with seats now → in today's poll, a plain-words
  ideology (`ideologyOf`), leader and whether they govern. Player MPs appear as pins with their initials.
- **Geography is generated** (`_floor/mapGeo.ts`), identical for everyone: hand-placed region centres
  (`REGION_LAYOUT`), a seeded natural coastline, and each district as the land closest to its point (Voronoi).
  Borders between nations and regions come from which neighbour each cell edge faces. A new region needs an
  entry in `REGION_LAYOUT`. Sea inlets in `COAST_CONTROL` separate the nations so each has its own shape;
  every country has a coloured edge band (`nationOutlines`) and a dashed international border, and when one
  nation is in focus the others are dimmed.
- The map data is cached for 30 seconds on the server.

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
