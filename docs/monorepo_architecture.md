# WORLDr Monorepo Architecture Specification

This document defines the final, authoritative monorepo architecture for **WORLDr**. It establishes a strict separation of concerns, guarantees future multi-nation and multiplayer scaling, defines a clear import strategy, and outlines the precise folder structure for development.

---

## 1. Directory Map (Monorepo Blueprint)

The project is structured as a **workspace-based monorepo** managed by **npm workspaces** and task-orchestrated via **Turborepo**.

```
WORLDr/
├── apps/                               # Application packages (Deployables)
│   ├── frontend/                       # Next.js App Router Frontend
│   │   ├── src/
│   │   │   ├── app/                    # App Router pages and layouts
│   │   │   ├── components/             # Reusable UI widgets and blocks
│   │   │   │   ├── common/             # Atomic components (buttons, panels)
│   │   │   │   └── widgets/            # Complex dashboard widget panels
│   │   │   ├── hooks/                  # Custom React hooks
│   │   │   ├── services/               # API clients and HTTP wrappers
│   │   │   └── store/                  # Zustand global store definitions
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   │
│   └── backend/                        # Node.js + TS Express & Worker Server
│       ├── src/
│       │   ├── api/                    # Controllers, middlewares, routes, WS
│       │   ├── config/                 # Env parser, Redis/DB connection poolers
│       │   ├── services/               # Transactional business logic orchestrator
│       │   ├── repositories/           # Knex-shielded SQL query interfaces
│       │   ├── workers/                # Background BullMQ queue worker scripts
│       │   ├── app.ts                  # Express application configuration
│       │   └── server.ts               # HTTP & WebSocket runner
│       └── tsconfig.json
│
├── packages/                           # Shared internal packages (Libraries)
│   ├── tsconfig/                       # Shared base TypeScript configurations
│   ├── eslint-config/                  # Linting standards across workspaces
│   ├── shared/                         # Domain core types, enums, and helpers
│   │   ├── src/
│   │   │   ├── types/                  # Shared typings (Nation, Sector, User)
│   │   │   ├── constants/              # System constants and limits
│   │   │   ├── validation/             # Zod validation schemas (Register, Budget)
│   │   │   └── formulas/               # Core math formulas (compound GDP, inflation)
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── database/                       # Migrations, Seeds, and Knex client configs
│       ├── migrations/
│       ├── seeds/
│       └── knexfile.ts
│
├── .vscode/                            # Workspace-wide VS Code configuration
│   └── settings.json
├── .env                                # Local environment secrets
├── .env.example                        # Template for environment variables
├── package.json                        # Root package.json defining workspaces
├── turbo.json                          # Turborepo task pipeline configuration
└── README.md
```

---

## 2. Shared Package Structure (`@worldr/shared`)

All shared types, enums, formulas, and validations reside in `packages/shared`. This package is compiled and linked into both `apps/frontend` and `apps/backend` to prevent code duplication.

