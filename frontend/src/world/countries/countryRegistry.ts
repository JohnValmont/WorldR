export type CountryConfig = {
  id: string;
  name: string;
  currencyId: string;
  stateIds: string[];
  businessRules: {
    registrationFee: number;
    minimumStartingCapital: number;
    availableLegalStructureIds: string[];
    availableIndustryIds: string[];
  };
};

import { DRENNIA_CONFIG } from './drennia/countryConfig';

export const WORLD_COUNTRIES: Record<string, CountryConfig> = {
  'drennia': DRENNIA_CONFIG
};

export function getCountryConfig(countryId: string): CountryConfig {
  return WORLD_COUNTRIES[countryId] || WORLD_COUNTRIES['drennia'];
}
