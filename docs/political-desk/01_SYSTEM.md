# System

This document outlines the core systems and mechanics of the Political Desk.
# 01_SYSTEM.md (Part 1 of 6)

# WORLDr Political Desk System Specification

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1
**Status:** Active Development
**Applies To:** Human Developers, AI Coding Assistants, Designers, Technical Contributors

---

# 1. Purpose

This document defines the permanent engineering philosophy, architectural principles, development standards, and decision-making framework for the **Political Desk** module of WORLDr.

It is the highest-level technical and design authority for this module.

Whenever implementation decisions conflict with convenience, speed, or personal preference, this document takes precedence.

Its objective is not merely to help build software, but to preserve the long-term vision and architectural integrity of the Political Desk throughout the lifetime of the project.

---

# 2. Scope

This document applies **only** to the Political Desk.

It governs every feature related to:

* Political parties
* Elections
* Governments
* Parliament
* Ministries
* Political media
* Political organizations
* Campaigns
* Laws
* Executive leadership
* Political UI
* Political gameplay
* Political databases
* Political APIs

It does **not** define implementation for:

* Economy
* Manufacturing
* Businesses
* Population Simulation
* Diplomacy
* Military
* Crime
* Healthcare
* Education
* Banking
* Trade
* Religion
* Transportation
* World Simulation

Future modules will maintain their own SYSTEM.md documents.

---

# 3. Role of Contributors

Every contributor—human or AI—is expected to behave as a long-term systems engineer rather than a short-term code generator.

Contributors are expected to:

* Protect architecture.
* Preserve scalability.
* Avoid unnecessary complexity.
* Avoid unnecessary simplification.
* Keep documentation synchronized with implementation.
* Respect existing design decisions.

The objective is to build a maintainable political simulation that can continue evolving over many years.

---

# 4. Project Identity

WORLDr is a persistent multiplayer world simulation.

The Political Desk is one module inside that world.

It is **not** intended to function as an isolated political game.

Instead, it represents one institutional layer within a larger simulated world.

Political decisions should eventually influence:

* Economy
* Population
* Businesses
* Education
* Healthcare
* Manufacturing
* Diplomacy
* Technology

Likewise, those systems should eventually influence politics.

The Political Desk must therefore remain modular and integration-ready.

---

# 5. Mission

The mission of the Political Desk is to create a political simulation where leadership is based on strategic decision-making rather than repetitive interaction.

Players should experience the challenges of:

* Building organizations.
* Winning elections.
* Governing institutions.
* Managing crises.
* Passing legislation.
* Balancing competing interests.
* Planning for long-term national success.

The Political Desk should reward thoughtful planning instead of mechanical repetition.

---

# 6. Long-Term Vision

The long-term vision is to create one of the deepest political management systems in gaming while remaining understandable and enjoyable.

The system should be capable of supporting:

* More than 75 playable countries.
* Multiple constitutional systems.
* Persistent multiplayer.
* Long-running political careers.
* AI-driven institutions.
* Emergent political history.

Every implementation should move the project closer to this vision.

---

# 7. Core Philosophy

The Political Desk follows seven foundational philosophies.

## PD-P-001 — Institutions Before Individuals

The simulation revolves around institutions.

Political parties.

Governments.

Parliament.

Cabinet.

Ministries.

Election commissions.

Media organizations.

The player leads institutions rather than personally performing every task.

---

## PD-P-002 — Leadership Over Micromanagement

Players should make strategic decisions.

Routine execution should be delegated to AI-controlled organizations wherever appropriate.

The player acts as:

* Party Leader
* Prime Minister
* President
* Opposition Leader

—not as every employee within those organizations.

---

## PD-P-003 — Decisions Create Consequences

Every significant decision must produce meaningful consequences.

Examples include:

* Coalition agreements.
* Budget priorities.
* Policy reforms.
* Minister appointments.
* Media responses.
* Campaign strategies.

Long-term consequences are more valuable than immediate rewards.

---

## PD-P-004 — Simulation Before Artificial Bonuses

Gameplay should emerge from interacting systems.

Incorrect approach:

* Education +5
* Economy +10

Preferred approach:

Education reform

↓

Budget approved

↓

Teachers recruited

↓

Schools improved

↓

Education quality increases

The simulation produces the outcome rather than assigning a direct bonus.

---

## PD-P-005 — Meaningful Complexity

Complexity should exist only when it creates interesting decisions.

Complexity added solely for realism should be avoided.

The objective is strategic depth, not bureaucracy.

---

## PD-P-006 — Persistent World

The world continues evolving while players are offline.

Departments continue working.

Media continues reporting.

Public opinion changes.

Projects advance.

Governments operate.

The player's absence should never pause the political world.

---

## PD-P-007 — Multiplayer First

Every feature should be evaluated from a multiplayer perspective before implementation.

Features that function only in single-player should not become architectural assumptions.

---

# 8. Design Principles

## PD-D-001 — Strategy Over Repetition

Gameplay should prioritize planning.

Players should not repeatedly click identical actions to make progress.

---

## PD-D-002 — Information Creates Decisions

Information exists to help players make better decisions.

Dashboards should explain situations.

They should never overwhelm the player with unnecessary statistics.

---

## PD-D-003 — Every Screen Needs Purpose

Every interface must answer one question:

"What important decision does this screen help the player make?"

Screens without meaningful decisions should not exist.

---

## PD-D-004 — Realism Supports Gameplay

Realism is valuable only when it improves decision-making or immersion.

If realism creates repetitive administration without adding strategy, it should be reconsidered.

---

## PD-D-005 — Transparency

Players should understand:

* Why something happened.
* Which systems influenced it.
* Which decisions created it.

Hidden randomness should be minimized.

---

# 9. Multiplayer Principles

## PD-M-001

One human player controls exactly one political party.

---

## PD-M-002

One political party has exactly one human leader.

---

## PD-M-003

Remaining party members are AI.

---

## PD-M-004

Competition occurs between political parties.

Internal multiplayer party management is outside the scope of Pre-Alpha v0.1.

---

## PD-M-005

The political simulation continues continuously.

No player can pause a country.

---

## PD-M-006

Every country follows its own constitutional configuration.

Political systems must remain configurable rather than hardcoded.

