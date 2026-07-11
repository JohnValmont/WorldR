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

# 05_POLITICAL_RULES.md

# Part 3 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Article X — Parliament

## Rule 10.1 — Legislative Authority

Parliament is the sole legislative institution of the country.

No law shall take effect without completing the parliamentary process defined by these rules.

---

## Rule 10.2 — Parliamentary Composition

Parliament consists of seats allocated after certified elections.

Seats belong to political parties.

Individual human players exercise authority through their party's representation.

---

## Rule 10.3 — Parliamentary Sessions

Parliament operates continuously.

It alternates between:

* Ordinary Session
* Special Session
* Election Suspension

Future versions may introduce additional session types.

---

## Rule 10.4 — Parliamentary Business

Examples of parliamentary business include:

* Bills
* Questions
* Government statements
* Confidence motions
* No-confidence motions

Each item follows its own procedural rules.

---

## Rule 10.5 — Voting Rights

Only parties represented in Parliament may participate in parliamentary votes.

Votes are recorded permanently.

---

## Rule 10.6 — Parliamentary Majority

The outcome of parliamentary business is determined by the applicable voting threshold.

Thresholds are configurable by constitutional rules.

Examples:

* Simple majority.
* Absolute majority.
* Qualified majority (future).

---

# Article XI — Bills

## Rule 11.1 — Definition

A bill is a legislative proposal submitted for parliamentary consideration.

Bills exist independently until:

* Passed.
* Rejected.
* Withdrawn.
* Expired.

---

## Rule 11.2 — Bill Types

Pre-Alpha supports:

* Government Bills
* Private Member Bills

Future versions may introduce:

* Constitutional Bills
* Budget Bills
* Emergency Bills

---

## Rule 11.3 — Bill Lifecycle

Every bill follows the same legal process.

```text id="8b0x4g"
Draft
   ↓
Submitted
   ↓
Scheduled
   ↓
Debate
   ↓
Vote
   ↓
Passed / Rejected
```

States may not be skipped.

---

## Rule 11.4 — Submission Authority

Government Bills may only be introduced by the Head of Government.

Private Member Bills may only be introduced by Members of Parliament.

---

## Rule 11.5 — Debate

Bills enter debate before voting.

Debate represents political discussion rather than real-time conversation.

Its primary purpose is to provide:

* Political context.
* Media coverage.
* Opposition reactions.
* Public awareness.

---

## Rule 11.6 — Voting

Every eligible parliamentary party casts one official vote position:

* Support
* Oppose
* Abstain

The party's parliamentary seats determine the weight of that vote.

---

## Rule 11.7 — Passage

A bill passes only after receiving the required parliamentary majority.

Otherwise it is rejected.

---

## Rule 11.8 — Historical Record

Every bill permanently records:

* Sponsor.
* Submission date.
* Debate period.
* Voting result.
* Supporting parties.
* Opposing parties.
* Final status.

Bills become part of the national legislative archive.

---

# Article XII — Government

## Rule 12.1 — Formation

A Government exists only after successful constitutional formation following an election or other lawful transition.

---

## Rule 12.2 — Executive Authority

Executive authority belongs to the Government.

Individual ministers exercise delegated authority.

---

## Rule 12.3 — Head of Government

The Head of Government is responsible for:

* Cabinet formation.
* Government agenda.
* Minister appointments.
* Government legislation.
* Coalition leadership.

These powers exist only while the Government retains constitutional authority.

---

## Rule 12.4 — Cabinet

The Cabinet consists of appointed ministers.

Each ministry shall have at most one serving minister.

Vacancies remain permissible until filled.

---

## Rule 12.5 — Government Responsibility

The Government remains accountable to Parliament.

Loss of parliamentary confidence threatens the Government's continuation.

---

## Rule 12.6 — Government Duration

Government continues until:

* Election defeat.
* Successful no-confidence motion.
* Constitutional dissolution.
* Future constitutional resignation procedures.

---

## Rule 12.7 — Caretaker Status

When Government loses authority but a replacement has not yet formed, caretaker rules apply.

---

# Article XIII — Confidence

## Rule 13.1 — Parliamentary Confidence

Government authority depends upon maintaining parliamentary confidence.

Confidence reflects institutional support rather than public popularity.

