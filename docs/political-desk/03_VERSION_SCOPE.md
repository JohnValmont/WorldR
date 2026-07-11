# Version Scope

# 03_VERSION_SCOPE.md (Part 1 of 5)

# Version Scope — Political Desk Pre-Alpha v0.1

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 1. Purpose

This document defines the complete scope of the Political Desk for **Pre-Alpha v0.1**.

Its purpose is to answer one question:

> **Exactly what will exist in Pre-Alpha v0.1?**

Anything not explicitly included in this document should be considered **out of scope**.

New features may only be added after the Version Scope has been updated.

This document exists to prevent feature creep and ensure predictable development.

---

# 2. Scope Philosophy

The objective of Pre-Alpha v0.1 is **not** to build a complete political simulation.

The objective is to build the smallest possible version that proves the core gameplay loop is enjoyable, technically stable, and scalable.

Every feature included in this release must satisfy at least one of the following:

* Demonstrates the core political gameplay loop.
* Validates multiplayer architecture.
* Establishes a reusable simulation system.
* Provides a foundation for future modules.
* Enables meaningful player testing.

Features that only add realism without improving the core experience should be postponed.

---

# 3. Development Goal

At the end of Pre-Alpha v0.1, a new player should be able to:

* Create an account.
* Choose a country.
* Create one political party.
* Lead that party.
* Participate in campaigns.
* Contest elections.
* Win or lose elections.
* Form a government (if eligible).
* Appoint a cabinet.
* Govern through ministries.
* Introduce legislation.
* Participate in parliamentary voting.
* Respond to news and political events.
* Observe the consequences of political decisions.
* Continue playing after winning or losing office.

If all of these are possible, the Political Desk has achieved its primary objective.

---

# 4. Definition of Pre-Alpha

Pre-Alpha is a functional engineering milestone.

It is **not** intended to be:

* Content complete.
* Visually polished.
* Fully balanced.
* Feature complete.

Instead, it must prove that:

* The architecture works.
* The simulation works.
* Multiplayer works.
* The gameplay loop works.
* Players understand how to play.
* The systems can support future expansion.

---

# 5. Target Audience

Pre-Alpha is designed for:

* Internal development.
* Closed testing.
* Early community feedback.
* Technical validation.
* Balance testing.

It is **not** intended for large-scale public release.

---

# 6. Primary Objectives

The Political Desk should successfully demonstrate the following capabilities.

### Political Leadership

Players can build and manage political parties.

---

### Elections

Political competition determines government leadership.

---

### Government

Winning parties can form governments and appoint ministers.

---

### Parliament

Legislation requires parliamentary approval.

---

### Media

Political decisions influence media coverage and public perception.

---

### Public Opinion

Citizens respond to political actions.

---

### Persistent Multiplayer

Countries continue evolving while players are offline.

---

### Institutional Gameplay

Players lead institutions rather than performing routine administrative tasks.

---

# 7. Secondary Objectives

If development time permits, the following systems may be implemented without delaying the release.

* Expanded notifications.
* Additional statistics.
* Improved charts.
* Better historical reports.
* Enhanced political news.
* Additional cabinet interactions.
* Improved AI behavior.
* Additional quality-of-life improvements.

These features are desirable but not required.

---

# 8. Out of Scope Philosophy

Every feature should be evaluated using one question:

> **Does this directly improve the core political gameplay loop?**

If the answer is no, the feature belongs in a future version.

Examples of postponed systems include:

* International diplomacy.
* Military command.
* Judicial systems.
* Local government.
* Intelligence agencies.
* Constitutional courts.
* Regional administration.
* Municipal politics.
* Detailed lobbying mechanics.

These systems may eventually exist, but they are intentionally excluded from Pre-Alpha.

---

# 9. Success Criteria

Pre-Alpha v0.1 is considered successful if players can complete the following gameplay loop without developer intervention.

```text id="k6m9fp"
Account Creation
        ↓
Country Selection
        ↓
Party Creation
        ↓
Political Campaign
        ↓
Election
        ↓
Government Formation
        ↓
Cabinet Appointment
        ↓
Parliamentary Governance
        ↓
Media Reaction
        ↓
Public Opinion Changes
        ↓
Next Election
```

Every step in this loop must function reliably.

---

# 10. Minimum Viable Political Simulation (MVPS)

The Political Desk should provide the minimum feature set required to create meaningful political gameplay.

The MVPS includes:

* One persistent world.
* Multiple playable countries.
* Human-led political parties.
* AI-controlled institutions.
* Elections.
* Governments.
* Parliaments.
* Ministries.
* Media.
* Public opinion.
* Legislative process.
* Persistent political history.

Anything beyond this baseline is optional for Pre-Alpha.

---

# 11. Release Philosophy

Pre-Alpha should prioritize:

