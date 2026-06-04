export type WorldTimeConfig = {
  startingOrbit: number;
  startingArc: number;
  startingMark: number;
  arcsPerOrbit: number;
  marksPerArc: number;
  realSecondsPerArc: number;
};

export const WORLD_TIME_CONFIG: WorldTimeConfig = {
  startingOrbit: 842,
  startingArc: 1,
  startingMark: 1,
  arcsPerOrbit: 12,
  marksPerArc: 30,
  realSecondsPerArc: 86400,
};
