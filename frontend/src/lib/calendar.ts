import { WORLD_TIME_CONFIG } from '../config/worldTimeConfig';

/**
 * Game calendar — the single source of truth for turning the world clock into
 * the player-facing "Month, Year" system.
 */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/** Absolute, 1-based month index from a cyclic world clock (year + month, month 1..12). */
export function absoluteMonth(year: number, month: number): number {
  return year * 12 + month;
}

function labelFromAbsolute(absMonth: number | undefined, short: boolean): string {
  if (absMonth === undefined || absMonth === null || Number.isNaN(absMonth)) {
    return short ? 'Unk' : 'Unknown Date';
  }
  
  // Calculate back year and month from absolute month
  // Since absoluteMonth = year * 12 + month, where month is 1..12
  // We subtract 1 from month for 0-based indexing
  const year = Math.floor((absMonth - 1) / 12);
  let month = (absMonth - 1) % 12;
  if (month < 0) month += 12; // Handle negative modulo in JS
  
  if (year < 0) {
    // If year is negative or 0 (which means Year 0 in some DB defaults), just format it normally
    return short
      ? `${MONTHS[month].slice(0, 3)} Yr ${year}`
      : `${MONTHS[month]}, Year ${year}`;
  }
  
  return short
    ? `${MONTHS[month].slice(0, 3)} Yr ${year}`
    : `${MONTHS[month]}, Year ${year}`;
}

/** Format an ABSOLUTE month counter. */
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
