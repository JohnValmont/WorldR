/**
 * Diplomacy: relations between nations and treaties (docs/NATIONS_SIMULATION.md, layer 5).
 *
 * Rules are pure functions in diplomacy.rules.ts. This file loads and stores.
 * Treaties are ratified through ordinary bills (type 'treaty', category
 * TREATY_CATEGORY), so the one vote rule (billVotePlan + tallyBill) counts them.
 * politics.service calls resolveTreatyVote when such a bill is decided.
 *
 * Must NOT import politics.service (it imports this file).
 */
import { AppError } from '../../utils/errors';
import {
  NPC_TREATY_CHANCE, RELATIONS_ON_LIFT, RELATIONS_ON_REJECT, RELATIONS_ON_WITHDRAW, RELATIONS_START, TREATY_AP,
  TREATY_CATEGORY, TREATY_KINDS, TREATY_REJECT_COOLDOWN, TREATY_SPECS, TreatyKind,
} from '../constants/diplomacy';
import { headOfGovernmentTitle, STARTER_NATIONS } from '../constants/nations';
import { TRADABLE_SECTORS } from '../constants/nationSim';
import { notify } from './notices.service';
import { getGovernment, getLawsInForce, seededUnit } from './statecraft.service';
import { spendEnergy, type PlayerPolitics } from './floor.service';
import * as D from './diplomacy.rules';
import { tariffRates, type DiplomacyInput, type TradeLink } from './nationSim.rules';

const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const json = (v: any) => (typeof v === 'string' ? JSON.parse(v) : v);
const nameOf = (code: string) => STARTER_NATIONS.find(n => n.polStateCode === code)?.shortName ?? code;
const CODES = STARTER_NATIONS.map(n => n.polStateCode);

// ─── Reading ────────────────────────────────────────────────────────────────

export async function relationsMap(conn: any): Promise<Map<string, number>> {
  const rows = await conn('nation_relations').select('state_a', 'state_b', 'score');
  const m = new Map<string, number>();
  for (const r of rows) m.set(`${r.state_a}|${r.state_b}`, num(r.score, RELATIONS_START));
  return m;
}
const relOf = (m: Map<string, number>, a: string, b: string) => m.get(D.pairKey(a, b).join('|')) ?? RELATIONS_START;

async function setRelations(trx: any, a: string, b: string, score: number, arc: number) {
  const [x, y] = D.pairKey(a, b);
  await trx('nation_relations').insert({ state_a: x, state_b: y, score, updated_arc: arc }).onConflict(['state_a', 'state_b']).merge();
}
async function bump(trx: any, a: string, b: string, delta: number, arc: number) {
  const m = await relationsMap(trx);
  await setRelations(trx, a, b, D.bumpRelations(relOf(m, a, b), delta), arc);
}

const involves = (t: any, a: string, b: string) => (t.from_code === a && t.to_code === b) || (t.from_code === b && t.to_code === a);

/** Who must ratify: the partner's parliament for a pact, your own for an embargo. */
const ratifierOf = (kind: TreatyKind, from: string, to: string) => (TREATY_SPECS[kind].ratifiedBy === 'own' ? from : to);

/** Per nation, what the simulation needs this month: trade links and rating inputs. */
export async function diplomacyInputs(conn: any): Promise<Record<string, { links: Record<string, TradeLink>; rating: DiplomacyInput }>> {
  const rel = await relationsMap(conn);
  const active = await conn('nation_treaties').where({ status: 'active' });
  const out: Record<string, { links: Record<string, TradeLink>; rating: DiplomacyInput }> = {};
  for (const code of CODES) {
    const links: Record<string, TradeLink> = {};
    const mine: TreatyKind[] = [];
    for (const t of active) {
      if (t.from_code !== code && t.to_code !== code) continue;
      const other = t.from_code === code ? t.to_code : t.from_code;
      mine.push(t.kind);
      if (t.kind === 'embargo') links[other] = 'embargo';
      else if (t.kind === 'trade_pact' && links[other] !== 'embargo') links[other] = 'pact';
    }
    const others = CODES.filter(c => c !== code);
    const avg = others.length ? others.reduce((a, c) => a + relOf(rel, code, c), 0) / others.length : RELATIONS_START;
    const bonus = D.treatyRatingBonus(mine);
    out[code] = { links, rating: { avgRelations: avg, diplomacyBonus: bonus.diplomacy, militaryBonus: bonus.military } };
  }
  return out;
}

// ─── Making treaties ────────────────────────────────────────────────────────

async function stateByCode(conn: any, code: string) {
  return conn('pol_states').where({ code }).first();
}

