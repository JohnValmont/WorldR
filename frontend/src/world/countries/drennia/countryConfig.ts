import type { CountryConfig } from '../countryRegistry';
import { DRENNIA_STATES } from './states';

export const DRENNIA_CONFIG: CountryConfig = {
  id: 'drennia',
  name: 'Drennia',
  currencyId: 'drennian-mark',
  stateIds: DRENNIA_STATES.map(s => s.id),
  businessRules: {
    registrationFee: 2500,
    minimumStartingCapital: 50000,
    availableLegalStructureIds: ['sole-trader', 'private-company', 'corporation'],
    availableIndustryIds: ['shipping-logistics']
  }
};