---

# 10. Engineering Philosophy

## PD-E-001 — Architecture Before Features

A correct architecture is more valuable than quickly implementing additional mechanics.

---

## PD-E-002 — Configuration Over Hardcoding

Gameplay systems should obtain country-specific behavior through configuration.

Example:

Preferred:

Election Configuration

Constitution Rules

Government Structure

Avoid:

Hardcoded country checks inside gameplay logic.

---

## PD-E-003 — Modularity

Every major political system should be independently maintainable.

Examples:

* Elections
* Parliament
* Cabinet
* Ministries
* Media
* Campaigns

Each system should communicate through clearly defined interfaces.

---

## PD-E-004 — Single Source of Truth

Gameplay data should exist in one authoritative location.

Duplicate state should be avoided.

---

## PD-E-005 — Scalability

Every implementation should assume future expansion.

If a system works for one country but cannot reasonably support seventy-five countries, it requires redesign.

---

# 11. Non-Negotiable Rules

The following principles are mandatory.

They may only change through a documented architecture decision.

### PD-N-001

One human player equals one political party.

### PD-N-002

One political party equals one human leader.

### PD-N-003

AI manages routine organizational work.

### PD-N-004

The world simulation never pauses.

### PD-N-005

Political systems must remain multiplayer compatible.

### PD-N-006

Country behavior must be configurable.

### PD-N-007

No feature may knowingly introduce architectural debt without explicit approval.

### PD-N-008

Documentation must remain synchronized with implementation.

### PD-N-009

Design consistency is more important than rapid feature growth.

---

# 12. Success Criteria

A feature should be considered successful only if it satisfies all of the following:

* Fits within the Political Desk scope.
* Respects the architecture defined by this document.
* Integrates cleanly with existing systems.
* Preserves multiplayer compatibility.
* Is understandable by future contributors.
* Can scale to the long-term vision of WORLDr.
* Does not introduce unnecessary duplication or technical debt.
* Creates meaningful gameplay decisions rather than repetitive interaction.

Any implementation that fails one or more of these criteria should be revised before being considered complete.

---

**End of Part 1**

The next part will define contributor behavior, AI implementation rules, documentation standards, review procedures, and the development workflow that every future Political Desk feature must follow.

# 01_SYSTEM.md (Part 2A of 7)

# Engineering Authority & AI Decision Framework

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 13. Authority Hierarchy

## Purpose

Large software projects fail when different documents, developers, or AI assistants follow different sources of truth.

To prevent architectural drift, every implementation must follow a fixed hierarchy of authority.

Whenever two instructions conflict, contributors shall follow the higher authority.

---

## PD-AUTH-001 — Authority Order

The following order is mandatory.

```
SYSTEM.md
        ↓
Architecture Decision Records (ADR)
        ↓
Political Rules
        ↓
Version Scope
        ↓
Gameplay Documents
        ↓
UI Guidelines
        ↓
Database Guidelines
        ↓
Coding Guidelines
        ↓
Current Development Task
        ↓
Temporary Chat Instructions
```

Lower-level instructions must never override higher-level documentation.

---

## PD-AUTH-002 — Documentation Is Canonical

Documentation is considered the canonical definition of the Political Desk.

Implementation must follow documentation.

Documentation should never be rewritten simply to match incorrect code.

If implementation and documentation disagree:

1. Determine which is correct.
2. Update the incorrect artifact.
3. Record architectural changes when necessary.

---

# 14. Contributor Identity

Every contributor should think like a **Lead Systems Engineer**, not a code generator.

The objective is not merely to finish tasks.

The objective is to build a political simulation that remains maintainable for years.

Every implementation should improve the project.

No implementation should knowingly reduce long-term quality.

---

## PD-ID-001

Contributors are architects before programmers.

Architecture always has higher priority than implementation speed.

---

## PD-ID-002

Contributors protect the project.

They do not merely write code.

They protect:

* Consistency
* Maintainability
* Scalability
* Multiplayer compatibility
* Documentation quality

---

## PD-ID-003

Every implementation should leave the codebase in a better condition than it was found.

---

# 15. Decision Framework

Before implementing any feature, contributors must follow the decision framework below.

No implementation should skip these questions.

---

## Step 1 — Scope Validation

Ask:

Does this belong inside the Political Desk?

If no,

Do not implement it.

Instead reference the appropriate future module.

---

## Step 2 — Architecture Validation

Ask:

Does this violate any architecture rule?

If yes,

Stop.

Propose alternatives.

Do not silently change architecture.

---

## Step 3 — Multiplayer Validation

Ask:

Will this continue working inside a persistent multiplayer world?

If no,

Redesign.

---

## Step 4 — Integration Validation

Ask:

Does an existing system already solve this problem?

If yes,

Extend the existing system.

Never duplicate functionality.

---

## Step 5 — Scalability Validation

Ask:

Can this design support seventy-five or more countries?

Can it support future constitutional systems?

Can it support additional gameplay modules?

If the answer is no,

Redesign before implementation.

---

## Step 6 — Maintainability Validation

Ask:

Will another developer understand this implementation after six months?

If not,

Simplify the implementation.

Not the gameplay.

---

## Step 7 — Documentation Validation

Ask:

Does this change require documentation updates?

If yes,

Documentation becomes part of the implementation.

The feature is incomplete until documentation is updated.

---

# 16. Core Engineering Principles

---

## PD-ENG-001

Architecture before Features

Requirement

Never compromise architecture to implement features faster.

Reason

Features can always be added later.

Architecture becomes increasingly difficult to change.

---

## PD-ENG-002

Systems before Screens

Gameplay systems should exist independently of user interfaces.

The UI presents information.

It should never contain gameplay logic.

---

## PD-ENG-003

Simulation before Presentation

Simulation is the source of truth.

Animations.

Dashboards.

Visualizations.

Notifications.

All derive from simulation.

Never the opposite.

---

## PD-ENG-004

Configuration before Hardcoding

Country-specific behavior must be configurable.

Incorrect

```
if(country=="India"){
...
}
```

Correct

```
ElectionConfiguration

↓

Country Constitution

↓

Election System
```

---

## PD-ENG-005

Composition before Duplication

If two systems share logic,

Extract reusable components.

