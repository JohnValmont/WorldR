# WORLDr Backend Architecture - Phase 1 Design

This document details the production-ready backend architecture for Phase 1 of WORLDr, structured using Node.js, TypeScript, Express, Redis, and WebSockets.

---

## 1. Folder Structure

```
WORLDr/backend/
├── src/
│   ├── config/             # Configuration managers (env, DB pools, Redis client)
│   │   ├── database.ts     # Knex / pg Pool configuration
│   │   ├── redis.ts        # ioredis configuration
│   │   └── env.ts          # Zod validation schema for environment variables
│   │
│   ├── api/                # API and presentation layer
│   │   ├── controllers/    # Route controllers (AuthController, NationController, LawController)
│   │   ├── middlewares/    # Custom Express middlewares (auth, logging, rate limiter)
│   │   ├── routes/         # Express Router mapping paths to controllers
│   │   └── ws/             # WebSocket connections and namespace handlers
│   │
│   ├── services/           # Service layer wrapping business logic
│   │   ├── auth.service.ts
│   │   ├── nation.service.ts
│   │   ├── parameter.service.ts
│   │   └── queue.service.ts # Interacts with background worker triggers
│   │
│   ├── simulation/         # Core simulation engines
│   │   ├── engines/        # Sub-engines mapping to specific systems
│   │   │   ├── economy.engine.ts
│   │   │   ├── politics.engine.ts
│   │   │   ├── inflation.engine.ts
│   │   │   └── budget.engine.ts
│   │   ├── tick.engine.ts  # Master orchestrator that schedules and updates ticks
│   │   └── modifier.resolver.ts # Resolves parameter modifiers from active laws
│   │
│   ├── repositories/       # Normalized database query interface
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   ├── nation.repository.ts
│   │   ├── sector.repository.ts
│   │   ├── population.repository.ts
│   │   ├── tax.repository.ts
│   │   ├── budget.repository.ts
│   │   ├── law.repository.ts
│   │   ├── parameter.repository.ts
│   │   └── snapshot.repository.ts
│   │
│   ├── workers/            # Background worker threads
│   │   └── tick.worker.ts  # BullMQ tick processor
│   │
│   ├── types/              # Centrally shared TypeScript types and interfaces
│   │   ├── express.d.ts    # Express namespace extensions
│   │   └── index.ts        # Simulation model definitions
│   │
│   ├── utils/              # Helper utilities
│   │   ├── logger.ts       # Winston / Pino logger wrapper
│   │   └── errors.ts       # Centralized API custom error handlers
│   │
│   ├── app.ts              # Express application configuration
│   └── server.ts           # WebSocket server initialization & process handlers
```

---

## 2. Service Architecture

The backend utilizes a **Service-Repository** pattern. Services encapsulate transactional business logic, orchestrating multiple repositories and external subsystems.

```
       +---------------------------------------------+
       |                  Client                     |
       +---------------------------------------------+
                              |
                              v [HTTP / WebSocket]
       +---------------------------------------------+
       |                 API Layer                   |
       |     (Controllers & WebSocket Handlers)      |
       +---------------------------------------------+
                              |
                              v
       +---------------------------------------------+
       |               Service Layer                 |
       | (AuthService, NationService, QueueService)  |
       +---------------------------------------------+
            |                 |                 |
            |                 |                 v
            |                 |       +-------------------+
            |                 |       |   Worker Queue    |
            |                 |       |  (BullMQ / Redis) |
            |                 |       +-------------------+
            v                 v                 |
+-------------------+ +---------------+         v
| Caching Interface | |  Repositories | +-------------------+
|      (Redis)      | |  (Postgres)   | | Simulation Engine |
+-------------------+ +---------------+ +-------------------+
```

- **API Controllers**: Restrict their scope to parsing requests, calling the corresponding service, and returning structured JSON HTTP responses.
- **Service Components**: Handle business logic, trigger database transactions through repositories, fetch cached values, and queue background jobs.
- **Repositories**: Execute raw or Knex-generated SQL, shielding the services from database-specific structure.

