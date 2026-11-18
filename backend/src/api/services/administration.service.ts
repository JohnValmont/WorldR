/**
 * Administrations (docs/NATIONS_SIMULATION.md, "Administrations").
 *
 * Every nation is always governed by someone: the government that commands
 * Parliament, or, while none does, a caretaker government led by the head of
 * state. Each administration is recorded with the nation's numbers when it took
 * office and when it left, so anyone can see who ruled when and what changed.
 *
 * Written ONLY by syncAdministrations, once per politics month from
 * runPoliticsTick in its own savepoint. Read-only for elections, votes, deals,
 * support and approval: it only summarises numbers that already exist.
 */
import {
  ADMINISTRATION_LAWS_SHOWN, CHRONICLE_ADMINISTRATIONS, CHRONICLE_MONTHS,
} from '../constants/administrations';
import { STARTER_NATIONS, type NationSpec } from '../constants/nations';
import { getElectionOffsetMonths, getJurisdiction, getTermMonthsForState } from '../constants/politics';
import { safeParseJSON } from '../../utils/json';
import {
  administrationChange, administrationName, electionOutlook, monthsInOffice, resolveAdministration, sameAdministration,
  type AdministrationIdentity, type AdministrationSnapshot,
} from './administration.rules';
import { derivePhase } from './politics.service';
import { billTitle, getGovernment, liveApproval } from './statecraft.service';

