# WORLDr — Political Party Ecosystem Reference

## Overview

The party ecosystem is the core gameplay layer of WORLDr. Players join, lead, and build political parties to compete for parliamentary seats, form governments, and enact laws.

---

## Party Ideologies (10 Types)

### 1. Socialist
- **Economic Stance:** State ownership of key industries; heavy redistribution; universal services
- **Social Stance:** Progressive; strong workers' rights; internationalist
- **Voter Blocs:** Union Members (primary), Unemployed & Precariat (primary), Industrial Workers (secondary)
- **Coalition Compatible With:** Social Democrat, Green
- **Coalition Incompatible:** Conservative, Libertarian, Nationalist
- **Economic Modifiers:** +welfare efficiency, +labor protection, -business investment, -GDP growth (short term)
- **Law Preferences:** Nationalization laws, living wage mandates, housing programs
- **Youth Support:** High (students)
- **Elderly Support:** Low-Medium

### 2. Social Democrat
- **Economic Stance:** Mixed market economy with strong regulation; high taxes; generous welfare
- **Social Stance:** Progressive on rights; moderate immigration; pro-EU equivalent
- **Voter Blocs:** Industrial Workers (primary), Union Members (secondary), Immigrant Communities (secondary)
- **Coalition Compatible With:** Socialist, Green, Centrist
- **Coalition Incompatible:** Nationalist, Libertarian
- **Economic Modifiers:** +welfare, +labor rights, slight -business confidence
- **Law Preferences:** Healthcare expansion, education funding, housing programs
- **Youth Support:** Medium-High
- **Elderly Support:** Medium

### 3. Centrist
- **Economic Stance:** Moderate market economy; targeted social spending
- **Social Stance:** Pragmatic; compromise-oriented; pro-institutions
- **Voter Blocs:** Middle Class Professionals (primary), Small Business Owners (secondary)
- **Coalition Compatible With:** All (bridge party)
- **Coalition Incompatible:** None (ideologically)
- **Economic Modifiers:** Neutral — no major boosts or penalties
- **Law Preferences:** Incremental reforms; compromise legislation
- **Youth Support:** Low-Medium
- **Elderly Support:** Medium

### 4. Conservative
- **Economic Stance:** Free-market preference; fiscal discipline; lower corporate taxes
- **Social Stance:** Traditional values; controlled immigration; strong national defense
- **Voter Blocs:** Pensioners & Elderly (primary), Large Business (primary), Rural Conservatives (secondary)
- **Coalition Compatible With:** Libertarian, Centrist, Nationalist (reluctantly)
- **Coalition Incompatible:** Socialist, Green (usually)
- **Economic Modifiers:** +business investment, +GDP growth, -welfare, +institutional trust
- **Law Preferences:** Tax cuts, deregulation, law & order, defense spending
- **Youth Support:** Low
- **Elderly Support:** Very High

### 5. Nationalist
- **Economic Stance:** Economic nationalism; protectionism; state investment in strategic industries
- **Social Stance:** Restrictive immigration; cultural traditionalism; anti-globalism
- **Voter Blocs:** Rural Conservatives (primary), Unemployed & Precariat (secondary), Industrial Workers (some)
- **Coalition Compatible With:** Conservative (cautiously), Populist
- **Coalition Incompatible:** Green, Socialist, Centrist
- **Economic Modifiers:** +industrial protection, -trade efficiency, -international investment
- **Law Preferences:** Immigration restrictions, tariffs, anti-globalization measures
- **Youth Support:** Divided (some youth attracted, mostly older)
- **Elderly Support:** High

### 6. Libertarian
- **Economic Stance:** Minimal state; low taxes; deregulation; free markets
- **Social Stance:** Individual freedom above all; civil liberties; anti-surveillance
- **Voter Blocs:** Small Business Owners (primary), Industrial Conglomerates (primary), Urban Knowledge Workers (some)
- **Coalition Compatible With:** Conservative, Centrist, Technocratic
- **Coalition Incompatible:** Socialist, Nationalist
- **Economic Modifiers:** +business investment, +GDP growth, -welfare, -public services quality
- **Law Preferences:** Tax cuts, privatization, deregulation, civil liberties
- **Youth Support:** Medium (civil liberties appeal)
- **Elderly Support:** Medium

### 7. Green
- **Economic Stance:** Green economy transition; carbon taxes; circular economy
- **Social Stance:** Progressive; environmental rights; diversity; pacifist
- **Voter Blocs:** Urban Knowledge Workers (primary), University Students (primary), Middle Class (secondary)
- **Coalition Compatible With:** Social Democrat, Socialist, Centrist
- **Coalition Incompatible:** Nationalist, Conservative
- **Economic Modifiers:** +renewable energy sector, -fossil fuel sector, +youth approval, -industrial sector (short term)
- **Law Preferences:** Carbon taxes, renewable subsidies, environmental protection, climate adaptation
- **Youth Support:** Very High
- **Elderly Support:** Low

### 8. Technocratic
- **Economic Stance:** Evidence-based policy; efficiency over ideology; expert administration
- **Social Stance:** Neutral — focus on measurable outcomes, not values
- **Voter Blocs:** Large Business (secondary), Small Business Owners (secondary), Urban Knowledge Workers (secondary)
- **Coalition Compatible With:** Centrist, Conservative, Liberal
- **Coalition Incompatible:** Populist, Nationalist
- **Economic Modifiers:** +efficiency across all sectors, -populist appeal, +GDP long-term
- **Law Preferences:** Regulatory reform, evidence-based spending, digital infrastructure
- **Youth Support:** Medium (elite students)
- **Elderly Support:** Medium

