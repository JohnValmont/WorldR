# 06_GAMEPLAY_LOOPS.md

# Part 1 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Purpose

This document defines the operational loops that drive the Political Desk.

A loop is a repeatable sequence of events executed by the player, AI, institutions, or the simulation engine.

Unlike the Player Experience Specification, which explains how the game feels, this document explains how the political simulation operates continuously.

Every loop shall define:

* Purpose
* Trigger
* Inputs
* Decisions
* Processing
* Outputs
* Next Loops

These loops collectively define the runtime behaviour of the Political Desk.

---

# Loop Classification

Every loop belongs to one of the following categories.

| Loop TypeDescription |                                          |
| -------------------- | ---------------------------------------- |
| Player Loop          | Initiated directly by a player           |
| Simulation Loop      | Executed automatically by the simulation |
| Institution Loop     | Executed by political institutions       |
| World Loop           | Executed by global world systems         |
| Historical Loop      | Records permanent history                |

A single gameplay feature may participate in multiple loop categories.

---

# Loop 1 — Core Political Simulation Loop

## Type

Simulation Loop

---

## Purpose

Continuously advance the political world regardless of player activity.

The simulation never waits for human input.

---

## Trigger

Every simulation tick.

---

## Inputs

* Current political state
* Active governments
* Active parties
* Parliament status
* Elections
* Bills
* Public opinion
* Pending events

---

## Processing

The simulation:

1. Processes scheduled events.
2. Advances political calendars.
3. Updates institutional states.
4. Resolves completed actions.
5. Generates new events.
6. Updates political indicators.

---

## Outputs

* Updated political state
* New events
* Updated institutions
* New notifications
* Historical entries

---

## Next Loops

* Media Loop
* Public Opinion Loop
* Notification Loop
* Historical Archive Loop

---

# Loop 2 — Time Progression Loop

## Type

Simulation Loop

---

## Purpose

Advance political time.

---

## Trigger

Simulation tick.

---

## Responsibilities

Advance:

* Hours
* Days
* Months
* Election countdowns
* Parliamentary schedules
* Government terms
* Legislative deadlines

Time progression never skips constitutional events.

---

## Outputs

Updated political calendar.

---

# Loop 3 — Event Processing Loop

## Type

Simulation Loop

---

## Purpose

Resolve all queued political events.

---

## Trigger

Whenever pending events exist.

---

## Inputs

Examples:

* Bill submitted
* Statement published
* Campaign started
* Coalition offer
* Election announced

---

## Processing Pipeline

```
Receive Event
      ↓
Validate
      ↓
Execute
      ↓
Update State
      ↓
Generate Reactions
      ↓
Record History
```

---

## Outputs

* Updated simulation
* Triggered reactions
* Notifications
* News opportunities

---

# Loop 4 — Player Login Loop

## Type

Player Loop

---

## Purpose

Reconnect the player with the current political situation.

---

## Trigger

Player logs in.

---

## Information Displayed

* Dashboard summary
* Political news
* Notifications
* Government status
* Election countdown
* Parliament status
* Coalition status

---

## Player Decisions

The player chooses:

* Observe
* Respond
* Plan
* Take action

---

## Outputs

Player enters the Daily Session Loop.

---

# Loop 5 — Daily Session Loop

## Type

Player Loop

---

## Purpose

Provide a complete political gameplay session.

---

## Trigger

Player finishes reviewing the dashboard.

---

## Typical Flow

```
Dashboard
      ↓
News
      ↓
Notifications
      ↓
Review Situation
      ↓
Choose Goal
      ↓
Take Political Actions
      ↓
Observe Results
      ↓
Logout
```

---

## Player Goals

Examples:

* Prepare campaign.
* Respond to media.
* Vote.
* Negotiate coalition.
* Draft legislation.
* Review government reports.

---

## Outputs

Updated political state.

---

## Next Loops

* Parliament
* Campaign
* Government
* Media
* Logout

---

# Loop 6 — Notification Loop

## Type

Simulation Loop

---

## Purpose

Inform players of developments requiring attention.

---

## Trigger

Whenever a significant political event occurs.

---

## Notification Categories

Critical

* Government collapse
* Election begins
* Confidence vote

Important

* Bill scheduled
* Poll update
* Coalition proposal

Informational

