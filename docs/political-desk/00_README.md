# Political Desk

This directory contains the comprehensive design, architecture, and development guidelines for the Political Desk feature in WORLDr.

# 00_README.md

# WORLDr — Political Desk Documentation

**Module:** Political Desk
**Project:** WORLDr
**Documentation Version:** Pre-Alpha v0.1
**Status:** Active Development

---

# Purpose

This directory contains the complete design and engineering documentation for the **Political Desk** module of **WORLDr**.

These documents define the architecture, gameplay, rules, technical constraints, user interface philosophy, and implementation guidelines for all political gameplay implemented during the **Pre-Alpha v0.1** milestone.

This documentation serves as the **single source of truth** for everyone working on the Political Desk, including human developers and AI coding assistants.

---

# Scope

This documentation applies **ONLY** to the Political Desk.

It does **NOT** define gameplay or implementation for:

* Economy
* Manufacturing
* Business Management
* Population Simulation
* Diplomacy
* Military
* Warfare
* Intelligence Agencies
* Crime
* Education Simulation
* Healthcare Simulation
* Banking
* Trade
* Natural Resources
* Transportation
* Housing
* Technology
* Religion
* Culture
* Local Government
* World Events

Those systems will receive their own documentation packages in future development phases.

The Political Desk may reference these systems, but it does not define their internal implementation.

---

# Vision

The Political Desk aims to become one of the deepest multiplayer political simulations ever created.

The design philosophy combines the strongest elements of:

* GearCity
* Suzerain
* Democracy 4
* Power & Revolution
* The Political Process

However, this module does **not** attempt to copy any existing game.

Instead, it follows one guiding principle:

> Build a living political simulation where institutions, organizations, media, elections, laws, and governments interact naturally inside a persistent multiplayer world.

---

# Political Desk Philosophy

The Political Desk is built around institutions rather than individual actions.

Players do not directly control a country.

Players lead political organizations.

Those organizations compete for power.

Governments govern through ministries.

Ministries implement laws.

Citizens react to outcomes.

Everything should be connected through simulation rather than artificial bonuses.

---

# Core Gameplay Loop

The overall gameplay loop is:

Citizen

↓

Independent Politician

↓

Political Party Founder

↓

Party Leader

↓

Election Candidate

↓

Parliament

↓

Government

↓

Policy Implementation

↓

Public Evaluation

↓

Next Election

Political success is earned through strategic leadership rather than repetitive actions.

---

# Multiplayer Philosophy

WORLDr is designed as a persistent multiplayer simulation.

Important principles:

* One human player controls exactly one political party.
* One political party has exactly one human leader.
* Remaining party members are AI.
* Political competition happens between parties rather than inside parties.
* The world continues to simulate while players are offline.
* Every country operates continuously in real time.

---

# Design Principles

Every system inside the Political Desk should follow these principles.

## 1. Institutions Before Individuals

Governments operate through institutions.

Players manage institutions rather than manually performing every task.

---

## 2. Decisions Over Clicking

Gameplay should reward strategic thinking.

Players should spend time making important decisions instead of repeating actions.

---

## 3. Persistent Simulation

The political world continues evolving while players are offline.

Media publishes news.

Departments perform work.

Public opinion changes.

Projects progress.

The player returns to an evolving political environment.

---

## 4. Realistic Without Becoming Bureaucratic

The goal is realism.

Not unnecessary complexity.

Every mechanic should create meaningful decisions.

Complexity that adds no gameplay value should be avoided.

---

## 5. AI Assists Leadership

AI characters execute routine work.

The player provides direction.

This reflects real political leadership.

---

## 6. Consequences Matter

Every significant decision should produce long-term consequences.

Policies.

Appointments.

Campaigns.

Budgets.

Coalitions.

Media responses.

All decisions should influence future gameplay.

---

## 7. No Magic Numbers

Avoid systems that instantly modify statistics.

Example:

Incorrect:

Education +5

Correct:

Education Reform

↓

Budget Approved

↓

Schools Expanded

↓

Teachers Hired

↓

Education Quality Improves

Simulation should produce outcomes.

---

## 8. Scalable Architecture

Every feature must support future expansion.

Future systems should integrate without requiring major rewrites.

Configuration should always be preferred over hardcoded logic.

---

# Documentation Structure

This documentation package contains:

00_README.md

Overview of the Political Desk documentation.

01_SYSTEM.md

Defines the engineering philosophy and behavioral rules for developers and AI assistants.

02_GAME_VISION.md

Explains the long-term vision of the Political Desk.

03_VERSION_SCOPE.md

Defines exactly what belongs inside Pre-Alpha v0.1.

04_ARCHITECTURE_DECISIONS.md

Contains major architectural decisions that govern the project.

05_POLITICAL_RULES.md

Canonical gameplay rules and political mechanics.

06_GAMEPLAY_LOOP.md

Defines every major gameplay loop.

07_UI_GUIDELINES.md

User interface philosophy and standards.

08_DATABASE_GUIDELINES.md

Database architecture principles.

09_CODING_GUIDELINES.md

Engineering and coding standards.

10_DEVELOPMENT_WORKFLOW.md

Recommended implementation workflow.

11_ROADMAP.md

Future milestones and expansion plans.

12_GLOSSARY.md

Terminology used throughout the Political Desk.

13_DECISION_LOG.md

Chronological record of important design decisions.

14_KNOWN_LIMITATIONS.md

Systems intentionally excluded from Pre-Alpha v0.1.

15_CLAUDE_WORKING_RULES.md

AI collaboration rules for Claude and other coding assistants.

---

# Documentation Rules

All documentation must remain internally consistent.

If a gameplay rule changes:

* Update the relevant document.
* Record the change inside the Decision Log.
* Update Version Scope if required.
* Ensure no conflicting documentation remains.

No implementation should contradict the documentation without an approved architecture decision.

---

# Versioning

Current Documentation Version

Political Desk Pre-Alpha v0.1

Future versions should introduce changes through documented revisions rather than silent modifications.

---

# Intended Audience

This documentation is written for:

* Game Designers
* Gameplay Programmers
* Backend Developers
* Frontend Developers
* Database Engineers
* AI Coding Assistants
* Future Contributors
* Project Owner

---

# Final Principle

If uncertainty exists during development, prioritize the following order:

1. Preserve multiplayer architecture.
2. Preserve simulation depth.
3. Preserve long-term scalability.
4. Preserve maintainability.
5. Preserve realism where it improves gameplay.
6. Prefer strategic decision-making over repetitive interaction.

Every future Political Desk feature should reinforce these principles.
