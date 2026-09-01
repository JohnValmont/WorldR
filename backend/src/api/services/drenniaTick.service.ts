/**
 * drenniaTick.service.ts
 *
 * Pure, stateless tick-resolution engine for the Drennia district map game.
 * No database calls — accepts plain data, returns new data.
 * This design makes it trivially unit-testable.
 *
 * ── Mechanics ──────────────────────────────────────────────────────────────
 *  Rally   : +5 pp for the acting party in the target district.
 *  Fundraiser: +200 to party treasury (handled in the DB layer, not here).
 *             In resolveTick, fundraisers are a no-op on district support.
 *  Decay   : Each district drifts 2 pp per tick toward equal-split among
 *             all parties that are currently present in that district.
 *  Multi-action: All rally effects for a district are summed simultaneously
 *             before normalization. No ordering dependency.
 *  Noise   : ±2 pp uniform, seeded by (tickNumber * 31337 + districtIdx)
 *             so tests can reproduce exact values with a fixed seed.
 *  Normalize: After all deltas, values are clamped ≥ 0 and renormalized to
 *             sum exactly to 100.
 */

// ── Types ──────────────────────────────────────────────────────────────────

/** One district's current state as loaded from the DB. */
export interface DistrictState {
  id: string;           // UUID
  district_number: number;
  state_id: string;     // UUID of drennia_states
  name: string;
  support_json: Record<string, number>;   // partyId → pct (sum ≈ 100)
  current_leading_party_id: string | null;
  prev_support_json?: Record<string, number> | null;
  last_updated_tick: number;
}

/** One queued action as loaded from drennia_pending_actions. */
export interface PendingAction {
  id: string;
  player_id: string;
  party_id: string;
  action_type: 'rally' | 'fundraiser';
  target_type: 'district' | 'state';
  /** UUID — district id if target_type=district, state id if target_type=state */
  target_id: string;
}

/** The output shape — mirrors DistrictState but always has prev_support_json set. */
export interface ResolvedDistrictState extends DistrictState {
  prev_support_json: Record<string, number>;
}

// ── Constants (all tunable) ────────────────────────────────────────────────

/** How many percentage points a single rally action shifts support. */
export const RALLY_SHIFT_PP = 5;

/** Decay rate per tick toward equal-split baseline. */
export const DECAY_PP = 2;

/** Maximum noise amplitude (±N pp). */
export const NOISE_AMP_PP = 2;

/** Minimum support any party can have after normalization (prevents zeroing out). */
export const SUPPORT_FLOOR_PP = 0;

/** Support cap per party (no party can monopolize a district). */
export const SUPPORT_CAP_PP = 95;

// ── Deterministic PRNG ────────────────────────────────────────────────────
// A simple mulberry32 seeded RNG so noise is reproducible in tests.

