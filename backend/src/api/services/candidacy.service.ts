/**
 * Standing for election (docs/POLITICS_FLOOR.md, "Your race").
 *
 * - Filing is the only time to stand or change district (standWindow).
 * - Each district is ranked for your party with the SAME projection the polls
 *   and the political map use (projectElection + pollParties).
 * - Owner decision (2026-11-19): nobody waits without a district. Whenever there
 *   is an election to stand in (governing, filing or campaign), a party member
 *   who has not chosen is put up in their party's best open district and told
 *   where (draftUnfiledMembers): on joining or founding a party, and at every
 *   month end. They can change district during filing. Nobody is placed in an
 *   arbitrary district.
 *
 * Must NOT import politics.service (it calls draftUnfiledMembers).
 */
import { AppError } from '../../utils/errors';
import { getElectionOffsetMonths, getJurisdiction, getTermMonthsForState, POL_CAMPAIGN_WINDOW_MONTHS, POL_FILING_WINDOW_MONTHS } from '../constants/politics';
import { getNationForPolState } from '../constants/nations';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { getGovernment, liveApproval, pollParties, projectElection } from './statecraft.service';
import { notify } from './notices.service';
import { logger } from '../../utils/logger';
import { draftDistrict, draftNotice, electionCalendar, electionPhase, placesUnfiledMembers, polArcLabel, rankDistricts, standWindow, type DistrictOption, type ElectionPhase } from './candidacy.rules';
import { electionOutlook } from './administration.rules';
import { whereRealUser } from './realPlayers';

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Every district, scored for one party (colleagues' districts marked, `meId`'s own district marked as mine). */
export async function districtOptions(conn: any, state: any, cycleId: string, partyId: string, meId: string | null): Promise<DistrictOption[]> {
  // Independent lookups load side by side.
  const [districts, parties, gov, approval, named] = await Promise.all([
    conn('pol_constituencies').where({ state_id: state.id, is_active: true }).orderBy('name'),
    conn('pol_parties').where({ state_id: state.id }),
    getGovernment(conn, state.id),
    liveApproval(conn, state),
    conn('pol_candidates as pc').leftJoin('characters as c', 'c.id', 'pc.character_id')
      .where({ 'pc.cycle_id': cycleId, 'pc.party_id': partyId, 'pc.is_npc': false }).whereNotNull('pc.character_id')
      .select('pc.constituency_id', 'pc.character_id', 'c.name'),
  ]);
  if (!districts.length) return [];
  const [polled, sittingRows] = await Promise.all([
    pollParties(conn, state.id, parties),
    gov.sittingCycleId
      ? conn('pol_council_seats').where({ cycle_id: gov.sittingCycleId, party_id: partyId }).select('constituency_id').count('* as n').groupBy('constituency_id')
      : Promise.resolve([]),
  ]);
  const proj = projectElection(polled, districts, readNationalStatsFromRow(state), new Set(gov.memberPartyIds), approval.approval);
  const sitting = new Map<string, number>(sittingRows.map((r: any) => [r.constituency_id, num(r.n)]));
  const regionName = new Map<string, string>((getNationForPolState(state.code)?.regions ?? []).map(r => [r.code, r.name]));
  return districts.map((d: any) => {
    const who = named.find((n: any) => n.constituency_id === d.id);
    const p = proj.districts[d.id];
    return {
      id: d.id, name: d.name, region: d.region ? regionName.get(d.region) ?? d.region : null, seats: num(d.seats) || 1,
      partyShare: p?.shares[partyId] ?? 0, projectedSeats: p?.seats[partyId] ?? 0, sitting: sitting.get(d.id) ?? 0,
      takenBy: who && who.character_id !== meId ? (who.name ?? 'A colleague') : null,
      mine: !!who && who.character_id === meId,
    };
  });
}

function phaseOf(cycle: any, arc: number): ElectionPhase {
  return electionPhase(electionCalendar(cycle), arc);
}