### 9. Populist
- **Economic Stance:** Vague; anti-elite; promise everything
- **Social Stance:** Anti-establishment; anti-immigration or pro-worker depending on variant
- **Voter Blocs:** Unemployed & Precariat (primary), Rural Conservatives (secondary)
- **Coalition Compatible With:** Nationalist (usually), sometimes Socialist
- **Coalition Incompatible:** Technocratic, Centrist
- **Economic Modifiers:** Volatile — approval spikes short term, economic damage long term
- **Law Preferences:** Anti-elite rhetoric bills, handouts, anti-immigration
- **Youth Support:** Divided
- **Elderly Support:** Medium-High

### 10. Religious Conservative
- **Economic Stance:** Traditional; moderate welfare; family-centered policy
- **Social Stance:** Religious values; anti-abortion; traditional family; skeptical of secularism
- **Voter Blocs:** Rural Conservatives (primary), Pensioners & Elderly (secondary)
- **Coalition Compatible With:** Conservative, Nationalist
- **Coalition Incompatible:** Green, Socialist, Libertarian (social issues)
- **Economic Modifiers:** +family spending, +rural communities, -urban liberal blocs
- **Law Preferences:** Family tax credits, religious education, anti-abortion laws
- **Youth Support:** Very Low
- **Elderly Support:** Very High

---

## Party Organization Roles

Each party can assign players (and AI staff) to 8 organizational roles:

| Role | Permissions | Player Action |
|------|-------------|--------------|
| **Party Leader** | All party decisions; coalition negotiations; public statements | Full control |
| **Deputy Leader** | Stands in for leader; manages parliamentary group | Substitute decisions |
| **Secretary General** | Administrative; member management; bylaws | Organizational actions |
| **Treasurer** | Party funds management; approves spending | Financial decisions |
| **Campaign Manager** | Rally organization; voter outreach; campaign strategy | Campaign actions |
| **Policy Chief** | Law drafting; manifesto updates; policy research | Legislative actions |
| **Media Manager** | Press statements; social media; party image | Approval actions |
| **Parliamentary Whip** | Ensures party discipline in parliamentary votes | Vote enforcement |

---

## AI Party Staff System

Parties can hire AI-controlled staff to perform automated actions each simulation month.

### Staff Roles & Economics

| AI Role | Base Salary (Junior) | Senior Multiplier | Expert Multiplier | Primary Action |
|---------|---------------------|-------------------|-------------------|----------------|
| Campaign Worker | $45,000/month | 1.5x ($67.5K) | 2.2x ($99K) | Organize Rally |
| Media Advisor | $95,000/month | 1.5x ($142.5K) | 2.2x ($209K) | Press Campaign |
| Policy Economist | $120,000/month | 1.5x ($180K) | 2.2x ($264K) | Draft Policy |
| Party Strategist | $160,000/month | 1.5x ($240K) | 2.2x ($352K) | Voter Targeting |
| Recruitment Officer | $65,000/month | 1.5x ($97.5K) | 2.2x ($143K) | Member Drive |
| Fundraiser | $80,000/month | 1.5x ($120K) | 2.2x ($176K) | Fundraise |
| Parliamentary Whip | $75,000/month | 1.5x ($112.5K) | 2.2x ($165K) | Vote Discipline |

### Staff Action Effects

| Action | Junior Effect | Senior Effect | Expert Effect |
|--------|--------------|---------------|---------------|
| Organize Rally | +1.5% bloc outreach | +2.5% | +4.0% |
| Press Campaign | +2% urban approval | +3.5% | +5.5% |
| Draft Policy | +3% law passage quality | +5% | +8% |
| Voter Targeting | +2% key bloc affinity | +3.5% | +6% |
| Member Drive | +10 members | +18 members | +30 members |
| Fundraise | +$250K–$500K | +$450K–$900K | +$800K–$1.8M |
| Vote Discipline | +8% parliamentary discipline | +14% | +22% |

### Staff Properties
- **Loyalty (0.0–1.0):** Probability staff stays when party faces adversity
- **Ideology Alignment (0.0–1.0):** How well staff's politics match party; misalignment reduces effectiveness
- **Experience (months):** Increases with time; veterans perform better
- **Corruption Risk:** Senior+ staff have small monthly corruption probability if party ethics are poor

### Hiring Mechanics
1. Party leader or treasurer initiates hire
2. Select role, seniority tier (junior/senior/expert)
3. Monthly salary deducted from **party treasury** at each tick
4. Party treasury = separate from national budget
5. Party treasury funded by: fundraising actions, member dues, private donations
6. Staff fire if treasury runs dry (automatic)

---

## Keldoria Starter Parties

| Party | Abbreviation | Ideology | Base Support | Founded | Color |
|-------|-------------|----------|-------------|---------|-------|
| Keldorian Social Democrats | KSD | social_democrat | 24% | 580 AE | #e63946 (Red) |
| Christian Conservative Union | CCU | conservative | 22% | 612 AE | #457b9d (Blue) |
| Keldorian Greens | KGP | green | 14% | 798 AE | #2d6a4f (Forest Green) |
| Free Liberal Democrats | FLD | libertarian | 11% | 680 AE | #f4a261 (Orange) |
| United Left Alliance | ULA | socialist | 9% | 742 AE | #9d0208 (Dark Red) |
| National Reform Party | NRP | nationalist | 8% | 821 AE | #1d3557 (Navy) |
| Technocratic Progress Party | TPP | technocratic | 7% | 845 AE | #6a4c93 (Purple) |
| Agrarian & Rural Union | ARU | centrist | 5% | 650 AE | #606c38 (Olive) |
