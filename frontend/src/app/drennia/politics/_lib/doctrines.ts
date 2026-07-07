// ─────────────────────────────────────────────────────────
// Doctrine System — Party Identity Data Layer
// ─────────────────────────────────────────────────────────
// Six Doctrines, each auto-setting all 5 platform axes at founding.
// Platform values use the same 20/50/80 numeric scale as PLATFORM_STANCES.
// Do NOT change these values — they must stay in sync with DOCTRINE_PLATFORMS
// in backend/src/api/constants/politics.ts and with the election math.

import type { Axis } from '@/lib/politicsConstants';
import { PLATFORM_STANCES } from './identity';

// ── Types ────────────────────────────────────────────────

export interface Tenet {
  id: string;
  name: string;
  type: 'intensify' | 'broaden';
  description: string;
  /** Segment key the fit bonus targets */
  targetSegment: string;
  /** Flat fit % bonus additive to the election engine's Fit calculation */
  fitBonus: number;
}

export interface SignatureActionDef {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  apCost: number;
}

export interface Doctrine {
  id: string;
  name: string;
  blurb: string;
  /** Lucide icon name or emoji for the card glyph */
  glyph: string;
  /** Numeric platform values for all 5 axes */
  platform: Record<Axis, number>;
  /** Segment keys this doctrine naturally appeals to */
  naturalSegments: string[];
  tenets: [Tenet, Tenet];
  signatureAction: SignatureActionDef;
}

// ── Doctrine Definitions ─────────────────────────────────

