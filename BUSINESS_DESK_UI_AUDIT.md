# Business Desk UI Audit & Redesign Plan

## Overview
The Business Desk is a complex multi-tab interface for managing business operations in WorldR. Currently it has a functional but visually inconsistent design with excessive headers/subheaders and card-based layouts that could benefit from polishing for the upcoming playtest.

---

## CURRENT UI STRUCTURE

### Main Page: `/frontend/src/app/drennia/business/page.tsx`
- **Framework**: Custom styled components with inline styles (not using Tailwind)
- **Color Scheme**: Dark theme with gold accents
  - Background: `#090A0F`
  - Panel: `#11131A` / `#17151B`
  - Paper: `#1E1A15`
  - Gold (primary): `#C9A24A`
  - Text (ivory): `#F4EBD6`
  - Muted: `#A79D8C`
  - Faint: `#6B6358`
  - Accent (mint): `#36D399`
  - Error (red): `#B85555`

### Main Tabs (Sub-tabs):
1. **Overview** - High-level business dashboard (not fully implemented)
2. **Start Business** - Sector/HQ selection, company creation wizard
3. **My Companies** - Company management interface
4. **Analytics** - Market & competitor analysis
5. **Drennport Exchange** - Stock market
6. **Registry** - Business registration records

---

## SUB-INTERFACES & COMPONENTS

### 1. **EquityDeskTab** (`EquityDeskTab.tsx`)
**Purpose**: Manage legal structure, shareholding, and dividend policies

**Current Design Issues**:
- ❌ Auto-fit grid layout with `minmax(320px, 1fr)` can cause awkward column breaks
- ❌ Three separate card sections (Legal Structure, Shareholder Register, Dividend Policy)
- ❌ Lots of inline style duplication
- ❌ Legal structure cards use different styling (isCurrent = highlighted, non-current = subtle)
- ❌ Dividend policy input is cramped in a small flex row

**Elements**:
- Legal Structure selector with up/down-grade capability
- Shareholder Register (cap table display)
- Dividend Policy input (0-50% payout)

---

### 2. **ManufacturingDeskTab** (`ManufacturingDeskTab.tsx`)
**Purpose**: Design, R&D, production, staffing, finance for manufacturing companies

**Current Design Issues**:
- ⚠️ **10 sub-tabs** total (Overview, Factory, R&D/Design, Procurement, Production, Market & Sales, Staffing, Finance, Records, Equity)
- ❌ Very complex engineering system with live priority adjustments
- ❌ Multiple nested modals and wizards
- ❌ Lots of charts and data visualization (Recharts)
- ❌ Budget allocation sliders are scattered
- ❌ Engineering report displays are densely packed

**Elements**:
- Factory status and capacity management
- R&D/Design wizard (vehicle class, platform, engine, drivetrain, interior, safety)
- Engineering priorities (Reliability, Performance, Fuel Economy, Comfort, Practicality, Mfg Simplicity)
- Budget allocation across 7 departments
- Production queue and scheduling
- Staffing (engineers, technicians, production workers)
- Finance dashboard with charts
- Model portfolio and comparison tools

---

### 3. **Main Business Page**
**Tab Structure**:
```
Main Tabs (Top-level):
├── Overview
├── Start Business
├── My Companies
├── Analytics
├── Drennport Exchange
└── Registry
```

**Current Issues**:
- ❌ Many custom atom components (Label, FieldRow, SectionHeader, PanelBox, GoldButton, GhostButton)
- ❌ Lots of header/subheader repetition
- ❌ Card-based layout that doesn't feel premium
- ❌ No consistent spacing/sizing
- ❌ No visual hierarchy differentiation (all cards feel the same weight)
- ❌ Form inputs and buttons scattered across different styling systems
- ❌ Many modals and overlays that can feel cluttered
- ❌ Manufacturing tab is 3300+ lines (massive component)

---

## VISUAL & INTERACTION ISSUES

### Typography Problems:
- ❌ Multiple font sizes without clear hierarchy (9px, 10px, 11px, 12px, 13px labels)
- ❌ Monospace font overused for labels
- ❌ No clear distinction between primary/secondary/tertiary text

### Layout Issues:
- ❌ Excessive use of inline styles instead of consistent classes
- ❌ Grid layouts with `auto-fit` cause unpredictable column counts
- ❌ Cards don't have consistent padding/gaps
- ❌ Section headers are repetitive and monotonous

### Color Issues:
- ❌ Gold accent used everywhere (dilutes its importance)
- ❌ Paper color (`#1E1A15`) barely distinguishable from panel (`#11131A`)
- ❌ Mint green used sparingly, could be underutilized

### Interactive Elements:
- ❌ Two different button styles (GoldButton vs GhostButton) but both feel generic
- ❌ Button states (disabled) need better visual feedback
- ❌ Modals have no backdrop animation or polish

### Spacing & Breathing Room:
- ❌ Dense information layouts with little whitespace
- ❌ Section headers followed immediately by content
- ❌ No clear visual separation between major sections

