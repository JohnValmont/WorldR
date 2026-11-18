/**
 * Diplomacy: relations between nations and treaties (docs/NATIONS_SIMULATION.md, layer 5).
 *
 * Every tunable number lives here (AGENTS.md). Rules are pure functions in
 * services/diplomacy.rules.ts, tested in tests/diplomacy.test.ts.
 *
 * Treaties are ratified by Parliament through the ordinary bill machinery: a
 * treaty bill has category TREATY_CATEGORY and option "<kind>:<partner code>",
 * so the one vote-counting rule (billVotePlan + tallyBill) decides it, players
 * vote on it in the Chamber, and pacts and favours work on it like any bill.
 */

/** The bill category every treaty bill uses. */
export const TREATY_CATEGORY = 'treaty';

export type TreatyKind = 'trade_pact' | 'defence_pact' | 'embargo';
export const TREATY_KINDS: TreatyKind[] = ['trade_pact', 'defence_pact', 'embargo'];

export interface TreatySpec {
  name: string;
  /** Shown to players: what it does, in one line. */
  blurb: string;
  /**
   * Whose parliament must ratify it. 'partner' = the other nation's parliament
   * (the proposing government already agreed by proposing); 'own' = the
   * proposer's own parliament (an embargo needs nobody else's consent).
   */
  ratifiedBy: 'partner' | 'own';
  /**
   * How parties feel about it from their platform (0-100 axes, 50 neutral):
   * desirability = sum(weight x (axis - 50) / 50) + base. Same scale as a law
   * change (NPC_BILL_MIN_GAIN, NPC_GOV_WHIP in constants/nations.ts).
   */
  liking: { base: number; axes: Record<string, number> };
  /** Relations change when it comes into force, and each month while it lasts. */
  relationsOnStart: number;
  relationsPerMonth: number;
  /** Diplomacy score points for each nation while it lasts. */
  diplomacyBonus: number;
  /** Military score points for each nation while it lasts. */
  militaryBonus: number;
}

export const TREATY_SPECS: Record<TreatyKind, TreatySpec> = {
  trade_pact: {
    name: 'Trade pact',
    blurb: 'No tariffs on farm goods, factory goods or energy between the two nations.',
    ratifiedBy: 'partner',
    liking: { base: 0.05, axes: { trade: 0.40, investment: 0.10 } },
    relationsOnStart: 8, relationsPerMonth: 0.6,
    diplomacyBonus: 3, militaryBonus: 0,
  },
  defence_pact: {
    name: 'Defence pact',
    blurb: 'Each defends the other: both gain military strength and standing.',
    ratifiedBy: 'partner',
    liking: { base: 0.0, axes: { stability: 0.40, labour: -0.10 } },
    relationsOnStart: 10, relationsPerMonth: 0.8,
    diplomacyBonus: 4, militaryBonus: 6,
  },
  embargo: {
    name: 'Embargo',
    blurb: 'No trade at all with that nation, either way. Ends any pact with it.',
    ratifiedBy: 'own',
    liking: { base: -0.25, axes: { trade: -0.35, stability: 0.15 } },
    relationsOnStart: -20, relationsPerMonth: -1.5,
    diplomacyBonus: -4, militaryBonus: 0,
  },
};

// ─── Relations (0-100, 50 = neutral) ───────────────────────────────────────

export const RELATIONS_START = 50;
export const RELATIONS_MIN = 0;
export const RELATIONS_MAX = 100;
/** Each month relations drift this share of the way back toward neutral. */
export const RELATIONS_DRIFT = 0.03;
/** A treaty rejected by the partner's parliament. */
export const RELATIONS_ON_REJECT = -3;
/** A government walks out of a pact. */
export const RELATIONS_ON_WITHDRAW = -10;
/** An embargo lifted. */
export const RELATIONS_ON_LIFT = 5;
/** Per month: a nation whose average tariff is above this sours relations with everyone. */
export const RELATIONS_TARIFF_THRESHOLD = 0.15;
export const RELATIONS_TARIFF_PENALTY = 0.3;

/** Diplomacy pillar = this share of global standing + the rest from average relations, plus treaty bonuses. */
export const DIPLOMACY_STANDING_SHARE = 0.7;

// ─── Rules of the game ──────────────────────────────────────────────────────

/** Energy the head of government spends to propose a treaty or an embargo. */
export const TREATY_AP = 3;
/** After a treaty is rejected, the same kind cannot be proposed to the same nation for this many months. */
export const TREATY_REJECT_COOLDOWN = 6;
/** A pact cannot be proposed while relations are below this. */
export const PACT_MIN_RELATIONS = 25;

/** Under an embargo, goods that cannot be bought count as if under this tariff for shoppers and efficiency. */
export const EMBARGO_EQUIVALENT_TARIFF = 0.5;

// ─── Computer-run governments ───────────────────────────────────────────────

/** Each month a computer-led government with nothing pending proposes its best treaty with this chance. */
export const NPC_TREATY_CHANCE = 0.10;
/** It only proposes something it likes at least this much (same scale as liking above). */
export const NPC_TREATY_MIN_LIKING = 0.05;
/** And only pacts with nations it gets on with at least this well. */
export const NPC_PACT_MIN_RELATIONS = 45;
/** It only embargoes a nation it gets on with worse than this. */
export const NPC_EMBARGO_MAX_RELATIONS = 20;
