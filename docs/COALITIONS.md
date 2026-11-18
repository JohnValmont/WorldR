# Coalitions: talks, deals and unity

Written 2026-11-18. Plain English. Owner decisions, the same day:
- **Open race.** Any party with seats may try to build a government, so smaller parties can band together against the largest.
- **Realism.** The more parties in a government and the further apart their views, the weaker it is. A weak coalition loses votes on big decisions because its partners vote their own way.
- **What can be traded:** ministries, promises to pass laws, and even the head-of-government job.
- **Deals are kept or broken over the whole term.** A partner can walk out.
- **Step 2 (not yet built):** MPs switching party for money or after a scandal, so the largest party can change between elections.

All numbers are in `backend/src/api/constants/coalition.ts`. The rules are pure functions in
`backend/src/api/services/coalition.rules.ts`, with tests in `backend/tests/coalition.test.ts`. Database work is in
`backend/src/api/services/coalition.service.ts`. The screen is **Nation → Coalition**.

## Before (what the game did until now)

Only the largest party could try. A computer-run leader invited the closest party by ideology, in the
same month as the vote, and nobody bargained. Ministries were shared by a formula in a fixed order, so the
largest party always took Finance, Industry and Welfare, and partners always got Interior and Defence.
The coalition deal rows existed but were always saved empty.

## Who can offer

| When | Who | What they can offer |
|---|---|---|
| Talks (the 2 months after an election) | **The leader of any party with seats.** Computer-run parties follow the rule below. | Join *my* government |
| While governing | **Only the head of government's party** (for example, to rebuild a majority after a partner walks out) | Join the government |

An offer goes to one party and names its price:
- **Ministries:** any of the five posts (each post can only be promised once).
- **Law promises:** up to 3. "This law will be in force within N months" (3 to 12).
- **Head of government:** "your leader becomes Premier / Chancellor / Prime Minister" (at most one partner).

A party can accept only one would-be government at a time. A computer-run party that is building its own
government does not accept other offers in the same round.

## How talks run

The election is counted at the end of the polling month. Talks then run for **two rounds** (two game months, 16 real hours).

1. **Round 1 starts at the count.** Computer-run parties make their offers (see below). Human leaders can make offers, answer them, or withdraw them at any time.
2. **At each month end,** every computer-run party that received offers takes the best one, if it is worth taking (score below). A human answers whenever they like. An offer still unanswered when talks end counts as a no.
3. **The moment a bloc reaches a majority, it governs.** A human acceptance can do this immediately.
4. **Still no majority after round 2?** The bloc with the most seats (its leader plus everyone who accepted) governs as a minority.

### Will a computer-run party accept? (one visible score; it says yes at 0 or above)

    score = ideology + ministries + promises + head of government + being in government − crowding

