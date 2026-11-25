/**
 * Company goals: tiered targets a car maker always has in front of it once the
 * factory is running (services/businessGoals.rules.ts, tests/businessGoals.test.ts).
 * Every number is measured from real rows (manufacturing data endpoint); nothing
 * here pays out money, so goals never change the economy, only show progress.
 */

export type BusinessGoalKey =
  | 'cars_sold' | 'profit_streak' | 'models' | 'markets' | 'market_share' | 'company_value' | 'own_factory' | 'debt_free';

export interface BusinessGoalSpec {
  key: BusinessGoalKey;
  title: string;
  /** How to read one tier, e.g. "Sell {n} cars". {n} is the tier target. */
  tierLabel: string;
  /** Plain-English hint on how to get there. */
  how: string;
  /** Ascending targets. A one-step goal has a single target of 1. */
  tiers: number[];
  /** How the value is shown: count, %, or money. */
  unit: 'count' | 'percent' | 'money';
  /** Desk tab the "Go" button opens. */
  tab: 'overview' | 'factory' | 'production' | 'design' | 'sales' | 'finance';
}

export const BUSINESS_GOALS: BusinessGoalSpec[] = [
  { key: 'cars_sold', title: 'Cars sold', tierLabel: 'Sell {n} cars in total', how: 'Build more and sell in more markets. Sold-out markets want more cars.', tiers: [100, 1_000, 5_000, 20_000], unit: 'count', tab: 'sales' },
  { key: 'profit_streak', title: 'Profitable months in a row', tierLabel: '{n} profitable months in a row', how: 'Price above cost, keep unsold stock low, and trim staff you do not need.', tiers: [1, 3, 6, 12], unit: 'count', tab: 'finance' },
  { key: 'models', title: 'Cars on sale', tierLabel: '{n} models on sale at once', how: 'Design a second car for a different buyer: a sedan for families, a van for trade.', tiers: [2, 3, 5], unit: 'count', tab: 'design' },
  { key: 'markets', title: 'Markets reached', tierLabel: 'Sell in {n} markets', how: 'Add a standing order in a new market. Local marketing helps a new brand get noticed.', tiers: [3, 5, 8], unit: 'count', tab: 'sales' },
  { key: 'market_share', title: 'Best market share', tierLabel: 'Win {n}% of one market', how: 'Concentrate cars and national marketing on the market your car fits best.', tiers: [10, 25, 40], unit: 'percent', tab: 'sales' },
  { key: 'company_value', title: 'Company value', tierLabel: 'Company worth {n}', how: 'Profits, cars in stock and buildings you own all count. Bank debt counts against you.', tiers: [5_000_000, 25_000_000, 100_000_000], unit: 'money', tab: 'finance' },
  { key: 'own_factory', title: 'Own your factory', tierLabel: 'Own a factory', how: 'Buy land and build. It takes about 7 months but there is no rent.', tiers: [1], unit: 'count', tab: 'factory' },
  { key: 'debt_free', title: 'Debt free', tierLabel: 'No bank debt while running a factory', how: 'Repay the bank from profits. Interest stops when the loan is gone.', tiers: [1], unit: 'count', tab: 'finance' },
];

/** How many goals the desk highlights as "next". */
export const NEXT_GOALS_SHOWN = 3;
