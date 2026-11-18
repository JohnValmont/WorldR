/**
 * Statecraft — Phase 2 politics rebuild.
 *
 * Adds the parts that make a nation feel governed even with no humans online:
 *   - districts synced from the nation's constitution (constants/nations.ts)
 *   - computer-run parties that table and vote on laws by their ideology
 *   - a cabinet of ministers appointed after each government forms
 *   - government approval driven by the economy, and monthly opinion polls
 *
 * Decision rules are PURE functions (exported, unit-tested in
 * tests/statecraft.test.ts). DB functions take a knex transaction and never use
 * the global connection, so they are safe inside the politics tick.
 */
import { AXES, Platform, SEGMENTS } from '../constants/politics';
import { TREATY_CATEGORY, TREATY_SPECS } from '../constants/diplomacy';
import { parseTreatyOption, treatyLiking } from './diplomacy.rules';
import { getMajorityForState } from '../constants/politics';
import { POLICY_CATALOG, PolicyOptionDef, NationalStat } from '../constants/macroEconomy';
import {
  APPROVAL_WEIGHTS, APPROVAL_MIN, APPROVAL_MAX, APPROVAL_ELECTION_SWING, ECONOMY_APPROVAL,
  CABINET_POSTS, DEFAULT_LAWS, MINISTER_BACKING_BONUS, MINISTER_SALARY, PREMIER_SALARY,
  NPC_BILL_CHANCE_LEAD, NPC_BILL_CHANCE_PARTNER, NPC_BILL_CHANCE_OPPOSITION, NPC_BILL_MIN_GAIN,
  NPC_EFFECT_WEIGHT, NPC_GOV_RESIST_PRIVATE_BILL, NPC_GOV_WHIP, NPC_OPPOSITION_BIAS,
  TAG_AXIS, getNationForPolState, npcName, statPreferences, NationSpec, NPC_MACHINE_EFFORT,
  NPC_BILL_COOLDOWN_MONTHS, NPC_PASSED_LAW_COOLDOWN_MONTHS, NPC_OPPOSITION_SIGNAL_SHARE, nationRules,
} from '../constants/nations';
import { allocateSeatsDHondt, apportionSeats, runElection, EngineCandidate, EngineConstituency } from './electionEngine';
import { NationalStats, readNationalStatsFromRow } from './nationalEconomy.service';
import { safeParseJSON } from '../../utils/json';
import { supportEffortByParty } from './support.store';
import { whipScale } from './coalition.rules';

// ═══════════════════════════════ PURE RULES ═══════════════════════════════

export function parsePlatform(raw: any): Platform {
  const p = typeof raw === 'string' ? safeParseJSON(raw) : (raw ?? {});
  const out = {} as Platform;
  for (const a of AXES) out[a] = Number.isFinite(Number(p?.[a])) ? Number(p[a]) : 50;
  return out;
}

/**
 * How much a party with this platform likes a law option, roughly -1..+1.
 * Ideological tags (e.g. "LOW TAXES") count fully; the law's measured effects
 * on national stats count at NPC_EFFECT_WEIGHT.
 */
export function optionAlignment(platform: Platform, option: Pick<PolicyOptionDef, 'tags' | 'effects'>): number {
  let tagScore = 0;
  let tagCount = 0;
  for (const tag of option.tags ?? []) {
    const m = TAG_AXIS[tag];
    if (!m) continue;
    tagScore += m.dir * ((platform[m.axis] ?? 50) - 50) / 50;
    tagCount++;
  }
  const tagPart = tagCount > 0 ? tagScore / tagCount : 0;

  const prefs = statPreferences(platform);
  let effectPart = 0;
  for (const [stat, delta] of Object.entries(option.effects ?? {})) {
    effectPart += (prefs[stat as NationalStat] ?? 0) * Number(delta) / 10;
  }
  effectPart = Math.max(-1, Math.min(1, effectPart));
  return tagPart + NPC_EFFECT_WEIGHT * effectPart;
}

export function findOption(category: string, optionId: string): PolicyOptionDef | undefined {
  return POLICY_CATALOG.find(c => c.id === category)?.options.find(o => o.id === optionId);
}

/** How much better (positive) or worse a party finds `proposed` than the law in force. */
export function changeDesirability(platform: Platform, category: string, currentId: string, proposedId: string): number {
  // Treaty bills (constants/diplomacy.ts): parties judge the treaty by their platform.
  if (category === TREATY_CATEGORY) {
    const t = parseTreatyOption(proposedId);
    return t ? treatyLiking(platform as any, t.kind) : -1;
  }
  const cur = findOption(category, currentId);
  const next = findOption(category, proposedId);
  if (!next) return -1;
  return optionAlignment(platform, next) - (cur ? optionAlignment(platform, cur) : 0);
}

/** The single change this party would most like to make, or null if none clears NPC_BILL_MIN_GAIN. */
export function pickNpcBill(
  platform: Platform,
  laws: Record<string, string>,
  exclude: Set<string> = new Set(),
): { category: string; option: string; gain: number } | null {
  let best: { category: string; option: string; gain: number } | null = null;
  for (const cat of POLICY_CATALOG) {
    if (exclude.has(cat.id)) continue;
    const current = laws[cat.id] ?? DEFAULT_LAWS[cat.id];
    for (const opt of cat.options) {
      if (opt.id === current) continue;
      const gain = changeDesirability(platform, cat.id, current, opt.id);
      if (gain >= NPC_BILL_MIN_GAIN && (!best || gain > best.gain)) {
        best = { category: cat.id, option: opt.id, gain };
      }
    }
  }
  return best;
}

