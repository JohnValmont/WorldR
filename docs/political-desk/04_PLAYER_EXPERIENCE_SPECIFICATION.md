# 04_PLAYER_EXPERIENCE_SPECIFICATION.md

# Part 1 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This document describes the complete player experience for the Political Desk.

Unlike `02_GAME_VISION.md`, which explains **why** the Political Desk exists, this document explains **how players actually experience it**.

Every screen, action, decision, and gameplay loop described here should be implemented consistently across the project.

If there is ever uncertainty about how gameplay should feel, this document takes precedence over implementation assumptions.

---

# 2. Experience Philosophy

The Political Desk is designed around **strategic leadership**, not mechanical repetition.

Players should spend most of their time:

* Observing.
* Planning.
* Negotiating.
* Responding.
* Leading.

Players should spend very little time:

* Repeating identical clicks.
* Filling forms.
* Managing unnecessary administration.
* Waiting for timers.

Every interaction should contribute toward meaningful political decisions.

---

# 3. Core Gameplay Loop

The Political Desk follows one continuous strategic loop.

```text
Observe
    ↓
Understand
    ↓
Plan
    ↓
Act
    ↓
Simulation Responds
    ↓
Evaluate
    ↓
Repeat
```

The player is never trying to "finish" the game.

Instead, they continually adapt to an evolving political landscape.

---

# 4. The Player Journey

A player's political career progresses through distinct stages.

```text
Create Account
        ↓
Create Character
        ↓
Browse Countries
        ↓
Choose Country
        ↓
Create Political Party
        ↓
Build Public Support
        ↓
Contest Elections
        ↓
Enter Parliament
        ↓
Join Government
        ↓
Lead Government
        ↓
Leave Political Legacy
```

Every stage unlocks additional responsibilities rather than replacing previous ones.

---

# 5. First Login Experience

## Player Goal

Understand what WORLDr is and begin a political career.

---

### Player Sees

A clean welcome screen introducing the Political Desk.

Primary actions:

* Start Political Career
* Continue Existing Career (if applicable)
* View World Overview
* Settings

The interface should immediately communicate that the player is entering a persistent multiplayer world.

---

# 6. Character Creation

## Player Goal

Create a political identity.

---

### Player Enters

* First Name
* Middle Name (optional)
* Last Name
* Gender
* Date of Birth (18+ minimum in game rules)

Future cosmetic customization is intentionally excluded from Pre-Alpha.

---

### System Generates

* Character ID
* Political biography placeholder
* Career history
* Reputation profile
* Initial statistics

The player begins as an unknown citizen.

No political influence exists yet.

---

# 7. World Overview

Before choosing a country, the player enters the World Overview.

This screen represents the living world.

Its purpose is to show that politics is already happening everywhere.

---

## Player Goal

Decide where to begin a political career.

---

### Information Displayed

For every playable country:

* Country name
* National flag
* Government type
* Current Head of Government
* Current ruling party
* Number of human-controlled parties
* Total active human players
* Parliamentary seats
* Months until next election
* Government approval
* Political stability
* New Player Recommendation
* Population (future integration)
* Economy summary (future integration)

---

### Player Decisions

Which country offers:

* Strong competition?
* New opportunities?
* Stable government?
* Chaotic politics?
* Beginner-friendly experience?

Country selection should feel like choosing a political environment rather than choosing a server.

---

# 8. Country Selection

## Player Goal

Commit to a political career within one nation.

---

### Rules

A character belongs to exactly one country.

Changing countries is not allowed without future migration mechanics.

Political careers are national.

Reputation does not transfer.

---

### Confirmation Screen

The player confirms:

"I understand that my political career will begin in this country."

This reinforces that the decision matters.

---

# 9. Starting Conditions

Every new politician begins equally.

The player starts with:

* No parliamentary seat.
* No government position.
* No party.
* No political influence.
* No cabinet authority.
* No legislative power.

The player possesses only one advantage:

The ability to build a political movement.

This ensures long-term progression feels earned.

---

# 10. Political Career Begins

After country selection, the player officially enters the Political Desk.

The Dashboard is intentionally **not** shown first.

Instead, the player is welcomed with a single clear objective:

> **Create your first political party.**

No other gameplay systems are accessible until a party exists.

This prevents new players from becoming overwhelmed and establishes the political party as the foundation of every career.

Once the party is created, the full Political Desk experience becomes available.

---

# 11. Player Mindset at This Stage

By the end of Part 1, the player should understand:

* I am entering a living political world.
* My country already has its own history.
* I am beginning as an ordinary citizen.
* I must build my own political movement.
* Every future success depends on decisions I make from this point onward.

The game should create curiosity, not confusion.

Players should feel that they are stepping into an ongoing national story—not starting a disconnected game session.

---

**End of Part 1**

# 04_PLAYER_EXPERIENCE_SPECIFICATION.md

# Part 2 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 12. Founding a Political Party

After selecting a country, the player enters the **Party Founding Experience**.

This is the first meaningful decision of every political career.

A political party is more than a name—it is the player's permanent political identity within that country.

Each character may found **exactly one** political party.

Each political party has **exactly one human leader**.

Additional party activity is performed by AI-controlled members and officials.

This rule keeps party ownership clear and avoids internal multiplayer conflicts during Pre-Alpha.

---

# 13. Player Goal

At this stage, the player's objective is:

> **Create a political movement capable of competing for power.**

The player is defining how they wish to be seen by voters, the media, and other parties.

This decision should feel permanent and meaningful.

---

# 14. Party Creation Wizard

Party creation is divided into several focused steps instead of one large form.

---

## Step 1 — Party Identity

The player enters:

* Party Name
* Party Abbreviation
* Party Motto (optional)
* Short Description

Validation includes:

* Unique party name within the country.
* Appropriate length limits.
* Reserved words blocked.
* Profanity filtering.

---

## Step 2 — Visual Identity

The player selects:

* Party Logo
* Primary Color
* Secondary Color

These choices are used consistently throughout:

* Parliament
* Election results
* News articles
* Dashboard
* Maps (future)
* Charts
* Notifications

Visual consistency helps players instantly recognize parties.

---

## Step 3 — Political Ideology

The player selects the party's initial ideological position.

For Pre-Alpha, ideology should be represented using a small number of understandable dimensions rather than dozens of sliders.

Example dimensions:

* Economic Policy
* Social Policy
* Government Size
* Environmental Priority

These values influence:

* AI voter attraction
* Party positioning
* Coalition compatibility
* Media narratives

Ideology should shape strategy rather than determine success.

---

## Step 4 — Party Confirmation

The player reviews:

* Party Name
* Logo
* Colors
* Ideology
* Description

Confirmation message:

> "You are founding a permanent political movement in this country. While some details may be adjusted later, your party's history begins today."

The creation timestamp becomes the first entry in the party's historical record.

---

# 15. AI Party Organization

Immediately after creation, the simulation generates the party structure.

The player does not recruit these individuals manually.

The system creates:

* General Secretary
* Communications Director
* Campaign Director
* Policy Director
* Local Organizers
* Volunteers
* Ordinary Members

These characters are AI-controlled.

They provide continuity and support future mechanics without requiring additional human players.

---

# 16. Welcome to the Political Desk

After party creation, the player officially enters the main Political Desk.

A short welcome panel summarizes:

* Party created successfully.
* Current political standing.
* Upcoming election countdown.
* Initial popularity.
* Current government.
* Number of competing parties.
* Suggested first objectives.

This is the player's orientation, not a tutorial.

---

# 17. First-Time Dashboard

The Dashboard becomes the player's political headquarters.

Its purpose is to answer one question:

> **"What should I do next?"**

The first-time Dashboard highlights:

* Create your first public statement.
* Review the political landscape.
* Learn about rival parties.
* Prepare for the next election.
* Understand current national issues.

These recommendations disappear as the player gains experience.

---

# 18. First Political Decisions

The player is now free to make strategic choices.

Typical early decisions include:

* Publish a public statement.
* Define campaign priorities.
* Review rival parties.
* Examine government popularity.
* Read recent political news.
* Monitor opinion polls.
* Plan long-term strategy.

There is intentionally no single correct opening move.

Different political styles should remain viable.

---

# 19. Early Progression

