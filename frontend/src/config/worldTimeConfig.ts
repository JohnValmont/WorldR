export type WorldTimeConfig = {
  startingYear: number;
  startingMonth: number;
  startingDay: number;
  monthsPerYear: number;
  daysPerMonth: number;
  realSecondsPerMonth: number;
};

export const WORLD_TIME_CONFIG: WorldTimeConfig = {
  startingYear: 842,
  startingMonth: 1,
  startingDay: 1,
  monthsPerYear: 12,
  daysPerMonth: 30,
  realSecondsPerMonth: 86400,
};
