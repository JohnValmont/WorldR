# WORLDr Database Design Specification — Phase 1

This document outlines the ERD relationships, tenant isolation, and template expansion design for the PostgreSQL database in WORLDr.

---

## 1. Entity Relationships (ERD Explanation)

Phase 1 tables map out the state of a single nation under governance, structured to support future expansions:

1. **`nations` (Core Tenant)**:
   - Houses the aggregate economic, political, and historical state of a nation.
   - All gameplay entities (`economic_sectors`, `population_groups`, `taxes`, `budget_items`, `laws`, `prices`, `historical_snapshots`, `audit_logs`) reference a `nation_id` with `ON DELETE CASCADE`.

2. **`users` and `refresh_tokens`**:
   - Users govern a nation by holding an optional `nation_id` reference.
   - **Multiplayer Co-op Support**: Multiple users can have the same `nation_id`, allowing a shared ministry where all actions (budget shifts, law toggles) are synchronized.
   - **Spectator Support**: Users with a `NULL` `nation_id` can watch the global simulation without governing.
   - Hashed session refresh tokens reference `user_id` with `ON DELETE CASCADE`.

3. **`economic_sectors` & `prices`**:
   - Each nation has five predefined sectors: *Agriculture, Industry, Services, Energy, and Construction*.
   - The `prices` table tracks price indices, base levels, and inflation rates on a per-sector, per-nation basis.

4. **`population_groups`**:
   - Represents the socio-economic classes (*Poor, Working, Middle, Wealthy, and Elite*).
   - Stores group-specific size, income, approval levels, and sensitivity parameters.

5. **`laws` & `law_effects`**:
   - Laws are proposed, passed, or repealed.
   - `law_effects` define the concrete modifier logic (e.g., additive `+0.02` to tax rate or multiplier `x1.05` to agriculture output) linked to active laws.

6. **`nation_templates`**:
   - Holds pre-configured nation parameters (starting cash, GDP, sector balance) to dynamically instantiate new nations in the database.

7. **`audit_logs`**:
   - Records audit details of player/system actions. Linked to `user_id` and `nation_id` for tracking.

---

## 2. Migration Order & Deployment Protocol

1. **`0001_phase1_schema.sql`**:
   Sets up the core database extension (`uuid-ossp`) and instantiates tables for nations, users, economic_sectors, population_groups, taxes, budget_items, laws, law_effects, parameters, historical_snapshots, overrides, and session tokens.
2. **`0002_phase1_additions.sql`**:
   Adds `nation_templates`, `prices`, and `audit_logs` tables along with indexes, check constraints, and referential actions.
3. **`first_nation_seed.sql`**:
   Populates global balancing coefficients, inserts the base template for Omnia, spins up the initial nation instance, and registers the default administrator user.

---

## 3. How `nation_id` Works for Future Lobbies (Multi-Nation Tenancy)

To scale to thousands of simultaneous players/lobbies without table bloat:
* **Isolation Query Pattern**:
  Every query executing business logic is scoped by `nation_id`:
  ```sql
  SELECT * FROM economic_sectors WHERE nation_id = $1;
  ```
* **Performance Indexes**:
  All transactional tables contain compound or lookup indexes on `(nation_id)`. This keeps reads sub-millisecond, even when tables contain millions of rows across different nations.
* **Cascading Purges**:
  When a nation or game lobby is deleted, deleting the row in `nations` automatically purges all child records via `ON DELETE CASCADE` foreign keys, preventing orphan rows.

---

## 4. Template-Based Expansion (Spawning New Lobbies)

When a player registers and starts a new nation, the system initializes their nation state programmatically from `nation_templates`:

1. **Read Template**:
   The API reads the configuration (e.g., for `Omnia`) from `nation_templates`:
   ```sql
   SELECT template_data FROM nation_templates WHERE name = 'Omnia';
   ```
2. **Atomic Transaction**:
   Within a single transaction, the backend:
   - Creates a row in `nations` to generate a new `nation_id`.
   - Reads the `template_data` JSONB payload containing initial sector details, population size distributions, tax defaults, and budget configurations.
   - Batch inserts rows into `economic_sectors`, `population_groups`, `taxes`, `budget_items`, and `prices` using the new `nation_id`.
3. **Assign Governer**:
   Updates the user's `nation_id` to link them to the newly generated nation.
