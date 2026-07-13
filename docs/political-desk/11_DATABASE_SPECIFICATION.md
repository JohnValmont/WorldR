10_DATABASE_SPECIFICATION.md ? Actual PostgreSQL/Supabase schema.
# 11_DATABASE_SPECIFICATION.md

# Chapter 1 — Database Philosophy & Design Principles

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This document defines the database architecture used by WORLDr.

The database is the authoritative persistent storage layer for the simulation. It stores world state, player data, historical records, and configuration while supporting deterministic simulation, multiplayer synchronization, and long-term scalability.

Business logic shall reside in the Simulation Engine. The database is responsible for durable storage, efficient querying, and maintaining data integrity.

---

# 2. Design Goals

The database is designed to be:

- Reliable
- Consistent
- Scalable
- Maintainable
- Observable
- Secure
- Efficient

Every design decision should improve one or more of these goals.

---

# 3. Core Principles

## Single Source of Truth

Every piece of authoritative data has exactly one canonical location.

Examples:

- Character → Characters Table
- Government → Governments Table
- Business → Businesses Table
- Country → Countries Table

Duplicate authoritative data shall be avoided.

---

## Data Integrity

Relationships between records must always remain valid.

The database shall enforce integrity using:

- Primary Keys
- Foreign Keys
- Unique Constraints
- Check Constraints
- Transactions

Application code should not be the only layer enforcing correctness.

---

## Separation of Responsibilities

The database stores data.

The Simulation Engine applies game rules.

The API exposes functionality.

The UI presents information.

Responsibilities shall not overlap unnecessarily.

---

## Normalize First

Core simulation data should be normalized to reduce redundancy and maintain consistency.

Denormalization is permitted only when it provides a measurable performance benefit and the duplicated data can be kept synchronized.

---

## Immutable History

Historical records should never be edited.

Corrections should create new records rather than modifying historical facts whenever practical.

---

# 4. Database Technology

WORLDr uses:

- PostgreSQL
- Supabase
- Row Level Security (RLS)
- PostgreSQL Extensions where appropriate

PostgreSQL provides the relational foundation required for complex simulation systems while Supabase supplies authentication, storage, realtime capabilities, and operational tooling.

---

# 5. Database Responsibilities

The database is responsible for:

- Persistent storage
- Relationships
- Constraints
- Indexing
- Transactions
- Security
- Historical records
- Backup support

The database is **not** responsible for simulation decision-making or gameplay rules.

---

# 6. High-Level Architecture

```
                Frontend
                    │
                    ▼
                 API Layer
                    │
                    ▼
           Simulation Engine
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   PostgreSQL Database   Object Storage
```

The Simulation Engine is the only component that writes authoritative simulation data.

---

# 7. Scalability Philosophy

The schema should support future growth without requiring major redesign.

Examples include:

- Additional countries
- New gameplay systems
- More simulation domains
- Millions of citizens
- Thousands of concurrent players

Scalability should primarily be achieved through good schema design rather than premature optimization.

---

# 8. Naming Standards

Database objects should follow consistent naming conventions.

Tables

- plural
- lowercase
- snake_case

Examples:

- users
- characters
- governments
- businesses

Columns

- lowercase
- snake_case

Primary Keys

- id

Foreign Keys

- entity_name_id

Examples:

- player_id
- country_id
- government_id

Consistency improves readability and maintenance.

---

# 9. Document Scope

This specification covers:

- Schema organization
- Core tables
- Relationships
- Constraints
- Performance
- Security
- Migrations
- Backup
- Operational standards

Implementation-specific SQL is intentionally excluded from this document and belongs in migration files.

---

# 10. Summary

The WORLDr database is designed as a reliable, normalized, and scalable persistence layer that supports deterministic simulation without embedding gameplay logic.

By separating storage from simulation while enforcing strong integrity, security, and consistency guarantees, the database provides a stable foundation capable of supporting the long-term evolution of the game.

---

# End of Chapter 1

# 11_DATABASE_SPECIFICATION.md

# Chapter 2 — Database Architecture

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the overall database architecture of WORLDr.

