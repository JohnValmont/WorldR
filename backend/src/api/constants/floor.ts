/**
 * The Floor — tunable numbers for the politics redesign (docs/POLITICS_FLOOR.md).
 *
 * One idea ties the whole game together: SUPPORT, a 0-100 score for how much each
 * of the five voter groups backs each party. Campaigning, laws, promises kept or
 * broken and monthly decisions all move it, and the election engine reads it.
 *
 * AGENTS.md: every tunable number lives in a constants file. Change them here.
 */
import type { NationalStat } from './macroEconomy';

export type SegmentKey =
  | 'industrial_workers'
  | 'logistics_trade_workers'
  | 'factory_business_owners'
  | 'civic_professionals'
  | 'suburban_families';

/** Short names shown to players. */
export const SEGMENT_SHORT: Record<SegmentKey, string> = {
  industrial_workers: 'Workers',
  logistics_trade_workers: 'Traders',
  factory_business_owners: 'Owners',
  civic_professionals: 'Professionals',
  suburban_families: 'Families',
};

// ─── Support ────────────────────────────────────────────────────────────────
// A party's natural support in a voter group comes from how well its platform
// fits that group: target = BASE + RANGE x fit (fit is 0..1 from the election
// engine's computeFit). Whatever players add or lose on top fades back toward
// that target by REVERT_RATE of the gap each month.
//
// Modelled: a player spending 10 of 12 energy on rallies across all five groups
// gains 2.5 a month in each; with 12% reversion that settles about +21 above
// target (2.5 / 0.12). Six rallies on one group settle about +50 there.
export const SUPPORT_BASE = 35;
export const SUPPORT_FIT_RANGE = 40;
export const SUPPORT_REVERT_RATE = 0.12;
export const SUPPORT_MIN = 0;
export const SUPPORT_MAX = 100;
/**
 * Support -> campaign effort in the election engine (effort feeds "reach").
 * 0.4 means 50 support = 20 effort, on top of the 15-effort party machine.
 * +21 support is about +14% votes in that group; +50 is about +31%.
 */
export const SUPPORT_EFFORT_PER_POINT = 0.4;

// ─── Desk actions (cost energy = AP) ────────────────────────────────────────
export const RALLY_AP = 2;
export const RALLY_GAIN = 2.5;
/** Each repeat rally in the same group in the same month is worth this share of the last. */
export const RALLY_REPEAT_DECAY = 0.6;
/** Rallies count for more once the campaign has officially started. */
export const RALLY_CAMPAIGN_MULT = 1.5;

export const AD_AP = 1;
export const AD_COST = 20_000;        // from the party's funds
export const AD_GAIN = 1.5;           // in every voter group
export const AD_REPEAT_DECAY = 0.7;

export const FUNDRAISE_AP = 1;
export const FUNDRAISE_BASE = 8_000;
export const FUNDRAISE_REPEAT_DECAY = 0.7;
/** Luck on the night: the take is multiplied by a roll between these. */
export const FUNDRAISE_ROLL_MIN = 0.5;
export const FUNDRAISE_ROLL_MAX = 1.8;

/** Charisma 0 -> x0.7, charisma 100 -> x1.3 on rallies and fundraisers. */
export const CHARISMA_MULT_MIN = 0.7;
export const CHARISMA_MULT_MAX = 1.3;

// ─── Laws move voters ───────────────────────────────────────────────────────
// When a bill passes, each voter group judges it (the same liking score parties
// use). Parties that voted for it gain liking x SCALE support in that group
// (capped), parties that voted against lose half of that.
export const LAW_SUPPORT_SCALE = 8;
export const LAW_SUPPORT_CAP = 5;
export const LAW_OPPONENT_SHARE = 0.5;
/** A bill that fails still earns its proposer this share with the groups that wanted it. */
export const LAW_FAILED_PROPOSER_SHARE = 0.4;

// ─── Individual votes ───────────────────────────────────────────────────────
/** An MP who votes against their own party's line. */
export const REBEL_CLOUT = -3;
export const REBEL_TRUST = 1;