export const DOCTRINES: Doctrine[] = [
  {
    id: 'forge_accord',
    name: 'The Forge Accord',
    blurb: 'Industrial populist. Workers first, state investment, protected borders.',
    glyph: '⚒',
    platform: { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 50 },
    naturalSegments: ['industrial_workers'],
    tenets: [
      {
        id: 'forge_radicals',
        name: 'Shop Floor Radicals',
        type: 'intensify',
        description: 'Double down on labour protection. Industrial Workers respond with fiercer loyalty.',
        targetSegment: 'industrial_workers',
        fitBonus: 0.08,
      },
      {
        id: 'forge_modernizers',
        name: 'Factory Modernizers',
        type: 'broaden',
        description: 'Pair labour strength with openness to industrial ownership. Gains ground with Factory & Business Owners.',
        targetSegment: 'factory_business_owners',
        fitBonus: 0.08,
      },
    ],
    signatureAction: {
      id: 'union_address',
      title: 'Union Address',
      subtitle: 'FORGE ACCORD · LABOUR BLOC',
      description: 'A direct address to organised labour. Stronger popularity boost than a standard Statement.',
      apCost: 3,
    },
  },
  {
    id: 'the_ledger',
    name: 'The Ledger',
    blurb: 'Free-market. Cut taxes, shrink the state, open trade, maintain order.',
    glyph: '📒',
    platform: { taxation: 80, labour: 20, investment: 20, trade: 80, stability: 80 },
    naturalSegments: ['factory_business_owners'],
    tenets: [
      {
        id: 'ledger_hardliners',
        name: 'Hard Austerity',
        type: 'intensify',
        description: 'Push austerity further. Signals fiscal credibility to the Boardroom.',
        targetSegment: 'factory_business_owners',
        fitBonus: 0.08,
      },
      {
        id: 'ledger_expansionists',
        name: 'Trade Expansionists',
        type: 'broaden',
        description: 'Frame open markets as opportunity for logistics workers too. Gains reach with Docks & Roads.',
        targetSegment: 'logistics_trade_workers',
        fitBonus: 0.08,
      },
    ],
    signatureAction: {
      id: 'investor_roadshow',
      title: 'Investor Roadshow',
      subtitle: 'THE LEDGER · THE BOARDROOM',
      description: 'Premium fundraising event with a bigger treasury payout, scaled by Charisma.',
      apCost: 2,
    },
  },
  {
    id: 'the_homestead',
    name: 'The Homestead',
    blurb: 'Traditionalist. Balanced books, protected industries, law and order.',
    glyph: '🏡',
    platform: { taxation: 50, labour: 50, investment: 20, trade: 20, stability: 80 },
    naturalSegments: ['suburban_families'],
    tenets: [
      {
        id: 'homestead_roots',
        name: 'Back to Roots',
        type: 'intensify',
        description: 'Lean harder into stability and order. Suburban Families feel represented.',
        targetSegment: 'suburban_families',
        fitBonus: 0.08,
      },
      {
        id: 'homestead_pragmatists',
        name: 'Pragmatic Centre',
        type: 'broaden',
        description: 'A steady hand appeals to Civic Professionals who value institutional reliability.',
        targetSegment: 'civic_professionals',
        fitBonus: 0.08,
      },
    ],
    signatureAction: {
      id: 'town_hall',
      title: 'Town Hall',
      subtitle: 'THE HOMESTEAD · THE COMMUNITY',
      description: 'Open community meeting. Larger stability-linked popularity nudge than a standard Statement.',
      apCost: 2,
    },
  },
  {
    id: 'the_commons',
    name: 'The Commons',
    blurb: 'Worker-first modernizer. Radical redistribution, bold reform, managed trade.',
    glyph: '✊',
    platform: { taxation: 20, labour: 80, investment: 80, trade: 50, stability: 20 },
    naturalSegments: ['industrial_workers', 'civic_professionals'],
    tenets: [
      {
        id: 'commons_vanguard',
        name: 'Reform Vanguard',
        type: 'intensify',
        description: 'Push reform further. Civic Professionals who want institutional change respond strongly.',
        targetSegment: 'civic_professionals',
        fitBonus: 0.08,
      },
      {
        id: 'commons_outreach',
        name: 'Cross-Class Outreach',
        type: 'broaden',
        description: 'Frame public investment as opportunity, not ideology. Pulls in Logistics & Trade Workers.',
        targetSegment: 'logistics_trade_workers',
        fitBonus: 0.08,
      },
    ],
    signatureAction: {
      id: 'shop_floor_tour',
      title: 'Shop Floor Tour',
      subtitle: 'THE COMMONS · THE SHOP FLOOR',
      description: 'Direct engagement with workers. Better odds of recruiting high-Labour-aligned NPC candidates.',
      apCost: 3,
    },
  },
  {
    id: 'the_vanguard',
    name: 'The Vanguard',
    blurb: 'Civic reformer. Open trade, pragmatic investment, bold institutional change.',
    glyph: '🌐',
    platform: { taxation: 50, labour: 50, investment: 50, trade: 80, stability: 20 },
    naturalSegments: ['civic_professionals', 'logistics_trade_workers'],
    tenets: [
      {
        id: 'vanguard_professionals',
        name: 'Professional Class',
        type: 'intensify',
        description: 'Double down on institutional reform. Civic Professionals feel this is their party.',
        targetSegment: 'civic_professionals',
        fitBonus: 0.08,
      },
      {
        id: 'vanguard_traders',
        name: 'Trade First',
        type: 'broaden',
        description: 'Frame open markets as a worker opportunity, not just a business win. Reaches Suburban Families.',
        targetSegment: 'suburban_families',
        fitBonus: 0.08,
      },
    ],
    signatureAction: {
      id: 'listening_tour',
      title: 'Listening Tour',
      subtitle: 'THE VANGUARD · YOUR ELECTORATE',
      description: 'Scout-like action revealing more precise voter segment data for your own electorate.',
      apCost: 2,
    },
  },
  {
    id: 'the_compact',
    name: 'The Compact',
    blurb: 'Deliberate centrist. Balanced on every axis. Defined by record, not rhetoric.',
    glyph: '🤝',
    platform: { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 },
    naturalSegments: [],
    tenets: [
      {
        id: 'compact_builders',
        name: 'Infrastructure First',
        type: 'intensify',
        description: 'Centre your centrist identity on pragmatic investment. Appeals to Civic Professionals.',
        targetSegment: 'civic_professionals',
        fitBonus: 0.06,
      },
      {
        id: 'compact_populists',
        name: 'Household Compact',
        type: 'broaden',
        description: 'A centrist pitch framed around household security. Pulls Suburban Families toward you.',
        targetSegment: 'suburban_families',
        fitBonus: 0.06,
      },
    ],
    signatureAction: {
      id: 'coalition_outreach',
      title: 'Coalition Outreach',
      subtitle: 'THE COMPACT · THE BACKROOM',
      description: 'Discounted Negotiate reflecting built-in flexibility. Cheaper coalition-building.',
      apCost: 1,
    },
  },
];

/** Look up a Doctrine by id, returning undefined if not found. */
export function getDoctrineById(id: string | null | undefined): Doctrine | undefined {
  if (!id) return undefined;
  return DOCTRINES.find((d) => d.id === id);
}

/**
 * Get the stance name for a given axis value using PLATFORM_STANCES.
 * e.g. axis='taxation', value=20 → 'Redistribute & Invest'
 */
export function stanceNameFor(axis: Axis, value: number): string {
  const stances = PLATFORM_STANCES[axis];
  if (value <= 33) return stances[0].name;
  if (value >= 67) return stances[2].name;
  return stances[1].name;
}