Rather than functioning as a collection of unrelated tables, the database is organized into logical domains that mirror the architecture of the simulation engine.

This separation improves maintainability, scalability, and future development while keeping ownership of data clearly defined.

---

# 2. Architectural Principles

The database architecture follows these principles:

- Domain-Oriented
- Normalized
- Modular
- Secure
- Scalable
- Observable

Every table belongs to exactly one domain.

Each domain owns its own data.

---

# 3. High-Level Architecture

```
                    PostgreSQL
                         │
 ┌───────────────────────┼────────────────────────┐
 │                       │                        │
 ▼                       ▼                        ▼

Core Domain        Gameplay Domain        Infrastructure

 │                     │                     │
 ├── Players           ├── Politics         ├── Auth
 ├── Characters        ├── Economy          ├── Storage
 ├── World             ├── Population       ├── Logs
 ├── Geography         ├── Businesses       ├── Jobs
 └── Configuration     ├── Military         └── Analytics
                       ├── Research
                       └── Diplomacy
```

Each domain may contain multiple schemas and tables.

---

# 4. Schema Organization

The database is divided into logical PostgreSQL schemas.

Recommended structure:

| Schema | Responsibility |
|---------|----------------|
| public | Shared application tables |
| auth | Authentication (Supabase managed) |
| core | Core world entities |
| political | Political simulation |
| economy | Economy and finance |
| population | Citizens and demographics |
| business | Companies and industries |
| military | Military systems |
| diplomacy | International relations |
| simulation | Simulation engine |
| analytics | Reporting and statistics |
| system | Internal infrastructure |

Schemas reduce naming conflicts and improve organization.

---

# 5. Core Domain

The Core Domain contains the foundational entities required by every simulation system.

Examples include:

- Players
- Characters
- Countries
- Regions
- Cities
- World Calendar
- Resources
- Configuration

Almost every other domain references the Core Domain.

---

# 6. Gameplay Domains

Gameplay systems are isolated into independent domains.

Examples:

Political Domain

- Governments
- Elections
- Legislature
- Laws
- Political Parties

Economy Domain

- GDP
- Inflation
- Markets
- Currency
- Trade

Population Domain

- Citizens
- Households
- Education
- Employment
- Migration

Business Domain

- Businesses
- Factories
- Products
- Supply Chains

Military Domain

- Units
- Bases
- Equipment
- Conflicts

Each domain owns its tables.

---

# 7. Infrastructure Domain

Infrastructure tables support the game itself rather than gameplay.

Examples include:

- Audit Logs
- Job Queue
- Notifications
- File Metadata
- Feature Flags
- Background Tasks
- Error Logs

Infrastructure data shall remain separate from gameplay data.

---

# 8. Relationships Between Domains

Domains communicate through foreign keys and the Simulation Engine.

Example:

Character

↓

Government Position

↓

Government

↓

Country

↓

World

The Simulation Engine coordinates gameplay logic.

The database enforces data integrity.

---

# 9. Transactions

Operations affecting multiple tables shall execute within database transactions.

Examples:

Government Formation

- Create Government
- Assign Leader
- Create Cabinet
- Update Country
- Record History

Either all operations succeed or none are committed.

This prevents partial world states.

---

# 10. Read vs Write Operations

The architecture distinguishes between read-heavy and write-heavy workloads.

Write Operations

Examples:

- Elections
- Laws
- Business Creation
- Player Actions

Read Operations

Examples:

- Leaderboards
- Country Pages
- Statistics
- World Map

Indexes and caching strategies should optimize both workloads independently.

---

# 11. Extension Strategy

Future gameplay systems should integrate by adding new schemas or tables within existing domains.

Examples:

Energy

Space

Religion

Tourism

Culture

Sports

No redesign of existing domains should be required.

---

# 12. Summary

The WORLDr database is organized around independent simulation domains rather than isolated tables.

By separating core data, gameplay systems, and infrastructure into clearly defined schemas with strong transactional guarantees, the architecture remains scalable, maintainable, and easy to extend as the simulation grows.

---

# End of Chapter 2

