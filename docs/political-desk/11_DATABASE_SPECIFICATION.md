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

# 11_DATABASE_SPECIFICATION.md

# Chapter 3 — Schema Organization

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how database schemas are organized within WORLDr.

A schema is a logical container that groups related tables, views, functions, and other database objects. Organizing the database into schemas keeps the project modular, improves maintainability, and clearly establishes ownership boundaries between simulation systems.

Each schema represents a major subsystem of the game.

---

# 2. Design Principles

Schema organization follows these principles:

- Single Responsibility
- Domain Ownership
- Clear Boundaries
- Low Coupling
- High Cohesion
- Future Scalability

A schema should contain only objects related to its own domain.

---

# 3. Schema Structure

The recommended database structure is:

```text
auth/
core/
political/
economy/
population/
business/
military/
diplomacy/
simulation/
analytics/
system/
```

Each schema is responsible for one major area of the game.

---

# 4. Core Schema

The **core** schema contains foundational world entities shared across the simulation.

Typical tables include:

- players
- characters
- countries
- regions
- provinces
- cities
- world_calendar
- resources
- currencies
- languages

These tables are referenced by many other schemas.

The Core schema should remain stable and change infrequently.

---

# 5. Gameplay Schemas

Gameplay systems are separated into dedicated schemas.

### political

Responsible for:

- governments
- legislatures
- elections
- political_parties
- laws
- ministries
- public_offices

---

### economy

Responsible for:

- markets
- industries
- taxation
- inflation
- gdp
- budgets
- trade

---

### population

Responsible for:

- citizens
- households
- education
- employment
- migration
- demographics

---

### business

Responsible for:

- businesses
- factories
- products
- inventories
- logistics
- contracts

---

### military

Responsible for:

- armed_forces
- units
- bases
- conflicts
- equipment

---

### diplomacy

Responsible for:

- treaties
- alliances
- sanctions
- international_relations

---

# 6. Simulation Schema

The **simulation** schema contains engine-level data rather than gameplay data.

Examples include:

- simulation_ticks
- scheduled_events
- world_state
- event_queue
- simulation_settings

This schema supports the operation of the Simulation Engine.

---

# 7. Analytics Schema

The **analytics** schema stores derived information.

Examples include:

- economic_statistics
- population_statistics
- historical_reports
- rankings
- dashboards

Data inside this schema can always be regenerated from authoritative gameplay data.

It should never become the primary source of truth.

---

# 8. System Schema

The **system** schema contains operational infrastructure.

Examples include:

- audit_logs
- background_jobs
- notifications
- feature_flags
- application_settings
- error_logs
- maintenance_records

This schema supports the game platform rather than the game world.

---

# 9. Cross-Schema Relationships

Schemas are independent but connected through foreign keys.

Example:

```text
core.characters
        │
        ▼
political.governments
        │
        ▼
political.ministers
```

Another example:

```text
core.countries
        │
        ▼
economy.markets
        │
        ▼
business.businesses
```

Relationships should always use explicit foreign key constraints.

---

# 10. Ownership Rules

Each database object has exactly one owning schema.

Examples:

| Object | Owner |
|---------|-------|
| Character | core |
| Government | political |
| Business | business |
| Citizen | population |
| Treaty | diplomacy |
| Market | economy |
| Military Unit | military |

Only the owning domain should modify its tables.

Other domains may reference them through foreign keys.

---

# 11. Naming Standards

Schemas

- lowercase
- singular
- descriptive

Tables

- lowercase
- plural
- snake_case

Columns

- lowercase
- snake_case

Examples:

```text
political.governments

population.citizens

business.factories

economy.markets
```

Consistency is mandatory across the database.

---

# 12. Future Expansion

The schema organization is designed to accommodate future systems without restructuring existing domains.

Potential future schemas include:

- culture
- religion
- tourism
- science
- energy
- healthcare
- transportation
- environment

New schemas should integrate through foreign keys and the Simulation Engine while preserving existing ownership boundaries.

---

# 13. Summary

The schema organization of WORLDr divides the database into clearly defined domains, each responsible for a specific area of the simulation.