Avoid copying logic between systems.

---

## PD-ENG-006

Single Responsibility

Every major system should have one clearly defined purpose.

Examples

Election System

Conduct elections.

Media System

Manage information flow.

Parliament System

Manage legislative processes.

Avoid systems responsible for unrelated functionality.

---

# 17. AI Operating Principles

These rules apply to every AI assistant working on the Political Desk.

---

## PD-AI-001

Never invent mechanics.

If documentation does not define behavior,

Ask for clarification.

---

## PD-AI-002

Never silently redesign systems.

Large architectural changes require explicit approval.

---

## PD-AI-003

Never reduce gameplay depth solely because implementation appears difficult.

Engineering challenges should be solved through better engineering.

Not by reducing the design.

---

## PD-AI-004

Never optimize prematurely.

Correctness.

Architecture.

Maintainability.

These always come before optimization.

---

## PD-AI-005

Never assume requirements.

Explicit requirements override assumptions.

---

## PD-AI-006

When multiple valid implementations exist,

Present trade-offs before selecting one.

---

## PD-AI-007

If uncertainty exists,

Pause implementation.

Explain the uncertainty.

Request clarification.

---

# 18. Communication Standards

Contributors should communicate using engineering reasoning.

Avoid statements like

"This is better."

Instead explain

* Why.
* Trade-offs.
* Benefits.
* Risks.
* Long-term impact.

Every recommendation should be technically justified.

---

## PD-COM-001

When proposing architecture changes,

Always include:

Purpose

Advantages

Disadvantages

Migration impact

Compatibility impact

---

## PD-COM-002

If rejecting an implementation,

Explain which architectural principle it violates.

Never reject without explanation.

---

# 19. Architectural Integrity

The Political Desk is intended to evolve over many years.

Small shortcuts accumulate into major technical debt.

Every contributor shares responsibility for protecting long-term quality.

Before completing any implementation,

Ask one final question:

> "Will this decision still make sense after the Political Desk contains hundreds of interconnected systems and supports more than seventy-five countries?"

If the answer is uncertain,

The implementation should be reviewed before acceptance.

---

# End of Part 2A

The next section (**Part 2B**) will establish the practical engineering standards: coding conventions, documentation workflow, database philosophy, API design, error handling, testing expectations, feature acceptance criteria, and the complete Definition of Done for every Political Desk feature.

# 01_SYSTEM.md (Part 2B of 7)

# Engineering Standards & Development Workflow

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 20. Software Engineering Standards

## Purpose

The Political Desk is expected to evolve into a large, persistent multiplayer simulation consisting of many interconnected systems.

As the codebase grows, consistency becomes more valuable than speed.

These standards define the minimum engineering quality expected from every implementation.

Every contributor, whether human or AI, shall follow these standards.

---

# 21. Coding Principles

## PD-CODE-001 — Readability Before Cleverness

### Requirement

Code shall be written for long-term maintainability rather than short-term brevity.

### Reason

Future contributors should understand the purpose of code without reverse engineering complex logic.

### Preferred

* Descriptive variable names.
* Small focused functions.
* Explicit logic.
* Clear separation of responsibilities.

### Avoid

* Cryptic variable names.
* Nested conditional chains.
* Large monolithic functions.
* Hidden side effects.

---

## PD-CODE-002 — Single Responsibility Principle

Every module, service, component, and class should have one primary responsibility.

Examples

Election Service

Conducts elections.

Media Service

Processes political news.

Parliament Service

Handles legislation.

Do not mix unrelated responsibilities.

---

## PD-CODE-003 — Reusable Systems

When similar logic appears multiple times, create reusable abstractions instead of duplicating code.

Examples

Validation

Permission checking

Date calculations

Political calculations

Simulation utilities

Reusable code improves consistency and reduces maintenance cost.

---

## PD-CODE-004 — Explicit Naming

Names should clearly communicate intent.

Good Examples

PartyService

ElectionManager

GovernmentDashboard

CabinetAppointment

MediaCoverageEngine

Poor Examples

Manager

Helper

Utils

Data

Controller2

---

## PD-CODE-005 — Predictable Behavior

Functions should produce predictable outputs for the same inputs whenever possible.

Avoid hidden dependencies and unexpected side effects.

Simulation systems should remain deterministic unless randomness is intentionally introduced.

---

# 22. Database Standards

## PD-DB-001 — Single Source of Truth

Every piece of gameplay information should exist in one authoritative location.

Duplicate state should be avoided.

---

## PD-DB-002 — Referential Integrity

Relationships between political entities must be enforced through database constraints.

Examples

Party → Leader

Government → Cabinet

Cabinet → Ministry

Election → Country

Parliament → Legislative Session

---

## PD-DB-003 — Normalize First

Normalize relational data before considering denormalization.

Only denormalize when measurable performance benefits justify the additional complexity.

---

## PD-DB-004 — Future Compatibility

Database schemas should support:

* Additional countries.
* Additional constitutions.
* Additional ministries.
* Additional elections.
* Future gameplay systems.

Avoid schemas that assume a fixed number of entities.

---

## PD-DB-005 — Avoid Business Logic in the Database

The database stores data.

Application services execute gameplay logic.

Triggers and stored procedures should be used only where they clearly improve consistency or integrity.

---

# 23. API Standards

## PD-API-001

Each endpoint should have one clearly defined responsibility.

---

## PD-API-002

Endpoints should expose domain concepts rather than database tables.

Example

Correct

Create Political Party

Incorrect

Insert Party Record

---

## PD-API-003

Every endpoint should perform validation before modifying persistent state.

---

## PD-API-004

Return structured, meaningful error messages.

Avoid ambiguous failures.

---

## PD-API-005

Business rules belong inside services, not inside controllers or routes.

---

# 24. User Interface Standards

The Political Desk is professional software.

It is not an arcade game.

The interface should resemble executive dashboards used by governments and organizations.

---

## PD-UI-001 — Information Before Decoration

Every screen exists to support decision-making.

Visual decoration must never reduce clarity.

---

## PD-UI-002 — Dashboard First

Players should understand the current political situation within seconds of opening the game.

Dashboards should prioritize:

* Active issues.
* Pending decisions.
* Urgent events.
* National indicators.
* Notifications requiring action.

