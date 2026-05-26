# WORLDr — Game Design Guidelines

## Core Gameplay Loop
Player modifies policies
→ simulation tick runs
→ economy updates
→ population reacts
→ approval changes
→ stability changes
→ player responds

## Phase 1 Scope
Single nation domestic governance simulation.

Included:
- GDP
- sectors
- inflation
- taxes
- budget
- approval
- laws
- monthly ticks

Excluded:
- diplomacy
- military
- multiplayer
- espionage
- global trade

## Nation Structure
Nation contains:
- economy
- population
- treasury
- debt
- approval
- stability
- laws
- sectors

## Economic Sectors
- Agriculture
- Industry
- Services
- Energy
- Construction

Each sector tracks:
- output
- workers
- productivity
- wages
- growth

## Population Groups
- Poor
- Working
- Middle
- Wealthy
- Elite

Each group tracks:
- income
- approval
- ideology
- inflation sensitivity
- unemployment sensitivity

## Inflation System
Track:
- food inflation
- fuel inflation
- housing inflation
- general CPI

Inflation affects:
- approval
- poverty
- wages
- stability

## Budget System
Player controls:
- taxes
- spending
- welfare

Simulation calculates:
- revenue
- deficit
- debt
- treasury changes

## Law System
Laws apply modifiers to:
- taxes
- wages
- approval
- inflation
- productivity

## Monthly Tick
Monthly simulation order:
1. sector production
2. wages
3. unemployment
4. inflation
5. taxes
6. spending
7. approval
8. stability
9. historical snapshots

## Historical Persistence
Store monthly snapshots for:
- GDP
- inflation
- unemployment
- approval
- debt
- treasury