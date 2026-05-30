// Drennia — Varelia's first playable nation.
// Balanced middle-tier nation for initial WORLDr launch.

export const DRENNIA = {
  countryId: 'drennia',
  countryName: 'Drennia',
  continentName: 'Varelia',
  capitalName: 'Drennport',
  cultureName: 'Varelian',
  governmentType: 'Parliamentary',
  area: '76K mi²',
  population: '3.1M',
  gdp: '$88B',
  gdpPerCapita: '$28,400',
  stability: '67%',
  flagPath: '/assets/flags/varelia/drennia.svg',
} as const;

export type CountryData = typeof DRENNIA;