---

## PD-UI-003 — Consistency

Navigation, typography, spacing, colors, and interaction patterns should remain consistent across the entire Political Desk.

---

## PD-UI-004 — Progressive Disclosure

Do not overwhelm players with every available detail.

Present summaries first.

Allow deeper exploration through drill-down interfaces.

---

## PD-UI-005 — Decision-Oriented Design

Every major screen should answer at least one strategic question.

Examples

What requires my attention?

Which bill should I support?

Which ministry is underperforming?

What threatens my government?

---

# 25. Error Handling Standards

Errors should help contributors understand problems rather than simply indicate failure.

---

## PD-ERR-001

Errors should clearly explain:

What happened.

Why it happened.

How it can be resolved.

---

## PD-ERR-002

Unexpected failures should never corrupt simulation state.

---

## PD-ERR-003

Recoverable errors should allow the player to continue whenever possible.

---

## PD-ERR-004

Critical failures should generate logs containing sufficient diagnostic information for investigation.

---

# 26. Documentation Workflow

Documentation is part of development.

Implementation is not complete until documentation has been updated.

---

## PD-DOC-001

Every new feature requires documentation.

---

## PD-DOC-002

Every architectural change requires an Architecture Decision Record.

---

## PD-DOC-003

Every gameplay rule change requires updates to the appropriate design documentation.

---

## PD-DOC-004

Documentation should explain:

Purpose.

Design reasoning.

Constraints.

Integration points.

Future expansion.

---

# 27. Feature Development Workflow

Every Political Desk feature should follow this sequence.

```text
Problem Definition
        ↓
Requirement Analysis
        ↓
Architecture Review
        ↓
Gameplay Design
        ↓
Documentation Update
        ↓
Database Design
        ↓
Backend Implementation
        ↓
Frontend Implementation
        ↓
Testing
        ↓
Code Review
        ↓
Documentation Verification
        ↓
Release
```

Skipping stages increases architectural risk.

---

# 28. Testing Philosophy

Testing should verify systems rather than individual lines of code.

Priority should be given to validating gameplay behavior.

Examples

Election produces correct winner.

Government formation follows constitutional rules.

Bills move correctly through Parliament.

Media reacts to political events.

Cabinet appointments update government structure.

Focus on validating complete workflows.

---

# 29. Feature Acceptance Criteria

Before a feature is considered complete, verify the following.

### Architecture

✓ Respects SYSTEM.md

✓ Preserves modularity

✓ Supports multiplayer

---

### Gameplay

✓ Creates meaningful decisions

✓ Integrates with existing systems

✓ Avoids unnecessary repetition

---

### Code

✓ Readable

✓ Reusable

✓ Well-structured

✓ No duplicated logic

---

### Database

✓ Proper relationships

✓ Future-proof

✓ Consistent

---

### UI

✓ Decision-oriented

✓ Consistent

✓ Clear

---

### Documentation

✓ Updated

✓ Accurate

✓ Complete

---

# 30. Definition of Done

A Political Desk feature is complete only when every condition below is satisfied.

* Functional requirements implemented.
* Architecture preserved.
* Multiplayer compatibility maintained.
* Existing systems integrated correctly.
* Documentation updated.
* Testing completed.
* No duplicated logic introduced.
* Database integrity maintained.
* User interface consistent with project standards.
* Code reviewed for maintainability.

If any requirement remains incomplete, the feature shall be considered **Work in Progress**, not finished.

---

# 31. Final Engineering Principle

The Political Desk is expected to evolve continuously over many years.

Every implementation should make future development easier rather than harder.

When uncertainty exists, contributors should choose the solution that best protects:

1. Architecture
2. Multiplayer compatibility
3. Simulation depth
4. Maintainability
5. Scalability
6. Developer experience
7. Player experience

Long-term quality always outweighs short-term convenience.

---

**End of Part 2B**

# 01_SYSTEM.md (Part 3 of 7)

# Architecture Protection & Long-Term Scalability

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 32. Purpose

The Political Desk is expected to remain under active development for many years.

As the project grows, the greatest threat is not bugs.

The greatest threat is **architectural drift**.

Architectural drift occurs when many individually "reasonable" decisions slowly move the project away from its original design philosophy.

This section defines permanent protection rules.

These rules exist to preserve the integrity of the Political Desk regardless of how many contributors work on the project.

---

# 33. Protected Architectural Principles

The following principles are considered **Architectural Invariants**.

These may only be changed through an approved Architecture Decision Record (ADR).

---

## PD-ARCH-001

### One Human Player Controls One Political Party

Status

Protected

Requirement

Every human player controls exactly one political party.

Reason

This provides clear ownership, simplifies multiplayer coordination, eliminates internal human party conflicts, and scales efficiently.

Changing this rule affects almost every gameplay system.

---

## PD-ARCH-002

### One Political Party Has One Human Leader

Status

Protected

Requirement

A political party has one human leader.

All remaining party officials are AI.

Reason

The Political Desk simulates leadership rather than internal multiplayer administration.

---

## PD-ARCH-003

### Persistent World Simulation

Status

Protected

Requirement

Countries continue operating regardless of player activity.

Governments continue governing.

Media continues reporting.

Projects continue progressing.

No player action pauses the simulation.

---

## PD-ARCH-004

### Institutions Execute Work

Status

Protected

Requirement

Players make strategic decisions.

Institutions perform operational work.

Examples

Cabinet

Ministries

Election Commission

Parliament

Media

Government Departments

Reason

The player should lead institutions.

The player should never replace institutions.

---

## PD-ARCH-005

### Systems Produce Outcomes

Status

Protected

Requirement

Simulation systems generate results.

Avoid direct numerical rewards whenever realistic simulation can produce equivalent outcomes.

Example

Avoid

Education +5

Prefer

Education Reform

↓

Funding

↓

Construction

↓

Teachers

↓

Education Quality

---

# 34. Expansion Principles

Every new feature should answer these questions before implementation.

---

## Integration

Which existing systems should this interact with?

---

## Ownership

Which organization owns this responsibility?

Party

Government

Ministry

Parliament

Media

Election Commission

---

## Authority

Who is responsible?

Human Player

AI Department

Cabinet

Institution

---

## Timing

How often does this occur?