1. Stability over feature count.
2. Architecture over speed.
3. Simulation over visual polish.
4. Decision quality over mechanical complexity.
5. Multiplayer reliability over content volume.
6. Scalability over short-term convenience.

A smaller, stable foundation is more valuable than a larger, unstable feature set.

---

# 12. Scope Lock

Once implementation begins, the Version Scope is considered locked.

New features should **not** be added because they are "interesting" or "easy to implement."

A feature may only be added if:

* It fixes a critical architectural gap.
* It resolves a blocker affecting core gameplay.
* It has been approved through the project's change management process.

Scope discipline is essential to completing Pre-Alpha.

---

# End of Part 1

**Next:** Part 2 will define every gameplay system that is included, partially included, or explicitly excluded from Pre-Alpha v0.1. It will serve as the definitive checklist for development and prevent accidental expansion beyond the agreed scope.

# 03_VERSION_SCOPE.md (Part 2 of 5)

# Gameplay Scope Matrix

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 13. Gameplay Scope Philosophy

Every gameplay system belongs to exactly one implementation category.

The purpose of this matrix is to define:

* What must exist.
* What may exist.
* What should only have architecture.
* What is prohibited.

Features outside this document should not be implemented.

---

# 14. Player Account & Identity

| Feature                         | Status      |
| ------------------------------- | ----------- |
| Authentication                  | 🟢 Required |
| Character Creation              | 🟢 Required |
| Country Selection               | 🟢 Required |
| One Character per Account       | 🟢 Required |
| One Political Party per Account | 🟢 Required |
| Character Profile               | 🟢 Required |
| Political Biography             | 🟡 Basic    |
| Achievements                    | 🔴 Future   |
| Multiple Characters             | 🔴 Future   |

---

# 15. Political Party System

| Feature                | Status      |
| ---------------------- | ----------- |
| Party Creation         | 🟢 Required |
| Party Name             | 🟢 Required |
| Party Abbreviation     | 🟢 Required |
| Party Logo             | 🟢 Required |
| Party Ideology         | 🟢 Required |
| Party Description      | 🟢 Required |
| Human Party Leader     | 🟢 Required |
| AI Party Officials     | 🟢 Required |
| Party Popularity       | 🟢 Required |
| Party Headquarters     | 🟡 Basic    |
| Party Members          | 🟡 Basic    |
| Party History          | 🟡 Basic    |
| Party Manifesto        | 🟡 Basic    |
| Party Finances         | 🟠 Stub     |
| Internal Elections     | 🔴 Future   |
| Multiple Human Leaders | 🔴 Future   |
| Human Party Officers   | 🔴 Future   |
| Party Splits           | 🔴 Future   |
| Party Mergers          | 🔴 Future   |

---

# 16. Elections

| Feature                | Status      |
| ---------------------- | ----------- |
| Election Schedule      | 🟢 Required |
| Candidate Registration | 🟢 Required |
| Campaign Period        | 🟢 Required |
| AI Campaigning         | 🟢 Required |
| Human Campaign Actions | 🟢 Required |
| Voting                 | 🟢 Required |
| Seat Allocation        | 🟢 Required |
| Government Formation   | 🟢 Required |
| Election History       | 🟢 Required |
| Opinion Polls          | 🟡 Basic    |
| Election Statistics    | 🟡 Basic    |
| Turnout Simulation     | 🟡 Basic    |
| Campaign Advertising   | 🟠 Stub     |
| Electoral Fraud        | 🔴 Future   |
| Referendums            | 🔴 Future   |
| Recall Elections       | 🔴 Future   |

---

# 17. Government

| Feature                    | Status      |
| -------------------------- | ----------- |
| Government Formation       | 🟢 Required |
| Coalition Formation        | 🟢 Required |
| Cabinet Creation           | 🟢 Required |
| Prime Minister / President | 🟢 Required |
| Ministries                 | 🟢 Required |
| Cabinet Approval           | 🟢 Required |
| Government Approval Rating | 🟢 Required |
| Coalition Stability        | 🟢 Required |
| Government History         | 🟢 Required |
| Cabinet Meetings           | 🟡 Basic    |
| Cabinet Reshuffle          | 🟡 Basic    |
| Emergency Cabinet Session  | 🟡 Basic    |
| Deputy Leader              | 🟠 Stub     |
| Vice President             | 🟠 Stub     |
| Acting Government          | 🔴 Future   |

---

# 18. Parliament

