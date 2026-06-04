export type NpcCompanyConfig = {
  id: string;
  name: string;
  countryId: string;
  headquartersStateId: string;
  sectorId: string;
  industryId: string;
  sizeTier: string;
  reputation: number;
  reliability: number;
  productIds?: string[];
  contractTypeIds?: string[];
};

export const DRENNIA_NPC_COMPANIES: NpcCompanyConfig[] = [
  {
    id: 'npc-drennport-office',
    name: 'Drennport Office Suppliers',
    countryId: 'drennia',
    headquartersStateId: 'drennia-drennport',
    sectorId: 'retail',
    industryId: 'commercial-supplies',
    sizeTier: 'Medium',
    reputation: 80,
    reliability: 85,
    contractTypeIds: ['local-delivery']
  },
  {
    id: 'npc-greenmere-fresh',
    name: 'Greenmere Fresh Supply',
    countryId: 'drennia',
    headquartersStateId: 'drennia-greenmere',
    sectorId: 'agriculture',
    industryId: 'farming',
    sizeTier: 'Large',
    reputation: 90,
    reliability: 95,
    contractTypeIds: ['produce-delivery']
  },
  {
    id: 'npc-drennia-motors',
    name: 'Drennia Motors',
    countryId: 'drennia',
    headquartersStateId: 'drennia-westport',
    sectorId: 'manufacturing',
    industryId: 'automotive',
    sizeTier: 'Mega',
    reputation: 95,
    reliability: 90
  },
  {
    id: 'npc-westport-commercial',
    name: 'Westport Commercial Vehicles',
    countryId: 'drennia',
    headquartersStateId: 'drennia-westport',
    sectorId: 'retail',
    industryId: 'automotive-dealership',
    sizeTier: 'Large',
    reputation: 85,
    reliability: 85
  },
  {
    id: 'npc-ironvale-heavy',
    name: 'Ironvale Heavy Industries',
    countryId: 'drennia',
    headquartersStateId: 'drennia-ironvale',
    sectorId: 'manufacturing',
    industryId: 'heavy-industry',
    sizeTier: 'Mega',
    reputation: 88,
    reliability: 92,
    contractTypeIds: ['industrial-freight']
  }
];
