/**
 * Support — pure rules (docs/POLITICS_FLOOR.md). Kept in its own file, with no
 * imports from the other politics services, so the election code, the polls
 * and the Floor can all use it without circular imports.
 */
import { AXES, Platform, SEGMENTS } from '../constants/politics';
import {
  SUPPORT_BASE, SUPPORT_EFFORT_PER_POINT, SUPPORT_FIT_RANGE, SUPPORT_MAX, SUPPORT_MIN, SUPPORT_REVERT_RATE,
} from '../constants/floor';
import { computeFit } from './electionEngine';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function toPlatform(raw: any): Platform {
  let p = raw;
  if (typeof raw === 'string') { try { p = JSON.parse(raw); } catch { p = {}; } }
  const out = {} as Platform;
  for (const a of AXES) out[a] = Number.isFinite(Number(p?.[a])) ? Number(p[a]) : 50;
  return out;
}

/** Where a party's support in a voter group settles if nobody does anything. */
export function supportTarget(platform: Platform, segmentKey: string): number {
  const seg = SEGMENTS.find(s => s.key === segmentKey);
  if (!seg) return SUPPORT_BASE;
  return SUPPORT_BASE + SUPPORT_FIT_RANGE * computeFit(platform, seg);
}

/** One month of fading back toward the natural level. */
export function driftSupport(score: number, target: number): number {
  return clamp(score + (target - score) * SUPPORT_REVERT_RATE, SUPPORT_MIN, SUPPORT_MAX);
}

export function clampSupport(score: number): number {
  return clamp(score, SUPPORT_MIN, SUPPORT_MAX);
}

/** Support -> campaign effort for the election engine. */
export function supportEffort(score: number): number {
  return SUPPORT_EFFORT_PER_POINT * clamp(score, SUPPORT_MIN, SUPPORT_MAX);
}
