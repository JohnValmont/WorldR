# WORLDr Direction & Living World Simulator Pivot

## Internal Only — Developer Guidelines

**WORLDr is pivoting to a Living World Simulator / multiplayer life-to-power world.**

The initial Drennia frontend (tap-actions, instant elections, old dashboard) has been officially quarantined and acts only as a prototype/reference. It must not be re-enabled for active play without explicit confirmation.

### Drennia Architecture
- **Capital**: Drennport
- **First Full Nation**: Drennia
- **State Structure (4 States)**:
  1. Drennport State
  2. Ironvale State
  3. Greenmere State
  4. Westport State

### Gameplay & Player Mechanics
- **Visible Player Factors**:
  - Credibility
  - Charisma
  - Influence
  - Resources
- **Playable Paths**:
  - *Active initially*: Politician, Businessman
  - *Later*: Civil Service / Executive Administration, Judiciary / Judge, Military
  - *Skipped for now*: Media (will not be playable until later phases)

### Future System Concepts
The future gameplay relies on a simulated Living World instead of static tap-actions:
- NPC Ecosystem and Factions
- The Opportunity Board
- Public Records & Relationships
- Staggered District Elections
- Business Operations Path

### Quarantine Rules
- **Do NOT delete** old systems; they are preserved as reference modules.
- **Do NOT break auth/onboarding**. The core platform logic must always remain functional.
- Old systems must **never write** to the new `worldr_living_world_*` and future reserved namespaces.
- Future systems must **not read** legacy keys unless a deliberate migration layer is implemented.