* Party anniversary
* Historical milestone
* Ministry report

---

## Delivery

Notifications remain available until:

* Read
* Archived
* Expired (where appropriate)

---

# Loop Relationships

```
Simulation Tick
        │
        ▼
Time Progression
        │
        ▼
Event Processing
   ┌────┼────┐
   ▼    ▼    ▼
Media Opinion Notifications
        │
        ▼
Player Login
        │
        ▼
Daily Session
        │
        ▼
Political Actions
        │
        ▼
Simulation Tick
```

Every gameplay session eventually returns to the simulation, creating a continuous political world.

---

# Design Principles

These foundational loops shall satisfy the following principles:

1. The world never pauses for players.
2. Institutions continue functioning while players are offline.
3. Every significant action becomes an event.
4. Every event may generate additional events.
5. Every political state change is deterministic according to constitutional rules.
6. Players make strategic decisions; the simulation performs routine processing.

These principles ensure that the Political Desk behaves as a living, persistent political simulation rather than a sequence of isolated gameplay screens.

---

# End of Part 1

# 06_GAMEPLAY_LOOPS.md

# Part 2 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Purpose

This section defines every gameplay loop experienced by a new player from creating a political character until becoming an active participant in national politics.

The onboarding experience should introduce mechanics gradually while immediately giving the player meaningful goals.

---

# Loop 7 — Character Creation

## Type

Player Loop

---

## Purpose

Create the player's permanent political identity.

---

## Trigger

Player selects **Start a New Life**.

---

## Preconditions

* Authenticated account.
* Available character slot.

---

## Information Available

The player is presented with:

* First Name
* Middle Name (optional)
* Last Name
* Family Name (optional, if supported)
* Gender
* Age (minimum 18)
* Portrait / Avatar (future)
* Short biography (future)

---

## Player Decisions

The player finalizes their political identity.

---

## Processing

The simulation:

1. Validates all fields.
2. Generates a unique Character ID.
3. Creates a citizen record.
4. Registers the player within the selected country.

---

## Outputs

* Character created.
* Citizen profile created.
* Political career begins.

---

## Next Loop

Country Selection.

---

# Loop 8 — Country Selection

## Type

Player Loop

---

## Purpose

Allow the player to choose where their political career begins.

---

## Trigger

Character creation completes.

---

## Information Available

Each country card displays:

* Country Name
* Flag
* Government Type
* Population
* Political Stability
* Number of Human Politicians
* Available Political Slots
* Election Timing
* Difficulty Indicator (optional)

---

## Player Decisions

The player selects one country.

---

## Processing

The simulation:

1. Checks country capacity.
2. Reserves a political slot.
3. Registers the citizen in that country.

---

## Outputs

* National citizenship assigned.
* Political career initialized.

---

## Next Loop

Political Introduction.

---

# Loop 9 — Political Introduction

## Type

Player Loop

---

## Purpose

Introduce the player to the country's current political landscape.

---

## Trigger

Country successfully assigned.

---

## Information Displayed

The player sees:

* Current Prime Minister.
* Governing coalition.
* Largest opposition party.
* Parliament composition.
* National headlines.
* Next election countdown.
* Public approval overview.
* Major national issues.

No decisions are required during this stage.

The purpose is orientation.

---

## Outputs

Player understands the current political situation.

---

## Next Loop

Party Creation.

---

# Loop 10 — Party Creation

## Type

Player Loop

---

## Purpose

Establish the player's political organization.

---

## Trigger

Political introduction completed.

---

## Information Available

The player configures:

* Party Name
* Party Abbreviation
* Party Colour
* Party Logo
* Ideological Position
* Founding Statement
* Core Priorities (future expansion)

---

## Player Decisions

The player finalizes party identity.

---

## Processing

The simulation:

1. Validates uniqueness.
2. Creates party records.
3. Assigns player as Party Leader.
4. Generates initial AI party members.
5. Registers the party nationally.

---

## Outputs

* Political party established.
* Party headquarters created (logical entity).
* Initial party reputation initialized.

---

## Next Loop

First Dashboard.

---

# Loop 11 — First Dashboard

## Type

Player Loop

---

## Purpose

Introduce the player to the Political Desk without overwhelming them.

---

## Information Displayed

The dashboard highlights:

* Welcome message.
* Party summary.
* Political influence.
* Current news.
* Suggested first objectives.
* Election countdown.
* Available actions.

---

## Suggested Objectives

Examples:

* Publish your first political statement.
* Read today's news.
* Open your party profile.
* Recruit initial supporters (future).
* Explore Parliament.
* Review national statistics.

Objectives are recommendations rather than mandatory tasks.

---

## Outputs

The player becomes familiar with the interface and available opportunities.

---

## Next Loop

First Political Action.

---

# Loop 12 — First Political Action

## Type

Player Loop

---

## Purpose

Transition the player from observation to participation.

---

## Trigger

Player selects any available political action.

---

## Examples

* Publish statement.
* View Parliament.
* Read a bill.
* Inspect another political party.
* Review opinion polls.
* Send a coalition message (if applicable).
* Open national history.

---

## Processing

The simulation:

1. Validates authority.
2. Executes the action.
3. Updates the world state.
4. Generates reactions where appropriate.
5. Records historical events if required.

---

## Outputs

The player experiences their first meaningful political consequence.

---

## Next Loop

Daily Political Loop.

---

# Onboarding Flow

```text id="n4v2xj"
Start New Life
        ↓
Character Creation
        ↓
Country Selection
        ↓
Political Introduction
        ↓
Party Creation
        ↓
First Dashboard
        ↓
First Political Action
        ↓
Daily Political Loop
```

---

# Design Principles

The onboarding experience shall follow these principles:

1. Every screen introduces one primary concept.
2. Players receive meaningful context before making decisions.
3. No mandatory tutorial interrupts progression.
4. Early actions should produce visible consequences.
5. Players should feel like active politicians within their first session.
6. The onboarding sequence should naturally transition into the recurring Daily Political Loop.

---

# End of Part 2
# 06_GAMEPLAY_LOOPS.md

# Part 3 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Purpose

This section defines the recurring political gameplay loops that players experience throughout their political career.

These loops form the core gameplay of the Political Desk and repeat continuously as the political world evolves.

---

# Loop 13 — Daily Political Loop

## Type

Player Loop

---

## Purpose

Allow the player to review the current political situation, establish priorities, and influence national politics.

---

## Trigger

* Player logs into the game.
* A new in-game month begins.
* A significant political event requires player attention.

---

## Preconditions

* Character exists.
* Player belongs to a registered political party.
* Political Dashboard is available.

---

## Information Available

The player reviews:

* National headlines.
* Party status.
* Public approval.
* Party approval.
* Coalition status.
* Parliament agenda.
* Bills awaiting action.
* Election countdown.
* Notifications.
* Political opportunities.

---

## Player Objectives

Examples include:

* Strengthen the party.
* Improve public support.
* Prepare legislation.
* Build alliances.
* Respond to opponents.
* Prepare for elections.
* Govern effectively.

The player chooses their priorities.

The simulation does not prescribe a fixed order.

---

## Available Actions

Examples:

* Publish Political Statement
* Hold Press Conference
* Schedule Campaign Activity
* Review Ministry Reports
* Open Parliament
* Inspect Other Parties
* Negotiate Coalition
* Draft Bill
* Meet Party Members (Future)
* Review National Statistics

Future versions may expand this list without changing the structure of the loop.

---

## Processing

Each completed action generates one or more simulation events.

The simulation then updates:

* Public Opinion
* Political Relationships
* Government Status
* Media Coverage
* Historical Records
* Notifications

---

## Outputs

* Updated political environment.
* New opportunities.
* New strategic decisions.
* Additional notifications.

---

## Next Possible Loops

* Parliament Loop
* Campaign Loop
* Government Loop
* Coalition Loop
* Logout

---

# Loop 14 — Campaign Loop

## Type

Player Loop

---

## Purpose

Allow political parties to influence voters during the official campaign period.

---

## Trigger

Campaign period begins.

---

## Preconditions

* Party is registered.
* Election has been announced.
* Campaign period is active.

---

## Information Available

* Opinion polls.
* Campaign calendar.
* Opponent activity.
* Media coverage.
* National issues.
* Campaign budget (Future).
* Regional support (Future).

---

## Available Actions

* Hold Rally
* Publish Manifesto
* Give Interview
* Participate in Debate
* Release Policy Proposal
* Respond to Opponents

