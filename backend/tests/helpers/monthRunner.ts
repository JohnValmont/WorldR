/**
 * Shared helpers for tests that run whole business months on a scratch
 * database (see scratchDatabase.ts). Import the controller lazily, AFTER the
 * scratch database exists.
 */
import { randomUUID } from 'crypto';
import type { Knex } from 'knex';

/** The game's calendar: 12 months a year (worldTick.service advances 12 -> 1). */
export const MONTHS_PER_YEAR = 12;

/** Month number i (1-based, counted from Year 1 month 1) as a clock position. */
export function clockAt(i: number): { year: number; month: number } {
  return { year: Math.floor((i - 1) / MONTHS_PER_YEAR) + 1, month: ((i - 1) % MONTHS_PER_YEAR) + 1 };
}

/**
 * Sets the world clock to month i and processes that month for the company's
 * nation through the admin endpoint (POST /admin/manufacturing/process-company/:id),
 * the same pipeline the world tick runs. Throws if the month fails or was
 * already processed — a crash must fail the test.
 */
export async function processMonth(db: Knex, companyId: string, i: number): Promise<void> {
  const { ManufacturingController } = await import('../../src/api/controllers/manufacturing.controller');
  const { year, month } = clockAt(i);
  await db('world_clock').update({ current_year: year, current_month: month });

  let failure: unknown;
  let code = 200;
  let body: any;
  const res: any = {
    status(c: number) { code = c; return res; },
    json(b: any) { body = b; return res; },
  };
  await ManufacturingController.processManufacturingArc(
    { params: { companyId } } as any, res, ((err?: unknown) => { failure = err; }) as any,
  );
  if (failure) throw failure;
  if (code >= 400 || !body?.data?.processedCompanies) {
    throw new Error(`Month ${i} (Year ${year}, month ${month}) did not process: ${code} ${JSON.stringify(body)}`);
  }
}

/**
 * Inserts a minimal player-owned car maker in Drennia (user, character,
 * company + finances, one launched model, a factory with one line and one
 * market allocation). Returns the ids. Only for scratch databases.
 */
export async function insertPlayerCarMaker(db: Knex, opts: {
  model: Record<string, unknown>;
  factoryCapacity: number;
  lineTarget: number;
  marketId: string;
  marketingTier: string;
  cash?: number;
}) {
  const country = await db('countries').where({ id: 'drennia' }).first();
  if (!country) throw new Error('scratch database has no Drennia');
  const worldId = country.world_instance_id;
  const created = { created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1 };

  const tag = randomUUID().slice(0, 8);
  const [user] = await db('users').insert({ email: `npc-test-${tag}@example.test`, password_hash: 'x-test' }).returning('id');
  const userId = user.id ?? user;
  const charId = randomUUID();
  const companyId = randomUUID();
  const modelId = randomUUID();
  const factoryId = randomUUID();
  const lineId = randomUUID();

  await db('characters').insert({ id: charId, user_id: userId, world_instance_id: worldId, name: `Test Player ${tag}`, motherland_country_id: country.id, age: 26, ...created });
  await db('companies').insert({
    id: companyId, world_instance_id: worldId, owner_character_id: charId, industry_id: 'manufacturing',
    country_id: country.id, headquarters_state_id: 'drennia-drennport', legal_structure_id: 'private-company',
    currency_id: country.currency_id, name: `Test Player Motors ${tag}`, status: 'active', ...created,
  });
  await db('company_finances').insert({ company_id: companyId, currency_id: country.currency_id, available_cash: opts.cash ?? 50_000_000, debt: 0, company_value: 0, last_arc_profit: 0 });
  await db('manufacturing_vehicle_models').insert({
    id: modelId, company_id: companyId, world_instance_id: worldId, name: 'Test Box',
    platform_type: 'compact_chassis_a', power_unit_type: 'ice_inline_4', drivetrain_type: 'fwd',
    interior_tier: 'standard', safety_tier: 'standard', production_quality: 'standard',
    development_status: 'launched', dev_stage: 'ready_to_launch', status: 'active',
    ...opts.model, ...created,
  });
  await db('manufacturing_factories').insert({
    id: factoryId, company_id: companyId, world_instance_id: worldId, country_id: country.id, state_id: 'drennia-drennport',
    factory_type_id: 'medium-plant', name: 'Test Factory', capacity_per_month: opts.factoryCapacity,
    lease_cost_per_month: 10000, maintenance_cost_per_month: 2000, status: 'active', ...created,
  });
  await db('manufacturing_production_lines').insert({ id: lineId, factory_id: factoryId, company_id: companyId, world_instance_id: worldId, assigned_vehicle_model_id: modelId, target_units_per_month: opts.lineTarget, status: 'active' });
  await db('manufacturing_market_allocations').insert({ company_id: companyId, vehicle_model_id: modelId, world_instance_id: worldId, region_market_id: opts.marketId, units_allocated: opts.lineTarget, marketing_tier: opts.marketingTier });

  return { worldId, countryId: country.id as string, companyId, modelId, factoryId, lineId };
}
