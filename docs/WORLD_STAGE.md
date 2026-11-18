# The world stage: career ladder, Meridian Wire, multiplayer glue

Written 2026-11-18. Plain English. Builds on `docs/POLITICS_FLOOR.md`.

## Owner decisions this covers

- **8 players per nation** (was 6). `NATION_PLAYER_CAP` in `constants/nations.ts`.
- **One game month = 8 real hours** (was 4), both clocks. Migration `0102_world_stage.sql` moves
  existing worlds (only clocks still on the 4-hour default); `database/seeds/0001` now starts a new
  world at 8 hours (it used to start at 24, which no migration ever reached on a fresh database).
- **A ladder for every politician**, from citizen to world statesman.
- **A neutral international news agency**, the Meridian Wire: a monthly list of the most influential
  politicians in the world with a %, and news written by players, like the newspaper in Supremacy 1914.

## What 8-hour months mean

| | Months | Real time |
|---|---|---|
| A day | 3 | 24 h |
| Drennia's term (48) | first term 48 | 16 days |
| Westmark's term (36) | first term 24 | 8 days first, then 12 |
| Eryndor's term (60) | first term 30 | 10 days first, then 20 |
| A leadership contest | 1 to 2 | 8 to 16 h |

Energy now **carries over**: each month adds 12, unused energy is kept, up to 24
(`AP_BANK_CAP`). Modelled: a player who checks in once a day can use 24 a day; one who checks in
every month, 36. Before, it was 12 against 36. Checking in more often still pays, but a once-a-day
player is no longer punished for having a life.

## The career ladder

Eight rungs (`constants/worldStage.ts` `LADDER`). Each says what it unlocks and how to reach the next.

1. **Citizen**: chat, write for the Wire, take personal deals.
2. **Party member**: rallies, ads, fundraisers; a ballot in leadership contests.
3. **Candidate**: on the ballot in a district.
4. **Member of Parliament**: your own vote on every bill.
5. **Party leader** (of a party with seats): your vote sets your party's line; party deals.
6. **Minister**: decrees and cheaper bills in your portfolio.
7. **Head of government** (Premier / Chancellor / Prime Minister).
8. **World statesman**: in the top 3 of the World Influence Index while holding real power
   (head of government, minister, or leader of a party with seats).

`careerRung` (`services/worldStage.rules.ts`) decides the rung; the Desk's **Career ladder** card
shows it. A **career record** (`pol_careers`) is updated at every edition: highest rung reached,
months as MP / leader / minister / head of government, best world rank, months at #1. It survives
losing office, and shows on the Desk and on every profile in Corridors.

## The Meridian Wire

*Independent. International. Accountable to no government.* The **World Press** tab
(`_floor/WireView.tsx`, `GET /agency/front`, `services/agency.service.ts`).

### The World Influence Index

Every politician who counts in the three nations: all players (citizens only if seen in the last
14 days) and the computer-run leaders of parties with seats. Each gets a score; the **%** is their
share of the whole world's score, so every name adds up to 100%.

score = (office + party seats + personal + record + press) × nation factor

| Part | Points |
|---|---|
| Office | head of government 36, minister 14, party leader 8, MP 5, member 1.5, citizen 0.5 |
| Party seats | leading a party: 30 × its share of all seats; head of government also 20 × the government's share |
| Personal | 0.2 × clout + 0.1 × trust |
| Record (last 12 months) | +2 per law you tabled that passed (max 5), +1 per promise kept (max 5), −3 per promise broken (max 5) |
| Press | +0.25 per endorsement your dispatches earned this month (max 20) |
| Nation factor | 0.75 + 0.5 × nation power / 100 (so 1.0 at power 50; never more than a quarter either way) |

Modelled: a head of government holds 7-15% (depends how many names are ranked), a computer-run
opposition leader about 7%, a player MP 3-5%, a new member 1-2%.

**The Index is read-only.** Nothing in elections, votes or deals reads it. Support is still the one
number that moves voters (AGENTS.md). The Index only describes what already happened.

### The monthly edition

When the politics month turns, after all three nations are processed, the Wire prints an edition
(`publishEdition`, in its own savepoint in `worldTick.service.ts`; a failure never rolls back the
nations). It holds:

