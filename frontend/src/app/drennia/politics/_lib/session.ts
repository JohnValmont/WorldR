// Political jurisdiction config — one entry per state + national placeholder.
// isLocked: true = "Coming Soon" treatment (not clickable).
// isActive: true = this jurisdiction has a live political cycle in the DB.
// This is the authoritative display-order list for the JurisdictionSwitcher.
export const JURISDICTIONS = [
  { id: 'drennia-ironvale',  name: 'Ironvale',  isLocked: false, isActive: true  },
  { id: 'drennia-drennport', name: 'Drennport', isLocked: true,  isActive: false },
  { id: 'drennia-westport',  name: 'Westport',  isLocked: true,  isActive: false },
  { id: 'drennia-greenmere', name: 'Greenmere', isLocked: true,  isActive: false },
  { id: 'national',          name: 'National',  isLocked: true,  isActive: false }, // deferred
] as const;

export type JurisdictionId = (typeof JURISDICTIONS)[number]['id'];
export const DEFAULT_JURISDICTION_ID: JurisdictionId = 'drennia-ironvale';

// Legacy aliases — kept so any existing imports don't break immediately.
export const POL_ACTIVE_STATE_CODE = 'drennia-ironvale';
export const POL_ACTIVE_STATE_NAME = 'Ironvale';
