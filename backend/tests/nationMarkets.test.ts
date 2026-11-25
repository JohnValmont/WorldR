/**
 * Every starter nation has its own car market (database/seeds/0006_nation_car_markets.sql,
 * NATION_HQ_STATES / hqOptionsFor in constants/nations.ts, NPC_NATION_NAMES in constants/npc.ts).
 * No database needed: the seed file is read as text.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { STARTER_NATIONS, NATION_HQ_STATES, hqOptionsFor, nationCapitalState } from '../src/api/constants/nations';
import { NPC_NATION_NAMES, NPC_ROSTER } from '../src/api/constants/npc';

const ROOT = path.resolve(__dirname, '../..');
const SEED = fs.readFileSync(path.join(ROOT, 'database/seeds/0006_nation_car_markets.sql'), 'utf8');
/** Every migration's and seed's text: Drennia's markets and states come from several of them. */
const ALL_MIGRATIONS_SQL = ['database/migrations', 'database/seeds'].flatMap(dir =>
  fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.sql') && !f.startsWith('0006_nation_car_markets'))
    .map(f => fs.readFileSync(path.join(ROOT, dir, f), 'utf8'))).join('\n');

/** Rows of the _nation_markets VALUES list: [country, src_market, new_market, market_name, new_state, state_name]. */
function seedMarketRows(): string[][] {
  const block = SEED.split('INSERT INTO _nation_markets VALUES')[1].split(';')[0];
  return [...block.matchAll(/\(([^()]*)\)/g)].map(m => [...m[1].matchAll(/'((?:[^']|'')*)'/g)].map(x => x[1]))
    .filter(r => r.length === 6); // skip "(Free Ports)" in comments
}
function seedRivalRows(): string[][] {
  const block = SEED.split('INSERT INTO _nation_rivals VALUES')[1].split(';')[0];
  return [...block.matchAll(/\(([^()]*)\)/g)].map(m => [...m[1].matchAll(/'((?:[^']|'')*)'/g)].map(x => x[1].replace(/''/g, "'")))
    .filter(r => r.length === 5);
}

describe('Each nation has its own car market', () => {
  const others = STARTER_NATIONS.filter(n => n.countryId !== 'drennia');

  it('every non-Drennia nation copies all eight of Drennia\'s markets, once each', () => {
    const rows = seedMarketRows();
    const drenniaMarketCount = rows.filter(r => r[0] === others[0].countryId).length;
    assert.ok(drenniaMarketCount >= 8, 'expected at least 8 markets per nation');
    for (const n of others) {
      const mine = rows.filter(r => r[0] === n.countryId);
      assert.strictEqual(mine.length, drenniaMarketCount, `${n.countryId} has a different number of markets`);
      assert.strictEqual(new Set(mine.map(r => r[1])).size, mine.length, `${n.countryId} copies a Drennia market twice`);
      assert.strictEqual(new Set(mine.map(r => r[2])).size, mine.length, `${n.countryId} reuses a market id`);
    }
    // ...and every market they copy is a real Drennia market.
    for (const r of rows) {
      assert.ok(ALL_MIGRATIONS_SQL.includes(`'${r[1]}'`), `unknown source market ${r[1]}`);
    }
  });

  it('every nation offers one headquarters per region, each a state the game creates', () => {
    const seedStates = new Set(seedMarketRows().map(r => r[4]));
    for (const n of STARTER_NATIONS) {
      const options = hqOptionsFor(n.countryId);
      assert.strictEqual(options.length, n.regions.length, `${n.countryId}: one HQ per region`);
      assert.strictEqual(new Set(options.map(o => o.id)).size, options.length);
      for (const o of options) {
        assert.ok(o.id.startsWith(`${n.countryId}-`), `${o.id} must be a state of ${n.countryId}`);
        if (n.countryId === 'drennia') assert.ok(ALL_MIGRATIONS_SQL.includes(`'${o.id}'`), `${o.id} is not created by any migration or seed`);
        else assert.ok(seedStates.has(o.id), `${o.id} is not created by seed 0006`);
      }
    }
  });

  it('computer-run companies sit in the nation\'s capital region', () => {
    for (const n of STARTER_NATIONS) {
      assert.strictEqual(nationCapitalState(n.countryId), NATION_HQ_STATES[n.countryId][n.regions[0].code]);
    }
    assert.strictEqual(nationCapitalState('nowhere'), 'drennia-drennport');
  });

  it('every nation has the same four kinds of rival car maker, named the same in code and seed', () => {
    const rivals = seedRivalRows();
    for (const n of others) {
      const names = NPC_NATION_NAMES[n.countryId];
      assert.ok(names, `${n.countryId} needs NPC_NATION_NAMES`);
      for (const r of NPC_ROSTER) {
        const row = rivals.find(x => x[0] === n.countryId && x[1] === r.key);
        assert.ok(row, `${n.countryId} has no ${r.key} rival in seed 0006`);
        assert.strictEqual(row![2], names[r.key], `${n.countryId} ${r.key}: seed and NPC_NATION_NAMES disagree`);
        assert.strictEqual(row![4], nationCapitalState(n.countryId), `${n.countryId} ${r.key}: rival HQ is not the capital`);
      }
    }
  });

  it('the seed never deletes or resets anything (seeds run on every boot)', () => {
    assert.ok(!/\bDELETE\b|\bTRUNCATE\b|\bUPDATE\s+\w+\s+SET\b/i.test(SEED));
    assert.ok(!SEED.includes('?'), 'knex raw reads ? as a bind placeholder');
  });
});
