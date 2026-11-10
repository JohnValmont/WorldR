/**
 * Real-time length of one game month. Keep in sync with the backend
 * DEFAULT_REAL_SECONDS_PER_MONTH (backend/src/api/constants/world.ts) and
 * migration 0095_four_hour_game_month.sql.
 */
export const REAL_HOURS_PER_GAME_MONTH = 4;

/** "2 months (~8 hours)" style helper for UI copy. */
export function gameMonthsToRealTime(months: number): string {
  const hours = months * REAL_HOURS_PER_GAME_MONTH;
  const monthWord = months === 1 ? 'month' : 'months';
  return `${months} game ${monthWord} (~${hours} real hours)`;
}
