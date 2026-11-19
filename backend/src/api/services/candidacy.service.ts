/**
 * Standing for election (docs/POLITICS_FLOOR.md, "Your race").
 *
 * - Filing is the only time to stand or change district (standWindow).
 * - Each district is ranked for your party with the SAME projection the polls
 *   and the political map use (projectElection + pollParties).
 * - When the campaign starts, members who never chose are put up in their best
 *   open district and told where (draftUnfiledMembers). Nobody is placed in an
 *   arbitrary district any more.
 *
 * Must NOT import politics.service (it calls draftUnfiledMembers).
 */
import { AppError } from '../../utils/errors';
import { getElectionOffsetMonths, getJurisdiction, getTermMonthsForState, POL_CAMPAIGN_WINDOW_MONTHS, POL_FILING_WINDOW_MONTHS } from '../constants/politics';
import { getNationForPolState } from '../constants/nations';
import { readNationalStatsFromRow } from './nationalEconomy.service';
import { getGovernment, liveApproval, pollParties, projectElection } from './statecraft.service';
import { notify } from './notices.service';
import { draftDistrict, polArcLabel, rankDistricts, standWindow, type DistrictOption, type ElectionPhase } from './candidacy.rules';

const num = (v: any) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** Every district, scored for one party (colleagues' districts marked, `meId`'s own district marked as mine). */
export async function districtOptions(conn: any, state: any, cycleId: string, partyId: string, meId: string | null): Promise<DistrictOption[]> {
  const districts = await conn('pol_constituencies').where({ state_id: state.id, is_active: true }).orderBy('name');
  if (!districts.length) return [];
  const parties = await conn('pol_parties').where({ state_id: state.id });
  const gov = await getGovernment(conn, state.id);
  const proj = projectElection(await pollParties(conn, state.id, parties), districts, readNationalStatsFromRow(state),
    new Set(gov.memberPartyIds), (await liveApproval(conn, state)).approval);
  const named = await conn('pol_candidates as pc').leftJoin('characters as c', 'c.id', 'pc.character_id')
    .where({ 'pc.cycle_id': cycleId, 'pc.party_id': partyId, 'pc.is_npc': false }).whereNotNull('pc.character_id')
    .select('pc.constituency_id', 'pc.character_id', 'c.name');
  const sittingRows = gov.sittingCycleId
    ? await conn('pol_council_seats').where({ cycle_id: gov.sittingCycleId, party_id: partyId }).select('constituency_id').count('* as n').groupBy('constituency_id')
    : [];
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
  const polling = num(cycle.polling_arc);
  const campaign = polling - POL_CAMPAIGN_WINDOW_MONTHS;
  const filing = campaign - POL_FILING_WINDOW_MONTHS;
  if (arc < filing) return 'governing';
  if (arc < campaign) return 'filing';
  if (arc < polling) return 'campaign';
  if (arc === polling) return 'polling';
  return 'formation';
}

function windowFor(state: any, cycle: any, arc: number, hasParty: boolean, standing: boolean) {
  const polling = num(cycle.polling_arc);
  const campaign = polling - POL_CAMPAIGN_WINDOW_MONTHS;
  const filing = campaign - POL_FILING_WINDOW_MONTHS;
  const firstCut = num(cycle.cycle_number) === 1 && getJurisdiction(state.code).tier === 'national' ? getElectionOffsetMonths(state.code) : 0;
  const nextPolling = polling + getTermMonthsForState(state.code) - firstCut;
  const phase = phaseOf(cycle, arc);
  const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`;
  return {
    phase,
    arcs: { filing, campaign, polling, formationEnd: num(cycle.formation_end_arc), nextFiling: phase === 'formation' ? nextPolling - POL_CAMPAIGN_WINDOW_MONTHS - POL_FILING_WINDOW_MONTHS : null },
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
  const mine = await conn('pol_candidates').where({ cycle_id: cycle.id, character_id: me.id }).first();
  const w = windowFor(state, cycle, arc, !!me.partyId, !!mine);
  const ranked = me.partyId ? rankDistricts(await districtOptions(conn, state, cycle.id, me.partyId, me.id)) : [];
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
 * When the campaign is under way: every party member who never chose a district
 * is put up in their best open one, and told. Idempotent.
 */
export async function draftUnfiledMembers(trx: any, state: any, cycle: any, arc: number): Promise<number> {
  const members = await trx('pol_party_members as m').join('pol_parties as p', 'p.id', 'm.party_id')
    .join('characters as c', 'c.id', 'm.character_id').join('users as u', 'u.id', 'c.user_id')
    .where('p.state_id', state.id).where('c.status', 'active').whereNot('u.password_hash', 'no_login_allowed')
    .select('m.character_id', 'm.party_id', 'p.name as party_name', 'p.platform');
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
    await trx('pol_candidates').insert({
      cycle_id: cycle.id, party_id: m.party_id, constituency_id: pick.id, character_id: m.character_id, is_npc: false,
      platform: typeof m.platform === 'string' ? m.platform : JSON.stringify(m.platform ?? {}), is_incumbent: false, drafted: true,
    });
    // Mark the district taken in the party's list (draftDistrict returns a copy) so the next member gets another.
    const taken = options.find(o => o.id === pick.id);
    if (taken) taken.takenBy = 'drafted';
    drafted++;
    await notify(trx, m.character_id, arc, 'candidacy',
      `Filing has closed and you had not picked a district, so ${m.party_name} put you up in ${pick.name}, its best open district for you (${Math.round(pick.partyShare * 100)}% in today's poll). Campaign there: votes are counted in ${polArcLabel(num(cycle.polling_arc))}.`, 'desk');
  }
  return drafted;
}