Real Time

Daily

Weekly

Monthly

Election Cycle

On Demand

---

## Scalability

Will this continue working when:

75 countries exist?

Thousands of players exist?

Hundreds of governments exist?

If not,

Redesign.

---

# 35. Anti-Patterns

The following patterns are prohibited.

---

## PD-ANTI-001

### Hardcoded Country Logic

Incorrect

```text
if(country=="India")
```

Reason

Every country should use configuration.

Never country-specific programming.

---

## PD-ANTI-002

### Duplicate Systems

Do not create:

Two election engines.

Two media systems.

Two parliament systems.

Extend existing systems instead.

---

## PD-ANTI-003

### UI Controls Simulation

The interface displays information.

It must never become the source of gameplay logic.

Simulation exists independently.

---

## PD-ANTI-004

### Direct Database Manipulation

Gameplay should modify state through services.

Not through scattered database operations.

---

## PD-ANTI-005

### God Objects

Avoid massive classes responsible for many unrelated systems.

Large responsibilities should be divided into focused modules.

---

## PD-ANTI-006

### Hidden Dependencies

Every dependency should be explicit.

Systems should not unexpectedly depend upon unrelated modules.

---

## PD-ANTI-007

### Circular Dependencies

Module A

↓

Module B

↓

Module C

↓

Module A

This architecture is prohibited.

---

# 36. Future Compatibility

Every implementation should remain compatible with future modules.

Political systems should expose interfaces rather than assumptions.

Future examples

Economy

Manufacturing

Population

Crime

Diplomacy

Military

Trade

Education

Healthcare

The Political Desk should communicate with these systems rather than embed their logic.

---

## Example

Correct

Government requests unemployment statistics.

Economy module calculates unemployment.

Political Desk receives results.

Incorrect

Political Desk calculates unemployment itself.

---

# 37. Scalability Philosophy

The Political Desk should never assume:

A fixed number of:

Countries

Political parties

Elections

Government ministries

Cabinet positions

Political ideologies

Media organizations

Political systems

Every implementation should support future expansion through configuration.

---

# 38. Evolution Philosophy

The Political Desk is expected to change.

Architecture should support growth without requiring complete rewrites.

When introducing new features,

Prefer:

Extension

Instead of:

Replacement

Example

Add new election systems.

Do not rewrite the election engine.

Add new constitutional rules.

Do not duplicate constitutional logic.

---

# 39. Decision Escalation

If contributors discover a decision that could significantly affect architecture,

Implementation should pause.

Instead,

Create an Architecture Decision Proposal.

Include

Problem

Options

Advantages

Disadvantages

Compatibility

Migration Cost

Recommendation

Major architectural changes should never occur silently.

---

# 40. Long-Term Project Philosophy

Every contributor should remember one principle.

The objective is not simply to complete Pre-Alpha v0.1.

The objective is to build a political simulation capable of continuous evolution for many years.

Short-term speed should never compromise long-term quality.

Every feature added today should make tomorrow's development easier.

Every architectural decision should make future systems easier to integrate.

Every improvement should strengthen the foundation rather than increase technical debt.

The Political Desk is intended to become one module within a much larger persistent simulated world.

Protecting that vision is the responsibility of every contributor.

---

# End of Part 3

# 01_SYSTEM.md (Part 4 of 7)

# Game System Philosophy & Simulation Framework

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 41. Purpose

The Political Desk is not a collection of independent mechanics.

It is a living political ecosystem.

Every system should influence other systems through clearly defined interactions rather than isolated bonuses.

The objective is to create emergent political gameplay where player decisions generate believable consequences across the political landscape.

---

# 42. The Simulation Chain

Every major political action should follow the same philosophy.

A player does not directly change the world.

Instead, the player changes institutions.

Institutions change behavior.

Behavior changes outcomes.

Outcomes change the world.

The preferred chain is:

```text
Player Decision
        ↓
Institution Receives Decision
        ↓
Institution Executes Action
        ↓
Simulation Processes Results
        ↓
Media Reports Outcome
        ↓
Citizens React
        ↓
Political Support Changes
        ↓
Future Decisions Become Easier or Harder
```

Never skip directly from player action to final outcome unless absolutely necessary.

---

# 43. System Interaction Rules

Every new political feature should identify:

### Inputs

Which systems provide information?

Examples:

* Elections
* Media
* Parliament
* Ministries
* Government
* Political Parties

---

### Outputs

Which systems receive the results?

Examples:

* Public Opinion
* Elections
* Government Approval
* Party Popularity
* Parliamentary Support

Every feature should clearly define both inputs and outputs.

---

# 44. Player Responsibility

The player represents political leadership.

The player does **not** represent:

* Every politician
* Every civil servant
* Every journalist
* Every voter
* Every government employee

The player sets direction.

Organizations perform execution.

---

## Protected Leadership Principle

The player should spend most gameplay time making decisions that only a national political leader could make.

Avoid giving players repetitive administrative tasks.

---

# 45. Information Philosophy

Information is a gameplay resource.

The challenge should not be finding information.

The challenge should be deciding what to do with it.

Therefore:

* Dashboards summarize.
* Reports explain.
* Notifications prioritize.
* Details remain available on demand.

Avoid overwhelming the player with unnecessary data.

---

# 46. Decision Quality

Every meaningful decision should satisfy four requirements.

### Visibility

The player understands the decision.

### Trade-Off

There is no universally correct option.

### Consequence

The decision has measurable effects.

### Memory

The simulation remembers the decision and may reference it later.

If one of these elements is missing, reconsider the mechanic.

---

# 47. Consequence Philosophy

Political consequences should emerge naturally.

Examples of preferred chains:

Campaign Promise

↓

Election Victory

↓

Government Forms

↓

Promise Not Fulfilled

↓

Media Questions Government

↓

Public Trust Declines

↓

Election Becomes More Difficult

Avoid artificial penalties such as:

"Broken Promise = -10 Popularity"

Instead, allow multiple systems to contribute to the outcome.

---

# 48. Time Philosophy

The Political Desk operates within a persistent multiplayer world.

Time is continuous.

The simulation should never require every player to be online simultaneously.

Whenever possible:

* AI institutions continue working.
* Scheduled processes execute automatically.
* Reports accumulate.
* Players return to a changing political environment.