---

## Rule 13.2 — Confidence Motion

A confidence motion allows Government to demonstrate parliamentary support.

Failure results in constitutional consequences.

---

## Rule 13.3 — No-Confidence Motion

A no-confidence motion allows Parliament to challenge Government legitimacy.

If successful:

* Government falls.
* Caretaker Government begins.
* Government formation procedures restart.

Future constitutions may instead require early elections.

---

## Rule 13.4 — Consequences

Loss of confidence never deletes political parties.

Political competition continues.

Only executive authority changes.

---

# Article XIV — Institutional Balance

## Rule 14.1 — Separation of Functions

The following institutional roles remain distinct:

* Parliament legislates.
* Government governs.
* Political Parties compete.
* Media informs.
* Citizens vote.

No institution permanently replaces another.

---

## Rule 14.2 — Mutual Constraints

Every institution possesses limits.

Examples:

* Parliament limits Government.
* Elections limit Parliament.
* Public opinion influences Elections.
* Media influences Public Opinion.

No institution exercises unlimited authority.

---

## Rule 14.3 — Constitutional Stability

Political instability creates gameplay.

It does not suspend constitutional order.

Even during crises:

* Elections remain lawful.
* Parliament remains lawful.
* Government transitions remain lawful.

The simulation should preserve institutional continuity wherever possible.

---

# End of Part 3

One important improvement

There's one thing I would add before implementation:

Constitution Profiles

Rather than hard-coding one political system, every country should eventually have a configurable constitutional profile.

For example:

Rule	Country A	Country B
Parliament Size	200	120
Majority Threshold	101	61
Government Type	Parliamentary	Semi-Presidential
Election Term	48 months	60 months
Caretaker Rules	Yes	No
Coalition Required	Sometimes	Rarely

This fits perfectly with WORLDr's long-term vision of supporting 75+ countries. The Political Desk would use the same simulation engine everywhere, while each country feels different because its constitutional configuration changes the rules rather than the code. That gives you variety without sacrificing maintainability.

# 05_POLITICAL_RULES.md

# Part 4 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Article XV — Ministries

## Rule 15.1 — Purpose

Ministries are permanent executive institutions responsible for administering specific areas of government.

Ministries continue to exist regardless of elections, changes of government, or ministerial appointments.

---

## Rule 15.2 — Ministry Independence

A ministry is an institution, not a political party.

Ministries execute lawful government policy while maintaining administrative continuity.

---

## Rule 15.3 — Ministerial Appointment

Only the Head of Government may appoint or remove ministers.

Each ministry may have only one serving minister at any given time.

---

## Rule 15.4 — Vacancies

If a ministry has no appointed minister:

* Administrative functions continue.
* Strategic political decisions are suspended until a minister is appointed.

---

## Rule 15.5 — Ministry Reports

Every ministry periodically produces reports for the Government.

Reports summarize:

* Current status.
* Emerging issues.
* Recommended actions.
* Outstanding decisions.

Reports inform player decisions but do not automatically determine policy.

---

## Rule 15.6 — AI Administration

Routine ministry operations are performed by AI-controlled civil servants.

Human players establish policy direction.

The AI carries out routine administration within those directions.

---

# Article XVI — Coalitions

## Rule 16.1 — Coalition Definition

A coalition is a formal agreement between two or more parliamentary parties for the purpose of forming or maintaining a government.

---

## Rule 16.2 — Coalition Requirement

Coalitions become available whenever no single party holds a parliamentary majority.

Countries may configure alternative constitutional requirements.

---

## Rule 16.3 — Coalition Membership

A political party may belong to only one governing coalition at a time.

Parties outside the coalition automatically become opposition parties.

---

## Rule 16.4 — Coalition Agreement

Coalition agreements define:

* Participating parties.
* Coalition leader.
* Government participation.
* Duration (if applicable).
* Shared legislative priorities.

Future versions may include detailed coalition contracts.

---

## Rule 16.5 — Coalition Stability

Coalitions remain valid until:

* A member withdraws.
* Parliamentary confidence is lost.
* Government changes.
* Constitutional dissolution occurs.

---

## Rule 16.6 — Coalition Withdrawal

A coalition member may withdraw according to constitutional procedures.