During the first few in-game months, the player's goals shift from creation to recognition.

Success is measured by increasing:

* Party awareness.
* Public trust.
* Media visibility.
* Voter support.
* Political influence.

The player is not expected to win immediately.

Building credibility is part of the intended experience.

---

# 20. Player Intent at This Stage

By the end of the first session, the player should feel:

* "This is my political movement."
* "I understand who my competitors are."
* "The country already has its own political history."
* "The next election gives me a clear objective."
* "My decisions from today will shape my future."

The player should leave with unfinished goals rather than completed content.

Curiosity should drive the next login.

---

# 21. Daily Motivation Begins

From this point onward, every login should present new political developments.

Examples include:

* Fresh headlines.
* Approval rating changes.
* Opposition statements.
* Government announcements.
* Coalition rumours.
* Poll updates.
* Legislative activity.

The player should never feel that they are returning to a static world.

Instead, they should feel they are re-entering an evolving political landscape that continued while they were away.

---

# End of Part 2

# 04_PLAYER_EXPERIENCE_SPECIFICATION.md

# Part 3 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 22. Daily Gameplay Philosophy

The Political Desk is designed around short but meaningful sessions.

Players should never feel obligated to remain online for hours to stay competitive.

Instead, they return because the political landscape has changed.

A typical session should last between **10 and 30 minutes**, though players may remain longer if they wish.

The focus is on making strategic decisions rather than continuously performing actions.

---

# 23. Login Experience

## Player Goal

Quickly understand the current political situation.

Immediately after logging in, the Dashboard summarizes everything that changed while the player was offline.

---

### Dashboard Summary

The player sees:

* Current date
* Government status
* Party popularity
* Government approval
* Coalition status
* Parliament status
* Election countdown
* Breaking news
* Pending actions
* Notifications

Nothing should require hunting through multiple menus.

---

# 24. Session Flow

Every gameplay session follows the same rhythm.

```text
Login
    ↓
Review Dashboard
    ↓
Read News
    ↓
Review Notifications
    ↓
Choose Priorities
    ↓
Take Political Actions
    ↓
Observe Immediate Results
    ↓
Plan Next Session
    ↓
Logout
```

This loop should remain consistent throughout the player's career.

---

# 25. Information Before Action

The player should always understand the situation before making decisions.

Information sources include:

* National headlines
* Party reports
* Opinion polls
* Parliamentary agenda
* Government reports
* Coalition messages
* Public opinion trends

Good decisions require good information.

---

# 26. Political Actions

Every action should represent a deliberate political decision.

Actions should consume political opportunity rather than player time.

Examples include:

### Public Communication

* Publish Statement
* Respond to News
* Hold Press Conference
* Address Citizens

---

### Party Management

* Update Party Platform
* Assign Campaign Focus
* Review Party Performance

---

### Coalition

* Open Negotiations
* Accept Proposal
* Reject Proposal

---

### Government

* Appoint Minister
* Replace Minister
* Submit Bill
* Review Ministry Reports

---

### Parliament

* Vote
* Debate
* Support Bill
* Oppose Bill

---

# 27. Action Design Principles

Every political action must satisfy five rules.

### Purpose

The player understands why they are taking the action.

---

### Cost

Every action consumes something.

Examples:

* Political capital
* Time
* Public trust
* Coalition support
* Reputation

No powerful action should be completely free.

---

### Risk

Actions should involve uncertainty.

Politics is never guaranteed.

---

### Consequence

The world reacts.

Media.

Opposition.

Citizens.

Government.

History.

---

### Recovery

Poor decisions should create new challenges rather than ending the game.

---

# 28. The Action Queue

Players should not need to remain online while every activity resolves.

Some actions resolve immediately.

Others enter an action queue processed by the simulation.

Examples:

Immediate

* Publish Statement
* Vote
* Accept Coalition Offer

Delayed

* Campaign Tour
* Policy Review
* Committee Investigation
* Media Interview

The player issues instructions.

The simulation executes them.

---

# 29. Notifications

Notifications are the player's political inbox.

Every notification should either:

* Inform
* Warn
* Request a decision

Notifications should never exist simply to create activity.

---

