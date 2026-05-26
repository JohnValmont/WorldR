# WORLDr Frontend Architecture & UI System - Reference Standard

This document establishes the official frontend architecture standard for Phase 1 of WORLDr. It specifies the single application root (`src/`), path aliasing, component organization, and naming rules.

---

## 1. Authoritative Folder Structure

All React/Next.js files are organized under the `src/` directory. Redundant root-level directories (`frontend/components/` and `frontend/screens/`) are deleted.

```
frontend/
├── tsconfig.json           # Configures path aliases (@/* -> src/*)
├── tailwind.config.js      # Declares terminal colors and fonts
├── postcss.config.js
├── package.json
│
└── src/                    # Single Application Root
    ├── app/                # Next.js App Router (Layouts and Pages)
    │   ├── globals.css     # Global terminal colors and spacing resets
    │   ├── layout.tsx      # Top-level layout (Metadata, Root HTML)
    │   ├── page.tsx        # Boot/Landing connection page
    │   │
    │   ├── (auth)/         # Grouped Authentication Routes
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   │
    │   └── dashboard/      # Main Game Screen Layout & Sub-pages
    │       ├── layout.tsx  # Layout Grid (Sidebar, Status Header)
    │       ├── page.tsx    # Summary screen (Overview widgets)
    │       ├── economy/page.tsx
    │       ├── budget/page.tsx
    │       └── laws/page.tsx
    │
    ├── components/         # Reusable UI Component Library
    │   ├── ui/             # Atomic inputs (Buttons, Input, Dialog)
    │   ├── layout/         # Grid wrappers (TerminalWidget, Sidebar, StatusHeader)
    │   └── widgets/        # Dedicated data cards (GDPSectors, CPIBreaks)
    │
    ├── hooks/              # Custom React hooks (useAuth, useWebSockets)
    ├── store/              # Zustand state managers (useNationStore, useAuthStore)
    └── services/           # Axios HTTP endpoints (api.client.ts)
```

---

## 2. Component Organization Strategy

To maintain a clean separation of concerns:
- **`components/ui/`**: Core primitives (buttons, dropdowns). They are stateless and receive styling and actions via standard React props.
- **`components/layout/`**: Viewport structural containers. The master `TerminalWidget` resides here to wrap dashboard data cells cleanly.
- **`components/widgets/`**: Game-specific widgets. They consume slices of state from the Zustand store (using hooks) and handle logical rendering (e.g., color-coding values or rendering tables).

---

## 3. Screen (Page) Organization Strategy

Next.js App Router folders handle screen-level structures:
- **Layout Files (`layout.tsx`)**: Establish layouts and viewport configurations (sidebars, grids). They do not store state, keeping page updates smooth.
- **Page Files (`page.tsx`)**: Act as screen entries, handling data fetching (REST) and instantiating the widgets.

---

## 4. Import / Path Alias Strategy

To prevent path traversal clutter (`../../../../components/ui/button`) and path breakage during refactoring:
- **Paths configuration** (`tsconfig.json`):
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- **Rules**:
  - Always use `@/components/` instead of relative paths for items outside the current directory.
  - Avoid using path aliases for sibling imports in the same directory (use `./file` instead).

---

## 5. Reusable UI & Widget Architecture

- **`TerminalWidget`**: Consistently wraps all widgets. It handles titles, border styling, header actions, and loading screens.
- **Data density rules**:
  - Pad layout items tightly (`p-1` to `p-3`).
  - Use high-density components (flat tables, flex lists) over spacious margins.
  - Numbers are wrapped in `monospace` font styling to preserve column alignments.

---

## 6. Recommended Naming Standards

- **React Components**: PascalCase (e.g., `TerminalWidget.tsx`, `GDPSectorsCard.tsx`).
- **Hooks**: camelCase prefixed with `use` (e.g., `useWebSockets.ts`, `useAuth.ts`).
- **Store & Services**: camelCase (e.g., `useNationStore.ts`, `api.client.ts`).
- **Styles & Settings**: lowercase kebab-case (e.g., `globals.css`, `postcss.config.js`).

---

## 7. Migration Steps

When adding new screens or refactoring Phase 1 assets:
1. Ensure files are created inside `frontend/src/` exclusively.
2. Replace all relative imports with path aliases starting with `@/`.
3. If duplicate components are found in root folders, move their logic to `src/components/` and delete the root folders.