// ─── Pacts and favours ──────────────────────────────────────────────────────
export const PACT_AP = 2;
/** How much an IOU from you is worth to another party, in "liking" points (-1..+1 scale). */
export const PACT_FAVOUR_VALUE = 0.30;
/** A donation to their party funds buys this much liking: $250k per full point, so the $100k cap adds 0.40. */
export const PACT_CASH_PER_POINT = 250_000;
export const PACT_MAX_CASH = 100_000;
/** Your reputation for keeping your word: trust 100 adds this much, trust 0 takes it away. */
export const PACT_TRUST_WEIGHT = 0.30;
/** Each favour you already owe that party makes a new one worth less to them. */
export const PACT_OWED_PENALTY = 0.15;
export const PACT_MAX_OWED_TO_ONE_PARTY = 3;
/** A governing party asked to vote down a government bill wants this much more. */
export const PACT_GOV_LOYALTY = 0.35;
/**
 * A computer-run party calls in a favour on a bill only if it cares this much
 * about the result (its lean toward yes or no, on the same scale as above).
 */
export const FAVOUR_CALL_MIN_LEAN = 0.25;
/** Keeping your word. */
export const WORD_KEPT_TRUST = 2;
export const WORD_KEPT_CLOUT = 2;
/** Breaking it. */
export const WORD_BROKEN_TRUST = -10;
export const WORD_BROKEN_SUPPORT = -3;
/** Computer-run parties refuse pacts with a word-breaker for this many months. */
export const WORD_BROKEN_MONTHS = 12;

// ─── Parties are open ───────────────────────────────────────────────────────
/** After joining a party you cannot join another for this many months. */
export const PARTY_SWITCH_COOLDOWN_MONTHS = 6;
/** Taking over a party's leadership. */
export const LEADERSHIP_AP = 6;
export const LEADERSHIP_MIN_CLOUT = 45;
/** You must have been in the party this many months before you can challenge (no day-one takeovers). */
export const LEADERSHIP_MIN_TENURE_MONTHS = 6;
/** To unseat a human leader you need this much more clout than they have. */
export const LEADERSHIP_MARGIN = 10;
export const LEADERSHIP_FAIL_CLOUT = -5;
// A challenge to a HUMAN leader is a contest, not a click (docs/WORLD_STAGE.md):
// it stays open until the month after next turns (at least 8 real hours), the
// leader is told, and the party's human members vote. Each side starts with its
// clout (the leader also gets LEADERSHIP_MARGIN for holding the job, the
// "party machine"); every ballot adds CONTEST_BALLOT_WEIGHT, doubled for an MP.
// Ties go to the leader.
// Modelled: challenger clout 55 vs leader 50 -> 55 vs 60, the leader holds;
// one member backing the challenger -> 65 vs 60, the challenger wins;
// two MPs backing the leader (+40) outweigh any clout gap. Members decide
// when they turn out; the machine decides when they do not.
export const CONTEST_MONTHS = 1;
export const CONTEST_BALLOT_WEIGHT = 10;
export const CONTEST_MP_BALLOT_MULT = 2;
/** The deposed leader loses this much clout; a beaten challenger loses LEADERSHIP_FAIL_CLOUT. */
export const CONTEST_DEPOSED_CLOUT = -5;

// ─── Monthly hand of situations ─────────────────────────────────────────────
export const HAND_SIZE = 3;
/** A card you were dealt is not dealt again for this many months. */
export const HAND_REPEAT_COOLDOWN_MONTHS = 8;

// ─── Executive decisions nudge the nation ───────────────────────────────────
/** A stat nudge from a Premier's or minister's decision lasts this many months. */
export const SHOCK_MONTHS = 8;
/** All active nudges to one stat together can never move it by more than this. */
export const SHOCK_TOTAL_CAP = 8;

/** Stats where a LOWER number is better for people (used for wording and colours). */
export const LOWER_IS_BETTER: NationalStat[] = ['cost_of_living'];

// ─── Handshakes: personal deals between any two politicians ─────────────────
// Party pacts (above) are leader-to-party. A handshake is person-to-person:
// each side may promise a vote on a bill and/or pay money from their own
// pocket. The game checks every vote promise when that bill is counted.
export const HANDSHAKE_AP = 1;
/** Most money one side can hand over in one handshake. */
export const HANDSHAKE_MAX_CASH = 250_000;
/** Open offers one politician may have waiting at once (stops spam). */
export const HANDSHAKE_MAX_OPEN = 5;
/** Keeping your word in a handshake. Paid at most once per politician per month (no farming between friends). */
export const HANDSHAKE_KEPT_TRUST = 1;
/** Breaking it: same weight as a broken party pact, and it makes the news. */
export const HANDSHAKE_BROKEN_TRUST = -10;
export const HANDSHAKE_BROKEN_CLOUT = -3;
export const HANDSHAKE_NOTE_MAX = 240;

// ─── Corridors: who's who and messages ──────────────────────────────────────
/** How many recent votes a politician's profile shows. */
export const PROFILE_RECENT_VOTES = 8;
