/**
 * Standing for election — pure rules (docs/POLITICS_FLOOR.md, "Your race").
 * When a player may stand or change district, and which districts suit them.
 * No database access here.
 */
import { CHANCE_BANDS } from '../constants/candidacy';
import { MONTHS } from '../utils/calendar';
import { POL_CAMPAIGN_WINDOW_MONTHS, POL_FILING_WINDOW_MONTHS } from '../constants/politics';

/** A politics month as players read it: "May, Year 36". */
export function polArcLabel(arc: number): string {
  return `${MONTHS[((arc % 12) + 12) % 12]}, Year ${Math.floor(arc / 12)}`;
}

export type ElectionPhase = 'governing' | 'filing' | 'campaign' | 'polling' | 'formation';

/** The months an election cycle opens filing, starts the campaign and votes. */
export interface ElectionCalendar { filing: number; campaign: number; polling: number }

/**
 * THE election calendar: every screen, rule and tick reads filing and campaign
 * dates from here. Normally filing opens POL_FILING_WINDOW_MONTHS before the
 * campaign, which starts POL_CAMPAIGN_WINDOW_MONTHS before election day.
 *
 * A cycle that opened closer to its election than that (a nation's founding
 * election, one month after the world starts) would otherwise begin mid-campaign
 * with filing dated before the world existed, and nobody could ever stand in it.
 * Its calendar is compressed instead: filing opens when the cycle opens (at
 * least one month of it), and the rest of the time, if any, is the campaign.
 */
export function electionCalendar(cycle: { polling_arc: unknown; start_arc?: unknown }): ElectionCalendar {
  const polling = Number(cycle.polling_arc) || 0;
  let campaign = polling - POL_CAMPAIGN_WINDOW_MONTHS;
  let filing = campaign - POL_FILING_WINDOW_MONTHS;
  const start = cycle.start_arc == null ? NaN : Number(cycle.start_arc);
  if (Number.isFinite(start) && filing < start && start < polling) {
    const lead = polling - start;
    const share = POL_FILING_WINDOW_MONTHS / (POL_FILING_WINDOW_MONTHS + POL_CAMPAIGN_WINDOW_MONTHS);
    filing = start;
    campaign = start + Math.min(lead, Math.max(1, Math.round(lead * share)));
  }
  return { filing, campaign, polling };
}

/** The phase of an election cycle in month `arc`. */
export function electionPhase(cal: ElectionCalendar, arc: number): ElectionPhase {
  if (arc < cal.filing) return 'governing';
  if (arc < cal.campaign) return 'filing';
  if (arc < cal.polling) return 'campaign';
  if (arc === cal.polling) return 'polling';
  return 'formation';
}

export interface StandWindow {
  /** The Stand / Change district control is usable right now. */
  open: boolean;
  /** Why it is locked (shown when a player clicks it), or null when open. */
  lockReason: string | null;
  /** Short label for the button. */
  action: 'stand' | 'change' | 'locked';
}

/**
 * Filing is the only time to stand or switch districts. Before it, the control
 * is visible but locked with the date it opens; once the campaign starts the
 * districts are fixed until the next election.
 */
export function standWindow(input: {
  phase: ElectionPhase; hasParty: boolean; standing: boolean;
  filingOpens: string; campaignStarts: string; electionDay: string; nextFiling: string | null;
}): StandWindow {
  const { phase, hasParty, standing } = input;
  if (!hasParty) return { open: false, action: 'locked', lockReason: 'Join or found a party first: every candidate stands for a party.' };
  switch (phase) {
    case 'filing':
      return { open: true, action: standing ? 'change' : 'stand', lockReason: null };
    case 'governing':
      return { open: false, action: 'locked', lockReason: `Filing opens in ${input.filingOpens}. You can stand, or change district, until the campaign starts.` };
    case 'campaign':
      return {
        open: false, action: 'locked',
        lockReason: standing
          ? `Districts are fixed once the campaign starts. Campaign where you stand: votes are counted in ${input.electionDay}.`
          : `Filing closed when the campaign started. Your party puts every member without a district up in their best one when the month turns.`,
      };
    case 'polling':
      return { open: false, action: 'locked', lockReason: 'It is election day: the votes are counted when this month turns.' };
    case 'formation':
    default:
      return {
        open: false, action: 'locked',
        lockReason: `The votes are counted and a government is forming.${input.nextFiling ? ` Filing for the next election opens about ${input.nextFiling}.` : ''}`,
      };
  }
}

