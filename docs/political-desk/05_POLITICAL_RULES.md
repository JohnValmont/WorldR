# 05_POLITICAL_RULES.md

# Part 1 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Preamble

The Political Rules define the formal laws governing the Political Desk.

These rules describe how political institutions function, how authority is exercised, and how power changes hands within a country.

They are independent of implementation, interface design, or technical architecture.

All gameplay systems, AI behaviour, backend logic, and user interfaces must conform to these rules.

Where conflicts arise between implementation and these rules, these rules take precedence.

---

# Article I — Fundamental Political Principles

## Rule 1.1 — Sovereignty

Political authority exists only within the institutions defined by the Political Desk.

No player possesses authority outside these institutions.

---

## Rule 1.2 — Equality

Every newly created political career begins with equal legal status.

No player receives political office, legislative authority, or governing power automatically.

---

## Rule 1.3 — Rule of Law

Every political action must be authorized by the rules of the Political Desk.

No action may bypass constitutional procedures.

---

## Rule 1.4 — Persistence

Political history is permanent.

Historical political events shall remain part of the country's record unless explicitly corrected through administrative action.

---

## Rule 1.5 — Institutional Continuity

Political institutions continue functioning regardless of player activity.

The absence of human players shall not suspend government operations.

AI institutions preserve continuity.

---

# Article II — Political Entities

The following entities exist within every country.

## Citizens

Every political career begins as a citizen.

Citizens possess no institutional authority.

Citizens may establish political parties subject to eligibility rules.

---

## Political Parties

Political parties are permanent political organizations.

A party exists independently of election cycles.

Parties compete for representation and government.

---

## Parliament

Parliament is the legislative institution of the country.

Only Parliament may approve or reject legislation.

---

## Government

The Government exercises executive authority after being lawfully formed.

Government authority exists only while constitutional conditions are satisfied.

---

## Ministries

Ministries administer government responsibilities.

Each ministry exists continuously regardless of ministerial appointments.

---

## Media

Media observes political activity and communicates information to the public.

Media is not a political institution.

---

## Public

Public opinion influences electoral outcomes but does not directly exercise governmental authority.

---

# Article III — Political Parties

## Rule 3.1 — Party Formation

Any eligible citizen may establish one political party.

A character may never found more than one party simultaneously.

---

## Rule 3.2 — Party Identity

Every political party shall possess:

* Official Name
* Official Abbreviation
* Official Logo
* Primary Colour
* Ideological Profile
* Founding Date
* Founding Leader

These attributes establish the party's permanent identity.

---

## Rule 3.3 — Human Leadership

Every political party shall have exactly one human leader.

Leadership transfers only through defined political procedures.

---

## Rule 3.4 — AI Membership

Political parties contain AI-controlled members and officials.

AI members ensure institutional continuity and operational capacity.

---

## Rule 3.5 — Party Independence

Political parties remain legally independent organizations regardless of:

* Election performance.
* Government participation.
* Parliamentary representation.

Participation in government does not merge or dissolve parties.

---

## Rule 3.6 — Party Dissolution

For Pre-Alpha v0.1, political parties cannot be voluntarily dissolved.

Future versions may introduce constitutional dissolution procedures.

---

## Rule 3.7 — Party Records

Every political party maintains permanent historical records including:

* Founding date.
* Election participation.
* Election results.
* Parliamentary representation.
* Government participation.
* Coalition history.
* Leadership history.

These records form part of the national political archive.

---

# Article IV — Political Authority

Political authority derives solely from legally recognized offices.

Authority shall never be inferred from popularity, wealth, seniority, or historical success.

Only institutional office grants political powers.

---

## Rule 4.1 — Authority Is Role-Based

Players may perform only those actions explicitly permitted by their current office.

Actions outside the authority of that office shall be rejected.

---

## Rule 4.2 — Authority Matrix

| Office               | Create Party | Campaign | Vote in Parliament | Form Coalition | Appoint Ministers | Introduce Government Bills |
| -------------------- | :----------: | :------: | :----------------: | :------------: | :---------------: | :------------------------: |
| Citizen              |       ✅      |     ❌    |          ❌         |        ❌       |         ❌         |              ❌             |
| Party Leader         |       ❌      |     ✅    |         ❌*         |        ✅       |         ❌         |              ❌             |
| Member of Parliament |       ❌      |     ✅    |          ✅         |        ✅       |         ❌         |     Private Bills Only     |
| Opposition Leader    |       ❌      |     ✅    |          ✅         |        ✅       |         ❌         |     Private Bills Only     |
| Head of Government   |       ❌      |     ✅    |          ✅         |        ✅       |         ✅         |              ✅             |

*A Party Leader may vote only if they also hold a parliamentary seat.

The Authority Matrix is normative.

Any action not granted by the matrix is prohibited.

---

# End of Part 1