By separating foundational data, gameplay systems, simulation infrastructure, analytics, and operational services into dedicated schemas, the database remains modular, maintainable, and scalable while supporting future expansion without significant architectural changes.

---

# End of Chapter 3

# 11_DATABASE_SPECIFICATION.md

# Chapter 4 — Core Data Model

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the core entities that form the foundation of the WORLDr database.

These entities represent the permanent objects that nearly every gameplay system depends upon.

Political systems, economy, businesses, AI, military, diplomacy, and future modules shall all reference these core entities rather than creating duplicate representations.

---

# 2. Core Entity Hierarchy

The world follows a hierarchical structure.

```text
World
│
├── Continents
│
├── Countries
│   │
│   ├── Regions
│   │   │
│   │   ├── Provinces
│   │   │   │
│   │   │   ├── Cities
│   │   │   │
│   │   │   └── Locations
│   │   │
│   │   └── Territories
│   │
│   └── National Institutions
│
└── Global Systems
```

This hierarchy should remain stable throughout the lifetime of the project.

---

# 3. Primary Core Entities

The Core Domain owns the following entities.

| Entity | Purpose |
|---------|---------|
| Player | User account |
| Character | Playable identity |
| World | Global simulation |
| Continent | Large geographical division |
| Country | Sovereign nation |
| Region | Administrative division |
| Province | Local administrative area |
| City | Population center |
| Territory | Simulation map area |
| Currency | Monetary definition |
| Language | Supported language |
| Resource | Natural resource definition |

These entities are shared throughout the simulation.

---

# 4. Player

A Player represents a real user of WORLDr.

A Player:

- owns an account
- may own multiple characters
- stores account preferences
- authenticates through Supabase Auth

The Player does **not** directly participate in gameplay.

Gameplay occurs through Characters.

---

# 5. Character

The Character is the primary gameplay entity.

Every player action originates from a Character.

A Character may:

- own businesses
- hold government office
- vote
- create organizations
- own property
- participate in diplomacy
- command military units
- conduct research

Characters are referenced by nearly every gameplay system.

---

# 6. World

The World represents the persistent simulation.

It stores global information including:

- current simulation tick
- current world date
- active simulation version
- global settings
- world configuration

Normally there is only one active World.

The architecture allows multiple worlds if required in the future.

---

# 7. Geographic Model

The geographical hierarchy is:

```text
World

↓

Continent

↓

Country

↓

Region

↓

Province

↓

City

↓

Territory
```

Each level has a clearly defined parent.

Geographic entities should never create circular relationships.

---

# 8. Territory

Territories are the smallest simulation units used by the engine.

They support:

- ownership
- resources
- population
- buildings
- infrastructure
- military occupation
- businesses

Most simulation calculations occur at the Territory level.

Higher geographical entities aggregate Territory data.

---

# 9. Shared Reference Entities

Some entities define reusable information rather than gameplay state.

Examples include:

- Currency
- Language
- Resource
- Industry Type
- Government Type
- Building Type

These entities change infrequently and are referenced throughout the database.

---

# 10. Entity Identity

Every core entity shall possess:

- globally unique identifier
- creation timestamp
- update timestamp
- status
- version

Identifiers remain permanent throughout the entity's lifetime.

Primary keys shall never change.

---

# 11. Soft Deletion

Core entities should generally use soft deletion rather than permanent removal.

Deleted entities remain available for:

- historical records
- replay
- analytics
- auditing

Example status values include:

- Active
- Archived
- Deprecated
- Deleted

Physical deletion should be reserved for exceptional administrative operations.

---

# 12. Design Rules

Core entities shall:

- represent real simulation objects
- avoid duplicate information
- maintain referential integrity
- remain independent of gameplay logic
- serve as authoritative references for other domains

Business rules belong in the Simulation Engine, not in the entity definitions.

---

# 13. Summary

The Core Data Model establishes the foundational entities upon which the entire WORLDr simulation is built.

By centralizing players, characters, geography, world configuration, and shared reference data into a stable and authoritative domain, every gameplay system can reference a consistent representation of the world while maintaining clear ownership, strong data integrity, and long-term scalability.

---

# End of Chapter 4

