# WORLDr — System Instructions

WORLDr is a highly realistic multiplayer political and economic simulation web game.

The project prioritizes:
- realism,
- systemic depth,
- scalability,
- parameterization,
- multiplayer synchronization,
- long-term maintainability.

Core philosophy:
- Every system must interact with other systems.
- No isolated mechanics.
- No magical effects.
- Every policy has tradeoffs.
- Economy drives politics.
- Population reacts dynamically.
- Institutions matter.
- Time-based simulation is core.

Simulation principles:
- Monthly tick-based simulation.
- Deterministic calculations where possible.
- Parameter-driven balancing.
- Historical persistence of all major metrics.
- Emergent gameplay preferred over scripted gameplay.

Architecture rules:
- Never hardcode gameplay values.
- All balancing values must come from parameters.
- Systems must be modular.
- Nation systems must support future multi-nation expansion.
- Every entity must use IDs.
- All APIs must be versionable.
- Frontend and backend must remain decoupled.

Database philosophy:
- PostgreSQL as primary DB.
- Normalized schemas.
- Foreign keys enforced.
- Historical snapshots stored monthly.
- Nation state separated from historical data.

Backend philosophy:
- Node.js + TypeScript.
- Service-oriented architecture.
- Tick engine separated from API layer.
- Redis for caching and real-time systems.
- WebSockets for live updates.

Frontend philosophy:
- React + Next.js + Tailwind.
- Bloomberg terminal aesthetic.
- Information-dense UI.
- Modular widgets.
- Real-time dashboards.
- Desktop-first UX.

Simulation philosophy:
- Economy simulation first.
- Politics emerges from economic conditions.
- Population groups react independently.
- Inflation, unemployment, and debt are central pressures.
- Laws modify parameters, not direct outcomes.

Coding standards:
- Strict TypeScript typing.
- Reusable components.
- Shared enums/constants centralized.
- Avoid duplicated logic.
- Prefer composition over inheritance.

Future-proofing:
- All systems must support:
  - multiplayer governance,
  - multiple nations,
  - diplomacy,
  - trade,
  - military expansion later.

AI instructions:
- Follow gemini.md strictly.
- Do not redesign core architecture unless explicitly instructed.
- Preserve naming consistency.
- Preserve parameterization.
- Avoid placeholder logic unless requested.