# WORLDr — Governance Systems Reference

## Overview

Every nation in WORLDr operates under one of 10 governance systems. The governance system fundamentally shapes how political power is distributed, how laws are passed, how elections work, and how stable the nation is.

---

## Governance System Definitions

---

### 1. Constitutional Monarchy

**Description:** A monarch serves as ceremonial head of state with no real executive power. Elected parliament holds legislative supremacy. Prime Minister / Chancellor is head of government.

**Real-World Analogues:** Keldoria (WORLDr), Germany, Sweden, Netherlands, Spain

| Property | Value |
|----------|-------|
| Executive Power | Parliament-derived Chancellor/PM |
| Legislative Power | Elected unicameral or bicameral parliament |
| Executive Authority Score | 4/10 |
| Parliament Authority Score | 9/10 |
| Coalition Threshold | 50%+1 seats |
| Confidence Vote | Yes (parliament can remove government) |
| Election Cycle | 48 months (adjustable) |
| Law Passage Threshold | Simple majority (50%+1) |
| Constitutional Change | Supermajority (67%) |
| Stability Modifier | +0.05 |
| Corruption Modifier | -0.08 (high transparency) |
| Voter Participation Bonus | +0.06 |
| Emergency Powers | Cabinet decree (parliament approval within 30 days) |
| Special Rules | Monarch must formally appoint Chancellor; moral authority role in crises |

**Gameplay Notes:**
- Coalition formation is complex and frequent
- Confidence votes add political drama
- Monarch's approval can boost public legitimacy during crises
- Strong institutional modifiers reduce corruption probability

---

### 2. Parliamentary Republic

**Description:** President is mostly ceremonial (elected by parliament or indirectly). Parliament directly elects the Prime Minister who holds executive authority.

**Real-World Analogues:** Italy, Germany (federal republic), Israel, India

| Property | Value |
|----------|-------|
| Executive Authority Score | 3/10 |
| Parliament Authority Score | 9/10 |
| Coalition Threshold | 50%+1 seats |
| Confidence Vote | Yes |
| Election Cycle | 48 months |
| Law Passage Threshold | Simple majority |
| Stability Modifier | +0.03 |
| Corruption Modifier | -0.05 |
| Voter Participation Bonus | +0.04 |
| Special Rules | No monarch; president plays symbolic role only |

---

### 3. Presidential Republic

**Description:** Directly elected president holds executive authority. Parliament (congress) holds legislative power. Separation of powers creates potential gridlock.

**Real-World Analogues:** Northern Novara (WORLDr), United States, Brazil, Indonesia

| Property | Value |
|----------|-------|
| Executive Authority Score | 8/10 |
| Parliament Authority Score | 6/10 |
| Coalition Threshold | N/A (president elected directly) |
| Confidence Vote | No (impeachment only, 67% threshold) |
| Election Cycle | 48 months (president); 24 months (congress) |
| Law Passage Threshold | Simple majority (Congress + Presidential signature) |
| Stability Modifier | +0.00 |
| Corruption Modifier | -0.02 |
| Voter Participation Bonus | +0.08 (high election engagement) |
| Special Rules | Presidential veto; gridlock when president vs congress split; executive orders possible |

---

### 4. Semi-Presidential Republic

**Description:** Both a directly-elected president AND a parliament-appointed prime minister hold executive authority. Power conflicts are endemic but manageable.

**Real-World Analogues:** France, Russia, Romania, Poland

| Property | Value |
|----------|-------|
| Executive Authority Score | 6/10 (president) + 4/10 (PM) = dual |
| Parliament Authority Score | 7/10 |
| Coalition Threshold | 50%+1 (for PM); president elected separately |
| Confidence Vote | Yes (against PM only) |
| Election Cycle | 60 months (president); 48 months (parliament) |
| Law Passage Threshold | Simple majority |
| Stability Modifier | -0.02 (cohabitation risk) |
| Corruption Modifier | -0.01 |
| Special Rules | "Cohabitation" when president and PM from different parties — reduces stability by additional -0.05 |

---

### 5. Federal Republic

**Description:** Significant powers devolved to regional governments (states/provinces). Federal government handles defense, foreign policy, and national standards.

**Real-World Analogues:** Canada, Australia, Switzerland, Brazil (strong federalism)

| Property | Value |
|----------|-------|
| Executive Authority Score | 5/10 (federal) |
| Parliament Authority Score | 7/10 |
| Coalition Threshold | 50%+1 |
| Confidence Vote | Yes |
| Election Cycle | 48 months |
| Law Passage Threshold | Simple majority (federal); regional veto on certain matters |
| Stability Modifier | +0.02 |
| Corruption Modifier | -0.04 |
| Special Rules | Regional approval needed for constitutional changes; regional elections affect national politics |

---

### 6. One-Party State

**Description:** A single dominant party controls all significant political institutions. Opposition parties may legally exist but have no real power. Elections are managed, not contested.

**Real-World Analogues:** Various Varanthos nations (WORLDr)