| Feature                   | Status       |
| ------------------------- | ------------ |
| Parliamentary Seats       | 🟢 Required  |
| Majority Calculation      | 🟢 Required  |
| Legislative Sessions      | 🟢 Required  |
| Bills                     | 🟢 Required  |
| Parliamentary Voting      | 🟢 Required  |
| Confidence Vote           | 🟢 Required  |
| No Confidence Vote        | 🟢 Required  |
| Bill History              | 🟢 Required  |
| Parliamentary Committees  | 🟡 Basic     |
| Speaker                   | 🟡 Basic     |
| Attendance                | 🟡 Basic     |
| Bicameral Parliament      | 🔵 Framework |
| Constitutional Amendments | 🟠 Stub      |
| Filibuster                | 🔴 Future    |

---

# 19. Media

| Feature                  | Status      |
| ------------------------ | ----------- |
| National News            | 🟢 Required |
| Government Statements    | 🟢 Required |
| Election Coverage        | 🟢 Required |
| Party News               | 🟢 Required |
| Public Headlines         | 🟢 Required |
| Political Timeline       | 🟢 Required |
| Press Conferences        | 🟡 Basic    |
| Interviews               | 🟡 Basic    |
| Editorial Opinions       | 🟡 Basic    |
| Investigative Journalism | 🟠 Stub     |
| Television Networks      | 🔴 Future   |
| Social Media Simulation  | 🔴 Future   |

---

# 20. Public Opinion

| Feature               | Status      |
| --------------------- | ----------- |
| National Approval     | 🟢 Required |
| Party Popularity      | 🟢 Required |
| Government Popularity | 🟢 Required |
| Issue Importance      | 🟢 Required |
| Voter Blocs           | 🟢 Required |
| Opinion History       | 🟢 Required |
| Regional Opinion      | 🟡 Basic    |
| Demographic Opinion   | 🟠 Stub     |
| Focus Groups          | 🔴 Future   |

---

# 21. Ministries

| Feature              | Status      |
| -------------------- | ----------- |
| Ministry List        | 🟢 Required |
| Minister Appointment | 🟢 Required |
| Ministry Performance | 🟢 Required |
| Ministry Reports     | 🟢 Required |
| Minister Replacement | 🟢 Required |
| Ministry Objectives  | 🟡 Basic    |
| Ministry Budgets     | 🟠 Stub     |
| Ministry Projects    | 🔴 Future   |

---

# 22. Player Actions

The following actions must exist.

| Action                | Status      |
| --------------------- | ----------- |
| Create Party          | 🟢 Required |
| Edit Party            | 🟢 Required |
| Campaign              | 🟢 Required |
| Publish Statement     | 🟢 Required |
| Form Coalition        | 🟢 Required |
| Negotiate Coalition   | 🟢 Required |
| Appoint Cabinet       | 🟢 Required |
| Submit Bill           | 🟢 Required |
| Vote in Parliament    | 🟢 Required |
| Respond to News       | 🟢 Required |
| Hold Press Conference | 🟡 Basic    |
| Replace Minister      | 🟡 Basic    |
| Emergency Address     | 🟠 Stub     |
| National Referendum   | 🔴 Future   |

---

# 23. Explicitly Excluded Systems

The following systems are intentionally excluded from Pre-Alpha v0.1.

Do not implement them.

* Diplomacy
* Military command
* Warfare
* Espionage
* Intelligence agencies
* Local governments
* Regional governments
* Municipal politics
* Judiciary
* Supreme Court
* Constitutional Court
* Lobbying
* Interest groups
* Political assassinations
* Terrorism
* Civil wars
* Monarchies with unique mechanics
* International organizations
* Immigration systems
* Refugee systems
* Religion mechanics
* Climate politics
* Detailed taxation
* Economic simulation
* Manufacturing
* Crime systems
* Healthcare simulation
* Education simulation
* Banking simulation
* Trade simulation

These modules will be developed independently in future versions and integrated through the architecture defined in `01_SYSTEM.md`.

---

# 24. Scope Enforcement

Every feature proposed during development should be classified before implementation.

If a feature is marked:

🟢 Required — implement completely.

🟡 Basic — implement the minimum useful version.

🟠 Stub — create architecture and data structures only.

🔵 Framework — prepare extension points without gameplay.

🔴 Future — do not implement in Pre-Alpha v0.1.

Changing a feature's classification requires updating this document and following the project's change management process.

---

# End of Part 2
# 03_VERSION_SCOPE.md (Part 3 of 5)

# Technical Scope — Backend, Database, Multiplayer & Simulation

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# 25. Purpose

This section defines the technical boundaries of the Political Desk for Pre-Alpha v0.1.

Its objective is to ensure that every gameplay feature is built upon a stable, scalable architecture capable of supporting a persistent multiplayer world.

The focus of Pre-Alpha is correctness, maintainability, and future expansion rather than maximum optimization.

---

# 26. Backend Scope

The backend is responsible for simulation and authoritative game state.

The frontend is responsible for presentation only.

Players must never directly modify gameplay data.

All gameplay actions pass through validated backend services.

---

### Required Backend Responsibilities

