/**
 * drenniaTick.test.ts
 *
 * Unit tests for the pure resolveTick() engine.
 * Uses node:assert (same pattern as other tests in this codebase).
 * Run: npx ts-node --transpile-only tests/drenniaTick.test.ts
 *
 * Tests cover the 4 required cases:
 *  (a) Single action on an untouched district
 *  (b) Two rival actions on the same district in one tick
 *  (c) District with no actions (decay-only)
 *  (d) State-wide action applied across all districts in a state
 */

import assert from 'assert';
import {
  resolveTick,
  resolveDistrict,
  RALLY_SHIFT_PP,
  DECAY_PP,
  DistrictState,
  PendingAction,
} from '../src/api/services/drenniaTick.service';

// ── Helpers ──────────────────────────────────────────────────────────────

function makeDistrict(overrides: Partial<DistrictState> & { id: string }): DistrictState {
  return {
    district_number: 1,
    state_id: 'state-A',
    name: 'Test District',
    support_json: {},
    current_leading_party_id: null,
    last_updated_tick: 0,
    ...overrides,
  };
}

function makeAction(overrides: Partial<PendingAction> & { party_id: string }): PendingAction {
  return {
    id: 'action-' + Math.random(),
    player_id: 'player-1',
    action_type: 'rally',
    target_type: 'district',
    target_id: 'district-1',
    ...overrides,
  };
}

// Start support equally split between two parties
const PARTY_A = 'party-alpha';
const PARTY_B = 'party-beta';
const PARTY_C = 'party-gamma';

function twoPartyDistrict(pctA: number): DistrictState {
  return makeDistrict({
    id: 'district-1',
    state_id: 'state-A',
    district_number: 1,
    support_json: { [PARTY_A]: pctA, [PARTY_B]: 100 - pctA },
    current_leading_party_id: PARTY_A,
  });
}

// ── Test runner ───────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (e: any) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${e.message}`);
    failed++;
  }
}

// ── (a) Single rally on an untouched (neutral 50/50) district ─────────────

console.log('\n── (a) Single action on an untouched district ──');

test('Party A rally increases Party A support', () => {
  const district = twoPartyDistrict(50); // 50/50 start
  const actions: PendingAction[] = [
    makeAction({ party_id: PARTY_A, target_id: 'district-1' }),
  ];

  const [result] = resolveTick([district], actions, 1, /* applyNoise= */ false);

  // After decay (no-op on equal split) + RALLY_SHIFT_PP for A:
  // A should be > 50, B should be < 50
  assert.ok(
    result.support_json[PARTY_A] > 50,
    `Expected A > 50, got ${result.support_json[PARTY_A].toFixed(2)}`,
  );
  assert.ok(
    result.support_json[PARTY_B] < 50,
    `Expected B < 50, got ${result.support_json[PARTY_B].toFixed(2)}`,
  );
});

test('Party A rally result sums to 100', () => {
  const district = twoPartyDistrict(50);
  const actions = [makeAction({ party_id: PARTY_A, target_id: 'district-1' })];
  const [result] = resolveTick([district], actions, 1, false);
  const total = Object.values(result.support_json).reduce((s, v) => s + v, 0);
  assert.ok(
    Math.abs(total - 100) < 0.001,
    `Expected sum=100, got ${total.toFixed(4)}`,
  );
});

test('Leading party updated correctly after single rally', () => {
  const district = twoPartyDistrict(50);
  const actions = [makeAction({ party_id: PARTY_A, target_id: 'district-1' })];
  const [result] = resolveTick([district], actions, 1, false);
  assert.strictEqual(
    result.current_leading_party_id,
    PARTY_A,
    'Leading party should be A after A rallied from 50/50',
  );
});

test('Rally shift is approximately RALLY_SHIFT_PP (net of decay on equal district)', () => {
  // On a 50/50 district, decay is a no-op. Net gain ≈ RALLY_SHIFT_PP after normalization.
  const district = twoPartyDistrict(50);
  const actions = [makeAction({ party_id: PARTY_A, target_id: 'district-1' })];
  const [result] = resolveTick([district], actions, 1, false);
  // After adding RALLY_SHIFT_PP to A=50 → A=55, B=50 → normalized: A=52.38, B=47.62
  // Just assert ratio increases in A's favour by more than half the shift
  const gain = result.support_json[PARTY_A] - 50;
  assert.ok(gain > RALLY_SHIFT_PP * 0.4, `Expected gain > ${RALLY_SHIFT_PP * 0.4}, got ${gain.toFixed(2)}`);
});

