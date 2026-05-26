# WORLDr Tick System & Simulation Engine - Phase 1

This document specifies the execution flow, ordering, mathematical modifier resolving, and database transaction handling for the monthly tick simulation in Phase 1 of WORLDr.

---

## 1. Tick Execution Order

During a single monthly tick, the simulation engine calculates variables sequentially. Each subsystem depends on values calculated in the previous steps. The execution order is as follows:

```
+--------------------------------------------------------+
| 0. Initialize Tick: Load parameters, active laws &    |
|    resolve modifiers                                   |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 1. Sector Production: Update outputs based on labor,   |
|    productivity indices, and modifiers                 |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 2. Wages & Employment: Distribute wages, calculate     |
|    hiring demand, adjust sector workers, compute       |
|    unemployment rate                                   |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 3. Inflation & CPI: Recalculate sector costs (food,    |
|    fuel, housing) and aggregate into Consumer Price    |
|    Index (CPI)                                         |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 4. Budget System: Calculate tax revenues, execute      |
|    allocated spending, update debt/treasury balances   |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 5. Approval & Stability: Update pop group metrics based|
|    on income changes, inflation, and unemployment;     |
|    aggregate national approval and stability           |
+--------------------------------------------------------+
                           |
                           v
+--------------------------------------------------------+
| 6. Finalize Tick: Increment nation.current_tick, write  |
|    historical snapshot record, trigger WebSockets      |
+--------------------------------------------------------+
```

---

## 2. Modifier & Formula Resolver

Before running the simulation sub-engines, active policies must be compiled into concrete values.

### The Modifier Model
Laws affect the simulation by altering base parameters. Modifiers stored in `law_effects` can be:
- `additive`: Modifies base parameters by a flat amount (e.g., adding `0.02` to a base tax rate).
- `multiplier`: Scales the base parameter proportionally (e.g., multiplying productivity by `1.05` for a +5% boost).

### Resolver Code Signature Example (TypeScript)
```typescript
interface ActiveModifier {
  targetType: 'sector' | 'population_group' | 'tax' | 'budget_item' | 'nation';
  targetName: string;
  parameterName: string;
  modifierType: 'multiplier' | 'additive';
  modifierValue: number;
}

class ModifierResolver {
  /**
   * Resolves a parameter value by applying all active modifiers to a base parameter value.
   */
  public static resolve(
    baseValue: number,
    modifiers: ActiveModifier[]
  ): number {
    let resolvedValue = baseValue;

    // 1. Process Additive Modifiers
    const additives = modifiers.filter(m => m.modifierType === 'additive');
    for (const add of additives) {
      resolvedValue += add.modifierValue;
    }

    // 2. Process Multiplicative Modifiers
    const multipliers = modifiers.filter(m => m.modifierType === 'multiplier');
    for (const mult of multipliers) {
      resolvedValue *= mult.modifierValue;
    }

    return resolvedValue;
  }
}
```

---

## 3. Database Transaction & Persistence Flow

To prevent database inconsistency in the event of worker or network failures, all state changes for a single tick are executed inside a **single ACID transaction**.

```
BEGIN TRANSACTION;

  -- 1. Fetch nation and lock for update
  SELECT * FROM nations WHERE id = ? FOR UPDATE;

  -- 2. Fetch related sub-entities
  SELECT * FROM economic_sectors WHERE nation_id = ?;
  SELECT * FROM population_groups WHERE nation_id = ?;
  SELECT * FROM taxes WHERE nation_id = ?;
  SELECT * FROM budget_items WHERE nation_id = ?;
  SELECT * FROM laws WHERE nation_id = ? AND status = 'passed';

  -- 3. Execute math engines (in-memory)
  -- ... calculations ...

  -- 4. Update live state
  UPDATE nations SET treasury = ?, debt = ?, gdp = ?, inflation_cpi = ?, approval = ?, stability = ?, current_tick = ? WHERE id = ?;
  UPDATE economic_sectors SET output = ?, workers = ?, productivity = ?, wages = ?, growth = ? WHERE id = ?;
  UPDATE population_groups SET size = ?, income = ?, approval = ? WHERE id = ?;
  UPDATE taxes SET revenue = ? WHERE id = ?;
  UPDATE budget_items SET allocation = ? WHERE id = ?;

  -- 5. Insert historical snapshot record
  INSERT INTO historical_snapshots (nation_id, tick, gdp, inflation_cpi, ..., snapshot_data) 
  VALUES (?, ?, ?, ?, ..., ?::jsonb);

COMMIT;
```

If any step fails, the transaction is rolled back completely (`ROLLBACK`), preserving the database in its previous valid monthly state.

---

## 4. Tick Worker Triggering Setup (BullMQ)

The `TickWorker` runs asynchronously in the background. It is triggered by the queue service whenever a monthly tick is scheduled or requested.

```typescript
import { Worker, Job } from 'bullmq';
import { db } from '../config/database';
import { redis } from '../config/redis';
import { TickEngine } from '../simulation/tick.engine';
import { logger } from '../utils/logger';

const TICK_QUEUE_NAME = 'tick-queue';

export const tickWorker = new Worker(
  TICK_QUEUE_NAME,
  async (job: Job<{ nationId: string }>) => {
    const { nationId } = job.data;
    const lockKey = `lock:tick:nation:${nationId}`;
    
    logger.info(`Starting tick processing for nation ${nationId} (Job ID: ${job.id})`);

    // 1. Acquire Redis distributed lock
    const acquiredLock = await redis.set(lockKey, 'locked', 'NX', 'PX', 30000); // 30s lock
    if (!acquiredLock) {
      logger.warn(`Tick for nation ${nationId} is already running elsewhere. Skipping.`);
      return;
    }

    try {
      // 2. Execute simulation tick inside database transaction
      await db.transaction(async (trx) => {
        const tickEngine = new TickEngine(trx, nationId);
        await tickEngine.executeTick();
      });

      logger.info(`Successfully completed tick for nation ${nationId}`);
      
      // 3. Publish update event to Redis Pub/Sub for WebSockets
      await redis.publish('tick:completed', JSON.stringify({ nationId }));
      
    } catch (error) {
      logger.error(`Tick failed for nation ${nationId}:`, error);
      throw error; // Fail job to trigger retry logic
    } finally {
      // 4. Release Redis lock
      await redis.del(lockKey);
    }
  },
  {
    connection: redis,
    concurrency: 5 // Process up to 5 nation ticks concurrently per worker instance
  }
);
```
