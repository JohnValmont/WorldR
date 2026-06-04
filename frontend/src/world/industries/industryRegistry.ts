export type IndustryConfig = {
  id: string;
  name: string;
  sectorId: string;
  availableContractTypeIds: string[];
  requiredFacilityTypeIds: string[];
  supportedAssetTypeIds: string[];
};

import { LOGISTICS_INDUSTRY_CONFIG } from './logistics/logisticsConfig';

export const WORLD_INDUSTRIES: Record<string, IndustryConfig> = {
  'shipping-logistics': LOGISTICS_INDUSTRY_CONFIG
};

export function getIndustryConfig(industryId: string): IndustryConfig {
  return WORLD_INDUSTRIES[industryId] || WORLD_INDUSTRIES['shipping-logistics'];
}
