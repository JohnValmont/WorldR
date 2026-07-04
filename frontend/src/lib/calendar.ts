import { WORLD_TIME_CONFIG } from '../config/worldTimeConfig';

/**
 * Game calendar — the single source of truth for turning the world clock into
 * the player-facing "Month, Year" system.
 *
 * The playable era begins in January, Year 0. Everything before it is lore —
 * "The Old Years". Internally the clock is still an (year, month) pair where the
 * era starts at year = WORLD_TIME_CONFIG.startingYear, month = 1; we translate
 * that into an absolute, 1-based month counter and format it.
 */

export const GAME_EPOCH = 1; // absolute-month value of January, Year 0

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Absolute, 1-based month index from a cyclic world clock (year + month, month 1..12). */
export function absoluteMonth(year: number, month: number): number {
  const { startingYear, monthsPerYear } = WORLD_TIME_CONFIG;
  return (year - startingYear) * monthsPerYear + month;
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

/** Format a cyclic world clock (year + month) directly. */
export function formatWorldDate(year: number, month: number): string {
  return formatGameDate(absoluteMonth(year, month));
}

export function formatWorldDateShort(year: number, month: number): string {
  return formatGameDateShort(absoluteMonth(year, month));
}