export interface Voter { id: string; platform: Platform; seats: number; inGovernment: boolean }

/**
 * Seats for and against a change, if every party voted by decidePartyVote.
 */
export function projectTally(
  voters: Voter[], proposerId: string, billFromGovernment: boolean,
  category: string, currentId: string, optionId: string, whip = 1,
): { yea: number; nay: number } {
  let yea = 0, nay = 0;
  for (const v of voters) {
    if (v.seats <= 0) continue;
    const vote = decidePartyVote({
      desirability: changeDesirability(v.platform, category, currentId, optionId),
      voterInGovernment: v.inGovernment,
      billFromGovernment,
      ownBill: v.id === proposerId,
      whipScale: whip,
    });
    if (vote === 'yea') yea += v.seats; else nay += v.seats;
  }
  return { yea, nay };
}

/**
 * The change a party would most like that Parliament would actually pass.
 * Returns the best passable bill, plus the party's overall favourite (which an
 * opposition party may table anyway to make a point).
 */
export function pickPassableBill(
  self: Voter,
  voters: Voter[],
  laws: Record<string, string>,
  exclude: Set<string> = new Set(),
  passMargin = 1,
  whip = 1,
): { passable: { category: string; option: string; gain: number } | null; favourite: { category: string; option: string; gain: number } | null } {
  let passable: { category: string; option: string; gain: number } | null = null;
  let favourite: { category: string; option: string; gain: number } | null = null;
  for (const cat of POLICY_CATALOG) {
    if (exclude.has(cat.id)) continue;
    const current = laws[cat.id] ?? DEFAULT_LAWS[cat.id];
    for (const opt of cat.options) {
      if (opt.id === current) continue;
      const gain = changeDesirability(self.platform, cat.id, current, opt.id);
      if (gain < NPC_BILL_MIN_GAIN) continue;
      if (!favourite || gain > favourite.gain) favourite = { category: cat.id, option: opt.id, gain };
      const t = projectTally(voters, self.id, self.inGovernment, cat.id, current, opt.id, whip);
      if (t.yea - t.nay >= passMargin && (!passable || gain > passable.gain)) passable = { category: cat.id, option: opt.id, gain };
    }
  }
  return { passable, favourite };
}

export interface VoteContext {
  /** How much the voting party likes the change (changeDesirability). */
  desirability: number;
  voterInGovernment: boolean;
  billFromGovernment: boolean;
  /** The bill was tabled by the minister responsible for that portfolio. */
  ministerial?: boolean;
  /** The voting party tabled the bill itself. */
  ownBill?: boolean;
  /** Coalition unity scales the government whip (coalition.rules whipScale). Missing = 1. */
  whipScale?: number;
}

/**
 * How strongly a party leans toward voting yes (positive) or no (negative):
 * its liking of the change, plus government whipping / opposition scepticism.
 * Pacts (floor.rules.ts) use the same number to judge what a vote is worth.
 */
export function partyVoteScore(ctx: VoteContext): number {
  if (ctx.ownBill) return 1;
  let score = ctx.desirability;
  if (ctx.voterInGovernment && ctx.billFromGovernment) {
    score += NPC_GOV_WHIP * (ctx.whipScale ?? 1) + (ctx.ministerial ? MINISTER_BACKING_BONUS : 0);
  } else if (!ctx.voterInGovernment && ctx.billFromGovernment) {
    score -= NPC_OPPOSITION_BIAS;
  } else if (ctx.voterInGovernment && !ctx.billFromGovernment) {
    score -= NPC_GOV_RESIST_PRIVATE_BILL;
  }
  return score;
}

/** A party's bloc vote when no human leader has voted for it. */
export function decidePartyVote(ctx: VoteContext): 'yea' | 'nay' {
  return partyVoteScore(ctx) > 0 ? 'yea' : 'nay';
}

/** What voters feel of the economy (from the nations simulation). Missing = no economy adjustment. */
export interface ApprovalEconomy {
  unemployment: number;
  /** Yearly growth in output, or null when there is not yet a year of history. */
  growth: number | null;
  debtRatio: number;
  /** Below 1 when debt is past the ceiling and programmes were cut. */
  funded: number;
}

export interface EconomyApprovalParts { jobs: number; growth: number; debt: number; total: number }

/** Pure: approval points from jobs, growth and debt. Each part capped, then the total (ECONOMY_APPROVAL). */
export function economyApprovalAdjustment(e: ApprovalEconomy | null | undefined): EconomyApprovalParts {
  if (!e) return { jobs: 0, growth: 0, debt: 0, total: 0 };
  const E = ECONOMY_APPROVAL;
  const cap = (x: number, c: number) => Math.max(-c, Math.min(c, x));
  const gap = (e.unemployment - E.unemploymentNorm) * 100;
  const jobs = cap(gap * (gap > 0 ? E.perPointUnemploymentAbove : E.perPointUnemploymentBelow), E.unemploymentCap);
  const growth = e.growth == null ? 0 : cap((e.growth - E.growthNorm) * 100 * E.perPointGrowth, E.growthCap);
  const debt = cap(Math.max(0, e.debtRatio - E.debtSafeRatio) * 100 * E.perPointDebt + (e.funded < 1 ? E.debtCeilingPenalty : 0), E.debtCap);
  const r1 = (x: number) => Math.round(x * 10) / 10;
  return { jobs: r1(jobs), growth: r1(growth), debt: r1(debt), total: r1(cap(jobs + growth + debt, E.totalCap)) };
}