---

# 49. Event Philosophy

Events should exist for one of three reasons.

## Reactive Events

Generated by player actions.

Examples:

* Cabinet resignation.
* Coalition collapse.
* Budget rejection.

---

## System Events

Generated by simulation.

Examples:

* Inflation rises.
* Flood damages infrastructure.
* Energy shortage.

---

## Scheduled Events

Generated by constitutional or gameplay rules.

Examples:

* Elections.
* Parliamentary sessions.
* Budget presentation.
* Party conferences.

Avoid random events that exist only to surprise the player.

---

# 50. Complexity Framework

Complexity is valuable only when it improves strategic depth.

Before adding a mechanic, ask:

Does this create meaningful decisions?

If no,

Do not implement it.

Examples of useful complexity:

* Coalition negotiations.
* Cabinet appointments.
* Legislative bargaining.
* Media strategy.

Examples of unnecessary complexity:

* Requiring five clicks for one obvious action.
* Entering information that never affects gameplay.
* Repeating identical tasks without strategic value.

---

# 51. Emergent Gameplay

The Political Desk should encourage stories that arise naturally from simulation.

For example:

A coalition partner withdraws support.

↓

Government loses majority.

↓

Opposition introduces a confidence vote.

↓

Media predicts collapse.

↓

Emergency negotiations begin.

↓

Government survives by one vote.

None of these outcomes should require a scripted scenario.

They should emerge from interacting systems.

---

# 52. AI Philosophy

AI organizations should behave according to objectives rather than scripts.

Examples:

Political Party

Objectives:

* Win elections.
* Increase influence.
* Maintain party unity.

Media Organization

Objectives:

* Publish news.
* Protect credibility.
* Grow audience.

Government

Objectives:

* Maintain stability.
* Implement policies.
* Preserve parliamentary support.

This creates more believable long-term behavior.

---

# 53. Modularity

Every political system should be replaceable without rewriting unrelated systems.

Example:

Replacing the election algorithm should not require changes to:

* Parliament
* Media
* Cabinet
* Ministries

Each system communicates through defined interfaces.

---

# 54. Future Expansion

The Political Desk is designed to integrate with future simulation modules.

Examples include:

* Economy
* Manufacturing
* Population
* Crime
* Military
* Diplomacy
* Healthcare
* Education
* Technology

The Political Desk should request information from these systems rather than calculating it internally.

Each module owns its own simulation.

---

# 55. Final Principle

The Political Desk should never feel like a menu-driven management application.

It should feel like leading a living political organization inside a persistent world.

Every decision should:

* Influence multiple systems.
* Create future opportunities or challenges.
* Leave a lasting political history.
* Encourage strategic planning.

The player should remember the consequences of their leadership long after individual decisions have been made.

---

# End of Part 4


# 01_SYSTEM.md (Part 4 of 7)

# Game System Philosophy & Simulation Framework

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 41. Purpose

The Political Desk is not a collection of independent mechanics.

It is a living political ecosystem.

Every system should influence other systems through clearly defined interactions rather than isolated bonuses.

The objective is to create emergent political gameplay where player decisions generate believable consequences across the political landscape.

---

# 42. The Simulation Chain

Every major political action should follow the same philosophy.

A player does not directly change the world.

Instead, the player changes institutions.

Institutions change behavior.

Behavior changes outcomes.

Outcomes change the world.

The preferred chain is:

```text
Player Decision
        ↓
Institution Receives Decision
        ↓
Institution Executes Action
        ↓
Simulation Processes Results
        ↓
Media Reports Outcome
        ↓
Citizens React
        ↓
Political Support Changes
        ↓
Future Decisions Become Easier or Harder
```

Never skip directly from player action to final outcome unless absolutely necessary.

---

# 43. System Interaction Rules

Every new political feature should identify:

### Inputs

Which systems provide information?

Examples:

* Elections
* Media
* Parliament
* Ministries
* Government
* Political Parties

---

### Outputs

Which systems receive the results?

Examples:

* Public Opinion
* Elections
* Government Approval
* Party Popularity
* Parliamentary Support

Every feature should clearly define both inputs and outputs.

---

# 44. Player Responsibility

The player represents political leadership.

The player does **not** represent:

* Every politician
* Every civil servant
* Every journalist
* Every voter
* Every government employee

The player sets direction.

Organizations perform execution.

---

## Protected Leadership Principle

The player should spend most gameplay time making decisions that only a national political leader could make.

Avoid giving players repetitive administrative tasks.

---

# 45. Information Philosophy

Information is a gameplay resource.

The challenge should not be finding information.

The challenge should be deciding what to do with it.

Therefore:

* Dashboards summarize.
* Reports explain.
* Notifications prioritize.
* Details remain available on demand.

Avoid overwhelming the player with unnecessary data.

---

# 46. Decision Quality

Every meaningful decision should satisfy four requirements.

### Visibility

The player understands the decision.

### Trade-Off

There is no universally correct option.

### Consequence

The decision has measurable effects.

### Memory

The simulation remembers the decision and may reference it later.

If one of these elements is missing, reconsider the mechanic.

---

# 47. Consequence Philosophy

Political consequences should emerge naturally.

Examples of preferred chains:

Campaign Promise

↓

Election Victory

↓

Government Forms

↓

Promise Not Fulfilled

↓

Media Questions Government

↓

Public Trust Declines

↓

Election Becomes More Difficult

Avoid artificial penalties such as:

"Broken Promise = -10 Popularity"

Instead, allow multiple systems to contribute to the outcome.

---

# 48. Time Philosophy

The Political Desk operates within a persistent multiplayer world.

Time is continuous.

The simulation should never require every player to be online simultaneously.

Whenever possible:

* AI institutions continue working.
* Scheduled processes execute automatically.
* Reports accumulate.
* Players return to a changing political environment.

---

# 49. Event Philosophy

Events should exist for one of three reasons.

## Reactive Events

Generated by player actions.

Examples:

* Cabinet resignation.
* Coalition collapse.
* Budget rejection.

---

## System Events

Generated by simulation.

Examples:

* Inflation rises.
* Flood damages infrastructure.
* Energy shortage.

---

## Scheduled Events

