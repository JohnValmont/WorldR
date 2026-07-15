# Politics Desk - New Handsoff
This document describes the current architecture of the Political Desk.

## Architecture Highlights
- **Nation Stats**: Implemented via \pol_states\ and \pol_state_policy\. The \policy_platform\ in \pol_state_policy\ dictates the target states.
- **Party System**: The Party Screen is redesigned. Creeds represent ideological platforms. \PILLARS\ maps the axes (Taxation, Labour, Investment, Trade, Stability).
- **Bills**: When a bill passes, the \pplyConditionDrift\ adjusts state conditions towards the target values of the effective platform (Governing platform overridden by Legislated policy_platform).

## Database Schema updates
- Added \policy_platform\ to \pol_state_policy\ table.

## Key Files
- \rontend/src/app/drennia/politics/NationScreen.tsx\ - Shows state condition dials and active laws.
- \rontend/src/app/drennia/politics/PartyScreen.tsx\ - Found party and roster overview.
- \ackend/src/api/services/politics.service.ts\ - Core backend loop for politics engine.