/**
 * Government approval 0..100 (50 = neutral): national stats, plus how the
 * economy feels when it is known. Pure. Callers with a database should use
 * liveApproval so the election and every poll read the same economy.
 */
export function computeApproval(stats: Partial<NationalStats>, economy?: ApprovalEconomy | null): number {
  let a = 50;
  for (const [stat, w] of Object.entries(APPROVAL_WEIGHTS)) {
    const v = Number((stats as any)[stat] ?? 50);
    a += (w as number) * (v - 50);
  }
  a += economyApprovalAdjustment(economy).total;
  return Math.max(APPROVAL_MIN, Math.min(APPROVAL_MAX, Math.round(a * 10) / 10));
}

/** The economy voters feel right now, from the latest nations-simulation month (null before the first one). */
export async function approvalEconomy(conn: any, stateId: string): Promise<ApprovalEconomy | null> {
  const latest = await conn('nation_sim_months').where({ state_id: stateId }).orderBy('arc', 'desc').first();
  if (!latest) return null;
  const back = await conn('nation_sim_months').where({ state_id: stateId }).where('arc', '<=', Number(latest.arc) - ECONOMY_APPROVAL.growthLookbackMonths).orderBy('arc', 'desc').first();
  const budget = typeof latest.budget === 'string' ? safeParseJSON(latest.budget) : latest.budget;
  const gdp = Number(latest.gdp_yearly) || 0;
  const gdpBack = back ? Number(back.gdp_yearly) || 0 : 0;
  return {
    unemployment: Number(latest.unemployment) || 0,
    growth: back && gdpBack > 0 ? gdp / gdpBack - 1 : null,
    debtRatio: budget?.debtRatio != null ? Number(budget.debtRatio) : (gdp > 0 && latest.debt != null ? Number(latest.debt) / gdp : 0),
    funded: budget?.funded != null ? Number(budget.funded) : 1,
  };
}

/**
 * THE approval number: what the real election, every poll, the map and every
 * screen use. Same inputs everywhere (AGENTS.md: polls and elections agree).
 */
export async function liveApproval(conn: any, stateRow: any): Promise<{ approval: number; fromStats: number; economy: EconomyApprovalParts }> {
  const stats = readNationalStatsFromRow(stateRow);
  const econ = await approvalEconomy(conn, stateRow.id);
  return { approval: computeApproval(stats, econ), fromStats: computeApproval(stats), economy: economyApprovalAdjustment(econ) };
}

/** Vote multiplier for governing parties' candidates at an election. */
export function approvalVoteMultiplier(approval: number): number {
  return 1 + APPROVAL_ELECTION_SWING * (approval - 50) / 50;
}

/** Deterministic pseudo-random number in [0,1) from a string seed. */
export function seededUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

export interface DistrictRow { id: string; registered_voters: number; seats: number; segment_weights: any }
export interface PartyForPoll {
  id: string;
  platform: Platform;
  credibility?: number;
  /** Campaign effort per voter segment, as the election engine would see it. */
  effortBySegment?: Record<string, number>;
}

/**
 * "If the election were held today": the real election engine run on every
 * party's platform in every district, with no campaign effort and the current
 * government approval applied to governing parties.
 */
export function projectElection(
  parties: PartyForPoll[],
  districts: DistrictRow[],
  conditions: NationalStats | null,
  governingPartyIds: Set<string>,
  approval: number,
): { shares: Record<string, number>; seats: Record<string, number>; districts: Record<string, { shares: Record<string, number>; seats: Record<string, number> }> } {
  const candidates: EngineCandidate[] = [];
  for (const d of districts) {
    for (const p of parties) {
      candidates.push({
        candidateId: `poll_${p.id}_${d.id}`,
        partyId: p.id,
        platform: p.platform,
        credibility: p.credibility ?? 50,
        isIncumbent: governingPartyIds.has(p.id),
        effortBySegment: p.effortBySegment ?? {},
        constituencyId: d.id,
        voteMultiplier: governingPartyIds.has(p.id) ? approvalVoteMultiplier(approval) : 1,
      });
    }
  }
  const constituencies: EngineConstituency[] = districts.map(d => ({
    id: d.id,
    registeredVoters: Number(d.registered_voters) || 80000,
    conditions,
    seats: Number(d.seats) || 1,
    segmentWeights: typeof d.segment_weights === 'string' ? safeParseJSON(d.segment_weights) : (d.segment_weights ?? {}),
  }));
  const res = runElection({ candidates, constituencies });
  const total = res.perParty.reduce((a, p) => a + p.votes, 0) || 1;
  const shares: Record<string, number> = {};
  const seats: Record<string, number> = {};
  for (const p of res.perParty) { shares[p.partyId] = p.votes / total; seats[p.partyId] = p.seats; }
  // The same projection, district by district (the political map reads it).
  const byDistrict: Record<string, { shares: Record<string, number>; seats: Record<string, number> }> = {};
  const districtVotes: Record<string, number> = {};
  for (const c of res.perCandidate) {
    const d = (byDistrict[c.constituencyId] ??= { shares: {}, seats: {} });
    d.shares[c.partyId] = (d.shares[c.partyId] ?? 0) + c.votes;
    districtVotes[c.constituencyId] = (districtVotes[c.constituencyId] ?? 0) + c.votes;
  }
  for (const pc of res.perConstituency) if (byDistrict[pc.constituencyId]) byDistrict[pc.constituencyId].seats = { ...(pc.seatsByParty ?? {}) };
  for (const [id, d] of Object.entries(byDistrict)) {
    const t = districtVotes[id] || 1;
    for (const k of Object.keys(d.shares)) d.shares[k] /= t;
  }
  return { shares, seats, districts: byDistrict };
}

