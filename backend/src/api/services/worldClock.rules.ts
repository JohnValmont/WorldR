/**
 * World clock rules (pure). The world has two monthly ticks, business and
 * politics, but players see ONE month: both must turn at the same moment.
 * Owner decision 2026-11-18: one game month = 8 real hours on both clocks.
 */

/**
 * When a clock's next month should end, given the other clock's schedule.
 *
 * `ownNext` is the drift-free time this clock would pick on its own
 * (its anchor + one interval). If the other clock's next turn is still ahead
 * and lies within one interval of `ownNext`, this clock joins it, so the two
 * turn together. That pulls them back in step after an admin force-tick or a
 * hand-edited clock, while a clock that is catching up after downtime (its own
 * time is still months behind) keeps catching up month by month.
 */
export function alignedNextClose(args: {
  ownNext: number;
  otherNext: number | null | undefined;
  now: number;
  intervalMs: number;
}): number {
  const { ownNext, otherNext, now, intervalMs } = args;
  if (otherNext == null || !Number.isFinite(otherNext)) return ownNext;
  if (otherNext > now && Math.abs(otherNext - ownNext) < intervalMs) return otherNext;
  return ownNext;
}

/** A timestamp column (Date, ISO string or null) as epoch ms, or null. */
export function clockMs(value: unknown): number | null {
  if (value == null) return null;
  const t = new Date(value as any).getTime();
  return Number.isFinite(t) ? t : null;
}
