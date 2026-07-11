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
