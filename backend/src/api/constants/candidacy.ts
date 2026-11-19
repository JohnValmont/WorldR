/**
 * Standing for election (docs/POLITICS_FLOOR.md, "Your race"). Words and
 * thresholds for the district recommendation. Display only: the real election
 * is counted by electionEngine with the same projection inputs.
 */

/**
 * How a district looks for your party, by "seat line" ratio: the party's
 * projected share there divided by the share that wins one seat (about
 * 1 / (seats + 1) under D'Hondt). 1.0 = right on the line.
 */
export const CHANCE_BANDS: { min: number; label: string; tone: 'good' | 'ok' | 'warn' | 'bad' }[] = [
  { min: 1.3, label: 'Strong', tone: 'good' },
  { min: 1.0, label: 'Likely', tone: 'good' },
  { min: 0.75, label: 'Close', tone: 'warn' },
  { min: 0, label: 'Long shot', tone: 'bad' },
];