Withdrawal may:

* Trigger renegotiation.
* Create minority government.
* Cause Government collapse.
* Trigger confidence procedures.

---

## Rule 16.7 — Coalition History

Every coalition permanently records:

* Formation date.
* Member parties.
* Coalition leader.
* Duration.
* Government formed.
* Method of dissolution.

Coalitions become part of national political history.

---

# Article XVII — Opposition

## Rule 17.1 — Definition

Any parliamentary party not participating in Government forms part of the Opposition.

---

## Rule 17.2 — Constitutional Role

The Opposition performs legitimate democratic functions.

It is not treated as an enemy of the state.

---

## Rule 17.3 — Opposition Rights

Opposition parties may:

* Campaign.
* Debate legislation.
* Vote.
* Submit Private Member Bills.
* Criticize Government.
* Participate in future coalition negotiations.

---

## Rule 17.4 — Opposition Restrictions

Opposition parties may not:

* Appoint ministers.
* Exercise executive authority.
* Submit Government Bills.
* Direct ministries.

---

## Rule 17.5 — Leader of the Opposition

The largest opposition party becomes the Official Opposition.

Its human leader becomes the Leader of the Opposition.

Future constitutions may define alternative rules.

---

# Article XVIII — Political Office

## Rule 18.1 — Office Definition

Political office grants institutional authority.

Authority belongs to the office rather than the individual.

---

## Rule 18.2 — Office Transfer

When office changes:

* Authority transfers immediately.
* Historical records remain unchanged.
* Previous office holders retain their political careers.

---

## Rule 18.3 — Simultaneous Offices

A player may hold multiple compatible offices where constitutionally permitted.

Example:

* Party Leader
* Member of Parliament
* Prime Minister

These offices combine their respective authorities.

---

## Rule 18.4 — Office Vacancy

If an office becomes vacant:

* Constitutional succession rules apply where defined.
* Otherwise the office remains vacant until lawfully filled.

---

# Article XIX — Political Records

## Rule 19.1 — Permanent Archive

Every country maintains a permanent political archive.

The archive is never automatically deleted.

---

## Rule 19.2 — Historical Entries

Examples include:

* Elections.
* Governments.
* Prime Ministers.
* Parliamentary composition.
* Coalitions.
* Bills.
* Cabinet appointments.
* Votes of confidence.
* Party formations.

---

## Rule 19.3 — Accessibility

Historical political records remain viewable by all players within that country unless future privacy rules specify otherwise.

---

## Rule 19.4 — Immutability

Historical political events shall not be modified except through authorized administrative correction procedures.

---

# End of Part 4
# 05_POLITICAL_RULES.md

A major design improvement

I think we should introduce a distinction between political offices and administrative institutions across the entire game.

For example:

Political	Administrative
Prime Minister	Ministry of Education
Party Leader	Civil Service
Member of Parliament	Election Commission
Opposition Leader	National Statistics Office

Players would control political leadership, while AI would run the permanent administrative institutions. This separation mirrors how many real governments function and keeps gameplay focused on leadership and strategy instead of bureaucracy. It also gives you a clean foundation for future modules like the economy, judiciary, diplomacy, and public administration without overwhelming players with operational detail.

One major improvement before writing

Originally we planned:

Public Opinion

↓

Media

↓

AI

I think that's backwards.

It should actually be:

Events
      ↓
Media interprets Events
      ↓
Citizens react
      ↓
Public Opinion changes
      ↓
Political Parties respond
      ↓
Government adjusts
      ↓
New Events occur

That creates a living feedback loop.

No single action directly changes approval.

Everything flows through institutions.

That is much closer to how politics actually evolves.

# 05_POLITICAL_RULES.md

# Part 5 of 6

**Project:** WORLDr

**Module:** Political Desk

**Version:** Pre-Alpha v0.1

---

# Article XX — Public Opinion

## Rule 20.1 — Definition

Public Opinion represents the collective political sentiment of the country's voting population.

It is an emergent result of the simulation and shall not be modified directly by player actions.

---

## Rule 20.2 — Sources of Influence

Public Opinion may change due to:

* Government performance.
* Parliamentary activity.
* Election campaigns.
* Media reporting.
* Party communication.
* Coalition stability.
* National events.
* Future economic and social conditions.