---

## Processing

Campaign activities influence:

* Media attention.
* Voter awareness.
* Public Opinion.
* Party momentum.

Campaigns never modify election results directly.

---

## Outputs

* Updated polling.
* News coverage.
* Political reactions.
* Campaign momentum.

---

## Next Loop

Election Loop.

---

# Loop 15 — Election Loop

## Type

Institution Loop

---

## Purpose

Conduct a constitutional election.

---

## Trigger

Election Day.

---

## Stages

```text
Election Begins
        ↓
Voting Opens
        ↓
Votes Cast
        ↓
Counting
        ↓
Certification
        ↓
Seat Allocation
        ↓
Government Formation
```

---

## Processing

The election system:

* Calculates votes.
* Allocates seats.
* Updates Parliament.
* Generates historical records.
* Triggers Government Formation if required.

---

## Outputs

* Official election results.
* New Parliament.
* Updated political balance.
* National headlines.

---

## Next Loop

Government Formation Loop.

---

# Loop 16 — Coalition Loop

## Type

Player + Institution Loop

---

## Purpose

Allow parliamentary parties to negotiate governing agreements when no party has a majority.

---

## Trigger

* Hung Parliament.
* Coalition collapse.
* Government resignation.
* Coalition renegotiation.

---

## Information Available

* Parliamentary seat distribution.
* Existing relationships.
* Coalition history.
* Government stability.
* Public Opinion.

---

## Available Actions

* Send Coalition Proposal.
* Accept Proposal.
* Reject Proposal.
* Leave Coalition.
* Renegotiate Agreement.

---

## Processing

The simulation evaluates:

* Parliamentary majority.
* Relationship compatibility.
* Coalition stability.
* Government viability.

---

## Outputs

* Coalition formed.
* Negotiations continue.
* Minority Government.
* Government collapse.

---

## Next Loops

* Government Loop.
* Daily Political Loop.

---

# Loop 17 — Opposition Loop

## Type

Player Loop

---

## Purpose

Provide meaningful gameplay for parties outside government.

---

## Trigger

Player's party is not part of the governing coalition.

---

## Information Available

* Government popularity.
* Parliamentary agenda.
* Bills under debate.
* Coalition tensions.
* Public concerns.

---

## Available Actions

* Criticize Government.
* Submit Private Member Bill.
* Hold Press Conference.
* Question Government.
* Build Alternative Coalition.
* Prepare Election Strategy.

---

## Processing

Opposition actions may influence:

* Media coverage.
* Public Opinion.
* Government stability.
* Coalition trust.
* Party reputation.

---

## Outputs

* Increased visibility.
* New political opportunities.
* Government responses.
* Historical events.

---

## Next Possible Loops

* Daily Political Loop.
* Parliament Loop.
* Campaign Loop.

---

# Political Loop Relationships

```text
Daily Political Loop
        │
        ├──────────────┐
        ▼              ▼
Campaign Loop    Opposition Loop
        │              │
        └──────┬───────┘
               ▼
        Election Loop
               ▼
      Government Formation
               ▼
        Government Loop
               ▼
      Daily Political Loop
```

The political gameplay cycle is continuous.

Winning an election changes the player's responsibilities but does not end the gameplay loop.

---

# Design Principles

The recurring political loops shall satisfy the following principles:

1. Every login should present new political information.
2. No two political careers should follow exactly the same path.
3. Elections are milestones, not endpoints.
4. Opposition gameplay must be as engaging as governing.
5. Every action should create meaningful political consequences.
6. The simulation should always provide the player with multiple strategic choices.

---

# End of Part 3
This is where the game changes genres.

Before this point, the player is a politician.

After this point, the player becomes a head of government.

That is a fundamentally different gameplay experience.

The biggest mistake political games make is turning government into spreadsheet management.

We should not do that.

Our principle:

Players make strategic decisions. Institutions execute the details.

One major improvement I would make

I would add a Government Briefing screen that appears automatically at the start of every session for players in executive office.

Think of it as the Prime Minister's morning briefing.

It would summarize:

Overnight events — coalition tension increased, bill passed, minister criticized, etc.

Urgent decisions — confidence vote tomorrow, coalition partner awaiting response.

Ministry alerts — education shortage, healthcare pressure, infrastructure delay.

