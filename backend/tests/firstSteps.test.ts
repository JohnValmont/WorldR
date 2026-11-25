/**
 * First steps checklist (services/firstSteps.rules.ts).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FIRST_STEPS, firstSteps, type FirstStepFacts } from '../src/api/services/firstSteps.rules';

const none: FirstStepFacts = { decision: false, party: false, rally: false, vote: false, room: false, company: false };

describe('First steps', () => {
  it('a brand-new player sees every step open, starting with a decision', () => {
    const v = firstSteps(none);
    assert.strictEqual(v.done, 0);
    assert.strictEqual(v.total, FIRST_STEPS.length);
    assert.strictEqual(v.next, 'decision');
    assert.strictEqual(v.complete, false);
  });

  it('the next step is the first one not done, in order', () => {
    assert.strictEqual(firstSteps({ ...none, decision: true, party: true }).next, 'rally');
    assert.strictEqual(firstSteps({ ...none, party: true }).next, 'decision');
  });

  it('all done: complete, so the Desk stops showing the card', () => {
    const all = Object.fromEntries(FIRST_STEPS.map(s => [s.key, true])) as FirstStepFacts;
    const v = firstSteps(all);
    assert.strictEqual(v.complete, true);
    assert.strictEqual(v.next, null);
    assert.strictEqual(v.done, v.total);
  });

  it('every step says why it matters and where to go; keys are unique', () => {
    assert.strictEqual(new Set(FIRST_STEPS.map(s => s.key)).size, FIRST_STEPS.length);
    for (const s of FIRST_STEPS) {
      assert.ok(s.title.length > 0 && s.why.length > 20 && s.cta.length > 0, s.key);
      assert.ok(s.go === null || /^[a-z]+(:[a-z]+)?$/.test(s.go) || s.go.startsWith('/'), `${s.key}: go must be a tab, tab:section or a path`);
    }
    // Player-facing text uses the nation's own words, never "Premier" (AGENTS.md).
    assert.ok(!FIRST_STEPS.some(s => /Premier/.test(s.title + s.why)));
  });
});