## Examples

Critical

* Confidence vote scheduled.
* Coalition partner withdrew support.
* Election begins tomorrow.

Important

* Poll numbers updated.
* Bill awaiting your vote.
* Media criticism increasing.

Informational

* Monthly approval report available.
* Party anniversary.
* Historical milestone recorded.

---

# 30. Campaign Gameplay

Campaigning is not a single button.

It is an ongoing strategic process.

The player decides:

* Which issues to emphasize.
* Which voter groups to target.
* Whether to criticize opponents or promote policies.
* Where to focus campaign effort.

Campaigns should gradually influence public opinion rather than producing instant popularity.

---

# 31. Time Management

Because one in-game month equals eight real-world hours, timing becomes a strategic resource.

Examples:

* A statement released just before a debate may receive greater attention.
* A controversial bill introduced during an election campaign may carry greater political risk.
* Delaying action may allow opponents to shape the narrative.

Choosing **when** to act is often as important as choosing **what** to do.

---

# 32. Daily Motivation

Players should have meaningful reasons to return multiple times per day.

Examples include:

* Parliament begins voting.
* Coalition negotiations progress.
* Polls are updated.
* New headlines are published.
* Bills require action.
* Election phases advance.
* Approval ratings change.
* Opponents release new statements.

The motivation comes from an evolving political world—not from daily reward streaks.

---

# 33. End of Session

Before logging out, the player should naturally ask:

* What is my biggest political risk?
* What should I watch tomorrow?
* Which bill is approaching?
* How is the next election developing?
* Is my coalition still stable?

The best sessions end with anticipation rather than completion.

The player leaves because they have made today's decisions, not because there is nothing left to do.

---

# 34. Player Experience Goals

By the end of this stage, the player should feel:

* Informed.
* Responsible.
* Strategically challenged.
* Curious about future developments.

The game should reward thoughtful planning over constant activity.

---

# End of Part 3

# 04_PLAYER_EXPERIENCE_SPECIFICATION.md

# Part 4 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 35. Election Gameplay

Elections are the central recurring event of the Political Desk.

Everything the player does between elections should influence the next election.

An election is not a single screen.

It is the culmination of months of political decisions.

---

# 36. Election Phases

Every election progresses through defined phases.

```text
Election Announced
        ↓
Candidate Registration
        ↓
Campaign Period
        ↓
Public Debates
        ↓
Final Campaign
        ↓
Voting
        ↓
Counting
        ↓
Official Results
        ↓
Government Formation
```

Each phase unlocks different gameplay opportunities.

---

# 37. Player Goal During Elections

The player's objective depends upon their current position.

### Governing Party

* Defend achievements.
* Retain public trust.
* Maintain coalition unity.
* Avoid political mistakes.

---

### Opposition

* Challenge government performance.
* Present an alternative vision.
* Increase voter support.
* Position for coalition negotiations.

---

### New Party

* Build recognition.
* Win first seats.
* Establish credibility.

Winning the election is not the only success condition.

Progress should always feel meaningful.

---

# 38. Campaign Decisions

Campaign gameplay should consist of choosing priorities rather than repeating actions.

Examples include:

### Policy Focus

Which issues receive attention?

* Economy (future integration)
* Education
* Healthcare
* Infrastructure
* Environment

---

### Target Audience

Who should the campaign focus on?

* Young voters
* Rural communities
* Urban citizens
* Business interests
* Working families

---

### Campaign Style

Examples:

* Positive campaign
* Reform campaign
* Opposition campaign
* Unity campaign

Different strategies should produce different political outcomes.

---

# 39. Election Results

When voting concludes, the simulation calculates:

* Vote share
* Parliamentary seats
* Majority threshold
* Coalition possibilities

The results screen should feel like a national political event.

Players should immediately understand:

* Who won.
* Who lost.
* Which coalitions are possible.
* Whether a majority exists.

---

# 40. Government Formation

Winning the election does not automatically create a government.

Government formation is its own strategic phase.

Possible outcomes include:

* Majority government.
* Minority government.
* Coalition government.
* Opposition government after failed negotiations.

Coalition-building should become one of the most important strategic experiences in the game.

---

