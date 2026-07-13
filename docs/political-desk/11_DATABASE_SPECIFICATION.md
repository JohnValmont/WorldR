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

# 11_DATABASE_SPECIFICATION.md

# Chapter 5 — Relationships & Constraints

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how entities within the WORLDr database relate to one another and how data integrity is enforced.

Relationships ensure that the simulation remains internally consistent while allowing different gameplay systems to interact through shared entities.

Constraints protect the database from invalid, incomplete, or contradictory data.

---

# 2. Relationship Principles

All relationships shall follow these principles:

- Explicit Ownership
- Referential Integrity
- Minimal Duplication
- Predictable Navigation
- Consistent Naming

Relationships should accurately reflect the structure of the simulation.

---

# 3. Relationship Types

The database primarily uses three relationship types.

## One-to-One (1:1)

One record corresponds to exactly one related record.

Examples:

- Character ↔ Character Profile
- Country ↔ National Statistics
- Government ↔ Current Cabinet

---

## One-to-Many (1:N)

One parent owns many children.

Examples:

- Country → Regions
- Region → Provinces
- Province → Cities
- Character → Businesses
- Government → Ministries

This is the most common relationship type.

---

## Many-to-Many (N:N)

Many records relate to many others through junction tables.

Examples:

- Characters ↔ Organizations
- Countries ↔ Treaties
- Businesses ↔ Products
- Citizens ↔ Laws (Affected By)

Many-to-many relationships should always use dedicated junction tables.

---

# 4. Foreign Keys

Relationships between tables shall be enforced using foreign keys.

Example:

```text
characters
      │
      ▼
governments.leader_id
```

Another example:

```text
countries
      │
      ▼
regions.country_id
```

Foreign keys ensure that referenced records exist before relationships can be created.

---

# 5. Referential Integrity

The database shall prevent:

- Orphan records
- Invalid references
- Broken relationships
- Duplicate ownership

If a referenced entity does not exist, the operation shall fail.

---

# 6. Cascade Rules

Cascade behavior should be applied carefully.

Preferred actions include:

| Operation | Recommended Action |
|-----------|--------------------|
| Delete | Restrict or Soft Delete |
| Update Primary Key | Never Allowed |
| Update Foreign Key | Cascade only when appropriate |

Automatic deletion should be avoided for gameplay entities to preserve historical data.

---

# 7. Unique Constraints

Unique constraints enforce business requirements.

Examples include:

- Username
- Email Address
- Country Code
- Currency Code
- Political Party Abbreviation (within a country)
- Government Term Number (within a country)

Unique constraints prevent duplicate records where uniqueness is required.

---

# 8. Check Constraints

Check constraints validate acceptable values.

Examples:

- Population ≥ 0
- Tax Rate between 0 and 100
- GDP ≥ 0
- Character Age ≥ 18
- Election Round ≥ 1

Validation should occur at both the application and database layers.

---

# 9. Nullability

Columns should be nullable only when the absence of a value is meaningful.

Examples of nullable fields:

- Middle Name
- Date of Death
- Resignation Date
- Business Closure Date

Required gameplay data should be marked as NOT NULL.

---

# 10. Transactions

Operations involving multiple related tables shall execute within a single database transaction.

Examples:

- Forming a government
- Creating a business
- Registering a political party
- Purchasing land
- Signing a treaty

Transactions guarantee that either all related changes succeed or none are applied.

---

# 11. Historical Integrity

Relationships should preserve historical information.

Instead of deleting relationships:

- record start date
- record end date
- archive when necessary

Examples:

A minister leaves office.

Do not delete the appointment.

Instead:

- appointment_start
- appointment_end

This preserves the historical timeline.

---

# 12. Constraint Philosophy

Database constraints protect structural correctness.

Simulation rules remain the responsibility of the Simulation Engine.

Examples:

Database ensures:

- Character exists
- Country exists
- Government exists

Simulation Engine ensures:

- Character is eligible to become President
- Election has completed
- Required majority has been reached

This separation keeps responsibilities clear.

---

# 13. Summary

Relationships and constraints form the structural backbone of the WORLDr database.

By enforcing referential integrity, appropriate relationship types, transactional consistency, and strong validation rules at the database level, the system maintains reliable and consistent data while leaving gameplay decisions to the Simulation Engine.

