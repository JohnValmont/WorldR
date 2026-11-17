/**
 * Character creation: who you were before politics.
 *
 * A new character picks ONE background and spends EDGE_TOKENS on top. Both set
 * the four numbers The Floor actually uses (docs/POLITICS_FLOOR.md):
 *   charisma    -> rallies and fundraisers (x0.7 at 0, x1.3 at 100)
 *   credibility -> "Trust": deals, your district, how voters take your word
 *   influence   -> "Clout": weight among politicians; 45 to lead a party
 *   cash        -> your own money (deals, ads as a member, business)
 * and a HOME voter group whose rallies go further.
 *
 * Balance rule (tests/floor.test.ts enforces it): every background is worth the
 * same BACKGROUND_POINTS, where 1 stat point = 1, CASH_PER_POINT dollars = 1 and
 * a home voter group = HOME_GROUP_POINT_VALUE. Every background has a weakness.
 *
 * The server computes everything from the ids the client sends. Never trust
 * numbers from the client.
 */
import type { SegmentKey } from './floor';

export type BackgroundKey =
  | 'union_organiser'
  | 'harbour_trader'
  | 'factory_heir'
  | 'civil_servant'
  | 'community_leader'
  | 'party_fixer';

export interface Background {
  key: BackgroundKey;
  label: string;
  /** One line, shown on the card. */
  blurb: string;
  /** What it means in play, in plain words. */
  edge: string;
  /** Stat bonuses on top of the base. */
  charisma: number;
  credibility: number;
  influence: number;
  cash: number;
  /** Rallies in this voter group go HOME_GROUP_RALLY_MULT further. null = none. */
  homeGroup: SegmentKey | null;
}

export const BASE_PROFILE = { charisma: 40, credibility: 40, influence: 20, cash: 1_000_000 };

/** 1 point of a background's budget buys this many dollars. */
export const CASH_PER_POINT = 50_000;
/** Every background spends this many points. */
export const BACKGROUND_POINTS = 35;
/** A home voter group is worth this many points. */
export const HOME_GROUP_POINT_VALUE = 5;
/** Rallies in your home voter group gain this much more support. */
export const HOME_GROUP_RALLY_MULT = 1.25;

/** Extra tokens a player spends freely after picking a background. */
export const EDGE_TOKENS = 4;
/** One token buys this much of a stat, or EDGE_CASH dollars. */
export const EDGE_STAT = 5;
export const EDGE_CASH = 250_000;

export const STAT_CAP = 80;

export const BACKGROUNDS: Background[] = [
  {
    key: 'union_organiser', label: 'Union organiser',
    blurb: 'You ran strikes and soup kitchens. Crowds know your face.',
    edge: 'Best speaker in the room. Rallies with workers go furthest. Little money.',
    charisma: 20, credibility: 10, influence: 0, cash: 0, homeGroup: 'industrial_workers',
  },
  {
    key: 'harbour_trader', label: 'Harbour trader',
    blurb: 'Cargo, contracts and a ledger that always balances.',
    edge: 'Deep pockets and friends on the docks. Traders listen to you.',
    charisma: 5, credibility: 0, influence: 5, cash: 1_000_000, homeGroup: 'logistics_trade_workers',
  },
  {
    key: 'factory_heir', label: 'Factory heir',
    blurb: 'Your family name is over the gate of a thousand workers.',
    edge: 'The most money and a seat at business dinners. Owners back you. Voters doubt you.',
    charisma: 0, credibility: -5, influence: 10, cash: 1_250_000, homeGroup: 'factory_business_owners',
  },
  {
    key: 'civil_servant', label: 'Senior civil servant',
    blurb: 'Twenty years writing the laws other people took credit for.',
    edge: 'The most trusted name in politics. Professionals back you. Dull on a stage.',
    charisma: -5, credibility: 25, influence: 10, cash: 0, homeGroup: 'civic_professionals',
  },
  {
    key: 'community_leader', label: 'Community leader',
    blurb: 'Schools, clinics, the flood appeal. You turn up.',
    edge: 'Liked and trusted. Families back you.',
    charisma: 10, credibility: 15, influence: 5, cash: 0, homeGroup: 'suburban_families',
  },
  {
    key: 'party_fixer', label: 'Party fixer',
    blurb: 'You know where the votes are, and who owes whom.',
    edge: 'Starts with the clout to lead a party. No voter group of your own, and people are wary of you.',
    charisma: 5, credibility: -10, influence: 40, cash: 0, homeGroup: null,
  },
];

export const BACKGROUNDS_BY_KEY: Record<string, Background> = Object.fromEntries(BACKGROUNDS.map(b => [b.key, b]));

/**
 * Four questions place a new character on the same five axes as party
 * platforms (0..100). The sign-up page uses them to show which party in each
 * nation fits you best; they are stored on the character.
 */
export type ConvictionAxis = 'taxation' | 'labour' | 'investment' | 'trade' | 'stability';
export const CONVICTION_AXES: ConvictionAxis[] = ['taxation', 'labour', 'investment', 'trade', 'stability'];
