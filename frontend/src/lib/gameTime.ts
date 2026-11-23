import build from '../../public/design/build.json';

/**
 * Real-time length of one game month, from public/design/build.json (the static landing
 * pages read the same file). Keep in sync with the backend DEFAULT_REAL_SECONDS_PER_MONTH
 * (backend/src/api/constants/world.ts) and migration 0102_world_stage.sql (8 real hours, both clocks).
 */
export const REAL_HOURS_PER_GAME_MONTH: number = build.realHoursPerGameMonth;

/** "2 months (~8 hours)" style helper for UI copy. */
export function gameMonthsToRealTime(months: number): string {
  const hours = months * REAL_HOURS_PER_GAME_MONTH;
  const monthWord = months === 1 ? 'month' : 'months';
  return `${months} game ${monthWord} (~${hours} real hours)`;
}
