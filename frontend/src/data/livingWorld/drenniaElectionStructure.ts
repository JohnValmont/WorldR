export const DRENNIA_ELECTION_STRUCTURE = {
  national: {
    name: 'Drennia House',
    totalDistricts: 40,
    majorityRequired: 21,
    distribution: [
      { state: 'Drennport State', districts: 12 },
      { state: 'Ironvale State', districts: 10 },
      { state: 'Greenmere State', districts: 9 },
      { state: 'Westport State', districts: 9 },
    ]
  },
  regional: [
    {
      state: 'Drennport State Assembly',
      totalDistricts: 25,
      majorityRequired: 13,
    },
    {
      state: 'Ironvale State Assembly',
      totalDistricts: 23,
      majorityRequired: 12,
    },
    {
      state: 'Greenmere State Assembly',
      totalDistricts: 21,
      majorityRequired: 11,
    },
    {
      state: 'Westport State Assembly',
      totalDistricts: 21,
      majorityRequired: 11,
    }
  ]
};
