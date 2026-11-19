/**
 * Elections are done only once their seats exist (electionEngine.electionStep).
 * Results without seats used to block the count forever: the nation stayed
 * "forming a government" with no parliament and no error in the log.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { electionStep } from '../src/api/services/electionEngine';

describe('Election step', () => {
  it('counts an election that has not been counted', () => {
    assert.strictEqual(electionStep({ hasSeats: false, hasResults: false }), 'count');
  });
  it('recounts when results exist but no seats were handed out', () => {
    assert.strictEqual(electionStep({ hasSeats: false, hasResults: true }), 'recount');
  });
  it('never counts twice once seats exist', () => {
    assert.strictEqual(electionStep({ hasSeats: true, hasResults: true }), 'done');
    assert.strictEqual(electionStep({ hasSeats: true, hasResults: false }), 'done');
  });
});