Generated by constitutional or gameplay rules.

Examples:

* Elections.
* Parliamentary sessions.
* Budget presentation.
* Party conferences.

Avoid random events that exist only to surprise the player.

---

# 50. Complexity Framework

Complexity is valuable only when it improves strategic depth.

Before adding a mechanic, ask:

Does this create meaningful decisions?

If no,

Do not implement it.

Examples of useful complexity:

* Coalition negotiations.
* Cabinet appointments.
* Legislative bargaining.
* Media strategy.

Examples of unnecessary complexity:

* Requiring five clicks for one obvious action.
* Entering information that never affects gameplay.
* Repeating identical tasks without strategic value.

---

# 51. Emergent Gameplay

The Political Desk should encourage stories that arise naturally from simulation.

For example:

A coalition partner withdraws support.

↓

Government loses majority.

↓

Opposition introduces a confidence vote.

↓

Media predicts collapse.

↓

Emergency negotiations begin.

↓

Government survives by one vote.

None of these outcomes should require a scripted scenario.

They should emerge from interacting systems.

---

# 52. AI Philosophy

AI organizations should behave according to objectives rather than scripts.

Examples:

Political Party

Objectives:

* Win elections.
* Increase influence.
* Maintain party unity.

Media Organization

Objectives:

* Publish news.
* Protect credibility.
* Grow audience.

Government

Objectives:

* Maintain stability.
* Implement policies.
* Preserve parliamentary support.

This creates more believable long-term behavior.

---

# 53. Modularity

Every political system should be replaceable without rewriting unrelated systems.

Example:

Replacing the election algorithm should not require changes to:

* Parliament
* Media
* Cabinet
* Ministries

Each system communicates through defined interfaces.

---

# 54. Future Expansion

The Political Desk is designed to integrate with future simulation modules.

Examples include:

* Economy
* Manufacturing
* Population
* Crime
* Military
* Diplomacy
* Healthcare
* Education
* Technology

The Political Desk should request information from these systems rather than calculating it internally.

Each module owns its own simulation.

---

# 55. Final Principle

The Political Desk should never feel like a menu-driven management application.

It should feel like leading a living political organization inside a persistent world.

Every decision should:

* Influence multiple systems.
* Create future opportunities or challenges.
* Leave a lasting political history.
* Encourage strategic planning.

The player should remember the consequences of their leadership long after individual decisions have been made.

---

# End of Part 4

# 01_SYSTEM.md (Part 5 of 7)

# Module Ownership, Boundaries & Integration Contracts

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 56. Purpose

The WORLDr simulation will eventually contain many independent modules.

Examples include:

* Economy
* Manufacturing
* Population
* Military
* Diplomacy
* Crime
* Healthcare
* Education
* Banking
* Transportation
* Technology

Without strict ownership rules, multiple modules will begin calculating the same concepts, resulting in inconsistent data and architectural drift.

This document defines the responsibilities of the Political Desk and its interaction with the rest of the simulation.

---

# 57. Ownership Principle

## PD-OWN-001

Every gameplay concept shall have exactly one owning module.

The owning module is responsible for:

* Creating data.
* Updating data.
* Validating rules.
* Providing APIs.
* Maintaining simulation.

Other modules may read the data but must not calculate or overwrite it.

---

# 58. Political Desk Responsibilities

The Political Desk owns the following systems.

### Political Parties

* Party creation
* Party leadership
* Party ideology
* Party membership
* Party organization
* Party popularity
* Campaign planning

---

### Elections

* Election scheduling
* Candidate registration
* Campaign participation
* Voting process
* Result calculation
* Seat allocation

---

### Government

* Government formation
* Coalition management
* Cabinet
* Ministries
* Executive leadership
* Confidence votes
* Government stability

---

### Parliament

* Bills
* Legislative sessions
* Voting
* Parliamentary procedures
* Committees
* Parliamentary majority

---

### Political Media

* Political news
* Press conferences
* Political interviews
* Government announcements
* Election coverage

---

### Political Reputation

* Party credibility
* Leader reputation
* Government approval
* Opposition influence

---

### Political Organizations

* Election Commission
* Parliament
* Cabinet
* Ministries
* Political Parties

---

# 59. Systems NOT Owned by Political Desk

The Political Desk must never become responsible for simulations owned by other modules.

Examples:

### Economy Module

Owns:

* GDP
* Inflation
* Employment
* Trade
* Tax revenue
* National budget calculations

Political Desk may propose economic policies, but the Economy Module determines their economic effects.

---

### Population Module

Owns:

* Population growth
* Demographics
* Migration
* Education level
* Health level
* Household composition

Political decisions may influence these systems, but the Population Module performs the simulation.

---

### Military Module

Owns:

* Armed forces
* Equipment
* Readiness
* Logistics
* Combat

Political Desk authorizes military decisions but does not simulate military operations.

---

### Diplomacy Module

Owns:

* International relations
* Treaties
* Alliances
* Sanctions
* Negotiations

Political Desk selects diplomatic direction while the Diplomacy Module executes the simulation.

---

# 60. Communication Rules

Modules communicate only through defined interfaces.

Direct modification of another module's internal state is prohibited.

Correct:

Political Desk

↓

Economy API

↓

Economy updates GDP

↓

Economy returns results

Incorrect:

Political Desk

↓

Directly modifies GDP database values

---

# 61. Event Ownership

Every event belongs to one owning module.

Example:

Election Result

Owner:

Political Desk

Economic Recession

Owner:

Economy

War Declaration

Owner:

Diplomacy

Earthquake

Owner:

World Events

The owner generates the event.

Other modules react to it.

---

# 62. Shared Data Philosophy

Some information will be visible across multiple modules.

Examples:

Prime Minister

National Budget

Government Approval

Population

GDP

Although many systems may display these values, only one module owns each value.

This prevents contradictory information.

---

# 63. Integration Contracts

Every future module should integrate with the Political Desk through requests rather than direct manipulation.

Examples:

Economy notifies Political Desk that unemployment has increased.

Political Desk updates public opinion.

Population reports demographic shifts.

Political Desk adjusts voter blocs.

Diplomacy reports an international crisis.

Political Desk schedules an emergency cabinet meeting.

The Political Desk reacts.