/** The share of the vote that wins one seat in a district of `seats` seats (D'Hondt, roughly). */
export function seatLine(seats: number): number {
  return 1 / (Math.max(1, Math.round(seats)) + 1);
}

export function chanceBand(ratio: number) {
  return CHANCE_BANDS.find(b => ratio >= b.min) ?? CHANCE_BANDS[CHANCE_BANDS.length - 1];
}

export interface DistrictOption {
  id: string; name: string; region: string | null; seats: number;
  /** Your party's projected share of the vote there (0-1), from the same projection as the polls. */
  partyShare: number;
  /** Seats your party is projected to win there. */
  projectedSeats: number;
  /** Seats your party holds there now. */
  sitting: number;
  /** A party colleague (another player) already stands here. */
  takenBy: string | null;
  mine: boolean;
}

export interface RankedDistrict extends DistrictOption {
  ratio: number; chance: string; tone: 'good' | 'ok' | 'warn' | 'bad'; recommended: boolean; rank: number;
}

/**
 * Districts for your party, best first. The ratio is projected share over the
 * seat line; the recommendation is the best district no colleague holds
 * (your own district counts as yours, not as taken).
 */
export function rankDistricts(options: DistrictOption[]): RankedDistrict[] {
  const scored = options.map(o => {
    const ratio = o.partyShare / seatLine(o.seats);
    const band = chanceBand(ratio);
    return { ...o, ratio, chance: band.label, tone: band.tone, recommended: false, rank: 0 };
  });
  scored.sort((a, b) => b.ratio - a.ratio || b.projectedSeats - a.projectedSeats || a.name.localeCompare(b.name));
  scored.forEach((d, i) => { d.rank = i + 1; });
  const best = scored.find(d => !d.takenBy);
  if (best) best.recommended = true;
  return scored;
}

/** Where to put a member who did not choose: their best district no colleague holds. */
export function draftDistrict(options: DistrictOption[]): DistrictOption | null {
  return rankDistricts(options).find(d => !d.takenBy) ?? null;
}

/**
 * Owner decision (2026-11-19): nobody waits without a district. While there is
 * an election ahead to stand in, an unplaced party member is put up in their
 * party's best open district. During polling and formation the next election
 * has no cycle yet; they are placed the month the new term opens.
 */
export function placesUnfiledMembers(phase: ElectionPhase): boolean {
  return phase === 'governing' || phase === 'filing' || phase === 'campaign';
}

/** What the member is told when their party puts them up in a district. */
export function draftNotice(input: {
  phase: ElectionPhase; partyName: string; districtName: string; partyShare: number;
  filingArc: number; campaignArc: number; pollingArc: number;
}): string {
  const poll = `${Math.round(input.partyShare * 100)}% in today's poll`;
  const where = `${input.partyName} put you up in ${input.districtName}, its best open district for you (${poll}).`;
  if (input.phase === 'campaign') {
    return `Filing has closed and you had not picked a district, so ${where} Campaign there: votes are counted in ${polArcLabel(input.pollingArc)}.`;
  }
  const change = input.phase === 'filing'
    ? `You can change district until ${polArcLabel(input.campaignArc)}.`
    : `You can change district during filing, ${polArcLabel(input.filingArc)} to ${polArcLabel(input.campaignArc - 1)}.`;
  return `You had no district for the next election, so ${where} ${change}`;
}