async function checkProposal(trx: any, kind: TreatyKind, from: string, to: string, arc: number) {
  const treaties = await trx('nation_treaties').whereIn('status', ['active', 'proposed']);
  const activeOrPending = treaties.filter((t: any) => involves(t, from, to)).map((t: any) => t.kind as TreatyKind);
  const rejected = await trx('nation_treaties').where({ kind, status: 'rejected' }).orderBy('resolved_arc', 'desc');
  const lastReject = rejected.find((t: any) => involves(t, from, to));
  const ratifier = await stateByCode(trx, ratifierOf(kind, from, to));
  const gov = ratifier ? await getGovernment(trx, ratifier.id) : null;
  return {
    problem: D.proposalProblem({
      kind, activeOrPending, relations: relOf(await relationsMap(trx), from, to),
      monthsSinceRejected: lastReject ? arc - num(lastReject.resolved_arc) : null, rejectCooldown: TREATY_REJECT_COOLDOWN,
      ratifierHasGovernment: !!gov?.leadPartyId,
    }),
    ratifier, gov,
  };
}

/** Create a treaty and table its ratification bill. Shared by players and computer-led governments. */
async function createTreaty(trx: any, kind: TreatyKind, from: string, to: string, arc: number, byCharacterId: string | null, byTitle: string) {
  const { problem, ratifier, gov } = await checkProposal(trx, kind, from, to, arc);
  if (problem) throw new AppError(problem, 409, 'CONFLICT');
  const spec = TREATY_SPECS[kind];
  const [treaty] = await trx('nation_treaties').insert({
    kind, from_code: from, to_code: to, status: 'proposed', proposed_by_character_id: byCharacterId, proposed_arc: arc,
  }).returning('*');
  // The bill sits in the ratifying parliament; its "partner" is the other nation from that parliament's view.
  const partnerForBill = ratifier.code === from ? to : from;
  const [bill] = await trx('pol_bills').insert({
    state_id: ratifier.id,
    proposed_by_party_id: gov!.leadPartyId,
    type: 'treaty',
    params: JSON.stringify({ category: TREATY_CATEGORY, option: D.treatyOption(kind, partnerForBill), treatyId: treaty.id }),
    status: 'proposed',
    proposed_arc: arc,
    tabled_by_character_id: spec.ratifiedBy === 'own' ? byCharacterId : null,
  }).returning('*');
  await trx('nation_treaties').where({ id: treaty.id }).update({ bill_id: bill.id });

  const fromState = await stateByCode(trx, from);
  const toState = await stateByCode(trx, to);
  const what = spec.name.toLowerCase();
  if (kind === 'embargo') {
    await trx('pol_ledger_events').insert({ state_id: fromState.id, arc, kind: 'treaty', headline: `${byTitle} asks Parliament for an embargo on ${nameOf(to)}`, body: `${spec.blurb} Parliament votes next month.` });
    await trx('pol_ledger_events').insert({ state_id: toState.id, arc, kind: 'treaty', headline: `${nameOf(from)} moves to embargo ${nameOf(to)}`, body: `${nameOf(from)}'s parliament votes next month on cutting off all trade with us.` });
  } else {
    await trx('pol_ledger_events').insert({ state_id: fromState.id, arc, kind: 'treaty', headline: `${byTitle} offers ${nameOf(to)} a ${what}`, body: `${spec.blurb} ${nameOf(to)}'s parliament votes next month.` });
    await trx('pol_ledger_events').insert({ state_id: toState.id, arc, kind: 'treaty', headline: `${nameOf(from)} offers us a ${what}`, body: `${spec.blurb} Parliament votes next month; it is on the order paper now.` });
    const toPremier = await trx('pol_offices').where({ state_id: toState.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
    await notify(trx, toPremier?.holder_character_id, arc, 'treaty_offered', `${nameOf(from)} offers ${nameOf(to)} a ${what}. Parliament votes on it next month.`, 'chamber');
  }
  return { treaty, bill };
}

/** A head of government proposes a pact to another nation, or asks their own parliament for an embargo. */
export async function proposeTreaty(trx: any, stateId: string, me: PlayerPolitics, kindIn: any, partnerIn: any, arc: number) {
  if (!me.isPremier) throw new AppError('Only the head of government can make treaties.', 403, 'FORBIDDEN');
  const kind = String(kindIn ?? '') as TreatyKind;
  if (!TREATY_KINDS.includes(kind)) throw new AppError('Unknown treaty.', 400, 'BAD_REQUEST');
  const own = await trx('pol_states').where({ id: stateId }).first();
  const partner = String(partnerIn ?? '');
  if (!CODES.includes(partner) || partner === own.code) throw new AppError('Choose another nation.', 400, 'BAD_REQUEST');
  await spendEnergy(trx, me.character.id, TREATY_AP, arc);
  await createTreaty(trx, kind, own.code, partner, arc, me.character.id, `${headOfGovernmentTitle(own.code)} ${me.character.name}`);
  const spec = TREATY_SPECS[kind];
  return { message: spec.ratifiedBy === 'own' ? `${spec.name} put to Parliament. It votes next month.` : `${spec.name} offered to ${nameOf(partner)}. Their parliament votes next month.` };
}

/** Called by politics.service when a treaty bill is decided. */
export async function resolveTreatyVote(trx: any, bill: any, passed: boolean, arc: number) {
  const params = json(bill.params) ?? {};
  if (!params.treatyId) return;
  const t = await trx('nation_treaties').where({ id: params.treatyId }).first();
  if (!t || t.status !== 'proposed') return;
  const spec = TREATY_SPECS[t.kind as TreatyKind];
  const fromState = await stateByCode(trx, t.from_code);
  const toState = await stateByCode(trx, t.to_code);
  const what = spec.name.toLowerCase();
  if (passed) {
    await trx('nation_treaties').where({ id: t.id }).update({ status: 'active', started_arc: arc, resolved_arc: arc });
    if (t.kind === 'embargo') {
      // An embargo ends every pact between the two.
      const pacts = await trx('nation_treaties').where({ status: 'active' }).whereNot({ id: t.id });
      for (const p of pacts) if (involves(p, t.from_code, t.to_code)) await trx('nation_treaties').where({ id: p.id }).update({ status: 'ended', resolved_arc: arc });
    }
    await bump(trx, t.from_code, t.to_code, spec.relationsOnStart, arc);
    const head = t.kind === 'embargo' ? `${nameOf(t.from_code)} embargoes ${nameOf(t.to_code)}` : `${nameOf(t.from_code)} and ${nameOf(t.to_code)} sign a ${what}`;
    for (const st of [fromState, toState]) await trx('pol_ledger_events').insert({ state_id: st.id, arc, kind: 'treaty', headline: head, body: spec.blurb });
    await notify(trx, t.proposed_by_character_id, arc, 'treaty_ratified', `${head}. It takes effect this month.`, 'nation');
  } else {
    await trx('nation_treaties').where({ id: t.id }).update({ status: 'rejected', resolved_arc: arc });
    await bump(trx, t.from_code, t.to_code, RELATIONS_ON_REJECT, arc);
    const head = t.kind === 'embargo' ? `Parliament refuses an embargo on ${nameOf(t.to_code)}` : `${nameOf(t.to_code)} rejects ${nameOf(t.from_code)}'s ${what}`;
    for (const st of [fromState, toState]) await trx('pol_ledger_events').insert({ state_id: st.id, arc, kind: 'treaty', headline: head, body: 'The vote failed. Relations cool a little.' });
    await notify(trx, t.proposed_by_character_id, arc, 'treaty_rejected', `${head}.`, 'nation');
  }
}

/** A head of government walks out of a pact, or lifts an embargo their nation imposed. */
export async function withdrawTreaty(trx: any, stateId: string, me: PlayerPolitics, treatyId: string, arc: number) {
  if (!me.isPremier) throw new AppError('Only the head of government can end treaties.', 403, 'FORBIDDEN');
  const own = await trx('pol_states').where({ id: stateId }).first();
  const t = await trx('nation_treaties').where({ id: treatyId }).forUpdate().first();
  if (!t || t.status !== 'active' || (t.from_code !== own.code && t.to_code !== own.code)) throw new AppError('No such treaty in force.', 404, 'NOT_FOUND');
  if (t.kind === 'embargo' && t.from_code !== own.code) throw new AppError('Only the nation that imposed an embargo can lift it.', 403, 'FORBIDDEN');
  await trx('nation_treaties').where({ id: t.id }).update({ status: 'ended', resolved_arc: arc });
  const other = t.from_code === own.code ? t.to_code : t.from_code;
  const delta = t.kind === 'embargo' ? RELATIONS_ON_LIFT : RELATIONS_ON_WITHDRAW;
  await bump(trx, own.code, other, delta, arc);
  const spec = TREATY_SPECS[t.kind as TreatyKind];
  const head = t.kind === 'embargo' ? `${nameOf(own.code)} lifts its embargo on ${nameOf(other)}` : `${nameOf(own.code)} walks out of its ${spec.name.toLowerCase()} with ${nameOf(other)}`;
  for (const code of [own.code, other]) {
    const st = await stateByCode(trx, code);
    await trx('pol_ledger_events').insert({ state_id: st.id, arc, kind: 'treaty', headline: head, body: `${headOfGovernmentTitle(own.code)} ${me.character.name} ended it.` });
  }
  return { message: `${head}.` };
}

// ─── Monthly step ───────────────────────────────────────────────────────────

/**
 * Relations drift and react to treaties and tariffs; computer-led governments
 * may propose a treaty. Run once per politics month, before the nation
 * simulation (so trade sees this month's treaties). Idempotent enough: relations
 * are only stepped when their updated_arc is older than this month.
 */
export async function stepDiplomacy(trx: any, arc: number): Promise<void> {
  const states = await trx('pol_states').whereIn('code', CODES).where({ is_active: true });
  const avgTariff: Record<string, number> = {};
  for (const s of states) {
    const r = tariffRates(await getLawsInForce(trx, s.id));
    avgTariff[s.code] = TRADABLE_SECTORS.reduce((a, k) => a + (r[k] ?? 0), 0) / TRADABLE_SECTORS.length;
  }
  const active = await trx('nation_treaties').where({ status: 'active' });
  const existing = await trx('nation_relations').select('*');
  for (let i = 0; i < states.length; i++) {
    for (let j = i + 1; j < states.length; j++) {
      const [a, b] = D.pairKey(states[i].code, states[j].code);
      const row = existing.find((r: any) => r.state_a === a && r.state_b === b);
      if (row && num(row.updated_arc) >= arc) continue;
      const score = D.stepRelations({
        score: row ? num(row.score) : RELATIONS_START,
        active: active.filter((t: any) => involves(t, a, b)).map((t: any) => t.kind),
        tariffA: avgTariff[a] ?? 0, tariffB: avgTariff[b] ?? 0,
      });
      await setRelations(trx, a, b, score, arc);
    }
  }

  // Computer-led governments (no player holds the top office) may propose something.
  const rel = await relationsMap(trx);
  const all = await trx('nation_treaties').whereIn('status', ['active', 'proposed', 'rejected']);
  for (const s of states) {
    const premier = await trx('pol_offices').where({ state_id: s.id, office: 'premier' }).orderBy('since_arc', 'desc').first();
    if (premier?.holder_character_id) continue;
    if (all.some((t: any) => t.status === 'proposed' && t.from_code === s.code)) continue;
    if (seededUnit(`npctreaty|${s.code}|${arc}`) >= NPC_TREATY_CHANCE) continue;
    const gov = await getGovernment(trx, s.id);
    if (!gov.leadPartyId) continue;
    const lead = await trx('pol_parties').where({ id: gov.leadPartyId }).first();
    const candidates: D.NpcCandidate[] = [];
    for (const o of states) {
      if (o.code === s.code) continue;
      const between = all.filter((t: any) => involves(t, s.code, o.code));
      const og = await getGovernment(trx, o.id);
      candidates.push({
        partner: o.code, relations: relOf(rel, s.code, o.code),
        activeOrPending: between.filter((t: any) => t.status !== 'rejected').map((t: any) => t.kind),
        coolingDown: between.filter((t: any) => t.status === 'rejected' && arc - num(t.resolved_arc) < TREATY_REJECT_COOLDOWN).map((t: any) => t.kind),
        partnerHasGovernment: !!og.leadPartyId,
      });
    }
    const pick = D.npcTreatyChoice(json(lead?.platform), candidates);
    if (!pick) continue;
    try {
      await trx.transaction(async (sp: any) => createTreaty(sp, pick.kind, s.code, pick.partner, arc, null, `The ${lead.name} government`));
    } catch (err) {
      if (!(err instanceof AppError)) throw err; // a rule said no (e.g. nobody to ratify): skip quietly
    }
  }
}

// ─── Read view ──────────────────────────────────────────────────────────────

export interface ForeignView {
  relations: { code: string; name: string; score: number }[];
  treaties: { id: string; kind: TreatyKind; name: string; with: string; withName: string; status: 'active' | 'proposed'; since: number | null; imposedByUs: boolean; awaitingVoteIn: string | null }[];
}

/** Each nation's relations and treaties in force or awaiting a vote. */
export async function foreignViews(conn: any): Promise<Record<string, ForeignView>> {
  const rel = await relationsMap(conn);
  const treaties = await conn('nation_treaties').whereIn('status', ['active', 'proposed']).orderBy('proposed_arc', 'desc');
  const out: Record<string, ForeignView> = {};
  for (const code of CODES) {
    out[code] = {
      relations: CODES.filter(c => c !== code).map(c => ({ code: c, name: nameOf(c), score: relOf(rel, code, c) })),
      treaties: treaties.filter((t: any) => t.from_code === code || t.to_code === code).map((t: any) => {
        const other = t.from_code === code ? t.to_code : t.from_code;
        return {
          id: t.id, kind: t.kind, name: TREATY_SPECS[t.kind as TreatyKind].name, with: other, withName: nameOf(other),
          status: t.status, since: t.started_arc ?? null, imposedByUs: t.kind === 'embargo' && t.from_code === code,
          awaitingVoteIn: t.status === 'proposed' ? nameOf(ratifierOf(t.kind, t.from_code, t.to_code)) : null,
        };
      }),
    };
  }
  return out;
}