# 41. Coalition Negotiations

When no party holds a majority, negotiations begin.

Players may:

* Invite coalition partners.
* Reject offers.
* Accept offers.
* Negotiate cabinet positions.
* Negotiate legislative priorities.

Negotiations should feel uncertain.

The strongest party is not guaranteed to form the government.

---

# 42. Becoming Head of Government

Once a government is successfully formed, the player enters a new stage of gameplay.

The Dashboard changes to reflect new responsibilities.

Additional information becomes available:

* Cabinet overview.
* Ministry performance.
* Government approval.
* Legislative agenda.
* Coalition stability.
* National priorities.

Leadership expands rather than replaces earlier gameplay.

---

# 43. Cabinet Gameplay

The Cabinet is the executive leadership team.

For Pre-Alpha, cabinet management focuses on strategic appointments rather than detailed administration.

The player may:

* Appoint ministers.
* Replace ministers.
* Review ministry performance.
* Monitor cabinet stability.

AI ministers execute routine work between player sessions.

---

# 44. Parliament Gameplay

Parliament is where political authority becomes law.

Every legislative proposal follows a consistent process.

```text
Draft Bill
      ↓
Submit Bill
      ↓
Parliament Schedule
      ↓
Debate
      ↓
Vote
      ↓
Result
      ↓
Implementation
```

The player should understand exactly where every bill is within this process.

---

# 45. Parliamentary Decisions

Examples include:

* Vote in favor.
* Vote against.
* Abstain.
* Withdraw bill.
* Amend bill (future expansion).

Every vote contributes to the country's permanent political history.

---

# 46. Confidence & No-Confidence

Governments should never feel permanently secure.

Confidence mechanisms create ongoing political tension.

Possible outcomes:

* Government survives.
* Government weakened.
* Coalition renegotiation.
* Government collapse.
* Early election.

Political instability should create new gameplay rather than ending it.

---

# 47. Authority-Based Gameplay

Political actions depend on office.

Examples:

### Party Leader

Can:

* Campaign.
* Publish statements.
* Build coalitions.

Cannot:

* Appoint ministers.
* Submit government legislation.

---

### Head of Government

Can additionally:

* Form cabinet.
* Introduce government bills.
* Set government priorities.
* Replace ministers.

The interface should reveal only actions appropriate to the player's current authority.

---

# 48. Political Consequences

Every major political decision should trigger reactions.

Examples:

Government Action

↓

Media Coverage

↓

Public Opinion

↓

Opposition Response

↓

Parliament

↓

Future Elections

The player experiences politics as a chain of interconnected consequences rather than isolated events.

---

# 49. Player Experience Goals

After completing an election cycle, the player should feel:

* Victory carries responsibility.
* Defeat creates new opportunities.
* Parliament matters.
* Coalitions matter.
* Every election reshapes the country's political future.

The political cycle should naturally encourage the player to prepare for the next one.

---

# End of Part 4


# 04_PLAYER_EXPERIENCE_SPECIFICATION.md

# Part 5 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 50. Governing Philosophy

Winning power is temporary.

Leading successfully is the true challenge.

Once a player enters government, every decision becomes a balance between:

* Delivering promises.
* Maintaining public support.
* Preserving coalition stability.
* Passing legislation.
* Preparing for the next election.

Government is a continuous leadership experience rather than a collection of administrative tasks.

---

# 51. Life Inside Government

The player's priorities change significantly after taking office.

Instead of asking:

> "How do I win?"

The player now asks:

* Which problems should I solve first?
* Which promises should I keep?
* Which bills should I prioritize?
* Can my coalition survive?
* How will the media react?
* Can I still win the next election?

The game shifts from competition to governance.

---

# 52. Daily Government Gameplay

Every login should begin with a Government Briefing.

The briefing summarizes:

* Overnight political events.
* Coalition status.
* Ministry performance.
* Bills awaiting action.
* National approval.
* Breaking news.
* Parliamentary schedule.
* Urgent decisions.

The player should immediately know what requires attention.

---

# 53. Government Priorities

Each government maintains a small list of active priorities.

Examples:

* Improve education.
* Expand infrastructure.
* Reduce unemployment (future integration).
* Strengthen healthcare.
* Environmental reform.

