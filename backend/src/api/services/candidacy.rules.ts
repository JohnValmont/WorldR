/**
 * Standing for election — pure rules (docs/POLITICS_FLOOR.md, "Your race").
 * When a player may stand or change district, and which districts suit them.
 * No database access here.
 */
import { CHANCE_BANDS } from '../constants/candidacy';
import { MONTHS } from '../utils/calendar';

/** A politics month as players read it: "May, Year 36". */
export function polArcLabel(arc: number): string {
  return `${MONTHS[((arc % 12) + 12) % 12]}, Year ${Math.floor(arc / 12)}`;
}

export type ElectionPhase = 'governing' | 'filing' | 'campaign' | 'polling' | 'formation';

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