---

# End of Chapter 5

# 11_DATABASE_SPECIFICATION.md

# Chapter 6 — Performance & Optimization

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the performance principles used by the WORLDr database.

The objective is to ensure that the database remains responsive as the simulation grows from hundreds to millions of entities while maintaining correctness and data integrity.

Performance improvements shall never compromise simulation accuracy.

---

# 2. Performance Philosophy

The database should be:

- Correct before fast
- Simple before complex
- Measured before optimized
- Scalable by design

Optimization should address verified bottlenecks rather than anticipated ones.

Premature optimization should be avoided.

---

# 3. Indexing Strategy

Indexes improve query performance but increase storage requirements and write costs.

Indexes should be created for:

- Primary Keys
- Foreign Keys
- Frequently filtered columns
- Frequently sorted columns
- Frequently joined columns

Examples include:

- character_id
- country_id
- business_id
- created_at
- status

Indexes should be reviewed periodically as query patterns evolve.

---

# 4. Query Design

Queries should be:

- Explicit
- Predictable
- Efficient
- Readable

Recommended practices:

- Select only required columns
- Avoid unnecessary joins
- Limit returned rows where appropriate
- Filter using indexed columns
- Prefer server-side pagination

Complex queries should be analyzed before deployment.

---

# 5. Normalization and Denormalization

The database should remain normalized by default.

Denormalization is acceptable when:

- it provides measurable performance improvements
- duplicated data can be kept consistent
- maintenance complexity remains reasonable

Examples include cached totals or precomputed statistics.

The authoritative source of truth must always remain clear.

---

# 6. Caching

Frequently requested information may be cached outside the database.

Suitable candidates include:

- Country profiles
- Public leaderboards
- World statistics
- Static configuration
- Reference data

Caches are temporary performance optimizations.

They shall never become authoritative data stores.

---

# 7. Pagination

Large result sets should never be loaded in a single request.

Interfaces should support pagination for data such as:

- Citizens
- Businesses
- Laws
- Historical records
- Notifications

Pagination improves responsiveness and reduces resource usage.

---

# 8. Background Processing

Long-running database operations should execute asynchronously where appropriate.

Examples include:

- Historical report generation
- Statistical aggregation
- Large imports
- Data cleanup
- Backup preparation

Gameplay interactions should remain responsive while background tasks execute independently.

---

# 9. Monitoring

Database performance should be continuously monitored.

Key metrics include:

- Query execution time
- Slow queries
- Active connections
- CPU usage
- Memory usage
- Storage growth
- Transaction duration

Monitoring enables proactive identification of performance issues.

---

# 10. Future Scaling

The database architecture should support future optimization techniques without requiring major redesign.

Potential enhancements include:

- Read replicas
- Connection pooling
- Table partitioning
- Materialized views
- Dedicated analytics databases

These techniques should be introduced only when justified by actual workload.

---

# 11. Summary

The WORLDr database prioritizes correctness, maintainability, and measured optimization over premature complexity.

By combining effective indexing, efficient query design, selective caching, background processing, and continuous monitoring, the database can scale alongside the simulation while remaining reliable and easy to maintain.

---

# End of Chapter 6

# 11_DATABASE_SPECIFICATION.md

# Chapter 7 — Security, Permissions & Row Level Security (RLS)

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the database security model used by WORLDr.

The objective is to ensure that every database operation is performed securely, that players can only access data they are authorized to view or modify, and that the integrity of the simulation is protected from accidental or malicious access.

Database security complements the Simulation Engine but never replaces its authorization logic.

---

# 2. Security Principles

The database follows these principles:

- Least Privilege
- Default Deny
- Explicit Authorization
- Defense in Depth
- Auditability
- Secure by Default

Every request should receive only the minimum level of access required.

---

# 3. Security Layers

Security is enforced across multiple layers.

```text
Player
    │
    ▼
Authentication
    │
    ▼
API Authorization
    │
    ▼
Simulation Engine
    │
    ▼
Database Permissions
    │
    ▼
Row Level Security
```

No single layer should be solely responsible for protecting sensitive data.

---

# 4. Authentication

Player authentication is managed through Supabase Authentication.

Authentication identifies:

