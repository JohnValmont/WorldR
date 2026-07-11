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

# 05_POLITICAL_RULES.md

# Part 2 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Article V — Elections

## Rule 5.1 — Purpose

Elections determine the democratic distribution of parliamentary representation.

Only certified election results may alter parliamentary composition.

No office may bypass the electoral process except where explicitly permitted by future constitutional rules.

---

## Rule 5.2 — Election Cycle

Each country follows a recurring constitutional election cycle.

Every election proceeds through the same official phases.

No phase may be skipped.

---

## Rule 5.3 — Election Phases

The official election sequence is:

```text
Election Announced
        ↓
Candidate Registration
        ↓
Campaign Period
        ↓
Public Debates
        ↓
Final Campaign
        ↓
Voting
        ↓
Vote Counting
        ↓
Certification
        ↓
Government Formation
```

Each phase begins and ends according to the national election calendar.

---

## Rule 5.4 — Election Calendar

The election calendar shall specify:

* Election date.
* Registration deadline.
* Campaign opening.
* Campaign closing.
* Debate period.
* Voting period.
* Certification date.

The calendar is publicly visible.

---

## Rule 5.5 — Parliamentary Dissolution

At the beginning of the election process:

* Parliament enters election mode.
* No new ordinary legislation may be introduced.
* Existing government continues in a caretaker capacity until a new government is formed.

---

## Rule 5.6 — Caretaker Government

During the caretaker period the Government:

May:

* Perform routine administration.
* Respond to emergencies.
* Continue essential state functions.

May Not:

* Introduce major legislative programmes.
* Appoint permanent ministers unless constitutionally required.
* Exercise extraordinary political powers.

---

# Article VI — Candidate Eligibility

## Rule 6.1 — Party Requirement

Only registered political parties may contest elections.

Independent candidates are excluded from Pre-Alpha v0.1.

---

## Rule 6.2 — Party Leader

The human Party Leader automatically becomes the party's national leader for elections unless future candidate systems replace this mechanism.

---

## Rule 6.3 — Candidate Registration

Registration occurs only during the Candidate Registration phase.

Late registrations are prohibited.

---

## Rule 6.4 — Withdrawal

A registered party may voluntarily withdraw before the campaign phase begins.

After campaigning starts, withdrawal is not permitted except through future constitutional mechanisms.

---

# Article VII — Campaign Rules

## Rule 7.1 — Campaign Purpose

Campaigning exists to influence voter opinion before voting begins.

Campaign activity may not directly alter election results.

Campaigns influence public opinion.

Public opinion influences voting behaviour.

---

## Rule 7.2 — Campaign Period

Campaign actions are available only during the official campaign period.

Outside this period, standard political communication remains available but does not receive campaign effects.

---

## Rule 7.3 — Equal Opportunity

All eligible parties receive equal legal access to campaign mechanics.

Success depends upon strategy and political circumstances rather than exclusive mechanics.

---

## Rule 7.4 — Campaign Actions

Examples include:

* Public statements.
* Policy announcements.
* Campaign rallies.
* Media interviews.
* Public debates.

Future versions may introduce additional campaign activities without altering the constitutional framework.

---

## Rule 7.5 — Campaign Conduct

Campaign actions must follow constitutional rules.

Actions prohibited in Pre-Alpha include:

* Electoral fraud.
* Vote buying.
* Illegal intimidation.
* Violence.
* Disinformation mechanics.

These systems may be introduced in future versions as separate mechanics.

---

# Article VIII — Voting

## Rule 8.1 — Voting Period

Voting begins only after the campaign officially closes.

No campaign actions are permitted during active voting.

---

## Rule 8.2 — Ballot Integrity

Every eligible simulated voter casts exactly one vote.

Votes may not be altered after submission.

---

## Rule 8.3 — Vote Counting

Votes are counted only after the voting period concludes.

Partial results are not published during counting.

---

## Rule 8.4 — Certification

Election results become official only after certification.

Until certification:

* Parliamentary seats remain provisional.
* Government formation cannot begin.

---

## Rule 8.5 — Finality

Certified election results are final.

They may not be altered except by future constitutional review systems.

---

# Article IX — Parliamentary Representation

## Rule 9.1 — Seat Allocation

Parliamentary seats are allocated according to the country's electoral system.

The electoral formula is configurable at the country level.

The Political Desk must support multiple electoral systems through configuration rather than country-specific code.

---

## Rule 9.2 — Majority

The majority threshold equals more than half of all parliamentary seats unless national constitutional rules specify otherwise.

---

## Rule 9.3 — Hung Parliament

If no party achieves a majority, Parliament enters coalition negotiation.

Government formation does not occur automatically.

---

## Rule 9.4 — Representation

Each parliamentary seat belongs to a political party rather than an individual player.

Human players exercise influence through party leadership and institutional authority.

---

# End of Part 2