---

## 3. API & Auth Layer

### Authentication Architecture
- **JWT (JSON Web Tokens)**: Used for stateless user authentication.
- **Access Tokens**: Short-lived (e.g., 15 minutes) passed in the `Authorization: Bearer <token>` header.
- **Refresh Tokens**: Long-lived (e.g., 7 days) stored securely in `HTTP-Only`, `SameSite=Strict` cookies.
- **Verification Middleware**: Extracts the token, verifies the signature, and sets `req.user` (with `id` and associated `nation_id`) for subsequent controllers.

### Core API Endpoints
All API paths follow the versioned REST convention: `/api/v1/...`

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register a user. |
| `POST` | `/api/v1/auth/login` | Public | Login and obtain JWT tokens. |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh expired access tokens. |
| `GET` | `/api/v1/nations/:nation_id` | User | Get current live state of a nation. |
| `PATCH`| `/api/v1/nations/:nation_id/budget`| User | Update budget/tax allocations. |
| `GET` | `/api/v1/nations/:nation_id/laws` | User | Get active policies and proposed laws. |
| `POST` | `/api/v1/nations/:nation_id/laws` | User | Propose or toggle law statuses. |
| `GET` | `/api/v1/nations/:nation_id/history`| User | Get history/snapshot data for charts. |

---

## 4. Caching & Caching Architecture

We implement a dual-purpose Redis caching strategy to guarantee scalability during simulation ticks:

### 1. Parameter Cache (Read-Through/Write-Through)
- Base parameters (e.g., sector coefficients, default tax modifiers) are stored in the database but cached in Redis under the prefix `param:<category>:<name>`.
- The simulation engine reads these values directly from Redis to eliminate SQL queries during massive calculation loops.
- Cache invalidation occurs automatically when an administrator updates a value inside the `parameters` table.

### 2. Lock Management (Distributed Locks)
- Prior to running a simulation tick, the worker acquires a Redis distributed lock (`redlock`) using the key `lock:tick:nation:<nation_id>` with an expiry of 30 seconds.
- This guarantees that even with multiple worker processes running, a nation's state cannot be modified by concurrent processes.

---

## 5. Background Workers & Event Queue Design

To prevent long-running computations from blocking API performance, we utilize a separate **Worker Queue** pattern.

```
[API Server] 
     |
     v (Push tick job)
+-----------------------+
|  Redis Queue (BullMQ) |
+-----------------------+
     |
     v (Fetch job & Lock nation)
[Background Worker] ---> [Execute Simulation Engine] ---> [Write DB Transaction]
                                                                  |
                                                                  v
                                                        [WebSocket Broadcast]
```

- **Job Queues**: Configured using **BullMQ**.
- **Tick Worker**: A separate Node.js process dedicated to executing simulation jobs.
- **Workflow**:
  1. Trigger event (e.g., monthly cron trigger or manual action) pushes a `{ nationId }` payload to the `tick-queue`.
  2. The `tick.worker.ts` process consumes the job.
  3. Worker locks the nation in Redis, runs the master `TickEngine`, commits calculations, writes snapshots to Postgres, unlocks Redis, and updates WebSocket rooms.

---

## 6. Recommended Libraries

- **Runtime Environment**: Node.js v18+ & TypeScript v4.9+
- **HTTP Server**: `express` with `cors`, `helmet`, and `compression`.
- **Database Access**: `pg` (Postgres driver) & `knex` (SQL query builder).
- **Queuing & Workers**: `bullmq` & `bull-board` (for queue monitoring).
- **Caching & Locks**: `ioredis` & `redlock`.
- **Real-Time Delivery**: `socket.io`.
- **Validation**: `zod` (for request validation and environment parsing).
- **Security**: `bcryptjs` (password hashing) & `jsonwebtoken` (JWT creation/validation).
- **Logging**: `pino` (structured JSON logger).