// ═══════════════════════════════ DB HELPERS ═══════════════════════════════

/**
 * Make the database's constituencies match the nation's constitution:
 * the named districts exist with their voters, voter mix and seat counts, and
 * anything else (old filler districts) is switched off. Returns active districts.
 */
export async function syncNationDistricts(trx: any, stateRow: any): Promise<any[]> {
  const nation = getNationForPolState(stateRow?.code);
  if (!nation) {
    return trx('pol_constituencies').where({ state_id: stateRow.id, is_active: true });
  }
  const seats = apportionSeats(nation.districts.map(d => d.registeredVoters), nation.legislature.seats, 1);
  const existing = await trx('pol_constituencies').where({ state_id: stateRow.id });
  const byName = new Map<string, any>(existing.map((c: any) => [c.name, c]));
  const keep = new Set<string>();

  for (let i = 0; i < nation.districts.length; i++) {
    const d = nation.districts[i];
    const row = {
      region: d.region,
      seats: seats[i],
      registered_voters: d.registeredVoters,
      population: Math.round(d.registeredVoters * 1.4),
      segment_weights: JSON.stringify(d.segmentWeights),
      is_active: true,
    };
    const found = byName.get(d.name);
    if (found) {
      keep.add(found.id);
      const same = found.is_active && Number(found.seats) === row.seats && Number(found.registered_voters) === row.registered_voters
        && found.region === row.region && JSON.stringify(found.segment_weights) === JSON.stringify(d.segmentWeights);
      if (!same) await trx('pol_constituencies').where({ id: found.id }).update(row);
    } else {
      const [ins] = await trx('pol_constituencies').insert({ state_id: stateRow.id, name: d.name, ...row }).returning('id');
      keep.add(typeof ins === 'object' ? ins.id : ins);
    }
  }
  const stale = existing.filter((c: any) => !keep.has(c.id) && c.is_active !== false).map((c: any) => c.id);
  if (stale.length) await trx('pol_constituencies').whereIn('id', stale).update({ is_active: false });

  return trx('pol_constituencies').where({ state_id: stateRow.id, is_active: true }).orderBy('name');
}

/** Laws in force: category -> option id (active macro-economy policies over defaults). */
export async function getLawsInForce(trx: any, stateId: string): Promise<Record<string, string>> {
  // Each nation starts from its own founding laws (constants/nations.ts), then
  // whatever its Parliament has passed since.
  const stateRow = await trx('pol_states').where({ id: stateId }).select('code').first();
  const founding = getNationForPolState(stateRow?.code)?.foundingLaws ?? {};
  const laws: Record<string, string> = { ...DEFAULT_LAWS, ...founding };
  const rows = await trx('pol_active_policies').where({ state_id: stateId, is_active: true }).select('category', 'option_id');
  for (const r of rows) laws[r.category] = r.option_id;
  return laws;
}

export interface GovernmentInfo {
  sittingCycleId: string | null;
  coalitionStatus: 'formed' | 'minority' | null;
  leadPartyId: string | null;
  memberPartyIds: string[];
  seatsByParty: Record<string, number>;
  /** Coalition unity 0..100 (docs/COALITIONS.md); null for a one-party government or none. */
  unity: number | null;
  /** The coalition deal row, when the government has one. */
  agreementId: string | null;
}

/** The sitting parliament and its government (latest cycle that has seats). */
export async function getGovernment(trx: any, stateId: string): Promise<GovernmentInfo> {
  const sitting = await trx('pol_council_seats')
    .join('pol_cycles', 'pol_council_seats.cycle_id', 'pol_cycles.id')
    .where('pol_cycles.state_id', stateId)
    .orderBy('pol_cycles.cycle_number', 'desc')
    .select('pol_cycles.id')
    .first();
  const sittingCycleId = sitting?.id ?? null;
  const seatsByParty: Record<string, number> = {};
  if (sittingCycleId) {
    const rows = await trx('pol_council_seats').where({ cycle_id: sittingCycleId }).select('party_id').count('* as n').groupBy('party_id');
    for (const r of rows) seatsByParty[r.party_id] = Number(r.n);
  }
  const coalition = sittingCycleId
    ? await trx('pol_coalitions').where({ cycle_id: sittingCycleId }).whereIn('status', ['formed', 'minority']).first()
    : null;
  let members: string[] = [];
  if (coalition) {
    const parsed = typeof coalition.member_party_ids === 'string' ? safeParseJSON(coalition.member_party_ids) : (coalition.member_party_ids ?? {});
    members = parsed?.accepted || (Array.isArray(parsed) ? parsed : []);
    if (!members.includes(coalition.lead_party_id)) members = [coalition.lead_party_id, ...members];
  }
  const agreement = coalition && members.length > 1
    ? await trx('pol_coalition_agreements').where({ coalition_id: coalition.id }).whereIn('status', ['active', 'under_review']).first()
    : null;
  return {
    sittingCycleId,
    coalitionStatus: coalition?.status ?? null,
    leadPartyId: coalition?.lead_party_id ?? null,
    memberPartyIds: members,
    seatsByParty,
    unity: agreement ? Number(agreement.health) : null,
    agreementId: agreement?.id ?? null,
  };
}

