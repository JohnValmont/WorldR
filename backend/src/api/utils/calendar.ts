export const GAME_EPOCH = 1;

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatGameDate(rawArc?: number): string {
  if (rawArc === undefined) return 'Unknown Date';
  if (rawArc < GAME_EPOCH) return 'Old Year';

  const elapsedMonths = rawArc - GAME_EPOCH;
  const year = Math.floor(elapsedMonths / 12);
  const month = elapsedMonths % 12;

  return `${MONTHS[month]}, Year ${year}`;
}