| Property | Value |
|----------|-------|
| Executive Authority Score | 10/10 |
| Parliament Authority Score | 2/10 |
| Coalition Threshold | N/A |
| Confidence Vote | No |
| Election Cycle | 60 months (managed) |
| Law Passage Threshold | Party leadership approval |
| Stability Modifier | +0.08 (short term) / -0.15 (long term pressure) |
| Corruption Modifier | +0.20 (high corruption baseline) |
| Freedom Modifier | -0.30 |
| Special Rules | Protest risk accelerates faster; legitimacy decay without economic growth; purge events possible |

---

### 7. Military Junta

**Description:** Military leaders control government. Democratic institutions suspended or severely curtailed. Stability maintained by force; legitimacy is chronically low.

**Real-World Analogues:** Various Kethara/historical nations (WORLDr)

| Property | Value |
|----------|-------|
| Executive Authority Score | 10/10 |
| Parliament Authority Score | 1/10 |
| Coalition Threshold | N/A (junta council decides) |
| Confidence Vote | No (coup risk instead) |
| Election Cycle | Indefinite (promised but postponed) |
| Law Passage Threshold | Junta council vote |
| Stability Modifier | -0.15 (legitimacy) +0.10 (repression) |
| Corruption Modifier | +0.30 |
| Special Rules | Military approval rating matters; coup probability calculates monthly; international sanctions possible |

---

### 8. Absolute Monarchy

**Description:** Monarch holds executive, legislative, and judicial authority. Parliament (if exists) is advisory only. Succession politics matter.

**Real-World Analogues:** Historical + some Ketharan nations (WORLDr)

| Property | Value |
|----------|-------|
| Executive Authority Score | 9/10 |
| Parliament Authority Score | 3/10 |
| Coalition Threshold | N/A |
| Confidence Vote | No |
| Election Cycle | N/A (monarch rules until death or abdication) |
| Law Passage Threshold | Royal decree |
| Stability Modifier | +0.02 / high revolt risk if approval below 35% |
| Corruption Modifier | +0.15 |
| Special Rules | Succession events when monarch ages; elite council approval needed for major economic changes |

---

### 9. Technocratic Republic

**Description:** Government led by domain experts and technocrats selected by merit, not election. Democratic accountability reduced; efficiency and evidence prioritized.

**Real-World Analogues:** Singapore-inspired + WORLDr Varanthos city-states

| Property | Value |
|----------|-------|
| Executive Authority Score | 6/10 |
| Parliament Authority Score | 8/10 |
| Coalition Threshold | 50%+1 (technocrat council) |
| Confidence Vote | Yes (by expert assembly) |
| Election Cycle | 60 months |
| Law Passage Threshold | Evidence-based committee approval + majority |
| Stability Modifier | +0.10 |
| Corruption Modifier | -0.10 |
| Efficiency Modifier | +0.15 (policies work better) |
| Populism Risk | +0.20 (populist backlash against elite governance) |
| Special Rules | Higher GDP efficiency; lower voter engagement; high protest risk if economic outcomes fail |

---

### 10. Hybrid Transitional State

**Description:** Nation in transition from one governance system to another. Democratic institutions exist but are weak, contested, and vulnerable to capture by powerful actors.

**Real-World Analogues:** Post-coup democracies, recent independence nations (WORLDr Kethara)

| Property | Value |
|----------|-------|
| Executive Authority Score | 4/10 (contested) |
| Parliament Authority Score | 5/10 (fragile) |
| Coalition Threshold | 40% (fragile coalitions easier to form, easier to break) |
| Confidence Vote | Yes (but frequently used frivolously) |
| Election Cycle | 36 months |
| Law Passage Threshold | Simple majority |
| Stability Modifier | -0.10 |
| Corruption Modifier | +0.15 |
| Protest Risk | +0.20 |
| Special Rules | Crisis events more frequent; institutions can be captured; foreign influence events possible |

---

## Governance Modifier Summary Table

| System | Exec | Parl | Stability | Corruption | Efficiency | Coalition |
|--------|------|------|-----------|------------|------------|-----------|
| Constitutional Monarchy | 4 | 9 | +0.05 | -0.08 | +0.00 | 50%+1 |
| Parliamentary Republic | 3 | 9 | +0.03 | -0.05 | +0.00 | 50%+1 |
| Presidential Republic | 8 | 6 | +0.00 | -0.02 | +0.00 | N/A |
| Semi-Presidential | 6 | 7 | -0.02 | -0.01 | +0.00 | 50%+1 |
| Federal Republic | 5 | 7 | +0.02 | -0.04 | +0.00 | 50%+1 |
| One-Party State | 10 | 2 | +0.08 | +0.20 | -0.05 | N/A |
| Military Junta | 10 | 1 | -0.15 | +0.30 | -0.10 | N/A |
| Absolute Monarchy | 9 | 3 | +0.02 | +0.15 | +0.00 | N/A |
| Technocratic Republic | 6 | 8 | +0.10 | -0.10 | +0.15 | 50%+1 |
| Hybrid Transitional | 4 | 5 | -0.10 | +0.15 | -0.05 | 40% |
