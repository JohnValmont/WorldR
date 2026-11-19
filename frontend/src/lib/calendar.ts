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

function labelFromAbsolute(rawMonth: number | undefined, short: boolean): string {
  const absMonth = Math.round(Number(rawMonth));
  if (rawMonth === undefined || rawMonth === null || !Number.isFinite(absMonth)) {
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

/**
 * Format a POLITICS arc (backend worldClockToArc: year*12 + (month-1), 0-based).
 * formatGameDateShort expects a 1-based month counter, so politics dates passed
 * to it were one month early (arc 0 showed as "Dec Yr -1").
 */
export function formatPolArc(arc?: number | null, short = true): string {
  const n = Math.round(Number(arc));
  if (arc === undefined || arc === null || !Number.isFinite(n)) return short ? 'Unk' : 'Unknown Date';
  // Arcs are whole months. Round so a fractional value (e.g. a chart tick) can never index past MONTHS.
  const year = Math.floor(n / 12);
  const month = ((n % 12) + 12) % 12;
  return short ? `${MONTHS[month].slice(0, 3)} Yr ${year}` : `${MONTHS[month]}, Year ${year}`;
}