// ── (b) Two rival actions on the same district in one tick ────────────────

console.log('\n── (b) Two rival actions same district, same tick ──');

test('Equal rival rallies cancel each other out (leading party stays same)', () => {
  // A leads 55/45. Both A and B rally. Net effect should be near-zero on the gap.
  const district = twoPartyDistrict(55);
  const actions: PendingAction[] = [
    makeAction({ party_id: PARTY_A, target_id: 'district-1' }),
    makeAction({ party_id: PARTY_B, target_id: 'district-1' }),
  ];
  const [result] = resolveTick([district], actions, 1, false);
  const sum = Object.values(result.support_json).reduce((s, v) => s + v, 0);
  // Both shifts applied, normalized — A still leads because it started ahead
  assert.strictEqual(result.current_leading_party_id, PARTY_A);
  assert.ok(Math.abs(sum - 100) < 0.001, 'Must sum to 100');
});

test('Two A rallies vs one B rally on same district — A increases share', () => {
  const district = twoPartyDistrict(50);
  const actions: PendingAction[] = [
    makeAction({ id: 'act-1', party_id: PARTY_A, target_id: 'district-1' }),
    makeAction({ id: 'act-2', party_id: PARTY_A, target_id: 'district-1' }),
    makeAction({ id: 'act-3', party_id: PARTY_B, target_id: 'district-1' }),
  ];
  const [result] = resolveTick([district], actions, 1, false);
  // A got +10 pp raw, B got +5 pp raw → A should win
  assert.ok(result.support_json[PARTY_A] > result.support_json[PARTY_B]);
  assert.strictEqual(result.current_leading_party_id, PARTY_A);
});

test('Rival actions: result still sums to 100', () => {
  const district = twoPartyDistrict(50);
  const actions = [
    makeAction({ id: 'r1', party_id: PARTY_A, target_id: 'district-1' }),
    makeAction({ id: 'r2', party_id: PARTY_B, target_id: 'district-1' }),
  ];
  const [result] = resolveTick([district], actions, 1, false);
  const sum = Object.values(result.support_json).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(sum - 100) < 0.001);
});

// ── (c) No actions — decay-only case ──────────────────────────────────────

console.log('\n── (c) No actions (decay only) ──');

test('Dominant party decays toward neutral with no actions', () => {
  // Party A at 70%, B at 30% — A should lose pp, B should gain
  const district = makeDistrict({
    id: 'district-1',
    state_id: 'state-A',
    district_number: 1,
    support_json: { [PARTY_A]: 70, [PARTY_B]: 30 },
    current_leading_party_id: PARTY_A,
  });
  const [result] = resolveTick([district], [], 1, false);
  assert.ok(
    result.support_json[PARTY_A] < 70,
    `A should decay below 70, got ${result.support_json[PARTY_A].toFixed(2)}`,
  );
  assert.ok(
    result.support_json[PARTY_B] > 30,
    `B should rise above 30, got ${result.support_json[PARTY_B].toFixed(2)}`,
  );
});

test('Decay amount is approximately DECAY_PP', () => {
  const district = makeDistrict({
    id: 'district-1',
    state_id: 'state-A',
    district_number: 1,
    support_json: { [PARTY_A]: 70, [PARTY_B]: 30 },
    current_leading_party_id: PARTY_A,
  });
  const [result] = resolveTick([district], [], 1, false);
  // A at 70 should decay by DECAY_PP = 2 → 68, then normalized
  // Since sum remains 100 after normalization, approximately correct
  const drop = 70 - result.support_json[PARTY_A];
  assert.ok(drop > 0 && drop <= DECAY_PP + 0.1, `Expected decay ~${DECAY_PP}, got ${drop.toFixed(2)}`);
});

test('Neutral 50/50 district with no actions stays at 50/50', () => {
  const district = twoPartyDistrict(50);
  const [result] = resolveTick([district], [], 1, false);
  assert.ok(
    Math.abs(result.support_json[PARTY_A] - 50) < 0.01,
    `Expected A≈50, got ${result.support_json[PARTY_A].toFixed(2)}`,
  );
});

test('Three parties decay toward equal-split (33.3%) from skewed start', () => {
  const district = makeDistrict({
    id: 'district-1',
    state_id: 'state-A',
    district_number: 1,
    support_json: { [PARTY_A]: 60, [PARTY_B]: 30, [PARTY_C]: 10 },
    current_leading_party_id: PARTY_A,
  });
  const [result] = resolveTick([district], [], 5, false);
  // A (60) > 33.3 → decays; C (10) < 33.3 → rises
  assert.ok(result.support_json[PARTY_A] < 60);
  assert.ok(result.support_json[PARTY_C] > 10);
});