| Part | Rule | Number |
|---|---|---|
| Ideology | `IDEOLOGY_WEIGHT × (1 − distance ÷ the nation's coalition limit)` | weight 0.6. Positive while closer than the limit (Drennia 0.5, Westmark 0.6, Eryndor 0.42), negative beyond it |
| Ministries | value of the posts offered − their **fair share** (seats share of 5 posts across the planned bloc, D'Hondt) × average post value | Finance 0.20, Industry 0.16, Welfare 0.16, Interior 0.12, Defence 0.12 |
| Promises | `0.6 ×` how much the party likes each promised law (a law it dislikes counts against) | total between −0.4 and +0.4 (a law is never worth as much as the top job) |
| Head of government | flat | +0.5 |
| Being in government | flat | +0.10 |
| Crowding | per party in the planned bloc beyond 2 | −0.08 |
| Broken word | the offering party broke its word recently (a pact), **or broke a coalition promise to this party in the last 5 years** | −0.5 |

The same score is shown to a human before they send an offer, with a reason ("Close: offer a better
ministry or a law they want"). If the party is building its own government, or has already said yes to
someone else, the forecast says it will not answer this round.

### How a computer-run party builds a government

- **The largest party always tries.** It adds partners, closest first, until it has a majority, then drops any partner it does not need. For each partner it starts at the partner's fair share of the least valuable posts. If that partner's score is below 0, it upgrades a post, then adds the law that partner most wants (one the leader can live with), then adds another post. If the score is still below 0, it skips that party and tries the next one.
- **A rival bloc (smaller parties ganging up on the largest)** is tried by the other computer-run parties, largest first. It goes ahead only if it reaches a majority without the largest party, every partner's score is 0 or above, **and its starting unity is at least 45**. Parties too far apart to agree don't try.
- **Outbidding.** When a rival bloc courts the same partner, the largest party raises its offer to beat the rival's score by 0.02, using the same steps. Without this, the first live test had the largest party lowball its natural partner and lose it to a left-right rival deal.
- A computer-run party offers the head-of-government job only to a partner with more seats than itself.
- A computer-run government brings a promised law to a vote **once**. It tries again only if the count says the law would now pass. In the first live test it re-tabled a doomed bill six months running.

## Unity: how tightly the coalition holds (0 to 100)

Stored on the coalition deal (`pol_coalition_agreements.health`). Every government of two or more parties has
one, including a minority government that has partners. A one-party government has no unity number and
whips at normal strength.

**Starting unity**

    80 − 12 × (parties beyond 2) − 40 × (widest distance between any two members) + seats over the majority (at most +10), or −10 for a minority

**Each month**

| Event | Change |
|---|---|
| A promised law comes into force by its deadline | +8 |
| A deadline passes with the law not in force | −15 (−7 if the government brought the law to a vote and it was defeated) |
| A government bill passes although a partner voted against it | −3 for each such partner |
| A government bill is defeated | −4 |
| A new scandal in a governing party | −5 |
| A quiet month (none of the above) | +1, up to the starting unity |

**What unity does**
- **Votes:** the government whip (the push that makes partners back government bills) is scaled by `unity ÷ 70`, kept between 0.3 and 1.25. At 70 it is as strong as before this change. At 35 it is half as strong, so a partner that dislikes a bill votes against it. This goes through `partyVoteScore`, so the tally, the on-screen whip count and pact forecasts all agree. There is still only one way votes are counted.
- **Walkout:** at a month end with unity below 20, one computer-run partner leaves: the one with the most broken promises to it, otherwise the one furthest from the leader in ideology. A human partner can walk out at any time. The leaving party's ministries go back to the head of government's party. Unity is then recalculated for whoever is left, and the government becomes a minority if it has dropped below a majority.

### Worked examples (party positions as seeded)

| Nation | Bloc | Distance | Starting unity |
|---|---|---|---|
| Drennia | Civic Stability (45) + National Progress (34) = 79 | 0.48 | 80 − 19 + 3 = **64** |
| Drennia | Labour (43) + National Progress (34) = 77, a left-right deal against the largest party | 0.84 | 80 − 34 + 1 = **47** (just clears 45, but National Progress's score is −0.41 before sweeteners, so it rarely happens) |
| Eryndor | Homestead (38) + Highland Ind. (27) = 65 | 0.34 | 80 − 14 − 10 (minority) = **56** |
| Eryndor | Homestead (38) + Enterprise (29) = 67 | 0.54 | 80 − 22 + 1 = **59**. Enterprise's score is −0.17 on ideology; Finance + Industry and one law it wants bring it to about +0.2, so it says yes |
| Eryndor | Miners (37) + Highland (27) + Enterprise (29) = 93, against the largest party | 0.84 | 80 − 12 − 34 + 10 = **44**, below 45, so they don't try |

## The cabinet honours the deal

Posts promised in accepted offers go to those partners. Every other post goes to the head of government's
party. Governments formed without offers (a one-party majority) keep the old seat-share formula.

## Laws promised

The computer-run head of government's party puts a promised law before Parliament first, ignoring its usual
waiting period. A human leader sees a reminder on the Desk. Each promise is checked at every month end.

## What the first live run produced (fresh world, 2026-11-18)

| Nation | Talks | Government |
|---|---|---|
| Drennia | Labour bid Finance and a free-trade law for National Progress; Civic Stability matched it with Finance | Civic Stability + National Progress, 79 seats, unity 64 |
| Westmark | Three parties bid for Guildhall Union; the winning offer cost Harbour Workers Finance, Industry, Interior and an interest-rate law | Harbour Workers + Guildhall, 59, unity 65. The promise was kept: 68 |
| Eryndor | Homestead bought Enterprise with Finance and an income-tax law | Homestead + Enterprise, 67, unity 59. The tax law could not clear the King's 5-vote margin, the promise was broken, unity fell to 23. At the next election Enterprise refused Homestead ("you broke your word") and Homestead governed with the Miners instead |

## Not built yet (step 2)

- **MPs switching party** for money or after a scandal, which would change seat counts between elections. This needs its own rules for who owns a seat, and it touches every vote count, so it is a separate job.
- **A vote of no confidence** to bring down a government mid-term. Today a government that loses its majority carries on as a minority and courts new partners.
- Talks are open: every offer and its terms are visible to everyone in the nation.
