# WORLDr Global Parameter System

This document specifies the global parameter system architecture, loading workflows, override priority engine, and caching designs for Phase 1 of WORLDr.

---

## 1. Database Schema

The parameter system uses a split layout: **Global defaults** are stored centrally, and **individual nation overrides** are written to an override association table.

```
+---------------------------------------+
|              parameters               | (Global Defaults)
+---------------------------------------+
| id          : UUID (PK)               |
| category    : VARCHAR(50)             |
| name        : VARCHAR(100)            |
| value       : NUMERIC(20,6)           |
| description : TEXT                    |
| created_at  : TIMESTAMPTZ             |
| updated_at  : TIMESTAMPTZ             |
+---------------------------------------+
                    ^
                    | (Fallbacks)
+---------------------------------------+
|      nation_parameter_overrides       | (Nation Overrides)
+---------------------------------------+
| id          : UUID (PK)               |
| nation_id   : UUID (FK -> nations)    |
| category    : VARCHAR(50)             |
| name        : VARCHAR(100)            |
| value       : NUMERIC(20,6)           |
| created_at  : TIMESTAMPTZ             |
| updated_at  : TIMESTAMPTZ             |
+---------------------------------------+
```

---

## 2. Parameter Loading Flow & Cache Resolution Priority

To keep tick calculations fast, parameters are resolved in-memory using a two-tier priority cache:

```
[Fetch parameter: 'inflation.food_weight' for Nation X]
                   |
                   v
    Check Redis Nation-Specific Cache:
    `param:nation:X:inflation:food_weight`
       |
       +---> [HIT] ------------------------------------> Return Value
       |
       +---> [MISS]
               |
               v
         Check Redis Global Default Cache:
         `param:global:inflation:food_weight`
            |
            +---> [HIT] -------------------------------> Return Value
            |
            +---> [MISS]
                    |
                    v
              Query Postgres Databases
              (Option A: Select from nation_parameter_overrides)
              (Option B: Fallback to parameters)
                    |
                    v
              Repopulate Redis Cache & Return Value
```

### Batch Loading Optimization
During `TickEngine` initialization, rather than querying parameters one-by-one, the service runs a batch fetch:
1. `MGET` all global defaults.
2. `MGET` all nation-specific override keys.
3. For any cache misses, execute a SQL union query:
   ```sql
   SELECT category, name, value 
   FROM nation_parameter_overrides 
   WHERE nation_id = ?
   UNION ALL
   SELECT category, name, value 
   FROM parameters p
   WHERE NOT EXISTS (
       SELECT 1 FROM nation_parameter_overrides o 
       WHERE o.nation_id = ? AND o.category = p.category AND o.name = p.name
   );
   ```
4. Write results back to Redis.

---

## 3. Caching & Invalidation Logic

- **Read Strategy**: Check `param:nation:<nation_id>:<category>:<name>` first. Fallback to `param:global:<category>:<name>`.
- **Write Strategy**:
  - **Global Updates**: When an admin updates a default value:
    1. Write to `parameters` table in Postgres.
    2. Update Redis key `param:global:<category>:<name>` to keep cache in sync (Write-Through).
  - **Nation-Specific Overrides**: When a nation override is saved or deleted:
    1. Update/Delete in `nation_parameter_overrides` table.
    2. Invalidate/Delete Redis key `param:nation:<nation_id>:<category>:<name>` (Cache-Aside invalidation).

---

## 4. Parameter Categories & Economy Examples

Parameters are segmented into logical categories to prevent variable collisions.

### Category: `economy`
Controls basic economic growth factors, labor force bounds, and cash rules.

| Name | Default Value | Description |
| :--- | :--- | :--- |
| `base_growth_rate` | `0.0015` | Default organic sector monthly output growth index (+0.15%). |
| `participation_rate` | `0.6500` | Percentage of total national population belonging to the active labor force. |
| `consumer_propensity` | `0.7000` | Average fraction of income spent by households, defining the sales tax base. |
| `min_treasury_reserve`| `1000000.00` | Cash threshold below which a nation borrows money (triggering debt). |

### Category: `inflation`
Defines CPI pricing calculations.

| Name | Default Value | Description |
| :--- | :--- | :--- |
| `base_inflation` | `0.0016` | Organic background monthly CPI inflation (+0.16% / ~2% annually). |
| `food_weight` | `0.1500` | CPI calculation weight assigned to food costs. |
| `fuel_weight` | `0.1000` | CPI calculation weight assigned to energy costs. |
| `housing_weight` | `0.2500` | CPI calculation weight assigned to shelter/construction costs. |
| `services_weight` | `0.5000` | CPI calculation weight assigned to tertiary industries. |

### Sector Scarcity Multipliers (Category: `<sector_name>`)
Used by the `InflationEngine` to simulate supply shock pricing (e.g. food costs skyrocketing when agriculture output declines).

| Name | Default Value | Description |
| :--- | :--- | :--- |
| `consumption_rate` | `12.5000` | Units of sector output demanded per capita monthly. |
| `scarcity_multiplier` | `0.1200` | Pricing sensitivity curve index when supply is below consumption. |

---

## 5. Administrative Editing Flow

To preserve balancing integrity in a multiplayer environment, changing parameters utilizes a transaction-safe editing flow:

```
[Admin Page: Edit Parameter]
            |
            v
   Perform Zod Validation
   (e.g., check that CPI weights sum to 1.0; check sensitivities are bounded)
            |
            v
   Write to Postgres DB within transaction
            |
            v
   Invalidate Redis Cache Keys
            |
            v
   Dispatch ParameterUpdateEvent to active instances
```
- **Auditing**: All adjustments to the `parameters` or `nation_parameter_overrides` tables are logged to an audit table to track tuning changes.
- **Hot-Reloading**: Since the simulation engines read resolved parameters on every tick, adjustments are applied immediately starting with the very next monthly simulation cycle.