/** Category -> human-friendly bill title. */
export function billTitle(category: string, option: string): string {
  if (category === TREATY_CATEGORY) {
    const t = parseTreatyOption(option);
    if (t) return `${TREATY_SPECS[t.kind].name} with ${getNationForPolState(t.partner)?.shortName ?? t.partner}`;
  }
  const cat = POLICY_CATALOG.find(c => c.id === category);
  const opt = cat?.options.find(o => o.id === option);
  return cat && opt ? `${cat.name}: ${opt.name}` : `${category}: ${option}`;
}

/**
 * Computer-run parties table bills that move the law toward their ideology.
 * At most one open bill per party; chances depend on the party's role.
 */
export async function runNpcLegislature(trx: any, stateId: string, arc: number): Promise<number> {
  const passMargin = nationRules((await trx('pol_states').where({ id: stateId }).select('code').first())?.code).passMargin;
  const gov = await getGovernment(trx, stateId);
  if (!gov.sittingCycleId) return 0;
  const parties = await trx('pol_parties').where({ state_id: stateId, is_npc: true });
  const laws = await getLawsInForce(trx, stateId);
  const openBills = await trx('pol_bills').where({ state_id: stateId, status: 'proposed' }).select('proposed_by_party_id', 'params');
  const openByParty = new Set(openBills.map((b: any) => b.proposed_by_party_id));
  const openCategories = new Set<string>(openBills.map((b: any) => {
    const p = typeof b.params === 'string' ? safeParseJSON(b.params) : b.params;
    return p?.category;
  }).filter(Boolean));

  // Laws voted on recently are off the table for a while (no monthly re-tabling).
  const recent = await trx('pol_bills')
    .where({ state_id: stateId })
    .where(function (this: any) {
      this.where(function (this: any) { this.where('status', 'failed').where('resolved_arc', '>', arc - NPC_BILL_COOLDOWN_MONTHS); })
        .orWhere(function (this: any) { this.where('status', 'passed').where('resolved_arc', '>', arc - NPC_PASSED_LAW_COOLDOWN_MONTHS); });
    })
    .select('params');
  for (const b of recent) {
    const p = typeof b.params === 'string' ? safeParseJSON(b.params) : b.params;
    if (p?.category) openCategories.add(p.category);
  }

  const allParties = await trx('pol_parties').where({ state_id: stateId });
  const voters: Voter[] = allParties.map((p: any) => ({
    id: p.id, platform: parsePlatform(p.platform), seats: gov.seatsByParty[p.id] || 0, inGovernment: gov.memberPartyIds.includes(p.id),
  }));

  let tabled = 0;
  // Coalition promises come first (docs/COALITIONS.md): a computer-run leading party
  // tables an undelivered promised law, ignoring its usual waiting period.
  const lead = parties.find((p: any) => p.id === gov.leadPartyId);
  if (lead && gov.agreementId && !openByParty.has(lead.id)) {
    const deal = await trx('pol_coalition_agreements').where({ id: gov.agreementId }).first();
    const promised = ((typeof deal?.mandatory_legislation === 'string' ? safeParseJSON(deal.mandatory_legislation) : deal?.mandatory_legislation) ?? [])
      .filter((p: any) => p.status === 'pending' && (laws[p.category] ?? DEFAULT_LAWS[p.category]) !== p.option)
      .filter((p: any) => !openBills.some((b: any) => {
        const bp = typeof b.params === 'string' ? safeParseJSON(b.params) : b.params;
        return bp?.category === p.category;
      }))
      // Tried once and lost: only bring it back if the count now says it would pass.
      .filter((p: any) => {
        if (!p.tried) return true;
        const t = projectTally(voters, lead.id, true, p.category, laws[p.category] ?? DEFAULT_LAWS[p.category], p.option, whipScale(gov.unity));
        return t.yea - t.nay >= passMargin;
      })
      .sort((a: any, b: any) => a.by_arc - b.by_arc);
    const due = promised[0];
    if (due) {
      await trx('pol_bills').insert({
        state_id: stateId, proposed_by_party_id: lead.id, type: 'policy_change',
        params: JSON.stringify({ category: due.category, option: due.option }), status: 'proposed', proposed_arc: arc,
      });
      openByParty.add(lead.id);
      openCategories.add(due.category);
      await trx('pol_ledger_events').insert({
        state_id: stateId, arc, kind: 'bill_tabled',
        headline: `${lead.name} tables: ${billTitle(due.category, due.option)}`,
        body: `${lead.name} brings a law it promised its coalition partners before Parliament. It goes to a vote next month.`,
      });
      tabled++;
    }
  }
  for (const party of parties) {
    if (!gov.seatsByParty[party.id] || openByParty.has(party.id)) continue;
    const isLead = gov.leadPartyId === party.id;
    const isPartner = !isLead && gov.memberPartyIds.includes(party.id);
    const chance = isLead ? NPC_BILL_CHANCE_LEAD : isPartner ? NPC_BILL_CHANCE_PARTNER : NPC_BILL_CHANCE_OPPOSITION;
    if (seededUnit(`npcbill|${party.id}|${arc}`) >= chance) continue;

    const self = voters.find(v => v.id === party.id)!;
    const { passable, favourite } = pickPassableBill(self, voters, laws, openCategories, passMargin, whipScale(gov.unity));
    // Government parties table what they can pass. The opposition sometimes
    // tables its favourite anyway, knowing it will probably lose.
    const signal = !self.inGovernment && seededUnit(`npcsignal|${party.id}|${arc}`) < NPC_OPPOSITION_SIGNAL_SHARE;
    const pick = passable ?? (signal ? favourite : null);
    if (!pick) continue;
    await trx('pol_bills').insert({
      state_id: stateId,
      proposed_by_party_id: party.id,
      type: 'policy_change',
      params: JSON.stringify({ category: pick.category, option: pick.option }),
      status: 'proposed',
      proposed_arc: arc,
    });
    openCategories.add(pick.category);
    await trx('pol_ledger_events').insert({
      state_id: stateId, arc, kind: 'bill_tabled',
      headline: `${party.name} tables: ${billTitle(pick.category, pick.option)}`,
      body: `${party.name} has put a bill before Parliament. It goes to a vote next month.`,
    });
    tabled++;
  }
  return tabled;
}

