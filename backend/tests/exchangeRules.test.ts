/**
 * The exchange screen tells players the trading rules (guide text, circuit-breaker
 * band). Its numbers live in frontend/src/lib/exchangeRules.ts and must match the
 * ones the server enforces in constants/exchange.ts. The guide once said ±50%
 * while the server refused orders beyond ±20%.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as server from '../src/api/constants/exchange';

const FRONTEND_RULES = fs.readFileSync(path.join(__dirname, '../../frontend/src/lib/exchangeRules.ts'), 'utf8');
const EXCHANGE_PAGE = fs.readFileSync(path.join(__dirname, '../../frontend/src/app/drennia/exchange/page.tsx'), 'utf8');

function frontendNumber(name: string): number {
  const m = FRONTEND_RULES.match(new RegExp(`export const ${name}\\s*=\\s*([0-9_.]+)\\s*;`));
  assert.ok(m, `${name} is exported from frontend/src/lib/exchangeRules.ts`);
  return Number(m![1].replace(/_/g, ''));
}

describe('Exchange rules shown to players match the server', () => {
  for (const name of ['CIRCUIT_BREAKER_LIMIT'] as const) {
    it(`${name} is the same on screen and on the server`, () => {
      assert.equal(frontendNumber(name), server[name]);
    });
  }

  it('the exchange page writes no percentage or band of its own for these rules', () => {
    assert.ok(!/±\s*\d+%/.test(EXCHANGE_PAGE), 'no hard-coded ±N% in page.tsx; use pctText(...) from lib/exchangeRules');
    assert.ok(!/lastClose \* 0\.8|lastClose \* 1\.2/.test(EXCHANGE_PAGE), 'the band uses CIRCUIT_BREAKER_LIMIT');
  });
});
