import type { IndustryConfig } from '../industryRegistry';

export const LOGISTICS_INDUSTRY_CONFIG: IndustryConfig = {
  id: 'shipping-logistics',
  name: 'Shipping & Logistics',
  sectorId: 'services',
  availableContractTypeIds: [
    'local-delivery',
    'interstate-freight',
    'industrial-freight',
    'produce-delivery',
    'port-transfer',
    'government-supply',
    'international-trade'
  ],
  requiredFacilityTypeIds: [
    'small-depot',
    'medium-yard',
    'freight-terminal'
  ],
  supportedAssetTypeIds: [
    'used-delivery-van',
    'box-truck',
    'used-freight-truck'
  ]
};
