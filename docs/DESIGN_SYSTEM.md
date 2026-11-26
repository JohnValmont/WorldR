# WORLDr design system (closed alpha)

One material, one accent, one type system, for the game and for the public pages.
This page is the rulebook; the values live in code.

## Where things live

| What | File | Used by |
|---|---|---|
| Tokens (colour, type, space, radius, elevation, motion, layers) | `frontend/public/design/tokens.css` | Next app (linked in `src/app/layout.tsx`), Tailwind (`tailwind.config.ts` reads the `--*-rgb` channels), static landing + sign-up pages |
| Hex mirror for inline styles / charts / canvas | `frontend/src/lib/design/tokens.ts` | Code that needs real hex (e.g. `${color}88`) |
| Build label, Discord link, real hours per game month | `frontend/public/design/build.json` | Game top bar, auth pages, What's New, landing + sign-up (`failsafe.js` fills `[data-build]`, `[data-month-hours]`, `[data-discord]`), `lib/gameTime.ts` |
| Drift check | `frontend/scripts/check-tokens.mjs` (`npm run check:tokens`, runs in CI) | Fails if `tokens.ts` differs from `tokens.css` |
| Shared components | `frontend/src/components/ui/*` (PageHeader + HeaderStat, Tabs, Button, Card, StatChip, StatCard, EmptyState …), politics `_floor/kit.tsx` (Btn, Card, Chip, LockedBtn) | All screens |
| Readable text on data colours | `readableOn(hex)` in `src/lib/design/tokens.ts` | Party/nation badges: picks dark or white text by measured contrast |
| Nation flags + emblems | `Flag` / `EmblemGlyph` in `_floor/worldKit.tsx`, drawn from each nation's flag recipe (pattern, colours, emblem) | Every flag in the game |
| Evidence | `tools/ui-audit/` (`journey.js`, `a11y.js`; local only) | New-player journey and axe-core audit behind the scorecard |
| Global classes | `frontend/src/app/globals.css` (`.btn-primary/.btn-secondary/.btn-danger/.btn-ghost`, `.terminal-input`, `.auth-*`) | All screens |

## Colour

- Surfaces, darkest first: `bg` #0B0D12 → `surface` #13161E → `raised` #1B1F29 → `overlay` #232835.
- Text: `ink` #ECEAE4 (15:1), `ink-dim` #A3A4AC (7.3:1), `ink-faint` #868994 (4.9:1). Every text token passes WCAG AA on every surface. Never put body text below `ink-faint`.
- Accent: Drennian gold `accent` #E8B84B. Text on gold is `#17130A`.
- Semantic: `good` #4FB286 (gain, yea), `bad` #D9625A (loss, nay, error), `warn` #E8913A, `info` #6AA6E8. Use them for outcomes, not decoration.
- Party and nation colours come from data (parties table, `NATION_COLOR` in `_floor/worldKit.tsx`), never from tokens.
- Tailwind: use `bg-surface`, `text-ink-dim`, `border-line`, `text-accent`, `bg-good/10` … The legacy names (`terminal-*`, `zinc-*`, `amber-*`) are re-pointed to the tokens so old screens follow; prefer the token names in new code.

## Type

- Four families only: **Cinzel** (brand wordmark and page titles), **Outfit** (all UI text), **JetBrains Mono** (numbers, codes; tabular figures are on by default), **Cormorant Garamond** (marketing prose on the landing page only).
- Scale (px): 10 label · 12 meta · 14 body · 16 lead · 20 h3 · 26 h2 · 34 h1 · 48+ display.
- **10px is the floor**, and only for UPPERCASE tracked labels. Body text is 13–15px.
- Buttons and tabs are sentence case, not monospace capitals.

## Shape, depth, motion

- Radius: 6 chips · 10 buttons/inputs · 16 cards · 20 modals/hero cards.
- Cards: hairline border (`line`), 3.5% top sheen, soft drop shadow (`shadow-card`). Same material in `ui/Card` and politics `Card`.
- Motion: 120ms hover/press, 200ms panels, 400ms entry. `prefers-reduced-motion` turns loops and travel off globally (globals.css, landing styles.css).

## Interaction rules

- Keyboard focus is always visible (gold outline via `:focus-visible`). Never remove it without a replacement.
- Locked features stay visible: dashed outline + lock icon + a reason (owner decision). Never fade them below AA contrast with `opacity-40`. The same goes for options the player can't afford yet: dashed, readable, with "Needs 2 energy · you have 0".
- One top bar in the game (`components/ui/BackBar.tsx`): labelled destinations, Back, Guide, Discord and the build badge. Nothing floats over page content; pages do not add their own "Back to Chronicle" links or brand marks.
- No decorative numbers: sparklines, trends and charts show real data or nothing. Players read every number as a fact.
- Modals: one at a time on a player's first screen. What's New is shown only to returning players, once per build.

## Page anatomy

- Every game screen's content sits in ONE centred frame, the same as the top bar and Politics: the `.page-frame` class (globals.css, width `--page-max` from tokens.css). `PageShell`, `PageHeader` and `Tabs` (inset "page") already use it; a screen with its own layout puts `page-frame` on its content wrapper. Never cap a section with a left-aligned `max-w-*` that leaves the right side of a wide screen empty: use a main column + right rail grid instead.
- Every game screen starts with `PageHeader` (gold kicker, Cinzel title as the page's only `h1`, one-line description, optional `aside` for a balance or the clock) and, when it has sections, `Tabs inset="none"` inside it.
- `Tabs` is the one tab bar: real `role="tab"` buttons, arrow-key navigation, optional `badge` / `tone: 'warn'`, and a `trailing` slot that sits *outside* the tab group (for a link such as "Drennport Exchange →").
- Long section lists are grouped by what the player is trying to do (the manufacturing desk: Run the plant / Cars / Sell / Company), not shown as one flat list.

## The month turning

- `components/gameplay/MonthBriefing.tsx` shows a short, skippable briefing when the politics month has moved on since the player last looked: money, trust, clout, energy and their nation's approval, each with the measured change, plus decisions waiting and the newest notices.
- It reads the shared `politics-desk` SWR cache (no polling of its own), never shows on a first visit or while What's New for this build is pending, and stores its snapshot in `localStorage` (`worldr_month_snapshot_v1`).

## Empty states

- An empty panel says what will appear there and offers the next action ("Meet the other players in Corridors →"), never just "Nothing yet".
- A brand-new company shows "No month closed" rather than zeroed charts or trends.

## Public pages (landing + sign-up)

- Static HTML in `frontend/public/landing`, styled from the same tokens.
- Third-party libraries are self-hosted in `public/landing/vendor` (see its README). Do not load scripts from public CDNs: an outage there would block sign-up.
- The 3D globe is decoration. Without WebGL the pages still work (`no-scene` class); `failsafe.js` hides the loader and offers the plain sign-in/register pages if the page script cannot start.
- Copy describes only what exists in the current build. Example content is labelled as an example.

## Checking your work

```bash
cd tools/ui-audit && npm init -y >/dev/null && npm i --no-save playwright@1 axe-core@4.10.2
node journey.js && node journey.js mobile && node a11y.js
```

Both must pass (0 axe violations on 30 screen views; the journey reaches a first decision with no 5xx or dead end) before a UI change ships.

## Adding something

1. Need a colour or size? Use a token. If none fits, add it to `tokens.css` (and `tokens.ts` if inline code needs it), then run `npm run check:tokens`.
2. Need a button, card, tab or chip? Use `components/ui` or the politics kit. Do not write a new local palette object.
3. Changing the build label or month length? Edit `public/design/build.json` only.