### Directory Breakdown
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── nation.ts                   # Nation & Sector state schemas
│   │   ├── user.ts                     # User & Auth credentials schemas
│   │   └── events.ts                   # WebSocket transaction event signatures
│   ├── constants/
│   │   ├── parameters.ts               # Base boundary limits (min tax rates, cap wages)
│   │   └── economy.ts                  # Base growth coefficients
│   ├── validation/
│   │   ├── auth.schema.ts              # Zod validation schemas for register/login
│   │   └── budget.schema.ts            # Zod validation schemas for budget changes
│   └── formulas/
│       ├── finance.ts                  # Tax yield & deficit calculations
│       └── growth.ts                   # GDP compounding and modifier application
├── package.json
└── tsconfig.json
```

### Reference Usage
```typescript
// Shared Zod schema validated in backend and typed in frontend
import { BudgetUpdateSchema } from '@worldr/shared/validation';
import { Nation, Sector } from '@worldr/shared/types';
import { calculateCompoundGrowth } from '@worldr/shared/formulas';
```

---

## 3. Path Aliasing & Import Strategy

To ensure refactor-safe paths and avoid nested relative imports (`../../../`), the following path alias strategy is enforced:

### Configured Path Aliases
1. **`@worldr/shared/*`**: Maps to the shared package library files.
2. **`@/frontend/*`**: Maps to `apps/frontend/src/*` (configured in frontend `tsconfig.json`).
3. **`@/backend/*`**: Maps to `apps/backend/src/*` (configured in backend `tsconfig.json`).

### Configuration Blueprints

#### Root `package.json` Workspaces Configuration
```json
{
  "name": "worldr-monorepo",
  "private": true,
  "packageManager": "npm@11.13.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

#### Shared package (`packages/shared/package.json`)
```json
{
  "name": "@worldr/shared",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w"
  },
  "dependencies": {
    "zod": "^3.22.4"
  }
}
```

---

## 4. API Layer & WebSocket Gateway

### REST Router Structure
The API follows a decoupled controller-route structure. Inbound HTTP requests are validated via Zod at the route level before reaching controllers:

```
apps/backend/src/api/
├── routes/
│   ├── auth.routes.ts                  # /api/v1/auth/*
│   └── nation.routes.ts                # /api/v1/nations/*
├── controllers/
│   ├── auth.controller.ts
│   └── nation.controller.ts
├── middlewares/
│   ├── auth.middleware.ts              # Resolves JWT and appends User to request
│   ├── validation.middleware.ts        # Validates request bodies against Zod schemas
│   └── error.middleware.ts             # Captures exceptions and returns standardized error payloads
└── ws/
    ├── socket.server.ts                # Socket.io initialization
    └── namespace.handlers.ts           # Handles room joins and pushes updates
```

### WebSocket Rooms (Multiplayer Scaling)
WebSockets are used exclusively for push synchronization. Users subscribe to updates using **room isolation**:
- **Room signature**: `nation:room:<nation_id>`
- When a client authenticates via WebSocket, the server reads the user's `nation_id` from their verified JWT token and automatically joins them to the appropriate room.
- Ticks computed by background workers broadcast the updated state directly to the room.

---

## 5. Simulation Engine Structure

The simulation engine is fully isolated from Express HTTP routes, database pooling, and scheduling protocols to remain unit-testable and high-performance.

```
apps/backend/src/simulation/
├── engines/                            # Sub-engines (pure functions)
│   ├── economy.engine.ts               # Sector calculations
│   ├── budget.engine.ts                # Taxes, treasury, debt
│   ├── inflation.engine.ts             # CPI derivation
│   └── political.engine.ts             # Stability and approval ratings
├── modifier.resolver.ts                # Resolves law modifiers
├── tick.engine.ts                      # Main orchestrator
└── index.ts                            # Package entry point
```

### Modular Pipeline Execution Flow
Calculations run sequentially on a single state memory block using pure functional transformations:

```typescript
export function runSimulationTick(baseState: NationState, modifiers: ParameterModifiers): NationState {
  let state = { ...baseState };

  state = EconomyEngine.calculate(state, modifiers);
  state = LaborEngine.calculate(state, modifiers);
  state = InflationEngine.calculate(state, modifiers);
  state = BudgetEngine.calculate(state, modifiers);
  state = PoliticalEngine.calculate(state, modifiers);
  state = SnapshotEngine.generate(state);

  return state;
}
```

---

## 6. Multiplayer & Future Multi-Nation Support

To accommodate multiple nations interacting simultaneously, the system uses an isolated tenancy model:

1. **Tenancy Keying**: Every data entity (sectors, population groups, laws, snapshots) is mapped to a parent `nation_id` UUID.
2. **Horizontal Scale**: Ticks run per-nation. If the system scales to thousands of nations:
   - Nations can be partitioned across different background worker queues (`tick-queue-node-1`, `tick-queue-node-2`).
   - The master `TickEngine` fetches only the targeted `nation_id` state and updates it within a single atomic database transaction.
3. **Database Sharding Readiness**: Foreign keys ensure that all queries remain scoped by `nation_id`. If database sharding is required in the future, rows can be mapped directly to specific database nodes based on the `nation_id` partition key.

---

## 7. State Management & Hydration Strategy

The frontend relies on **Zustand** for state management, structured to mirror the domain data structure.

### Hydration Flow
```
[Page Mount] ---> [Fetch GET /api/v1/nations/:id] ---> [Hydrate Zustand Store]
                                                              |
                                                     [Join WebSocket Room]
                                                              |
[Real-Time State Broadcast] <--- [Sync Socket Event] <--------+
```

### Zustand Store Blueprint (`apps/frontend/src/store/useNationStore.ts`)
```typescript
import { create } from 'zustand';
import { Nation, Sector } from '@worldr/shared/types';

interface NationState {
  nation: Nation | null;
  sectors: Sector[];
  isLoading: boolean;
  setNation: (nation: Nation) => void;
  setSectors: (sectors: Sector[]) => void;
  updateFromWebSocket: (updates: Partial<Nation>) => void;
}

export const useNationStore = create<NationState>((set) => ({
  nation: null,
  sectors: [],
  isLoading: false,
  setNation: (nation) => set({ nation }),
  setSectors: (sectors) => set({ sectors }),
  updateFromWebSocket: (updates) => set((state) => ({
    nation: state.nation ? { ...state.nation, ...updates } : null,
  })),
}));
```

---

## 8. Environment Configuration Structure

We use structured environment files at the root level. Applications fetch their configurations using filtered environment schemas:

* **`.env`**: Holds local secrets (e.g., PostgreSQL credentials, Redis host, session secret keys). Never committed to version control.
* **`.env.example`**: Non-sensitive template showing all required environment keys. Committed to git.

### Environment Variable Validation Schema
Parsed at boot using Zod to ensure zero runtime configuration failures:

```typescript
import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});
```

---

## 9. Final Naming & Implementation Standards

1. **Files & Folders**:
   - Folders: lowercase hyphenated (`components/layout-widgets/`).
   - React Components: PascalCase (`TerminalWidget.tsx`).
   - TypeScript helpers/classes: camelCase (`api.client.ts`, `auth.service.ts`).
2. **Database Schema**:
   - Tables & columns: `snake_case`. All primary/foreign keys must use UUID formats.
3. **API Contracts**:
   - HTTP routes: lowercase hyphenated (`/api/v1/nations/:id/budget-allocation`).
   - Payload JSON keys: `camelCase`.
4. **Tooling Strategy**:
   - Linting: ESLint with Next.js and TypeScript compiler rules configured workspace-wide.
   - Formatting: Prettier configurations inherited from the root directory.