* Authentication
* Authorization
* Political simulation
* Election processing
* Government formation
* Cabinet management
* Parliament simulation
* Party management
* News generation
* Notification generation
* Public opinion calculation
* Time management
* Scheduled simulation
* Database validation
* API security
* Audit logging

---

### Backend Must NOT

* Contain UI logic.
* Generate visual layouts.
* Store duplicated calculations.
* Depend on frontend state.
* Trust client requests.

---

# 27. Database Scope

The database stores the permanent political history of the world.

Every important political event should be recoverable.

Examples:

* Election results
* Governments
* Coalition history
* Cabinet history
* Bills
* Parliamentary votes
* Political parties
* News archives
* Approval history

Historical data should never be overwritten.

New records should represent historical changes.

---

## Required Database Characteristics

* Normalized schema
* Foreign key integrity
* Soft deletion where appropriate
* UUID primary keys
* Audit timestamps
* Version-compatible schema

---

# 28. Multiplayer Scope

The Political Desk is multiplayer by default.

Single-player mode is not a development target.

---

## Country Capacity

The architecture must support at least **75 playable countries**.

Country-specific code is prohibited.

Countries differ through configuration.

---

## Player Capacity

The architecture should support thousands of concurrent players across all countries.

Within a country:

* One human controls one political party.
* One political party has one human leader.
* Remaining party members are AI.
* Institutions continue operating regardless of player activity.

---

## Player Distribution

Countries may have:

* Many human parties.
* Few human parties.
* Only one human party.
* No human parties.

The simulation must remain functional in all four situations.

---

# 29. Persistent World

The world never pauses.

Simulation continues whether players are online or offline.

Examples:

* Elections continue.
* Parliament meets.
* Ministries operate.
* News is published.
* Approval changes.
* AI parties make decisions.
* Coalition negotiations progress.

Logging out pauses the player.

It never pauses the country.

---

# 30. Time System

Pre-Alpha uses a shared global simulation clock.

Current design:

**1 in-game month = 8 real-world hours**

All countries follow the same simulation timeline.

The simulation advances automatically.

No player may pause or accelerate time.

---

## Scheduled Processes

Examples:

Hourly

* Notifications
* News generation

Daily

* AI evaluations
* Political events
* Approval updates

Monthly

* Polling
* Ministry reports
* Government performance
* Party statistics

Election Cycle

* Candidate registration
* Campaign phase
* Voting
* Government formation

---

# 31. AI Scope

AI exists to preserve continuity.

AI should:

* Create believable political competition.
* Maintain inactive countries.
* Operate institutions.
* Replace inactive political actors when necessary.
* Generate realistic political activity.

AI should not:

* Cheat.
* Ignore constitutional rules.
* Receive hidden advantages.
* Override player decisions without valid gameplay reasons.

---

# 32. Simulation Scope

The simulation owns gameplay.

Every gameplay change should originate from simulation.

Example:

Player

↓

Campaign

↓

Media

↓

Public Opinion

↓

Election Polling

↓

Election

↓

Government

↓

Policy

↓

Media

↓

Public Opinion

Simulation drives outcomes.

Players influence simulation.

---

# 33. Networking Scope

Client requests should contain intent rather than results.

Correct

"Submit Bill"

Incorrect

"Bill Passed"

The server determines outcomes.

This prevents cheating and preserves simulation integrity.

---

# 34. Security Scope

Every gameplay request should verify:

* Authentication
* Authorization
* Party ownership
* Government authority
* Parliamentary authority
* Country membership
* Current political status

Players should only perform actions permitted by their political role.

---

# 35. Performance Targets

Pre-Alpha should prioritize consistency over raw speed.

Target characteristics:

* Fast dashboard loading
* Responsive UI
* Reliable simulation ticks
* Predictable API response times
* Stable multiplayer synchronization

Optimization should occur only after correctness has been established.

---

# 36. Logging & Auditing

Important political actions should generate audit records.

Examples:

* Party creation
* Elections
* Coalition formation
* Cabinet appointments
* Parliamentary votes
* Leadership changes
* Government collapse

Audit records improve debugging, moderation, and historical analysis.

---

# 37. Save Philosophy

The Political Desk uses a persistent database.

Players do not manually save progress.

The world continuously records political history.

The latest validated simulation state is always the current save.

---

# 38. Technical Completion Criteria

The technical scope of Pre-Alpha v0.1 is complete when:

✓ Persistent multiplayer world operates continuously.

✓ Multiple countries function simultaneously.

✓ Backend is authoritative.

✓ Political simulation remains deterministic where intended.

✓ AI institutions maintain inactive countries.

✓ Historical records persist.

✓ Frontend displays authoritative data only.

✓ Architecture supports future expansion without major redesign.

---

# End of Part 3