function windowFor(state: any, cycle: any, arc: number, hasParty: boolean, standing: boolean) {
  const { filing, campaign, polling } = electionCalendar(cycle);
  const firstCut = num(cycle.cycle_number) === 1 && getJurisdiction(state.code).tier === 'national' ? getElectionOffsetMonths(state.code) : 0;
  const phase = phaseOf(cycle, arc);
  // Screens take election timing from electionOutlook (never a date in the past,
  // even after an overdue count).
  const outlook = electionOutlook({
    arc, phase, pollingArc: polling, formationEndArc: num(cycle.formation_end_arc),
    termMonths: getTermMonthsForState(state.code), firstTermCut: firstCut,
  });
  const nextPolling = outlook.electionArc;
  const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`;
  return {
    phase,
    arcs: {
      filing, campaign, polling,
      formationEnd: outlook.formationEndArc ?? num(cycle.formation_end_arc),
      nextFiling: phase === 'formation' ? nextPolling - POL_CAMPAIGN_WINDOW_MONTHS - POL_FILING_WINDOW_MONTHS : null,
      // The cycle's own filing/campaign/polling dates are long past (an overdue count): screens hide them.
      stale: phase === 'formation' && arc > num(cycle.formation_end_arc),
    },
    window: standWindow({
      phase, hasParty, standing,
      filingOpens: `${polArcLabel(filing)} (${months(Math.max(0, filing - arc))} from now)`,
      campaignStarts: polArcLabel(campaign), electionDay: polArcLabel(polling),
      nextFiling: phase === 'formation' ? polArcLabel(nextPolling - POL_CAMPAIGN_WINDOW_MONTHS - POL_FILING_WINDOW_MONTHS) : null,
    }),
  };
}

/** The player's race, for the Desk: when filing is, where they stand, and how every district looks for their party. */
export async function raceFor(conn: any, state: any, me: { id: string; partyId: string | null }, arc: number) {
  const cycle = await conn('pol_cycles').where({ state_id: state.id, status: 'open' }).first();
  if (!cycle) return null;
  const [mine, options] = await Promise.all([
    conn('pol_candidates').where({ cycle_id: cycle.id, character_id: me.id }).first(),
    me.partyId ? districtOptions(conn, state, cycle.id, me.partyId, me.id) : Promise.resolve([] as DistrictOption[]),
  ]);
  const w = windowFor(state, cycle, arc, !!me.partyId, !!mine);
  const ranked = rankDistricts(options);
  return {
    ...w,
    drafted: !!mine?.drafted,
    myDistrictId: mine?.constituency_id ?? null,
    districts: ranked,
  };
}

/**
 * POST /politics/candidacy: stand in a district, or move to another one, during
 * filing only. Replaces the party's computer placeholder in that district.
 */
export async function standInDistrict(trx: any, state: any, cycle: any, character: any, party: any, constituencyId: string, arc: number) {
  const district = await trx('pol_constituencies').where({ id: constituencyId, state_id: state.id, is_active: true }).first();
  if (!district) throw new AppError('That district is not in your nation.', 400, 'BAD_REQUEST');
  const mine = await trx('pol_candidates').where({ cycle_id: cycle.id, character_id: character.id }).first();
  const w = windowFor(state, cycle, arc, !!party, !!mine);
  if (!w.window.open) throw new AppError(w.window.lockReason ?? 'Filing is closed.', 409, 'FILING_CLOSED');
  if (mine && mine.constituency_id === constituencyId) return { message: `You already stand in ${district.name}.` };

  const there = await trx('pol_candidates').where({ cycle_id: cycle.id, party_id: party.id, constituency_id: constituencyId }).first();
  if (there?.character_id && there.character_id !== character.id) {
    throw new AppError('A party colleague already stands in that district. Pick another, or talk to them.', 409, 'CONFLICT');
  }
  if (there && !there.character_id) await trx('pol_candidates').where({ id: there.id }).del(); // the party's computer placeholder

  if (mine) {
    await trx('pol_candidates').where({ id: mine.id }).update({ constituency_id: constituencyId, drafted: false });
    return { message: `You now stand in ${district.name}. You can change again until ${polArcLabel(w.arcs.campaign)}.` };
  }
  const gov = await getGovernment(trx, state.id);
  const seat = gov.sittingCycleId ? await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: character.id }).first() : null;
  await trx('pol_candidates').insert({
    cycle_id: cycle.id, party_id: party.id, constituency_id: constituencyId, character_id: character.id,
    is_npc: false, platform: typeof party.platform === 'string' ? party.platform : JSON.stringify(party.platform ?? {}), is_incumbent: !!seat, drafted: false,
  });
  return { message: `You are standing in ${district.name}. You can change district until ${polArcLabel(w.arcs.campaign)}.` };
}

/**
 * Every party member with no district for the coming election is put up in
 * their party's best open district, and told (owner decision 2026-11-19: on
 * joining or founding a party, and at every month end; before 2026-11-19 this
 * waited for the campaign). During polling and formation the coming election
 * has no cycle yet, so nothing happens until the new term opens. Idempotent.
 * `onlyCharacterId` limits it to one member (the one who just joined).
 */
export async function draftUnfiledMembers(trx: any, state: any, cycle: any, arc: number, onlyCharacterId?: string): Promise<number> {
  const phase = phaseOf(cycle, arc);
  if (!placesUnfiledMembers(phase)) return 0;
  const q = trx('pol_party_members as m').join('pol_parties as p', 'p.id', 'm.party_id')
    .join('characters as c', 'c.id', 'm.character_id').join('users as u', 'u.id', 'c.user_id')
    .where('p.state_id', state.id).where('c.status', 'active').modify(whereRealUser)
    .select('m.character_id', 'm.party_id', 'p.name as party_name', 'p.platform');
  if (onlyCharacterId) q.where('m.character_id', onlyCharacterId);
  const members = await q;
  if (!members.length) return 0;
  const gov = await getGovernment(trx, state.id);
  const { filing: filingArc, campaign: campaignArc } = electionCalendar(cycle);
  let drafted = 0;
  const optionsByParty = new Map<string, DistrictOption[]>();
  for (const m of members) {
    if (await trx('pol_candidates').where({ cycle_id: cycle.id, character_id: m.character_id }).first()) continue;
    if (!optionsByParty.has(m.party_id)) optionsByParty.set(m.party_id, await districtOptions(trx, state, cycle.id, m.party_id, null));
    const options = optionsByParty.get(m.party_id)!;
    const pick = draftDistrict(options);
    if (!pick) continue;
    // Only the party's computer placeholder makes way, never a person.
    await trx('pol_candidates').where({ cycle_id: cycle.id, party_id: m.party_id, constituency_id: pick.id }).whereNull('character_id').del();
    const seat = gov.sittingCycleId ? await trx('pol_council_seats').where({ cycle_id: gov.sittingCycleId, character_id: m.character_id }).first() : null;
    await trx('pol_candidates').insert({
      cycle_id: cycle.id, party_id: m.party_id, constituency_id: pick.id, character_id: m.character_id, is_npc: false,
      platform: typeof m.platform === 'string' ? m.platform : JSON.stringify(m.platform ?? {}), is_incumbent: !!seat, drafted: true,
    });
    // Mark the district taken in the party's list (draftDistrict returns a copy) so the next member gets another.
    const taken = options.find(o => o.id === pick.id);
    if (taken) taken.takenBy = 'drafted';
    drafted++;
    await notify(trx, m.character_id, arc, 'candidacy', draftNotice({
      phase, partyName: m.party_name, districtName: pick.name, partyShare: pick.partyShare,
      filingArc, campaignArc, pollingArc: num(cycle.polling_arc),
    }), 'desk');
  }
  return drafted;
}

/**
 * A player who just joined or founded a party is put up in its best open
 * district for the coming election (draftUnfiledMembers). Its own savepoint:
 * a failure here never undoes the join.
 */
export async function placeNewMember(trx: any, stateId: string, characterId: string, arc: number): Promise<void> {
  try {
    await trx.transaction(async (sp: any) => {
      const [state, cycle] = await Promise.all([
        sp('pol_states').where({ id: stateId }).first(),
        sp('pol_cycles').where({ state_id: stateId, status: 'open' }).first(),
      ]);
      if (state && cycle) await draftUnfiledMembers(sp, state, cycle, arc, characterId);
    });
  } catch (err) {
    logger.error(`[candidacy] could not place character ${characterId} in a district; they can choose one in filing.`, err);
  }
}