Priorities influence:

* Media coverage.
* Public expectations.
* Government approval.
* Election narratives.

Changing priorities too frequently should reduce public trust.

---

# 54. Ministry Management

The player does not micromanage ministries.

Instead, ministries provide reports and request decisions.

Example report:

Ministry of Education

Status:
On Track

Issues:
Teacher shortage increasing.

Recommendation:
Approve recruitment programme.

Player choices:

* Approve.
* Delay.
* Reject.
* Request further review.

The ministry then continues implementing the chosen direction.

---

# 55. Legislative Agenda

The government should always have multiple legislative options.

Examples:

* Introduce a new bill.
* Delay legislation.
* Withdraw proposal.
* Prioritize emergency legislation.

Only a limited number of major bills should be active simultaneously.

This forces strategic prioritization.

---

# 56. Media Gameplay

The media is not an enemy or an ally.

It is an institution that observes political events.

Media reacts to:

* Government actions.
* Opposition statements.
* Parliamentary debates.
* Election campaigns.
* Public controversies.
* Leadership changes.

News should emerge from gameplay rather than scripted events.

---

# 57. Public Opinion

Citizens constantly evaluate political leadership.

Approval is influenced by many interconnected factors.

Examples:

* Government stability.
* Legislative success.
* Campaign promises.
* Leadership consistency.
* National events.
* Media narratives.
* Coalition disputes.

Approval should change gradually rather than swinging wildly after every action.

---

# 58. Political Reputation

Every leader develops a long-term political reputation.

Examples:

* Reformer.
* Consensus Builder.
* Coalition Specialist.
* Skilled Campaigner.
* Strong Legislator.
* Crisis Leader (future expansion).

Reputation should emerge naturally from repeated decisions rather than being selected manually.

It influences how AI parties, media, and citizens perceive future actions.

---

# 59. Political Legacy

Every political career automatically records significant milestones.

Examples include:

* Party founded.
* First parliamentary seat.
* First cabinet appointment.
* First election victory.
* Longest period in government.
* Coalition formed.
* Major legislation passed.
* Vote of no confidence survived.
* Government defeated.
* Retirement (future).

The player's legacy becomes part of the country's permanent history.

Future players entering the country should be able to see that history.

---

# 60. Losing Power

Leaving government is not failure.

After an election defeat or successful no-confidence vote, the player returns to opposition.

The party retains:

* Membership.
* Reputation.
* Historical record.
* Parliamentary seats (if any).
* Organizational structure.

The objective changes from governing to rebuilding.

Political careers should contain multiple periods in government and opposition.

---

# 61. Long-Term Motivation

The Political Desk should provide goals that span months or years of real time.

Examples:

* Build the country's largest political party.
* Become the longest-serving Prime Minister.
* Win consecutive elections.
* Pass landmark legislation.
* Maintain the highest recorded approval rating.
* Build the strongest coalition in national history.

These ambitions create enduring reasons to remain engaged.

---

# 62. Session Satisfaction

A successful gameplay session does not require winning.

A session is successful if the player:

* Solved an important political problem.
* Made meaningful decisions.
* Learned new political information.
* Advanced long-term objectives.
* Created new opportunities for future sessions.

The game rewards strategic progress rather than constant victories.

---

# 63. Emotional Experience

The Political Desk should consistently create:

* Anticipation before elections.
* Pressure during government.
* Satisfaction after successful legislation.
* Uncertainty during coalition negotiations.
* Pride after political achievements.
* Curiosity when returning after time away.

Emotional engagement should emerge from the simulation rather than scripted storytelling.

---

# End of Part 5

# 04_PLAYER_EXPERIENCE_SPECIFICATION.md

# Part 6 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 64. Long-Term Progression

Progression in the Political Desk is measured by influence, leadership, and historical impact.

There are no character levels.

There is no experience point system.

Players progress by building a political career.

Examples of progression include:

* Growing a political party.
* Winning elections.
* Governing successfully.
* Passing important legislation.
* Building lasting coalitions.
* Establishing a respected political reputation.
* Leaving a lasting national legacy.