- Player
- Session
- Access Token

Authentication confirms identity but does not determine gameplay permissions.

Gameplay authorization remains the responsibility of the Simulation Engine.

---

# 5. Database Roles

The database should use dedicated roles with clearly defined responsibilities.

Typical roles include:

| Role | Responsibility |
|------|----------------|
| Anonymous | Public access only |
| Authenticated | Logged-in player |
| Service | Backend services |
| Administrator | Operational management |
| Migration | Schema changes |

Each role should have only the permissions required for its purpose.

---

# 6. Row Level Security (RLS)

Row Level Security shall be enabled for all player-accessible tables.

RLS ensures that users can access only the rows they are permitted to access.

Examples:

A player may:

- View their own account
- View their own characters
- Edit their own profile

A player may not:

- Modify another player's account
- Read private administrative records
- Access internal simulation tables

---

# 7. Public and Private Data

Data should be classified according to its visibility.

### Public Data

Examples:

- Countries
- Cities
- Public businesses
- Public governments
- World statistics
- Public laws

Public data may be readable by all players.

---

### Protected Data

Examples:

- Character inventories
- Personal finances
- Private messages
- Draft legislation
- Internal AI decisions

Protected data requires explicit authorization.

---

### Administrative Data

Examples:

- Audit logs
- Server configuration
- Background jobs
- Security events
- Internal diagnostics

Administrative data shall never be accessible to normal players.

---

# 8. Permission Philosophy

Permissions should be based on gameplay responsibilities rather than database ownership.

Examples:

A President may approve a budget because the Simulation Engine authorizes that action.

The database simply stores the resulting data after authorization has been verified.

Business rules should never rely solely on database permissions.

---

# 9. Sensitive Information

Sensitive information should receive additional protection.

Examples include:

- Email addresses
- Authentication identifiers
- API secrets
- Internal configuration
- Administrative credentials

Sensitive information should never be exposed through public queries.

---

# 10. Auditing

Security-related database operations should be recorded for auditing purposes.

Examples include:

- Administrative actions
- Permission changes
- Failed access attempts
- Schema migrations
- Sensitive data modifications

Audit records should be immutable and retained according to operational policies.

---

# 11. Security Best Practices

The following practices shall be followed throughout the project:

- Enable RLS on player-facing tables
- Validate permissions in the Simulation Engine
- Use parameterized queries
- Avoid direct client database access beyond approved APIs
- Minimize privileged operations
- Review permissions regularly

Security should be considered during system design rather than added later.

---

# 12. Summary

The WORLDr database employs a layered security model combining authentication, application-level authorization, database permissions, and Row Level Security.

By separating identity verification from gameplay authorization and applying least-privilege access throughout the system, the database protects sensitive information while supporting secure multiplayer gameplay and long-term maintainability.

---

# End of Chapter 7

# 11_DATABASE_SPECIFICATION.md

# Chapter 8 — Migrations & Versioning

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines how the WORLDr database evolves over time.

As the game grows, the database schema will require new tables, columns, indexes, constraints, and optimizations. A structured migration strategy ensures these changes are applied safely, consistently, and reproducibly across all environments.

Every database change shall be version-controlled and reproducible.

---

# 2. Design Principles

Database evolution shall follow these principles:

- Version Controlled
- Incremental
- Reproducible
- Backward Compatible (where practical)
- Reversible
- Tested Before Deployment

Schema changes should be predictable and traceable.

---

# 3. Migration Philosophy

The database schema is treated as source code.

Every structural change shall be introduced through a migration rather than manual database edits.

Examples include:

- Creating tables
- Adding columns
- Removing deprecated columns
- Creating indexes
- Updating constraints
- Creating views
- Adding functions

Production databases should never be modified manually except during emergency maintenance.

---

# 4. Migration Lifecycle

Every migration follows the same lifecycle.

```text
Design

↓

Review

↓

Implement

↓

Test

↓

Commit

↓

Deploy

↓

Verify
```

Each migration should represent one logical change.

---

# 5. Migration Organization

Migration files should be:

- Sequential
- Descriptive
- Atomic
- Idempotent where possible

Example naming convention:

```text
001_initial_schema.sql

002_create_countries.sql

003_create_characters.sql

004_add_business_indexes.sql

005_create_government_tables.sql
```