Political outlook — approval up 2%, opposition gaining support.

This would make logging in feel immediately consequential and would naturally guide the player toward the most important decisions without removing strategic freedom.

# 06_GAMEPLAY_LOOPS.md

# Part 4 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Purpose

This section defines the gameplay loops that occur after a government is formed.

Unlike campaign gameplay, these loops focus on governing, legislation, executive leadership, coalition management, and maintaining parliamentary confidence.

Government gameplay should emphasize strategic leadership rather than administrative micromanagement.

---

# Loop 18 — Government Formation Loop

## Type

Institution Loop

---

## Purpose

Form a constitutional government following an election or government collapse.

---

## Trigger

* Certified election results.
* Government resignation.
* Successful no-confidence vote.
* Coalition collapse requiring a new government.

---

## Preconditions

* Parliament has been constituted.
* Seat allocation is complete.

---

## Information Available

Players can review:

* Parliamentary seat distribution.
* Majority threshold.
* Coalition possibilities.
* Party relationships.
* Election results.
* Historical coalition performance.

---

## Available Actions

Government Leader:

* Invite coalition partners.
* Negotiate ministries.
* Accept coalition requests.
* Reject coalition requests.
* Form minority government (if constitutionally allowed).
* End negotiations.

Coalition Parties:

* Accept invitation.
* Reject invitation.
* Counter-offer.
* Request ministries.
* Leave negotiations.

---

## Processing

The simulation:

1. Validates coalition majority.
2. Confirms participating parties.
3. Assigns Head of Government.
4. Creates Cabinet.
5. Updates executive authority.
6. Publishes government formation news.
7. Records historical event.

---

## Outputs

* Government formed.
* Coalition agreement.
* Cabinet established.
* Government enters office.

---

## Next Loops

* Cabinet Management Loop.
* Government Leadership Loop.

---

# Loop 19 — Government Leadership Loop

## Type

Player Loop

---

## Purpose

Allow the Head of Government to direct national policy and political strategy.

---

## Trigger

Player holds executive office.

---

## Information Available

Daily Government Briefing:

* National approval.
* Coalition stability.
* Parliamentary agenda.
* Ministry reports.
* Breaking political news.
* Active legislation.
* Upcoming deadlines.
* Opposition activity.

---

## Available Actions

* Set Government Priorities.
* Approve Government Bills.
* Meet Coalition Leaders.
* Replace Ministers.
* Issue Government Statement.
* Schedule Cabinet Meeting.
* Respond to National Events.
* Prepare Legislative Agenda.

---

## Processing

Government decisions create political events which affect:

* Ministries.
* Coalition partners.
* Parliament.
* Public Opinion.
* Media.
* Historical records.

---

## Outputs

* Updated government agenda.
* Political reactions.
* Executive decisions.
* New strategic opportunities.

---

## Next Loops

* Cabinet Loop.
* Parliament Loop.
* Bill Lifecycle Loop.

---

# Loop 20 — Cabinet Management Loop

## Type

Player + Institution Loop

---

## Purpose

Manage ministers and executive leadership.

---

## Trigger

* Government formation.
* Minister vacancy.
* Cabinet reshuffle.
* Coalition agreement.

---

## Information Available

Each minister displays:

* Portfolio.
* Performance.
* Public approval.
* Political loyalty.
* Party affiliation.
* Coalition partner.
* Current workload.

---

## Available Actions

* Appoint Minister.
* Remove Minister.
* Reshuffle Cabinet.
* Leave Position Vacant.
* Review Minister Reports.

---

## Processing

Cabinet changes influence:

* Coalition trust.
* Government stability.
* Public confidence.
* Media attention.

Routine ministry operations continue under AI administration.

---

## Outputs

* Updated Cabinet.
* Executive changes.
* Historical records.

---

## Next Loops

* Ministry Reports Loop.
* Government Leadership Loop.

---

# Loop 21 — Parliament & Legislative Loop

## Type

Institution + Player Loop

---

## Purpose

Manage legislative activity within Parliament.

---

## Trigger

* Bill submitted.
* Debate scheduled.
* Voting session.
* Parliamentary calendar event.

---

## Information Available

Players can review:

* Active bills.
* Voting schedule.
* Party positions.
* Coalition whip status.
* Bill history.
* Parliamentary calendar.