Progression should feel earned through decisions rather than accumulated through repetitive activity.

---

# 65. Mastery

New players learn the interface.

Experienced players learn strategy.

Mastery comes from understanding:

* Electoral timing.
* Coalition negotiation.
* Parliamentary arithmetic.
* Public opinion.
* Political messaging.
* Long-term planning.
* Institutional relationships.

The skill ceiling should remain high while the basic interface remains approachable.

---

# 66. Failure

Failure should create new stories.

Examples:

* Losing an election.
* Coalition collapse.
* Defeat in Parliament.
* Public approval decline.
* Minister resignation.
* Leadership challenge (future expansion).

None of these should end a political career.

Instead, they create new objectives.

Players recover through better leadership rather than restarting.

---

# 67. Political Identity

Over time, every player develops a recognizable political identity.

Examples:

* Coalition builder.
* Reform advocate.
* Opposition strategist.
* Skilled legislator.
* Electoral campaign expert.
* Stable administrator.

Identity should emerge naturally from repeated choices.

The game should never force a predefined role.

---

# 68. National Legacy

Players leave permanent marks on the countries they govern.

Examples include:

* Election victories.
* Governments formed.
* Coalitions negotiated.
* Bills enacted.
* Parliamentary speeches (future).
* National reforms.
* Record approval ratings.
* Longest-serving administrations.

These records become part of the country's historical archive and remain visible to future players.

---

# 69. Replayability

The Political Desk is designed for replay through changing political circumstances rather than scripted content.

Every country develops differently.

Different factors influence each political environment:

* Active player population.
* AI behaviour.
* Election outcomes.
* Coalition history.
* Legislative priorities.
* Public opinion.
* Historical decisions.

No two political careers should unfold identically.

---

# 70. Returning Players

Players returning after hours, days, or weeks should feel that the world continued without them.

On returning, they should immediately discover:

* New political headlines.
* Election developments.
* Government changes.
* Coalition activity.
* Parliamentary outcomes.
* Public opinion shifts.
* New strategic opportunities.

The world should never appear frozen.

---

# 71. The Political Timeline

Every player maintains a chronological political timeline.

Examples:

2027

* Founded Democratic Alliance.

2028

* Won first parliamentary seat.

2029

* Joined coalition government.

2030

* Appointed Minister of Education.

2031

* Became Prime Minister.

2033

* Passed National Education Reform Act.

This timeline becomes a living biography of the player's career.

---

# 72. A Complete Political Career

An example career might unfold as follows:

```text id="5m2cwu"
Unknown Citizen
        ↓
Party Founder
        ↓
Election Candidate
        ↓
Member of Parliament
        ↓
Opposition Leader
        ↓
Coalition Partner
        ↓
Prime Minister
        ↓
Former Prime Minister
        ↓
Senior Statesperson
        ↓
Historical Figure
```

Not every player reaches every stage.

Different careers create different stories.

---

# 73. Why Players Return

The Political Desk encourages long-term engagement because:

* Politics continues while the player is away.
* Every login presents new developments.
* Elections create recurring goals.
* Governments are temporary.
* Coalitions constantly evolve.
* New political rivals emerge.
* National history keeps growing.
* Every decision influences future opportunities.

The motivation comes from participating in a living political system rather than completing fixed content.

---

# 74. The Intended Player Experience

By the conclusion of a long political career, the player should feel:

* Their decisions mattered.
* Their victories were earned.
* Their defeats shaped future success.
* Their party became part of national history.
* Their country remembers their leadership.
* They helped create a unique political story that could not have existed in any other world.

The simulation should generate memorable experiences without relying on scripted narratives.

---

# 75. Final Experience Statement

The Political Desk is not a game about clicking political actions.

It is a persistent multiplayer leadership simulation where players build parties, contest elections, govern nations, negotiate with rivals, respond to changing public opinion, and leave permanent marks on a shared political world.

Every decision contributes to an evolving national story.

Every election changes the balance of power.

Every government becomes part of history.

Every player helps shape the future inherited by those who arrive after them.

This enduring continuity is the defining experience of the Political Desk within WORLDr.

---

# End of 04_PLAYER_EXPERIENCE_SPECIFICATION.md
