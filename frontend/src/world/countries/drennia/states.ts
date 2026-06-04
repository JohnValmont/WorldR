export type StateConfig = {
  id: string;
  name: string;
  countryId: string;
};

export const DRENNIA_STATES: StateConfig[] = [
  { id: 'drennia-westport', name: 'Westport State', countryId: 'drennia' },
  { id: 'drennia-drennport', name: 'Drennport State', countryId: 'drennia' },
  { id: 'drennia-ironvale', name: 'Ironvale State', countryId: 'drennia' },
  { id: 'drennia-greenmere', name: 'Greenmere State', countryId: 'drennia' }
];

export function getStateConfig(stateId: string): StateConfig | undefined {
  return DRENNIA_STATES.find(s => s.id === stateId);
}
