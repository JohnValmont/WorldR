import assert from 'assert';
import {
  computeConditionTargets,
  driftConditions,
  conditionTurnoutMultiplier,
  detectCrises,
  readConditionsFromRow,
  NEUTRAL_CONDITIONS,
  Conditions,
} from '../src/api/services/conditions';
import { Platform, POL_CONDITION_NEUTRAL, POL_CONDITION_TURNOUT_MAX_SWING } from '../src/api/constants/politics';

// Task E — Jurisdiction Conditions (GDD $11 & $16). Pure/deterministic; no DB.
function runTests() {
  console.log('Targets test 1 — no government pulls toward neutral...');
  {
    const t = computeConditionTargets(null);
    for (const k of Object.keys(NEUTRAL_CONDITIONS) as (keyof Conditions)[]) {
      assert(t[k] === POL_CONDITION_NEUTRAL, `${k} should be neutral, got ${t[k]}`);
    }
  }

  console.log('Targets test 2 — statist/worker-first/protectionist policy shifts as designed...');
  {
    // taxation 20 (generous) · labour 80 (worker-first) · investment 80 (state-run)
    // · trade 20 (closed/protected) · stability 80 (law & order)
    const platform: Platform = { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 80 };
    const t = computeConditionTargets(platform);
    // Jobs pushed hard up; prosperity down; budget strained; order up.
    assert(t.jobs >= 8, `jobs should be high, got ${t.jobs}`);
    assert(t.prosperity <= 3, `prosperity should be low, got ${t.prosperity}`);
    assert(t.budget <= 3, `budget should be strained, got ${t.budget}`);
    assert(t.order >= 6, `order should be elevated, got ${t.order}`);
    // Everything stays within the 0–10 band.
    for (const k of Object.keys(t) as (keyof Conditions)[]) {
      assert(t[k] >= 0 && t[k] <= 10, `${k} out of band: ${t[k]}`);
    }
  }

  console.log('Targets test 3 — mid rungs (balanced platform) leave conditions neutral...');
  {
    const balanced: Platform = { taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50 };
    const t = computeConditionTargets(balanced);
    for (const k of Object.keys(t) as (keyof Conditions)[]) {
      assert(t[k] === POL_CONDITION_NEUTRAL, `${k} should stay neutral for a balanced platform, got ${t[k]}`);
    }
  }

  console.log('Drift test 1 — moves partway toward target, never overshoots...');
  {
    const current = { ...NEUTRAL_CONDITIONS };
    const targets: Conditions = { prosperity: 2, jobs: 10, order: 7, cohesion: 6, budget: 3 };
    const next = driftConditions(current, targets);
    assert(next.jobs > current.jobs && next.jobs < targets.jobs, `jobs should move up but not overshoot: ${next.jobs}`);
    assert(next.prosperity < current.prosperity && next.prosperity > targets.prosperity, `prosperity should move down but not overshoot: ${next.prosperity}`);
  }

  console.log('Drift test 2 — repeated drift converges toward the target...');
  {
    let c: Conditions = { ...NEUTRAL_CONDITIONS };
    const targets: Conditions = { prosperity: 2, jobs: 10, order: 7, cohesion: 6, budget: 3 };
    for (let i = 0; i < 40; i++) c = driftConditions(c, targets);
    for (const k of Object.keys(targets) as (keyof Conditions)[]) {
      assert(Math.abs(c[k] - targets[k]) < 0.05, `${k} should converge to target: ${c[k]} vs ${targets[k]}`);
    }
  }

  console.log('Turnout test 1 — Workers turn out less when Jobs are low, more when high...');
  {
    const lowJobs: Conditions = { ...NEUTRAL_CONDITIONS, jobs: 0 };
    const highJobs: Conditions = { ...NEUTRAL_CONDITIONS, jobs: 10 };
    const mLow = conditionTurnoutMultiplier('industrial_workers', lowJobs);
    const mHigh = conditionTurnoutMultiplier('industrial_workers', highJobs);
    assert(mLow < 1.0, `low jobs should depress worker turnout, got ${mLow}`);
    assert(mHigh > 1.0, `high jobs should lift worker turnout, got ${mHigh}`);
  }

  console.log('Turnout test 2 — no conditions or unknown bloc returns 1.0; swing is clamped...');
  {
    assert(conditionTurnoutMultiplier('industrial_workers', null) === 1.0, 'null conditions must be neutral');
    assert(conditionTurnoutMultiplier('unknown_bloc', { ...NEUTRAL_CONDITIONS, jobs: 0 }) === 1.0, 'unknown bloc must be neutral');
    const extreme: Conditions = { prosperity: 10, jobs: 10, order: 10, cohesion: 10, budget: 10 };
    const m = conditionTurnoutMultiplier('industrial_workers', extreme);
    assert(m <= 1 + POL_CONDITION_TURNOUT_MAX_SWING + 1e-9, `swing must be clamped, got ${m}`);
  }

  console.log('Crisis test 1 — low indicators trigger the right crises...');
  {
    const broke: Conditions = { prosperity: 5, jobs: 2, order: 5, cohesion: 5, budget: 2 };
    const active = detectCrises(broke);
    assert(active.includes('crisis_debt'), 'low budget should trigger debt crisis');
    assert(active.includes('crisis_jobs'), 'low jobs should trigger civil unrest');
    assert(!active.includes('crisis_order'), 'order is healthy, no unrest crisis');
    assert(!active.includes('crisis_cohesion'), 'cohesion is healthy, no extremism crisis');
  }

  console.log('Crisis test 2 — healthy conditions trigger nothing...');
  {
    assert(detectCrises(NEUTRAL_CONDITIONS).length === 0, 'neutral conditions should be crisis-free');
  }

  console.log('Row test — readConditionsFromRow parses NUMERIC strings and defaults...');
  {
    const row = { cond_prosperity: '7.50', cond_jobs: '4.00', cond_order: '5.00', cond_cohesion: '5.00', cond_budget: '2.00' };
    const c = readConditionsFromRow(row);
    assert(c.prosperity === 7.5 && c.jobs === 4 && c.budget === 2, `parsed wrong: ${JSON.stringify(c)}`);
    const fallback = readConditionsFromRow(null);
    assert(fallback.prosperity === POL_CONDITION_NEUTRAL, 'missing row should default to neutral');
  }

  console.log('Determinism test — same input, same output...');
  {
    const platform: Platform = { taxation: 20, labour: 80, investment: 80, trade: 20, stability: 80 };
    const a = JSON.stringify(computeConditionTargets(platform));
    const b = JSON.stringify(computeConditionTargets(platform));
    assert(a === b, 'condition targets must be deterministic');
  }

  console.log('All jurisdiction conditions tests passed!');
}

runTests();
