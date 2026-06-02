# WORLDr — Current Active Direction

**Last Updated:** June 2026

---

## Active Direction: Business-First Chronicle

The active development direction for WORLDr is a **Business-First async multiplayer power-life simulator** set in the country of Drennia.

### What this means

The player enters Drennia as an unknown 18-year-old and builds:
- Cash (₯ Drennian Marks)
- Business records and contacts
- NPC and player relationships
- Company power and market position
- Influence
- Eventually: political access

The first playable vertical slice is the **Business Path**.

---

## Post-Login Flow (Active)

1. No pre-alpha access → `/pre-alpha-access`
2. No motherland → `/world-entry`
3. No character/origin → `/start/character`
4. Character complete → `/drennia/chronicle` ← **THE CHRONICLE IS THE ACTIVE HOME**

---

## The Chronicle

The Chronicle is the main game interface. It is NOT a dashboard. It has four surfaces:

1. **The Map** — Drennia map as ambient world surface (business activity highlighted)
2. **The Room** — Selected room takes foreground: atmosphere, NPCs, roles, stakes, entry
3. **The Record** — Player biography as prose records (not stat logs)
4. **The Ledger** — Country/business/world movement in newspaper voice

---

## Visible Player Factors (Active)

| Factor | Description |
|--------|-------------|
| Credibility | Institutional trust, reliability, record |
| Charisma | Public voice, persuasion, room presence |
| Influence | Network access, political/business weight |
| Cash ₯ | Spendable Drennian Marks |

**Resources is a hidden weighting factor only — NOT shown in active UI.**

---

## Currency

**Drennian Mark** — symbol: `₯`

Format: `₯80`, `₯1,500`, `₯4,200.50`

---

## Active Navigation Tabs

- Chronicle
- Records
- Network
- Business *(locked until company registration)*
- World

---

## Frozen Systems (Politics Module)

The following systems are **frozen** and preserved for a later Politics module. They must not control post-login flow.

| System | Status |
|--------|--------|
| Party dashboard | FROZEN |
| Tap actions | FROZEN |
| Elections | FROZEN |
| Government screens | FROZEN |
| Ministries | FROZEN |
| Parliament | FROZEN |
| Laws | FROZEN |
| Campaign/election prototypes | FROZEN |
| Political opportunity cards | FROZEN |
| Old /varelia prototype pages | FROZEN / QUARANTINED |

**These frozen systems should NOT appear in active navigation.**
**Old localStorage keys from the politics prototype are NOT source of truth for the Business path.**

---

## Active localStorage Keys (Business Path)

| Key | Purpose |
|-----|---------|
| `worldr_pre_alpha_access_granted_v1` | Pre-alpha gate |
| `worldr_selected_motherland` | Motherland selection |
| `worldr_citizen_file_v1` | Player character/origin |
| `worldr_living_world_entry_v1` | Chronicle entry flag |
| `worldr_records_v1` | Prose life records |
| `worldr_letters_v1` | NPC letter inbox |
| `worldr_room_history_v1` | Room participation history |
| `worldr_companies_v1` | Company registry |
| `worldr_business_rooms_v1` | Business room state |
| `worldr_recent_world_events_v1` | Ledger events |

---

## Future: Politics Module

Politics, parties, elections, government, ministries, laws, parliament, and offices will return as a later module **after the Business vertical slice is complete and playable**.

---

## Do Not Change

- Auth (login, signup, register, verify, password reset)
- Backend routes and DB schema
- Render deployment
- SMTP/Brevo email service
- Pre-alpha access code: `ROSE5037`