/**
 * Bloc votes for every seated party whose human leader has not voted.
 * Returns partyId -> vote. Used by the tick (to count votes) and by the
 * Capitol page (to project the result before the vote).
 */
export async function projectPartyVotes(
  trx: any,
  bill: any,
  parties: any[],
  gov: GovernmentInfo,
  laws: Record<string, string>,
  alreadyVotedPartyIds: Set<string>,
): Promise<Record<string, 'yea' | 'nay'>> {
  const params = typeof bill.params === 'string' ? safeParseJSON(bill.params) : (bill.params ?? {});
  const category = params?.category;
  const option = params?.option;
  const billFromGovernment = gov.memberPartyIds.includes(bill.proposed_by_party_id);
  let ministerial = false;
  if (bill.tabled_by_character_id && category) {
    const post = CABINET_POSTS.find(p => p.portfolio.includes(category));
    if (post) {
      const holder = await trx('pol_cabinet_posts').where({ state_id: bill.state_id, post_key: post.key }).first();
      ministerial = !!holder && holder.holder_character_id === bill.tabled_by_character_id;
    }
  }
  const out: Record<string, 'yea' | 'nay'> = {};
  for (const p of parties) {
    if (!gov.seatsByParty[p.id] || alreadyVotedPartyIds.has(p.id)) continue;
    const desirability = category && option
      ? changeDesirability(parsePlatform(p.platform), category, laws[category] ?? DEFAULT_LAWS[category], option)
      : 0;
    out[p.id] = decidePartyVote({
      desirability,
      voterInGovernment: gov.memberPartyIds.includes(p.id),
      billFromGovernment,
      ministerial,
      ownBill: p.id === bill.proposed_by_party_id,
      whipScale: whipScale(gov.unity),
    });
  }
  return out;
}

/**
 * Appoint the cabinet after a government forms. Posts are shared between the
 * governing parties by seats (D'Hondt). Inside a party, human members with a
 * seat go first, then other human members by credibility; empty posts get a
 * named computer-run minister.
 */