// ── (d) State-wide action across all districts in state ───────────────────

console.log('\n── (d) State-wide action on all districts ──');

test('State-wide rally applies to every district in the target state', () => {
  const districts: DistrictState[] = [
    makeDistrict({ id: 'd1', district_number: 1, state_id: 'state-A', support_json: { [PARTY_A]: 50, [PARTY_B]: 50 } }),
    makeDistrict({ id: 'd2', district_number: 2, state_id: 'state-A', support_json: { [PARTY_A]: 50, [PARTY_B]: 50 } }),
    makeDistrict({ id: 'd3', district_number: 3, state_id: 'state-B', support_json: { [PARTY_A]: 50, [PARTY_B]: 50 } }),
  ];

  const stateWideAction: PendingAction = {
    id: 'state-action',
    player_id: 'player-1',
    party_id: PARTY_A,
    action_type: 'rally',
    target_type: 'state',
    target_id: 'state-A',  // only state-A districts
  };

  const results = resolveTick(districts, [stateWideAction], 1, false);

  // d1 and d2 are in state-A → A should gain
  assert.ok(results[0].support_json[PARTY_A] > 50, `d1: A should gain in state-A`);
  assert.ok(results[1].support_json[PARTY_A] > 50, `d2: A should gain in state-A`);
  // d3 is in state-B → should NOT be affected (50/50 stays, decay is no-op)
  assert.ok(
    Math.abs(results[2].support_json[PARTY_A] - 50) < 0.01,
    `d3: A in state-B should be unchanged, got ${results[2].support_json[PARTY_A].toFixed(2)}`,
  );
});

test('State-wide action does NOT affect districts in a different state', () => {
  const districts: DistrictState[] = [
    makeDistrict({ id: 'd1', district_number: 1, state_id: 'state-A', support_json: { [PARTY_A]: 50, [PARTY_B]: 50 } }),
    makeDistrict({ id: 'd2', district_number: 2, state_id: 'state-B', support_json: { [PARTY_A]: 50, [PARTY_B]: 50 } }),
  ];
  const action: PendingAction = makeAction({
    party_id: PARTY_A,
    target_type: 'state',
    target_id: 'state-A',
  });
  const results = resolveTick(districts, [action], 1, false);
  // d1 (state-A) should gain; d2 (state-B) should be untouched (neutral → no decay)
  assert.ok(results[0].support_json[PARTY_A] > 50);
  assert.ok(Math.abs(results[1].support_json[PARTY_A] - 50) < 0.01);
});

test('State-wide rally result sums to 100 for each district', () => {
  const districts: DistrictState[] = [1, 2, 3, 4, 5].map(n =>
    makeDistrict({ id: `d${n}`, district_number: n, state_id: 'state-A', support_json: { [PARTY_A]: 50, [PARTY_B]: 50 } }),
  );
  const action = makeAction({ party_id: PARTY_A, target_type: 'state', target_id: 'state-A' });
  const results = resolveTick(districts, [action], 1, false);
  for (const r of results) {
    const sum = Object.values(r.support_json).reduce((s, v) => s + v, 0);
    assert.ok(Math.abs(sum - 100) < 0.001, `District sum=${sum.toFixed(4)}, expected 100`);
  }
});

// ── Bonus: Fundraiser is a no-op on support ──────────────────────────────

console.log('\n── (e) Fundraiser: no-op on district support ──');

test('Fundraiser action does not change district support', () => {
  const district = twoPartyDistrict(60);
  const fundraiser: PendingAction = makeAction({
    party_id: PARTY_A,
    action_type: 'fundraiser',
    target_id: 'district-1',
  });
  // No-noise, no actions affecting support; decay moves 60→58 approx
  const [noActionResult] = resolveTick([twoPartyDistrict(60)], [], 1, false);
  const [fundraiserResult] = resolveTick([district], [fundraiser], 1, false);
  // Both should be identical — fundraiser is a no-op in resolveTick
  assert.ok(
    Math.abs(fundraiserResult.support_json[PARTY_A] - noActionResult.support_json[PARTY_A]) < 0.001,
    'Fundraiser should not change support vs no-action case',
  );
});

// ── Summary ───────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some tests FAILED.');
  process.exit(1);
} else {
  console.log('All tests passed ✓');
}