Names should clearly describe the purpose of the migration.

---

# 6. Schema Versioning

Each deployed database corresponds to a specific schema version.

Version information should allow developers to determine:

- Current schema version
- Applied migrations
- Pending migrations
- Migration history

This ensures all environments remain synchronized.

---

# 7. Backward Compatibility

When practical, schema changes should avoid breaking existing systems.

Preferred approach:

```text
Add New Column

↓

Update Application

↓

Migrate Existing Data

↓

Remove Deprecated Column
```

Large structural changes should be performed incrementally.

---

# 8. Rollback Strategy

Every migration should have a rollback plan.

Rollback may include:

- Removing newly added objects
- Restoring previous constraints
- Reverting configuration changes
- Restoring backups when necessary

Not every migration can be automatically reversed, especially when data transformations are involved.

Rollback procedures should be documented before deployment.

---

# 9. Environment Consistency

The same migration history should be applied across:

- Local Development
- Testing
- Staging
- Production

Environment-specific manual changes should be avoided.

Consistency simplifies debugging and deployment.

---

# 10. Deprecation Policy

Obsolete database objects should not be removed immediately.

Preferred lifecycle:

```text
Active

↓

Deprecated

↓

Unused

↓

Removed
```

Deprecation provides time for application code to transition safely.

---

# 11. Documentation

Significant migrations should include documentation describing:

- Purpose
- Affected objects
- Reason for change
- Deployment considerations
- Rollback approach

Good documentation improves maintainability and future troubleshooting.

---

# 12. Summary

The WORLDr database evolves through structured, version-controlled migrations rather than manual modifications.

By treating schema changes as source code, maintaining consistent migration histories, planning for rollbacks, and documenting significant changes, the project can safely evolve its database while minimizing deployment risk and ensuring long-term maintainability.

---

# End of Chapter 8

# 11_DATABASE_SPECIFICATION.md

# Chapter 9 — Backup, Recovery & Monitoring

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the operational practices for protecting, recovering, and monitoring the WORLDr database.

The objective is to ensure that player progress, simulation state, and historical data remain recoverable in the event of hardware failures, software defects, accidental changes, or operational incidents.

Operational reliability is a core requirement of a persistent online world.

---

# 2. Design Principles

Operational management shall follow these principles:

- Reliability
- Recoverability
- Observability
- Automation
- Verification
- Minimal Downtime

Backup procedures are only valuable if recovery has been verified.

---

# 3. Backup Strategy

The database shall be protected through multiple backup mechanisms.

Recommended backup types include:

- Full Backups
- Incremental Backups
- Point-in-Time Recovery (when supported)
- Automated Scheduled Backups

Backups should occur without disrupting normal gameplay.

---

# 4. Recovery Strategy

Recovery procedures shall be documented and periodically tested.

Recovery objectives include:

- Restore database availability
- Preserve player progress
- Maintain data integrity
- Minimize downtime
- Verify restored data before reopening the game

Recovery procedures should be standardized across all environments.

---

# 5. Backup Verification

Every backup should be verified regularly.

Verification may include:

- Successful backup completion
- Restore testing
- Data integrity validation
- Schema verification
- Application compatibility checks

A backup that cannot be restored should be treated as a failed backup.

---

# 6. Monitoring

Database health should be monitored continuously.

Key operational metrics include:

- Database availability
- Active connections
- Query performance
- CPU utilization
- Memory utilization
- Storage capacity
- Transaction throughput
- Error rates

Monitoring should provide early warning before issues affect players.

---

# 7. Alerting

Critical operational events should generate alerts.

Examples include:

- Backup failures
- Database unavailable
- High error rates
- Slow query thresholds exceeded
- Low storage capacity
- Failed replication
- Excessive connection usage

Alerts should prioritize issues that directly impact gameplay or data integrity.

---

# 8. Maintenance

Routine maintenance may include:

- Index maintenance
- Statistics updates
- Storage optimization
- Log cleanup
- Archive management
- Database upgrades

Maintenance should be scheduled to minimize player disruption.

Whenever possible, maintenance should be automated.

---

# 9. Disaster Recovery

A disaster recovery plan should define procedures for major incidents.

Examples include:

- Infrastructure failure
- Database corruption
- Cloud provider outage
- Accidental data deletion
- Failed deployment

The recovery plan should identify:

- Recovery steps
- Responsible personnel
- Communication procedures
- Validation process
- Return-to-service criteria

---

# 10. Operational Logging

Operational events should be recorded for troubleshooting and auditing.

Examples include:

- Backup execution
- Restore operations
- Migration execution
- Administrative actions
- Maintenance activities
- Critical database events

Operational logs should be retained according to project requirements.

---

# 11. Summary

The WORLDr database is supported by a comprehensive operational strategy that combines automated backups, verified recovery procedures, continuous monitoring, proactive alerting, and routine maintenance.

By emphasizing recoverability and observability alongside data integrity, the database remains resilient against operational failures while providing a reliable foundation for a persistent multiplayer simulation.

---

# End of Chapter 9
# 11_DATABASE_SPECIFICATION.md

# Chapter 10 — Implementation Standards

Project: WORLDr

Module: Backend Infrastructure

Version: Pre-Alpha v0.1

Status: Foundation Specification

---

# 1. Purpose

This chapter defines the implementation standards that every database object, migration, and future gameplay module shall follow.

These standards ensure consistency across the project regardless of which system is being developed.

A consistent database is easier to understand, maintain, optimize, and extend.

---

# 2. Design Principles

All database implementations shall follow these principles:

- Consistency
- Simplicity
- Maintainability
- Performance
- Security
- Scalability

When multiple implementation approaches are possible, the simplest correct solution should be preferred.

---

# 3. Table Standards

Every gameplay table should include a consistent set of metadata where applicable.

Typical metadata includes:

- Primary Key
- Created Timestamp
- Updated Timestamp
- Status
- Version

Not every table requires every field, but consistency should be maintained whenever practical.

---

# 4. Naming Conventions

Database objects shall follow these conventions.

Schemas

- lowercase
- singular

Tables

- lowercase
- plural
- snake_case

Columns

- lowercase
- snake_case

Primary Keys

- id

Foreign Keys

- referenced_table_id

Indexes

- descriptive and consistent

Examples:

```text
characters

businesses

government_id

character_id

created_at
```

Consistent naming improves readability and reduces development errors.

---

# 5. Data Integrity

Every implementation shall protect data integrity through:

- Primary Keys
- Foreign Keys
- Unique Constraints
- Check Constraints
- Transactions

Database constraints should complement—not replace—validation performed by the Simulation Engine.

---

# 6. Performance Guidelines

Implementations should:

- Use indexes where appropriate
- Avoid unnecessary duplication
- Keep queries predictable
- Minimize full table scans
- Optimize only after measuring performance

Maintainability should not be sacrificed for minor performance gains.

---

# 7. Security Standards

Every player-accessible table shall follow the project's security model.

Requirements include:

- Appropriate database permissions
- Row Level Security where applicable
- Principle of least privilege
- Protection of sensitive data

Gameplay authorization shall remain the responsibility of the Simulation Engine.

---

# 8. Documentation Standards

Significant database objects should be documented.

Documentation should describe:

- Purpose
- Ownership
- Relationships
- Important constraints
- Usage considerations

Clear documentation reduces onboarding time and simplifies future maintenance.

---

# 9. Future Development

New gameplay systems should integrate with the existing database architecture rather than introducing separate design patterns.

New modules should:

- Follow established naming conventions
- Reuse existing reference entities where appropriate
- Respect domain ownership
- Maintain referential integrity
- Use standardized migrations

Consistency across modules is more valuable than isolated optimizations.

---

# 10. Compliance Checklist

Before introducing a new database object, verify that it satisfies the following:

- Appropriate schema selected
- Naming conventions followed
- Relationships clearly defined
- Constraints implemented
- Security reviewed
- Migration prepared
- Documentation updated
- Performance impact considered

This checklist serves as the minimum standard for database development.

---

# 11. Summary

The WORLDr Database Specification establishes a consistent foundation for implementing and evolving the project's persistence layer.

By adhering to common standards for structure, naming, integrity, security, migrations, and operational practices, every future gameplay module can integrate into a single, coherent database architecture that remains maintainable and scalable throughout the lifetime of the project.

---

# End of Chapter 10

# End of Document