- the Index (top 25 shown, everyone stored), with movement against last month (▲ / ▼ / NEW);
- a headline written from who is on top and who climbed;
- up to 4 stories from each capital (from `pol_ledger_events` of that month, most newsworthy first);
- the 5 most endorsed reader dispatches of the month.

Players can read past editions (archive). A **Live now** view shows the Index as it stands this
minute (cached 60 s).

Optional: set `AGENCY_DISCORD_WEBHOOK_URL` and each edition's headline and top 5 are posted to a
Discord channel after the tick commits. Public game news only; never personal data.

### Reader dispatches (news by players)

Anyone with a character can file a **dispatch**: a headline (8-120 characters) and a story
(40-1500). Two per game month, 1 energy each, at least a minute apart. Plain text only; the author's
name is always on it, and the page says the Wire has not checked it (the agency stays neutral).

- **Endorse**: one per reader per dispatch, not your own, only this month's. Every 3 endorsements a
  month = +1 clout for the author (max +3), paid at the edition. Endorsements also count toward the Index.
- **Report**: 3 reports hide a dispatch until an admin looks at it
  (`POST /agency/dispatches/:id/moderate`, admins only). Authors can withdraw their own.

## Multiplayer glue

- **Inbox** (`player_notices`, `services/notices.service.ts`). A note when: someone offers you a deal,
  accepts or declines yours, keeps or breaks their word to you; a party asks your party for its votes
  or calls in a favour; your bill passes or fails; someone challenges you; a contest is decided; you
  reach a new rung; the Wire ranks you; your dispatches earn clout. The header shows **Inbox** with an
  unread count; opening it marks all read and each note jumps to the right tab.
- **Leadership contests.** Challenging a computer-run leader is still decided at once. Challenging a
  **human** leader opens a contest (`pol_leadership_contests`): it needs 45 clout and six months in the
  party, costs 6 energy, the leader is told at once, and every member who belonged when it opened may
  vote (and change their vote). It is counted when next month ends:
  challenger's clout vs leader's clout + 10, each member's ballot +10, an MP's +20, ties to the leader
  (`contestResult`). Loser loses 5 clout. Modelled: with nobody voting, the leader holds unless the
  challenger has 11+ more clout; one member can swing a close contest; two loyal MPs outweigh any clout gap.
- **Party war room.** The Party tab shows each member's work for the party this month (rallies, ads,
  money raised, deals). Party effort is pooled, so members in different time zones keep support up
  together.
- **Handshakes must turn on a vote.** Money-for-money is refused: it was a way for one account to feed
  another up to about $3M a month.

## Where the code is

| What | File |
|---|---|
| All numbers | `backend/src/api/constants/worldStage.ts`; contest numbers in `constants/floor.ts`; energy in `constants/politics.ts` |
| Pure rules (tested) | `backend/src/api/services/worldStage.rules.ts`, `bankedAp` in `floor.rules.ts` |
| Wire, Index, careers | `backend/src/api/services/agency.service.ts`, routes `routes/agency.routes.ts` (`/agency/...`) |
| Contests | `floor.service.ts` (`challengeLeadership`, `voteInContest`, `resolveContests`, `contestView`) |
| Inbox | `services/notices.service.ts`, `POST /politics/notices/read` |
| Tables | `database/migrations/0102_world_stage.sql` |
| Tests | `backend/tests/worldStage.test.ts` (in the required CI list) |
| Screens | `_floor/WireView.tsx`, Career ladder in `DeskView.tsx`, contest and war room in `PartyView.tsx`, Inbox in `page.tsx` |

## Honest limits

- The Index weights are modelled, not played. Expect to tune `constants/worldStage.ts` after real
  players. With few humans, computer-run leaders fill most of the top of the list; a new player starts
  near the bottom and climbs.
- The inbox is in-game only. Players are not emailed or pushed; the optional Discord post is public
  news, not personal alerts.
- Dispatch moderation is reports plus an admin endpoint; there is no admin screen yet.
- Nations still do not act on each other (no treaties or war). The Wire is the first thing all three
  share.