---

## Available Actions

Depending on office:

* Submit Government Bill.
* Submit Private Member Bill.
* Debate Bill.
* Support Bill.
* Oppose Bill.
* Abstain.
* Withdraw Bill.
* Schedule Debate.

---

## Processing

The simulation:

1. Validates authority.
2. Opens debate.
3. Records party positions.
4. Conducts vote.
5. Applies legislative outcome.
6. Updates national laws.
7. Generates news.

---

## Outputs

* Bill passed.
* Bill rejected.
* Debate concluded.
* Parliamentary history updated.

---

## Next Loops

* Media Generation Loop.
* Public Opinion Loop.
* Government Leadership Loop.

---

# Loop 22 — Ministry Reports Loop

## Type

Institution Loop

---

## Purpose

Provide executive leaders with summarized information instead of requiring direct administrative management.

---

## Trigger

At the beginning of every in-game month or after major national events.

---

## Report Categories

Each ministry provides:

* Current Status.
* Key Performance Indicators.
* Emerging Problems.
* Strategic Recommendations.
* Urgent Decisions Required.

Example:

**Ministry of Health**

* Healthcare Capacity: Stable
* Public Satisfaction: 74%
* Current Issue: Rural clinic shortages
* Recommendation: Increase healthcare investment

---

## Player Decisions

The player may:

* Accept Recommendation.
* Reject Recommendation.
* Delay Decision.
* Request More Information.
* Prioritize Another Ministry.

---

## Processing

Accepted decisions create executive events that influence:

* Government performance.
* Ministry effectiveness.
* Public Opinion.
* Future reports.
* National statistics.

---

## Outputs

* Updated ministry priorities.
* Government actions.
* Political consequences.

---

## Next Loops

* Government Leadership Loop.
* Media Generation Loop.
* Daily Political Loop.

---

# Government Loop Relationships

```text
Government Formation
          │
          ▼
Government Leadership
     ┌────┼────┐
     ▼    ▼    ▼
Cabinet Parliament Ministries
     │      │      │
     └──┬───┴──┬───┘
        ▼
Government Decisions
        ▼
Media & Public Opinion
        ▼
Daily Political Loop
```

Government is not a single screen.

It is a continuous cycle of leadership, legislation, coalition management, and institutional decision-making.

---

# Design Principles

Government gameplay shall satisfy the following principles:

1. Executive leadership focuses on strategic decisions rather than administrative micromanagement.
2. Ministries provide recommendations; players determine political direction.
3. Coalition management is a continuous responsibility.
4. Parliament remains central to government success.
5. Every executive decision creates political consequences.
6. Governing should be as engaging and challenging as winning elections.

---

# End of Part 4
One recommendation before implementation

I would add one more gameplay loop in a future version called National Crisis Loop.

It would activate only during exceptional situations such as:

Economic recession
Pandemic
Natural disaster
Military conflict
Constitutional crisis
Major corruption scandal

Unlike normal gameplay, a crisis temporarily changes priorities across every ministry, Parliament, media, and public opinion. This creates memorable, high-pressure moments without making the entire game revolve around constant emergencies. It also provides a strong foundation for later Economy, Military, Health, and Disaster modules.

# 06_GAMEPLAY_LOOPS.md

# Part 6 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Purpose

This section defines how all gameplay and simulation loops interact to form a single persistent political simulation.

Individual loops shall never operate in isolation.

Every completed loop may trigger one or more subsequent loops, creating an evolving political world.

---

# Complete Political Lifecycle

The Political Desk follows a continuous gameplay lifecycle.

```text
Player Creates Character
          │
          ▼
Country Selection
          │
          ▼
Political Introduction
          │
          ▼
Party Creation
          │
          ▼
Daily Political Loop
     ┌────┼──────┐
     ▼    ▼      ▼
Campaign Parliament Government
     │      │      │
     └──┬───┴──┬───┘
        ▼
Political Events
        ▼
Media Coverage
        ▼
Public Opinion
        ▼
AI Reactions
        ▼
Political Relationships
        ▼
Election
        ▼
Government Formation
        ▼
Daily Political Loop
```

The political lifecycle repeats continuously throughout the lifetime of the world.

---

# Loop Dependency Graph

The following diagram illustrates the primary dependencies between gameplay systems.