It does not own those simulations.

---

# 64. Future-Proofing Rules

The Political Desk must never assume:

* A fixed number of ministries.
* A fixed number of parties.
* A fixed number of elections.
* A fixed number of parliamentary chambers.
* A single constitutional system.
* A single electoral system.
* A single ideology model.

Every implementation must remain configurable.

---

# 65. Stable Public Interfaces

Any service exposed by the Political Desk should be treated as a public contract.

Breaking changes should be avoided.

When unavoidable:

1. Document the change.
2. Explain the reason.
3. Provide a migration strategy.
4. Update dependent documentation.

---

# 66. Cross-Module Principles

When integrating with another module:

* Exchange only the required information.
* Avoid exposing internal implementation details.
* Prefer domain events over direct database access.
* Maintain loose coupling.
* Preserve module independence.

A module should be replaceable without forcing major rewrites to unrelated systems.

---

# 67. Architectural Promise

The Political Desk makes the following promise to every future module:

* It will own political simulation and nothing else.
* It will expose stable interfaces.
* It will remain configurable.
* It will remain multiplayer compatible.
* It will never duplicate another module's responsibilities.

Likewise, every future module is expected to follow the same ownership philosophy.

---

# End of Part 5

# 01_SYSTEM.md (Part 6 of 6)

# Governance, Change Management & Constitutional Principles

**Project:** WORLDr
**Module:** Political Desk
**Document Version:** Pre-Alpha v0.1

---

# 68. Purpose

The Political Desk is intended to evolve continuously over many years.

During long-term development, the greatest risk is not adding features.

The greatest risk is making small, inconsistent changes that gradually weaken the architecture.

This section defines how the Political Desk evolves while preserving its original vision.

---

# 69. Architecture Decision Records (ADR)

## PD-ADR-001 — When an ADR Is Required

An Architecture Decision Record (ADR) must be created before any change that affects:

* Core gameplay architecture
* Multiplayer assumptions
* Database architecture
* Public APIs
* Module ownership
* Protected architectural principles
* Save-game compatibility
* Simulation timing
* Cross-module communication

Minor implementation details do not require an ADR.

---

## PD-ADR-002 — ADR Template

Every ADR should contain:

1. Decision ID
2. Title
3. Date
4. Status
5. Context
6. Problem Statement
7. Options Considered
8. Selected Solution
9. Advantages
10. Disadvantages
11. Migration Plan
12. Compatibility Impact
13. Related Documents

---

## PD-ADR-003 — ADR Status

Each ADR shall have one of the following states:

* Proposed
* Accepted
* Implemented
* Deprecated
* Superseded

Only **Accepted** ADRs may change architectural rules.

---

# 70. Change Management

Every significant change should follow the same process.

```text
Problem Identified
        ↓
Research
        ↓
Architecture Discussion
        ↓
ADR Created
        ↓
Review
        ↓
Approval
        ↓
Implementation
        ↓
Documentation Update
        ↓
Testing
        ↓
Release
```

Architecture should never change through undocumented implementation.

---

# 71. Versioning Policy

Documentation should use semantic versioning.

Examples:

* v0.1 – Initial Pre-Alpha
* v0.2 – Feature Expansion
* v0.5 – Feature Complete Pre-Alpha
* v1.0 – Stable Release

Every version should include a changelog describing:

* Added features
* Modified behavior
* Removed functionality
* Architectural changes

---

# 72. Deprecation Policy

Sometimes systems must be replaced.

Deprecated systems should not be removed immediately.

Instead:

1. Mark as deprecated.
2. Document the reason.
3. Provide a replacement.
4. Complete migration.
5. Remove only after dependent systems are updated.

This minimizes disruption.

---

# 73. Technical Debt Policy

Technical debt is sometimes unavoidable, but it must never become invisible.

Every intentional shortcut should include:

* Reason
* Scope
* Risks
* Expected resolution
* Target milestone

Hidden technical debt is prohibited.

---

# 74. Risk Assessment

Before implementing major features, evaluate:

### Architectural Risk

Will this increase coupling?

### Multiplayer Risk

Will this create synchronization issues?

### Scalability Risk

Will this still work with 75+ countries?

### Performance Risk

Will this significantly increase simulation cost?

### Maintenance Risk

Will future contributors understand it?

If risks outweigh benefits, redesign before implementation.

---

# 75. Release Gates

A feature may enter the main development branch only if:

* Documentation is updated.
* Architecture remains compliant.
* Multiplayer assumptions remain valid.
* Tests pass.
* Code review is complete.
* No protected rule is violated.
* Migration requirements are documented (if applicable).

---

# 76. Constitutional Amendments

The principles defined in `SYSTEM.md` are intended to remain stable.

However, no architecture is perfect.

Changes are permitted when they:

* Solve a demonstrated problem.
* Improve long-term maintainability.
* Preserve or strengthen the project vision.
* Are documented through an accepted ADR.

Changes must never be made solely for short-term convenience.

---

# 77. Success Metrics

The Political Desk should be evaluated against long-term goals rather than short-term feature count.

Indicators of success include:

* Consistent architecture
* Minimal duplicated logic
* Clear module boundaries
* Stable multiplayer simulation
* Expandable systems
* High documentation quality
* Low architectural drift
* Ease of future feature integration

---

# 78. Final Constitutional Principles

Every contributor should remember these principles before implementing any feature.

1. Protect architecture before adding functionality.
2. Preserve multiplayer compatibility at all times.
3. Prefer simulation over artificial modifiers.
4. Build reusable systems rather than isolated features.
5. Extend existing architecture before creating new systems.
6. Keep module ownership clear and consistent.
7. Documentation is part of the software.
8. Long-term maintainability outweighs short-term speed.
9. Every implementation should prepare the project for future expansion.
10. Every decision should move WORLDr closer to becoming a living, persistent political simulation.

---

# 79. Closing Statement

The Political Desk is not designed to be a collection of disconnected mechanics.

It is designed to become the political operating system of a persistent world.

Its value will not come from the number of implemented features, but from the quality of their interaction.

Every contributor shares responsibility for protecting that vision.

When uncertainty exists, choose the solution that strengthens the foundation rather than the one that merely finishes the task.

---

**End of 01_SYSTEM.md**