export async function formCabinet(trx: any, stateId: string, arc: number): Promise<void> {
  const gov = await getGovernment(trx, stateId);
  if (!gov.leadPartyId) return;
  const memberSeats: Record<string, number> = {};
  for (const id of gov.memberPartyIds) memberSeats[id] = gov.seatsByParty[id] || 0;

  // Which party gets which post. A coalition deal (docs/COALITIONS.md) names the posts
  // promised to partners; every other post goes to the party that built the government.
  // Without a deal (one-party government), posts are shared by seats in cabinet order.
  const postParty: Record<string, string> = {};
  const deal = gov.agreementId ? await trx('pol_coalition_agreements').where({ id: gov.agreementId }).first() : null;
  if (deal) {
    const alloc = (typeof deal.portfolio_allocation === 'string' ? safeParseJSON(deal.portfolio_allocation) : deal.portfolio_allocation) ?? [];
    for (const a of alloc) if (gov.memberPartyIds.includes(a.party_id)) postParty[a.post] = a.party_id;
    const keeper = deal.formateur_party_id && gov.memberPartyIds.includes(deal.formateur_party_id) ? deal.formateur_party_id : gov.leadPartyId;
    for (const p of CABINET_POSTS) if (!postParty[p.key]) postParty[p.key] = keeper;
  } else {
    const postsPerParty = allocateSeatsDHondt(memberSeats, CABINET_POSTS.length);
    const order = Object.keys(postsPerParty).filter(id => postsPerParty[id] > 0)
      .sort((a, b) => (a === gov.leadPartyId ? -1 : b === gov.leadPartyId ? 1 : (memberSeats[b] - memberSeats[a])));
    let idx = 0;
    for (const partyId of order) for (let k = 0; k < postsPerParty[partyId] && idx < CABINET_POSTS.length; k++) postParty[CABINET_POSTS[idx++].key] = partyId;
  }

  const premier = await trx('pol_offices').where({ state_id: stateId, office: 'premier' }).orderBy('since_arc', 'desc').first();
  const used = new Set<string>(premier?.holder_character_id ? [premier.holder_character_id] : []);
  const seatHolders = new Set<string>(
    gov.sittingCycleId
      ? (await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId }).whereNotNull('character_id').select('character_id')).map((r: any) => r.character_id)
      : [],
  );

  const assignments: { post: string; partyId: string; charId: string | null }[] = [];
  const parties = [...new Set(Object.values(postParty))];
  for (const partyId of parties) {
    const members = await trx('pol_party_members')
      .join('characters', 'characters.id', 'pol_party_members.character_id')
      .where('pol_party_members.party_id', partyId)
      .select('characters.id', 'characters.credibility');
    const ranked = members
      .filter((m: any) => !used.has(m.id))
      .sort((a: any, b: any) => (Number(seatHolders.has(b.id)) - Number(seatHolders.has(a.id))) || (Number(b.credibility || 0) - Number(a.credibility || 0)));
    let k = 0;
    for (const p of CABINET_POSTS) {
      if (postParty[p.key] !== partyId) continue;
      const pick = ranked[k++];
      if (pick) used.add(pick.id);
      assignments.push({ post: p.key, partyId, charId: pick?.id ?? null });
    }
  }
  const order = parties;

  const usedNames = new Set<string>();
  for (const a of assignments) {
    const row = {
      state_id: stateId,
      post_key: a.post,
      party_id: a.partyId,
      holder_character_id: a.charId,
      npc_name: a.charId ? null : uniqueNpcName(`${stateId}|${a.post}|${a.partyId}|${arc}`, usedNames),
      appointed_arc: arc,
    };
    await trx('pol_cabinet_posts').insert(row).onConflict(['state_id', 'post_key']).merge();
  }

  const lead = await trx('pol_parties').where({ id: gov.leadPartyId }).first();
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'cabinet_formed',
    headline: `New cabinet sworn in under ${lead?.name ?? 'the government'}`,
    body: `${assignments.length} ministers take office across ${order.length} governing part${order.length === 1 ? 'y' : 'ies'}.`,
  });
}

/** A computer-run minister's name that isn't already in `used` (adds it). */
export function uniqueNpcName(seed: string, used: Set<string>): string {
  let name = npcName(seed);
  for (let k = 1; used.has(name) && k < 50; k++) name = npcName(`${seed}#${k}`);
  used.add(name);
  return name;
}

/** The Premier replaces a minister with a member of a governing party. */
export async function appointMinister(trx: any, stateId: string, premierCharId: string, postKey: string, targetCharId: string | null, arc: number) {
  const post = CABINET_POSTS.find(p => p.key === postKey);
  if (!post) throw Object.assign(new Error('Unknown cabinet post'), { status: 400 });
  const premier = await trx('pol_offices').where({ state_id: stateId, office: 'premier' }).orderBy('since_arc', 'desc').first();
  if (!premier || premier.holder_character_id !== premierCharId) {
    throw Object.assign(new Error('Only the Premier can appoint ministers'), { status: 403 });
  }
  const gov = await getGovernment(trx, stateId);
  let partyId: string | null = null;
  if (targetCharId) {
    const m = await trx('pol_party_members').where({ character_id: targetCharId }).first();
    if (!m || !gov.memberPartyIds.includes(m.party_id)) {
      throw Object.assign(new Error('Ministers must belong to a governing party'), { status: 400 });
    }
    partyId = m.party_id;
    // One post per person: clear any other post they hold.
    await trx('pol_cabinet_posts').where({ state_id: stateId, holder_character_id: targetCharId }).update({
      holder_character_id: null, npc_name: npcName(`${stateId}|${postKey}|vacated|${arc}`),
    });
  }
  const existing = await trx('pol_cabinet_posts').where({ state_id: stateId, post_key: postKey }).first();
  await trx('pol_cabinet_posts').insert({
    state_id: stateId, post_key: postKey,
    party_id: partyId ?? existing?.party_id ?? gov.leadPartyId,
    holder_character_id: targetCharId,
    npc_name: targetCharId ? null : npcName(`${stateId}|${postKey}|${arc}`),
    appointed_arc: arc,
  }).onConflict(['state_id', 'post_key']).merge();

  const who = targetCharId ? (await trx('characters').where({ id: targetCharId }).first())?.name : 'a career civil servant';
  await trx('pol_ledger_events').insert({
    state_id: stateId, arc, kind: 'cabinet_reshuffle',
    headline: `Reshuffle: ${who} named ${post.title}`,
    body: `The Premier has appointed a new ${post.title}.`,
  });
}

/** Monthly pay for human office holders. */
export async function payOfficeSalaries(trx: any, stateId: string): Promise<void> {
  const premier = await trx('pol_offices').where({ state_id: stateId, office: 'premier' }).orderBy('since_arc', 'desc').first();
  if (premier?.holder_character_id) {
    await trx('character_finances').where({ character_id: premier.holder_character_id }).increment('cash_in_hand', PREMIER_SALARY);
  }
  const ministers = await trx('pol_cabinet_posts').where({ state_id: stateId }).whereNotNull('holder_character_id');
  for (const m of ministers) {
    if (m.holder_character_id === premier?.holder_character_id) continue;
    await trx('character_finances').where({ character_id: m.holder_character_id }).increment('cash_in_hand', MINISTER_SALARY);
  }
}