```text
Character
    │
    ▼
Country
    │
    ▼
Party
    │
    ▼
Daily Political Loop
    │
 ┌──┼──────────────┐
 ▼  ▼              ▼
Government     Campaign     Parliament
 │              │             │
 └─────┬────────┴───────┐
       ▼                ▼
 Political Events    Elections
       │                │
       └──────┬─────────┘
              ▼
      Media Generation
              ▼
      Public Opinion
              ▼
       AI Decisions
              ▼
     Political Stability
              ▼
      Historical Archive
              ▼
      Future Political Events
```

Dependencies define information flow rather than execution order.

---

# Event Propagation Pipeline

Every significant political action follows the same processing pipeline.

```text
Player / AI Action
          │
          ▼
Authority Validation
          │
          ▼
Simulation Execution
          │
          ▼
Political State Updated
          │
          ▼
Media Evaluation
          │
          ▼
Public Opinion Evaluation
          │
          ▼
AI Strategic Evaluation
          │
          ▼
Relationship Updates
          │
          ▼
Historical Recording
          │
          ▼
Player Notifications
```

All political actions shall use this standardized pipeline.

---

# Simulation Tick Order

Every simulation tick processes systems in the following order.

1. Advance political time.
2. Execute scheduled events.
3. Process government actions.
4. Process parliamentary actions.
5. Execute AI political decisions.
6. Update political relationships.
7. Generate media coverage.
8. Update Public Opinion.
9. Evaluate Political Stability.
10. Record historical events.
11. Generate notifications.

This order ensures deterministic behaviour across all countries.

---

# Event Priority Levels

Events are processed according to priority.

| Priority | Examples                                                           |
| -------- | ------------------------------------------------------------------ |
| Critical | Election certification, government collapse, confidence vote       |
| High     | Coalition negotiations, parliamentary voting, cabinet appointments |
| Medium   | Party statements, ministry reports, campaign activities            |
| Low      | Historical indexing, analytics, statistical summaries              |

Higher-priority events always complete before lower-priority events during the same simulation tick.

---

# Concurrent Processing

Where technically possible, independent systems may execute concurrently.

Examples:

* Multiple countries.
* Independent AI decisions.
* Historical indexing.
* Statistical calculations.
* News generation.

Constitutional procedures affecting the same country shall execute sequentially to preserve consistency.

---

# Failure Recovery

The Political Desk shall preserve simulation integrity during unexpected failures.

If processing is interrupted:

1. Restore the last valid simulation state.
2. Resume processing from the interrupted event.
3. Prevent duplicate execution.
4. Preserve historical consistency.

Partial constitutional state changes are not permitted.

---

# Cross-System Integration

The Political Desk shall expose standardized events for other game systems.

Examples:

* GovernmentFormed
* ElectionCompleted
* BillPassed
* CoalitionCreated
* MinisterAppointed
* GovernmentCollapsed
* PartyCreated
* PoliticalStatementPublished

Future systems including Economy, Population, Judiciary, Diplomacy, Military, Business, and Local Government may subscribe to these events without modifying Political Desk logic.

---

# Scalability Principles

The Political Desk shall support:

* Multiple countries simultaneously.
* Thousands of AI political actors.
* Hundreds of concurrent human politicians.
* Independent constitutional profiles.
* Continuous simulation without world resets.

Scalability shall be achieved through modular architecture rather than country-specific implementations.

---

# Final Design Principles

The complete gameplay loop shall satisfy the following principles.

1. The political world never pauses.
2. Every action creates consequences.
3. Every consequence becomes future context.
4. Institutions outlive individual politicians.
5. Political history is permanent.
6. AI maintains institutional continuity.
7. Human players make strategic decisions.
8. Governments rise and fall naturally.
9. Elections change power without resetting the simulation.
10. Every political career contributes to the evolving history of the world.

---

# Final Gameplay Statement

The Political Desk is a persistent institutional simulation.

Players do not play isolated matches or scenarios.

Instead, they enter an already living political world, build parties, compete for influence, govern nations, shape history, and leave a permanent political legacy that continues to affect future generations of players.

The gameplay loop is therefore not finite.

It is a continuous cycle of political participation, institutional evolution, and historical progression.

---

# End of 06_GAMEPLAY_LOOPS.md


















