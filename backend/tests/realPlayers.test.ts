/**
 * Public player lists show real players only (services/realPlayers.ts).
 * "DRX Market Maker" belongs to the system account (password_hash
 * 'no_login_allowed') and used to appear on the World page's Operators tab and
 * could top the rich list.
 *
 * SAFETY: this writes rows, so it runs only against a LOCAL database
 * (DATABASE_URL on localhost/127.0.0.1) that is reachable; otherwise it is
 * skipped. It creates two users with their own characters and deletes only
 * those rows. Never point it at production.
 */
import * as assert from 'node:assert';
import { test } from 'node:test';
import { randomUUID } from 'crypto';
import { db } from '../src/config/database';
import { WorldController } from '../src/api/controllers/world.controller';
import { NO_LOGIN_PASSWORD_HASH } from '../src/api/constants/world';

const LOCAL_DB = /@(localhost|127\.0\.0\.1)(:\d+)?\//.test(process.env.DATABASE_URL || '');

/** Calls an Express handler and returns the JSON body (or throws what it passed to next). */
async function call(handler: (req: any, res: any, next: any) => Promise<any>): Promise<any> {
  let body: any; let failure: any;
  const res: any = { status: () => res, json: (b: any) => { body = b; return res; } };
  await handler({ query: {}, params: {} }, res, (e: any) => { failure = e; });
  if (failure) throw failure;
  return body;
}

test('World page lists and the rich list leave out system accounts', async (t) => {
  if (!LOCAL_DB) { t.skip('needs a local test database (DATABASE_URL on localhost)'); await db.destroy(); return; }
  try { await db.raw('select 1'); } catch { t.skip('no local test database is running'); await db.destroy(); return; }

  const instance = await db('world_instances').where({ status: 'active' }).first();
  const country = await db('countries').where({ world_instance_id: instance?.id }).first();
  if (!instance || !country) { t.skip('local database has no active world'); await db.destroy(); return; }

  const tag = randomUUID().slice(0, 8);
  const userIds: number[] = [];
  const charIds: string[] = [];
  const make = async (email: string, hash: string, name: string, cash: number) => {
    const [u] = await db('users').insert({ email, password_hash: hash }).returning('id');
    userIds.push(u.id ?? u);
    const [c] = await db('characters').insert({
      user_id: u.id ?? u, world_instance_id: instance.id, motherland_country_id: country.id,
      name, age: 30, created_at_world_year: 1, created_at_world_month: 1, created_at_world_day: 1,
    }).returning('id');
    charIds.push(c.id ?? c);
    await db('character_finances').insert({ character_id: c.id ?? c, currency_id: 'dollar', cash_in_hand: cash });
    return c.id ?? c;
  };

  try {
    const playerId = await make(`rp-player-${tag}@example.test`, 'x-real-hash', `RP Player ${tag}`, 1_000);
    // A system account far richer than anyone: it would top the rich list if it were not filtered.
    const systemId = await make(`rp-system-${tag}@example.test`, NO_LOGIN_PASSWORD_HASH, `RP System ${tag}`, 1e12);

    const { operators } = await call(WorldController.getOperators);
    const opIds = operators.map((o: any) => o.id);
    assert.ok(opIds.includes(playerId), 'a real player is listed as an operator');
    assert.ok(!opIds.includes(systemId), 'a system account is not an operator');
    assert.ok(!operators.some((o: any) => o.name === 'DRX Market Maker'), 'the DRX market maker is not an operator');

    const real = await db('characters as c').join('users as u', 'u.id', 'c.user_id')
      .where({ 'c.status': 'active', 'c.world_instance_id': instance.id })
      .whereNot('u.password_hash', NO_LOGIN_PASSWORD_HASH).count({ n: '*' }).first();
    assert.strictEqual(operators.length, Number(real?.n), 'the operator count is the number of real players');

    const { richestPlayers } = await call(WorldController.getGlobalLeaderboards);
    const richIds = richestPlayers.map((r: any) => r.id);
    assert.ok(richIds.includes(playerId), 'a real player is on the rich list');
    assert.ok(!richIds.includes(systemId), 'a system account is not on the rich list');
    assert.ok(!richestPlayers.some((r: any) => r.name === 'DRX Market Maker'), 'the DRX market maker is not on the rich list');
  } finally {
    if (charIds.length) {
      await db('character_finances').whereIn('character_id', charIds).del();
      await db('characters').whereIn('id', charIds).del();
    }
    if (userIds.length) await db('users').whereIn('id', userIds).del();
    await db.destroy();
  }
});
