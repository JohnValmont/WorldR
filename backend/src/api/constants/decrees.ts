/**
 * Decrees — what the Premier and ministers can do WITHOUT Parliament
 * (docs/POLITICS_FLOOR.md). One decree per office-holder per month. Each nudges
 * national statistics for SHOCK_MONTHS (constants/floor.ts), capped in total by
 * SHOCK_TOTAL_CAP, and moves the governing party's support with voter groups.
 * Laws remain the lasting lever; decrees are the fast, temporary one.
 * This is DATA: add a decree by adding an entry.
 */
import type { NationalStat } from './macroEconomy';
import type { SegmentKey } from './floor';

export interface Decree {
  key: string;
  /** 'premier', or the cabinet post key (constants/nations.ts CABINET_POSTS) that may issue it. */
  office: 'premier' | 'finance' | 'industry' | 'welfare' | 'interior' | 'defence';
  title: string;
  blurb: string;
  stat: Partial<Record<NationalStat, number>>;
  support?: Partial<Record<SegmentKey | 'all', number>>;
}

/** Energy to issue a decree. */
export const DECREE_AP = 4;

export const DECREES: Decree[] = [
  { key: 'jobs_drive', office: 'premier', title: 'National jobs drive', blurb: 'Public works in every region, paid for by borrowing.',
    stat: { prosperity: 2, fiscal_health: -2 }, support: { industrial_workers: 1.5 } },
  { key: 'emergency_savings', office: 'premier', title: 'Emergency savings order', blurb: 'Freeze departmental spending until the books improve.',
    stat: { fiscal_health: 3, human_development: -1 }, support: { civic_professionals: 1, suburban_families: -1 } },
  { key: 'price_cap', office: 'premier', title: 'Cap fuel and bread prices', blurb: 'Hold shop prices down by order. Producers will complain.',
    stat: { cost_of_living: -2, fiscal_health: -1, prosperity: -1 }, support: { industrial_workers: 1, suburban_families: 1, factory_business_owners: -1.5 } },
  { key: 'order_drive', office: 'premier', title: 'Law and order drive', blurb: 'Police on every corner for a season.',
    stat: { order_safety: 3, freedom_rights: -2 }, support: { suburban_families: 1.5, civic_professionals: -1 } },
  { key: 'diplomatic_tour', office: 'premier', title: 'Diplomatic tour', blurb: 'Visit the neighbouring capitals in person.',
    stat: { global_standing: 3, fiscal_health: -1 } },
  { key: 'tax_amnesty', office: 'finance', title: 'Tax amnesty', blurb: 'Let evaders pay up quietly. The honest will resent it.',
    stat: { fiscal_health: 2, equity: -1 }, support: { factory_business_owners: 1 } },
  { key: 'export_push', office: 'industry', title: 'Export push', blurb: 'Credit and trade missions for exporters.',
    stat: { prosperity: 2, global_standing: 1, cost_of_living: 1 }, support: { logistics_trade_workers: 1.5 } },
  { key: 'clinic_programme', office: 'welfare', title: 'Clinic programme', blurb: 'Open a clinic in every district that lacks one.',
    stat: { human_development: 2, equity: 1, fiscal_health: -2 }, support: { suburban_families: 1, industrial_workers: 1 } },
  { key: 'police_surge', office: 'interior', title: 'Police surge', blurb: 'Cancel leave and flood the streets.',
    stat: { order_safety: 2, freedom_rights: -1 }, support: { suburban_families: 1 } },
  { key: 'defence_review', office: 'defence', title: 'Defence and foreign review', blurb: 'A public review of the forces and the alliances.',
    stat: { global_standing: 2, fiscal_health: -1 } },
];
export const DECREE_BY_KEY: Record<string, Decree> = Object.fromEntries(DECREES.map(d => [d.key, d]));
