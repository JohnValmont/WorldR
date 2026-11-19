/**
 * Elections are done only once their seats exist (electionEngine.electionStep).
 * Results without seats used to block the count forever: the nation stayed
 * "forming a government" with no parliament and no error in the log.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { electionStep, lateCountCalendar } from '../src/api/services/electionEngine';
import { POL_FORMATION_WINDOW_MONTHS } from '../src/api/constants/politics';

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

describe('A late count restarts the talks window', () => {
  const due = { polling_arc: 122, formation_end_arc: 122 + POL_FORMATION_WINDOW_MONTHS };
  it('an on-time count leaves the calendar alone', () => {
    assert.strictEqual(lateCountCalendar(due, 122, POL_FORMATION_WINDOW_MONTHS), null);
  });
  it('a count 23 years late is dated the month it happens, with the full window after it', () => {
    const moved = lateCountCalendar(due, 401, POL_FORMATION_WINDOW_MONTHS)!;
    assert.strictEqual(moved.polling_arc, 401);
    assert.strictEqual(moved.formation_end_arc - moved.polling_arc, due.formation_end_arc - due.polling_arc,
      'talks last as long as an on-time election\'s');
    assert.ok(moved.formation_end_arc > 401, 'the deadline is never in the past');
  });
});