---

## RECOMMENDED CHANGES FOR POLISH (Prioritized)

### PHASE 1: High-Impact Visual Improvements (Quick Wins)
1. **Consolidate Color Scheme** - Reduce paper and panel colors to one, add a lighter accent
2. **Create Typography System** - Standardize heading sizes and weights
3. **Improve Tab Visual Design** - Make active/inactive tabs more distinct
4. **Add Consistent Spacing** - Use a spacing scale (4, 8, 12, 16, 20, 24px)
5. **Refactor Button Styles** - Create primary, secondary, and danger variants

### PHASE 2: Layout & Structure
6. **Redesign Card Layouts** - Use consistent card styles with proper hierarchy
7. **Simplify Header Repetition** - Create reusable section headers
8. **Improve Form Layouts** - Consistent input field styling and sizing
9. **Manufacturing Tab Refactor** - Split into smaller sub-components
10. **Add Visual Loading States** - Skeleton screens or spinners

### PHASE 3: Interaction & Feedback
11. **Improve Modals** - Better backdrop, cleaner close buttons, animations
12. **Add Tooltips** - Help text on complex fields (engineering priorities, etc.)
13. **Better Form Validation** - Clear error messages with context
14. **Improve Data Tables** - Better sorting, filtering, hover states
15. **Add Confirmations** - Before destructive actions (convert structure, etc.)

### PHASE 4: Polish & Details
16. **Animations & Transitions** - Smooth tab transitions, card reveals
17. **Icon Consistency** - Use consistent icon sizing and alignment
18. **Responsive Design** - Better mobile/tablet experience
19. **Accessibility** - Better contrast, ARIA labels, keyboard navigation
20. **Performance** - Lazy load heavy components, optimize charts

---

## CURRENT COMPONENT BREAKDOWN

### Reusable Components Used:
```
From @/components/ui:
- Card
- Button
- StatChip
- Badge
- StatusDot
- SectionHeading
- TerminalPanel
- Tabs
- PageShell
- StatCard
- DataRow
- EmptyState
```

### Custom Components Defined Inline:
- Label
- FieldRow
- SectionHeader
- PanelBox
- GoldButton
- GhostButton
- Various form inputs (select, input, textarea)

---

## FILE SIZES & COMPLEXITY

| File | Lines | Complexity | Status |
|------|-------|-----------|--------|
| page.tsx | 2926 | Very High | Needs splitting |
| ManufacturingDeskTab.tsx | 3300+ | Extreme | Needs major refactor |
| EquityDeskTab.tsx | 184 | Low | Good, can improve visuals |

---

## RECOMMENDED REFACTORING STRATEGY

### Step 1: Extract Shared Components
Create `frontend/src/app/drennia/business/_components/`:
- `BusinessSectionHeader.tsx` - Standardized section header
- `BusinessCardBox.tsx` - Standardized card container
- `BusinessButton.tsx` - Unified button component
- `BusinessFormField.tsx` - Unified input wrapper
- `BusinessTabs.tsx` - Custom tab styling

### Step 2: Visual Hierarchy
- **Hero elements**: Company name, net worth, key metrics
- **Primary sections**: Company overview, fleet, contracts
- **Secondary sections**: Finance, analytics, details
- **Tertiary**: Form fields, settings, fine details

### Step 3: Manufacturing Tab Split
Break into logical sub-components:
- `ManufacturingOverview.tsx`
- `DesignStudio.tsx`
- `ProductionQueue.tsx`
- `FinanceDashboard.tsx`
- `StaffingPanel.tsx`
- `ProcurementPanel.tsx`

### Step 4: Styling Approach
- Migrate from inline styles to Tailwind classes
- Or create CSS modules for business desk
- Consistent spacing scale: 4, 8, 12, 16, 24, 32px
- Consistent color token system

---

## KEY METRICS FOR ASSESSMENT

**Before Changes**:
- ❌ 5+ different button styles scattered across files
- ❌ 8+ different text color combinations
- ❌ No clear typography hierarchy
- ❌ Cards without consistent styling
- ❌ Manufacturing tab is 3300+ lines

**Target After Polish**:
- ✅ 3 button variants (primary, secondary, danger)
- ✅ Consistent heading/body text styling
- ✅ Clear visual hierarchy with spacing
- ✅ Card designs with consistent padding/shadows
- ✅ Manufacturing components split into 5-6 manageable files
- ✅ Better accessibility and responsiveness
- ✅ Playtest-ready UI polish

---

## READY FOR IMPLEMENTATION?
Once you approve this audit, we can prioritize changes based on:
1. **Time constraint** - How much time before playtest?
2. **Scope** - Full refactor vs. targeted polish?
3. **Strategy** - Inline fixes vs. migration to Tailwind?

**Current recommendation**: Start with PHASE 1 (quick visual wins) to get immediate impact, then tackle PHASE 2 (layout) if time allows.