const num = (v: any): number | null => { if (v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const json = (v: any, d: any) => (v == null ? d : typeof v === 'string' ? safeParseJSON(v) ?? d : v);

async function currentArcOf(conn: any): Promise<number> {
  const clock = await conn('world_clock').first();
  return clock ? Number(clock.pol_current_year ?? 0) * 12 + (Number(clock.pol_current_month ?? 1) - 1) : 0;
}

/** Who governs this nation right now (see resolveAdministration). */
export async function currentIdentity(conn: any, state: any, spec: NationSpec): Promise<AdministrationIdentity> {
  const gov = await getGovernment(conn, state.id);
  const commands = !!gov.leadPartyId && (gov.coalitionStatus === 'formed' || gov.coalitionStatus === 'minority');
  let leadParty = null;
  let premier = null;
  let coalitionPartyNames: string[] = [];
  if (commands) {
    const parties = await conn('pol_parties as p').leftJoin('pol_party_identities as i', 'i.party_id', 'p.id')
      .whereIn('p.id', gov.memberPartyIds).select('p.id', 'p.name', 'i.color', 'i.leader as npc_leader');
    const lead = parties.find((p: any) => p.id === gov.leadPartyId);
    if (lead) {
      leadParty = { id: lead.id, name: lead.name, color: lead.color ?? null, npcLeader: lead.npc_leader && lead.npc_leader !== 'Various' ? lead.npc_leader : null };
      coalitionPartyNames = gov.memberPartyIds.map(id => parties.find((p: any) => p.id === id)?.name).filter(Boolean) as string[];
      const office = await conn('pol_offices').where({ state_id: state.id, office: 'premier' }).whereIn('party_id', gov.memberPartyIds)
        .orderBy('since_arc', 'desc').first();
      if (office?.holder_character_id) {
        const c = await conn('characters').where({ id: office.holder_character_id }).select('id', 'name').first();
        if (c) premier = { characterId: c.id, name: c.name };
      }
    }
  }
  return resolveAdministration({
    headOfState: spec.headOfState, headOfGovernmentTitle: spec.headOfGovernment.title, leadParty, premier, coalitionPartyNames,
  });
}

/** The nation's numbers this month (latest stored month of the nation simulation, plus live approval). */
export async function snapshotOf(conn: any, state: any, arc: number): Promise<AdministrationSnapshot> {
  const m = await conn('nation_sim_months').where({ state_id: state.id }).orderBy('arc', 'desc').first();
  const approval = (await liveApproval(conn, state)).approval;
  return {
    arc,
    rating: num(m?.rating), tier: m?.tier ?? null, gdpYearly: num(m?.gdp_yearly), unemployment: num(m?.unemployment),
    population: num(m?.population), debt: num(m?.debt), approval: approval == null ? null : Math.round(approval * 10) / 10,
  };
}

/**
 * Once a month, after the nations have stepped: keep each nation's open
 * administration current, or close it and open the next one when the
 * government changed. Idempotent within a month.
 */
export async function syncAdministrations(trx: any, arc: number): Promise<void> {
  for (const spec of STARTER_NATIONS) {
    const state = await trx('pol_states').where({ code: spec.polStateCode }).first();
    if (!state) continue;
    const who = await currentIdentity(trx, state, spec);
    const snap = await snapshotOf(trx, state, arc);
    const open = await trx('pol_administrations').where({ state_id: state.id }).whereNull('end_arc').forUpdate().first();
    if (open && sameAdministration(rowIdentity(open), who)) {
      await trx('pol_administrations').where({ id: open.id }).update({ end_snapshot: JSON.stringify(snap), coalition: JSON.stringify(who.coalition) });
      continue;
    }
    if (open) await trx('pol_administrations').where({ id: open.id }).update({ end_arc: arc, end_snapshot: JSON.stringify(snap) });
    // A head's earlier separate governments of the same kind make this one their "Second ...".
    const earlier = await trx('pol_administrations').where({ state_id: state.id, kind: who.kind })
      .modify((q: any) => (who.headCharacterId ? q.where('head_character_id', who.headCharacterId) : q.where('head_name', who.headName)))
      .count('* as n').first();
    const termNumber = Number(earlier?.n ?? 0) + 1;
    await trx('pol_administrations').insert({
      state_id: state.id, kind: who.kind, name: administrationName(who.kind, who.headName, termNumber),
      head_name: who.headName, head_title: who.headTitle, head_character_id: who.headCharacterId,
      party_id: who.partyId, party_name: who.partyName, party_color: who.partyColor, coalition: JSON.stringify(who.coalition),
      term_number: termNumber, start_arc: arc, end_arc: null,
      start_snapshot: JSON.stringify(snap), end_snapshot: JSON.stringify(snap),
    });
  }
}

function rowIdentity(r: any): AdministrationIdentity {
  return {
    kind: r.kind, headName: r.head_name, headTitle: r.head_title, headCharacterId: r.head_character_id ?? null,
    partyId: r.party_id ?? null, partyName: r.party_name ?? null, partyColor: r.party_color ?? null, coalition: json(r.coalition, []),
  };
}

function lawTitle(bill: any): string {
  const p = json(bill.params, {});
  return p?.category ? billTitle(p.category, p.option) : String(bill.type ?? 'Bill').replace(/_/g, ' ');
}

/** When the next election is, for one nation. */
async function electionFor(conn: any, state: any, arc: number) {
  const cycle = await conn('pol_cycles').where({ state_id: state.id, status: 'open' }).first();
  if (!cycle) return null;
  const pollingArc = Number(cycle.polling_arc);
  const formationEndArc = Number(cycle.formation_end_arc);
  const firstTermCut = Number(cycle.cycle_number) === 1 && getJurisdiction(state.code).tier === 'national' ? getElectionOffsetMonths(state.code) : 0;
  const out = electionOutlook({
    arc, phase: derivePhase({ polling_arc: pollingArc, formation_end_arc: formationEndArc }, arc),
    pollingArc, formationEndArc, termMonths: getTermMonthsForState(state.code), firstTermCut,
  });
  return { ...out, cycleNumber: Number(cycle.cycle_number), lastElectionArc: out.phase === 'formation' ? pollingArc : null };
}

export interface ChronicleAdministration {
  id: string | null; kind: 'elected' | 'caretaker'; name: string; headName: string; headTitle: string; isPlayer: boolean;
  partyName: string | null; partyColor: string | null; coalition: string[]; termNumber: number;
  startArc: number | null; endArc: number | null; months: number; current: boolean;
  start: AdministrationSnapshot | null; end: AdministrationSnapshot | null;
  change: ReturnType<typeof administrationChange> | null;
  laws: { count: number; titles: string[] };
}

/**
 * GET /politics/chronicle: for every nation, the monthly series behind the
 * charts, who governs now, when the next election is, and the record of past
 * administrations. World-wide and read-only.
 */
export async function chronicle(conn: any) {
  const arc = await currentArcOf(conn);
  const since = arc - CHRONICLE_MONTHS;
  const nations = [];
  for (const spec of STARTER_NATIONS) {
    const state = await conn('pol_states').where({ code: spec.polStateCode }).first();
    if (!state) continue;
    const months = await conn('nation_sim_months').where({ state_id: state.id }).where('arc', '>=', since).orderBy('arc', 'asc')
      .select('arc', 'rating', 'tier', 'gdp_yearly', 'unemployment', 'population', 'debt');
    const polls = await conn('pol_poll_snapshots').where({ state_id: state.id }).whereNull('party_id').where('arc', '>=', since).select('arc', 'approval');
    const approvalAt = new Map<number, number>(polls.map((p: any) => [Number(p.arc), Number(p.approval)]));
    const series = months.map((m: any) => ({
      arc: Number(m.arc), rating: num(m.rating), tier: m.tier, gdpYearly: num(m.gdp_yearly), unemployment: num(m.unemployment),
      population: num(m.population), debt: num(m.debt), approval: approvalAt.get(Number(m.arc)) ?? null,
    }));

    const rows = await conn('pol_administrations').where({ state_id: state.id }).orderBy('start_arc', 'desc').limit(CHRONICLE_ADMINISTRATIONS);
    const passed = rows.length
      ? await conn('pol_bills').where({ state_id: state.id, status: 'passed' }).where('resolved_arc', '>=', Math.min(...rows.map((r: any) => Number(r.start_arc))))
        .orderBy('resolved_arc', 'asc').select('type', 'params', 'resolved_arc')
      : [];
    const administrations: ChronicleAdministration[] = rows.map((r: any) => {
      const start = json(r.start_snapshot, null) as AdministrationSnapshot | null;
      const end = json(r.end_snapshot, null) as AdministrationSnapshot | null;
      const endArc = r.end_arc == null ? null : Number(r.end_arc);
      const laws = passed.filter((b: any) => Number(b.resolved_arc) >= Number(r.start_arc) && (endArc == null || Number(b.resolved_arc) < endArc));
      return {
        id: r.id, kind: r.kind, name: r.name, headName: r.head_name, headTitle: r.head_title, isPlayer: !!r.head_character_id,
        partyName: r.party_name ?? null, partyColor: r.party_color ?? null, coalition: json(r.coalition, []), termNumber: Number(r.term_number) || 1,
        startArc: Number(r.start_arc), endArc, months: monthsInOffice(Number(r.start_arc), endArc, arc), current: endArc == null,
        start, end, change: start && end ? administrationChange(start, end) : null,
        laws: { count: laws.length, titles: laws.slice(-ADMINISTRATION_LAWS_SHOWN).reverse().map(lawTitle) },
      };
    });

    // Before the first month closes after this feature ships, nothing is stored yet:
    // show who governs now, without writing anything.
    const who = await currentIdentity(conn, state, spec);
    const open = administrations.find(a => a.current);
    const current: ChronicleAdministration = open && sameAdministration({ ...who }, {
      kind: open.kind, headName: open.headName, headCharacterId: rows.find((r: any) => r.id === open.id)?.head_character_id ?? null,
      partyId: rows.find((r: any) => r.id === open.id)?.party_id ?? null,
    }) ? open : {
      id: null, kind: who.kind, name: administrationName(who.kind, who.headName), headName: who.headName, headTitle: who.headTitle,
      isPlayer: !!who.headCharacterId, partyName: who.partyName, partyColor: who.partyColor, coalition: who.coalition, termNumber: 1,
      startArc: null, endArc: null, months: 0, current: true, start: null, end: null, change: null, laws: { count: 0, titles: [] },
    };

    nations.push({
      code: state.code, countryId: spec.countryId, name: spec.shortName, headOfState: { title: spec.headOfState.title, name: spec.headOfState.name },
      leaderTitle: spec.headOfGovernment.title, termMonths: getTermMonthsForState(state.code),
      series, current, administrations, election: await electionFor(conn, state, arc),
    });
  }
  return { arc, nations };
}

/** Current administration and election outlook for one nation (used by the world rows). */
export async function nationGovernmentSummary(conn: any, state: any, spec: NationSpec, arc: number) {
  const who = await currentIdentity(conn, state, spec);
  const open = await conn('pol_administrations').where({ state_id: state.id }).whereNull('end_arc').first();
  const stored = open && sameAdministration(rowIdentity(open), who) ? open : null;
  return {
    administration: {
      kind: who.kind, name: stored?.name ?? administrationName(who.kind, who.headName), headName: who.headName, headTitle: who.headTitle,
      isPlayer: !!who.headCharacterId, partyName: who.partyName, partyColor: who.partyColor, coalition: who.coalition,
      sinceArc: stored ? Number(stored.start_arc) : null,
    },
    election: await electionFor(conn, state, arc),
  };
}