function mulberry32(seed: number) {
  return function (): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Produces a seeded random value in [-1, 1]. */
function seededNoise(tickNumber: number, districtIdx: number): number {
  const seed = (tickNumber * 31337 + districtIdx) >>> 0;
  const rng = mulberry32(seed);
  return rng() * 2 - 1; // map [0,1] → [-1,1]
}

// ── Helper: Normalize a support map to sum exactly to 100 ─────────────────

function normalizeSupport(raw: Record<string, number>): Record<string, number> {
  const entries = Object.entries(raw).map(([k, v]) => [k, Math.max(SUPPORT_FLOOR_PP, v)] as [string, number]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) {
    // Degenerate: all parties at zero — give equal share
    const each = 100 / entries.length;
    return Object.fromEntries(entries.map(([k]) => [k, each]));
  }
  const normalized = Object.fromEntries(
    entries.map(([k, v]) => [k, (v / total) * 100])
  );
  // Apply cap: no party exceeds SUPPORT_CAP_PP — excess redistributed proportionally
  let capped = false;
  for (const k of Object.keys(normalized)) {
    if (normalized[k] > SUPPORT_CAP_PP) {
      normalized[k] = SUPPORT_CAP_PP;
      capped = true;
    }
  }
  if (capped) return normalizeSupport(normalized); // recurse once to redistribute
  return normalized;
}

/** Returns the party_id with the highest support, or null if support_json is empty. */
function leadingParty(support: Record<string, number>): string | null {
  const entries = Object.entries(support);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

// ── Core: resolve a single district ────────────────────────────────────────

/**
 * Resolves one district for a given tick.
 * @param district   Current district state from DB.
 * @param actions    All pending actions targeting this district (already filtered).
 * @param tickNumber Used to seed the noise PRNG.
 * @param districtIdx Index of this district in the resolution batch (noise seed).
 * @param applyNoise  Set false in deterministic unit tests to isolate logic.
 * @returns New support map and leading party id.
 */
export function resolveDistrict(
  district: DistrictState,
  actions: PendingAction[],
  tickNumber: number,
  districtIdx: number,
  applyNoise = true,
): { support_json: Record<string, number>; current_leading_party_id: string | null } {
  // 1. Copy current support
  const support: Record<string, number> = { ...district.support_json };

  // If there are no parties yet (fresh district), start at empty — seed data handles this.
  const partyIds = Object.keys(support);
  if (partyIds.length === 0) {
    return { support_json: {}, current_leading_party_id: null };
  }

  // 2. Apply decay toward equal-split baseline
  const equalShare = 100 / partyIds.length;
  for (const pid of partyIds) {
    const current = support[pid];
    if (current > equalShare) {
      support[pid] = Math.max(equalShare, current - DECAY_PP);
    } else if (current < equalShare) {
      support[pid] = Math.min(equalShare, current + DECAY_PP);
    }
  }

  // 3. Apply rally actions (additive — all applied before normalization)
  for (const action of actions) {
    if (action.action_type !== 'rally') continue;
    if (!Object.prototype.hasOwnProperty.call(support, action.party_id)) {
      // Party not yet in this district — seed them at 0 then apply
      support[action.party_id] = 0;
    }
    support[action.party_id] += RALLY_SHIFT_PP;
  }

  // 4. Apply deterministic noise
  if (applyNoise) {
    const noise = seededNoise(tickNumber, districtIdx) * NOISE_AMP_PP;
    // Noise shifts the leading party and offsets the trailing party
    const sorted = Object.entries(support).sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2) {
      support[sorted[0][0]] += noise;
      support[sorted[1][0]] -= noise;
    }
  }

  // 5. Normalize to 100, enforce floor and cap
  const normalized = normalizeSupport(support);

  return {
    support_json: normalized,
    current_leading_party_id: leadingParty(normalized),
  };
}

// ── Core: resolveTick (the main export) ──────────────────────────────────

/**
 * Resolves a full tick for all districts.
 *
 * @param currentDistricts   All drennia_districts rows (full list).
 * @param pendingActions     All drennia_pending_actions for this tick window.
 * @param tickNumber         Current tick number (for PRNG seeding).
 * @param applyNoise         Set false in tests for determinism. Default true.
 * @returns New array of district states with updated support_json and leading party.
 */
export function resolveTick(
  currentDistricts: DistrictState[],
  pendingActions: PendingAction[],
  tickNumber: number,
  applyNoise = true,
): ResolvedDistrictState[] {
  // Build lookup: stateId → [districtId, ...]
  const stateToDistricts = new Map<string, string[]>();
  for (const d of currentDistricts) {
    const arr = stateToDistricts.get(d.state_id) ?? [];
    arr.push(d.id);
    stateToDistricts.set(d.state_id, arr);
  }

  // Expand state-wide actions into per-district actions
  const expanded: PendingAction[] = [];
  for (const action of pendingActions) {
    if (action.target_type === 'district') {
      expanded.push(action);
    } else {
      // target_type === 'state': fan out to every district in that state
      const districtIds = stateToDistricts.get(action.target_id) ?? [];
      for (const did of districtIds) {
        expanded.push({ ...action, target_type: 'district', target_id: did });
      }
    }
  }

  // Index actions by district_id for O(1) lookup
  const actionsByDistrict = new Map<string, PendingAction[]>();
  for (const action of expanded) {
    const arr = actionsByDistrict.get(action.target_id) ?? [];
    arr.push(action);
    actionsByDistrict.set(action.target_id, arr);
  }

  // Resolve each district
  return currentDistricts.map((district, idx): ResolvedDistrictState => {
    const actions = actionsByDistrict.get(district.id) ?? [];
    const { support_json, current_leading_party_id } = resolveDistrict(
      district,
      actions,
      tickNumber,
      idx,
      applyNoise,
    );
    return {
      ...district,
      prev_support_json: district.support_json,
      support_json,
      current_leading_party_id,
      last_updated_tick: tickNumber,
    };
  });
}
