# WORLDr Simulation Engine - Software Architecture

This document details the software design, modular composition, memory management, and caching strategies of the simulation tick engine in Phase 1 of WORLDr.

---

## 1. Engine Software Design & Modular Sub-Engines

To ensure maintainability and testability, the simulation engine is broken down into modular sub-engines governed by a central orchestrator.

```
       +---------------------------------------------+
       |                 TickEngine                  |
       |                (Orchestrator)               |
       +---------------------------------------------+
                              |
     +------------------------+------------------------+
     |                        |                        |
     v                        v                        v
+------------+          +------------+          +------------+
|  Economy   |          | Labor/Wage |          | Inflation  |
|   Engine   |          |   Engine   |          |   Engine   |
+------------+          +------------+          +------------+
     |                        |                        |
     +------------------------+------------------------+
                              |
     +------------------------+------------------------+
     |                        |                        |
     v                        v                        v
+------------+          +------------+          +------------+
|   Budget   |          | Political  |          | Snapshot   |
|   Engine   |          |   Engine   |          |   Engine   |
+------------+          +------------+          +------------+
```

### Sub-Engine Responsibilities
- **`TickEngine`**: Loads data, acquires distributed locks, executes sub-engines sequentially, manages database transactions, and handles rollback states.
- **`EconomyEngine`**: Calculates productivity, sector output, and Gross Domestic Product (GDP).
- **`LaborEngine`**: Dictates hiring demand, wage rates, employment allocation, and unemployment.
- **`InflationEngine`**: Derives sector-specific pricing changes and outputs the Consumer Price Index (CPI).
- **`BudgetEngine`**: Evaluates tax collection, deducts spending lines, updates treasury cash reserves, and issues debt.
- **`PoliticalEngine`**: Recalculates popular approval ratings and national stability.
- **`SnapshotEngine`**: Packages the final state into standard and JSONB columns for long-term database storage.

---

## 2. Memory Handling & Execution Lifecycle

To prevent garbage collection overhead and memory fragmentation in high-throughput environments:
1. **Plain Old JavaScript Objects (POJOs)**: Calculations are executed on raw, flat in-memory data objects rather than heavy ORM models.
2. **Stateless Sub-Engines**: Engines contain pure functions with no local state. The nation's state object is passed from engine to engine as a reference:
   `const stateAfterEconomy = EconomyEngine.calculate(baseState, modifiers);`
3. **Garbage Collection Optimization**: Re-uses temporary vectors where possible, minimizing allocation of transient objects in calculation loops.

---

## 3. Caching Strategy for Simulation Parameters

To maintain sub-millisecond execution speeds, the simulation minimizes SQL reads for static balancing values:

### Redis Parameter Caching
- **Parameter Hydration**: Global parameters (`parameters` table) are fetched once and cached in Redis with keys styled as `param:<category>:<name>`.
- **Pre-Tick Fetching**: The `TickEngine` performs a single pipeline fetch (`MGET`) from Redis at step `0` to retrieve all required base variables.
- **Cache Invalidation**: When parameters are adjusted in the admin panel, a Hook triggers a cache flush of that key, ensuring the next tick reads the updated value.

### Database Query Optimization
- All writes are batched and executed as a single transaction using Knex query builder parameters to minimize database roundtrips.