No single factor shall permanently dominate Public Opinion.

---

## Rule 20.3 — Gradual Change

Public Opinion changes progressively over time.

Large shifts require significant political developments.

Minor actions should produce proportionally small effects.

---

## Rule 20.4 — Political Diversity

Public Opinion is not a single national value.

It consists of multiple voter groups whose preferences may differ.

Future modules may expand demographic and regional variation without changing these rules.

---

## Rule 20.5 — Electoral Influence

Public Opinion influences electoral behaviour.

It does not directly determine election outcomes.

Election results emerge from the interaction between Public Opinion, party competition, campaign strategy, and the electoral system.

---

# Article XXI — Media

## Rule 21.1 — Purpose

Media communicates political developments to the public.

It is an observer and interpreter of events rather than an executive institution.

---

## Rule 21.2 — Event Reporting

Media reports on significant political events, including:

* Elections.
* Parliamentary debates.
* Government announcements.
* Coalition developments.
* Legislative outcomes.
* Leadership changes.

Routine political activity should not always become major news.

---

## Rule 21.3 — Political Neutrality

For Pre-Alpha v0.1, the Media reports events using neutral simulation rules.

Editorial bias, partisan outlets, and media ownership are reserved for future versions.

---

## Rule 21.4 — Information Flow

Media coverage informs citizens.

Citizens react through Public Opinion.

Political actors respond to Public Opinion.

This relationship forms a continuous political feedback loop.

---

## Rule 21.5 — Historical Archive

Major political news becomes part of the country's historical archive.

Players may review previous headlines to understand the development of national politics.

---

# Article XXII — Artificial Intelligence

## Rule 22.1 — Institutional Continuity

Artificial Intelligence maintains political continuity whenever direct player actions are absent.

The simulation shall never require continuous human activity to remain functional.

---

## Rule 22.2 — AI Responsibilities

AI controls:

* Citizens.
* Voters.
* Civil servants.
* Party members.
* Ministers (routine administration).
* Parliamentary behaviour where no human party exists.
* Government administration between player decisions.

---

## Rule 22.3 — AI Objectives

AI actors pursue institutional goals rather than personal optimisation.

Examples include:

* Governing effectively.
* Winning elections.
* Maintaining stability.
* Passing legislation.
* Representing voter interests.

Future personality systems may diversify AI behaviour.

---

## Rule 22.4 — Equal Rules

AI follows the same constitutional rules as human players.

No AI actor may bypass institutional procedures.

---

## Rule 22.5 — Strategic Behaviour

AI should make rational political decisions based upon:

* Public Opinion.
* Parliamentary arithmetic.
* Coalition opportunities.
* Government stability.
* Election timing.
* Historical relationships.

Random behaviour should be avoided except where uncertainty is intentionally modelled.

---

# Article XXIII — Political Relationships

## Rule 23.1 — Relationship Records

Political parties maintain long-term relationship values with other parties.

Relationships evolve through political interaction.

---

## Rule 23.2 — Sources of Change

Relationships may strengthen or weaken due to:

* Coalition cooperation.
* Legislative cooperation.
* Public criticism.
* Election competition.
* Government participation.
* Historical agreements.

---

## Rule 23.3 — Long-Term Memory

Political relationships persist across elections.

A coalition partner from four years ago may still be viewed more favourably than a long-term rival.

---

## Rule 23.4 — Institutional Trust

Government institutions maintain internal trust indicators.

Examples include:

* Coalition trust.
* Cabinet cohesion.
* Parliamentary confidence.

These values influence future political interactions but do not override constitutional rules.

---

# Article XXIV — Political Stability

## Rule 24.1 — National Stability

Each country maintains a Political Stability indicator.

Political Stability reflects the resilience of democratic institutions rather than the popularity of any individual government.

---

## Rule 24.2 — Influencing Factors

Political Stability may be affected by:

* Frequent government changes.
* Coalition collapse.
* Legislative deadlock.
* Successful government transitions.
* Institutional continuity.

Future modules may incorporate additional national conditions.

---

## Rule 24.3 — Gameplay Effect

Political Stability influences the overall political environment.

It should modify the likelihood and impact of future political developments without dictating specific outcomes.

---

# End of Part 5
