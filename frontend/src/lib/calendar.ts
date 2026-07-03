import { WORLD_TIME_CONFIG } from '../config/worldTimeConfig';

/**
 * Game calendar — the single source of truth for turning the world clock into
 * the player-facing "Month, Year" system.
 *
 * The playable era begins in January, Year 0. Everything before it is lore —
 * "The Old Years". Internally the clock is still an (orbit, arc) pair where the
 * era starts at orbit = WORLD_TIME_CONFIG.startingOrbit, arc = 1; we translate
 * that into an absolute, 1-based month counter and format it.
 */

export const GAME_EPOCH = 1; // absolute-month value of January, Year 0

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Absolute, 1-based month index from a cyclic world clock (orbit + arc, arc 1..12). */
export function absoluteMonth(orbit: number, arc: number): number {
  const { startingOrbit, arcsPerOrbit } = WORLD_TIME_CONFIG;
  return (orbit - startingOrbit) * arcsPerOrbit + arc;
}

function labelFromAbsolute(absMonth: number | undefined, short: boolean): string {
  if (absMonth === undefined || absMonth === null || Number.isNaN(absMonth)) {
    return short ? 'Unk' : 'Unknown Date';
  }
  if (absMonth < GAME_EPOCH) {
    return short ? 'Old Yrs' : 'The Old Years';
  }
  const elapsed = absMonth - GAME_EPOCH;
  const year = Math.floor(elapsed / 12);
  const month = ((elapsed % 12) + 12) % 12;
  return short
    ? `${MONTHS[month].slice(0, 3)} Yr ${year}`
    : `${MONTHS[month]}, Year ${year}`;
}

/** Format an ABSOLUTE month counter (1 = January Year 0). Used by monotonic clocks (e.g. politics). */
export function formatGameDate(absMonth?: number): string {
  return labelFromAbsolute(absMonth, false);
}

export function formatGameDateShort(absMonth?: number): string {
  return labelFromAbsolute(absMonth, true);
}

/** Format a cyclic world clock (orbit + arc) directly. */
export function formatWorldDate(orbit: number, arc: number): string {
  return formatGameDate(absoluteMonth(orbit, arc));
}

export function formatWorldDateShort(orbit: number, arc: number): string {
  return formatGameDateShort(absoluteMonth(orbit, arc));
}
