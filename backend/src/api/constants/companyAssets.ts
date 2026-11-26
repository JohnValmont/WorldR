/**
 * What a company's buildings cost, what they sell for, and how a company is valued.
 *
 * One source for these numbers: the build/scrap endpoints charge them and the
 * book value (services/companyValue.ts) counts them. All prices are multiplied by
 * the state's economic_multiplier (manufacturing_region_markets).
 */

/** Land, per acre. */
export const LAND_COST_PER_ACRE = 1_000_000;
/** A state licence (your HQ state's licence is free). */
export const STATE_LICENSE_COST = 50_000;

/** Building a factory, by factory type. */
export const FACTORY_BUILD_COST: Record<string, number> = {
  'small-workshop': 2_500_000,
  'medium-plant': 8_000_000,
  'large-complex': 25_000_000,
};
/** Acres a factory type needs. */
export const FACTORY_ACRES: Record<string, number> = {
  'small-workshop': 1,
  'medium-plant': 3,
  'large-complex': 10,
};
export const DEFAULT_FACTORY_TYPE = 'small-workshop';
/** Expanding a factory when the country config has no expansion_cost. */
export const DEFAULT_EXPANSION_COST = 500_000;
/** Building one production line. */
export const PRODUCTION_LINE_BUILD_COST = 1_500_000;

/**
 * Leasing a ready-built factory: producing this month, lines included, no land.
 * Rival car makers start in leased plants; before this a player had to buy land,
 * build for 5 months and fit a line for 2 more (about $5M and two real days)
 * before the first car. Rent is charged every month by the business tick
 * (lease_cost_per_month); a signing fee of SIGNING_MONTHS' rent is paid up front.
 * A leased factory is not the company's asset: it adds no book value, can't be
 * expanded, and ending the lease returns nothing.
 * Prices are multiplied by the state's economic_multiplier.
 */
export const FACTORY_LEASE_OPTIONS: Record<string, { monthlyRent: number; label: string }> = {
  'small-workshop': { monthlyRent: 40_000, label: 'Leased workshop' },
  'medium-plant': { monthlyRent: 160_000, label: 'Leased plant' },
};
export const LEASE_SIGNING_MONTHS = 2;

/** Share of the price you get back when you sell land / scrap a building. */
export const LAND_SALVAGE_SHARE = 0.8;
export const BUILDING_SALVAGE_SHARE = 0.3;

/** Bank loan statuses that are still owed (a defaulted loan is still a debt). */
export const OWED_COMPANY_LOAN_STATUSES = ['ACTIVE', 'DEFAULTED'];
export const OWED_PERSONAL_LOAN_STATUSES = ['active', 'defaulted'];

/**
 * Sectors a player can open a company in, and the least starting capital for each.
 * Anything not listed (shipping-logistics, retail, ...) is closed: the server refuses
 * it even if a client sends it. The Start Business screen shows the others locked.
 */
export const OPEN_INDUSTRIES: Record<string, { label: string; minCapital: number }> = {
  manufacturing: { label: 'Car manufacturing', minCapital: 500_000 },
  finance: { label: 'Capital Partners firm', minCapital: 50_000 },
};

/** Limits on a car's sale price and on unit counts typed by players. */
export const MIN_SALE_PRICE = 1_000;
export const MAX_SALE_PRICE = 2_000_000;
export const MAX_UNITS_INPUT = 1_000_000;

export function factoryBuildCost(typeId: string): number {
  return FACTORY_BUILD_COST[typeId] ?? FACTORY_BUILD_COST[DEFAULT_FACTORY_TYPE];
}
export function factoryAcres(typeId: string): number {
  return FACTORY_ACRES[typeId] ?? FACTORY_ACRES[DEFAULT_FACTORY_TYPE];
}