/**
 * Parties as the polls see them: the same credibility and campaign effort the
 * election engine would use (computer-run parties get their party machine,
 * everyone gets the campaign effort they actually spent this cycle).
 */
export async function pollParties(trx: any, stateId: string, parties: any[]): Promise<PartyForPoll[]> {
  const cycle = await trx('pol_cycles').where({ state_id: stateId, status: 'open' }).first();
  const districtsCount = Math.max(1, Number((await trx('pol_constituencies').where({ state_id: stateId, is_active: true }).count('* as n').first())?.n) || 1);

  // Credibility as the real election sees it: a player standing in a district
  // brings their own reputation there; every other district is fought by a
  // computer-run list candidate at 50. The poll uses the party-wide average.
  const credSumByParty: Record<string, { sum: number; n: number }> = {};
  if (cycle) {
    const humans = await trx('pol_candidates')
      .join('characters', 'characters.id', 'pol_candidates.character_id')
      .where('pol_candidates.cycle_id', cycle.id)
      .select('pol_candidates.party_id', 'characters.credibility');
    for (const h of humans) {
      const e = (credSumByParty[h.party_id] ??= { sum: 0, n: 0 });
      e.sum += Number(h.credibility) || 0;
      e.n += 1;
    }
  }
  const partyCredibility = (partyId: string) => {
    const e = credSumByParty[partyId];
    if (!e) return 50;
    const n = Math.min(districtsCount, e.n);
    return (e.sum / e.n * n + 50 * (districtsCount - n)) / districtsCount;
  };
  const effortByParty: Record<string, Record<string, number>> = {};
  if (cycle) {
    const actions = await trx('pol_campaign_actions')
      .join('pol_candidates', 'pol_candidates.id', 'pol_campaign_actions.candidate_id')
      .where('pol_campaign_actions.cycle_id', cycle.id)
      .where('pol_campaign_actions.effort', '>', 0)
      .select('pol_candidates.party_id', 'pol_campaign_actions.target_segment', 'pol_campaign_actions.effort');
    for (const a of actions) {
      const e = (effortByParty[a.party_id] ??= {});
      const amt = Number(a.effort) / districtsCount;
      if (a.target_segment) e[a.target_segment] = (e[a.target_segment] || 0) + amt;
      else for (const seg of SEGMENTS) e[seg.key] = (e[seg.key] || 0) + amt / SEGMENTS.length;
    }
  }
  // Every candidate gets the party machine plus their party's support with
  // each voter group, exactly as buildEngineCandidates does for the real election.
  const support = await supportEffortByParty(trx, stateId);
  return parties.map((p: any) => {
    const effort: Record<string, number> = { ...(effortByParty[p.id] ?? {}) };
    for (const seg of SEGMENTS) effort[seg.key] = (effort[seg.key] || 0) + NPC_MACHINE_EFFORT + (support[p.id]?.[seg.key] ?? 0);
    return {
      id: p.id,
      platform: parsePlatform(p.platform),
      credibility: partyCredibility(p.id),
      effortBySegment: effort,
    };
  });
}

/** Record this month's poll (vote share + seat projection per party) and government approval. */
export async function recordPollSnapshot(trx: any, stateRow: any, arc: number): Promise<void> {
  const districts = await trx('pol_constituencies').where({ state_id: stateRow.id, is_active: true });
  if (!districts.length) return;
  const parties = await trx('pol_parties').where({ state_id: stateRow.id });
  if (!parties.length) return;
  const gov = await getGovernment(trx, stateRow.id);
  const conditions = readNationalStatsFromRow(stateRow);
  const approval = (await liveApproval(trx, stateRow)).approval;
  const proj = projectElection(
    await pollParties(trx, stateRow.id, parties),
    districts,
    conditions,
    new Set(gov.memberPartyIds),
    approval,
  );
  for (const p of parties) {
    await trx.raw(
      `INSERT INTO pol_poll_snapshots (state_id, arc, party_id, vote_share, projected_seats)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (state_id, arc, party_id) WHERE party_id IS NOT NULL
       DO UPDATE SET vote_share = EXCLUDED.vote_share, projected_seats = EXCLUDED.projected_seats`,
      [stateRow.id, arc, p.id, Number((proj.shares[p.id] ?? 0).toFixed(4)), proj.seats[p.id] ?? 0],
    );
  }
  await trx.raw(
    `INSERT INTO pol_poll_snapshots (state_id, arc, party_id, approval)
     VALUES (?, ?, NULL, ?)
     ON CONFLICT (state_id, arc) WHERE party_id IS NULL
     DO UPDATE SET approval = EXCLUDED.approval`,
    [stateRow.id, arc, approval],
  );
}

/** Everything the monthly tick needs from this module, in a safe order. */
export async function runStatecraftMonth(trx: any, stateId: string, arc: number): Promise<void> {
  const stateRow = await trx('pol_states').where({ id: stateId }).first();
  if (!stateRow) return;
  await syncNationDistricts(trx, stateRow);
  await runNpcLegislature(trx, stateId, arc);
  await payOfficeSalaries(trx, stateId);
  await recordPollSnapshot(trx, stateRow, arc);
}

export function nationFor(stateRow: any): NationSpec | null {
  return getNationForPolState(stateRow?.code);
}

export { getMajorityForState, SEGMENTS };
