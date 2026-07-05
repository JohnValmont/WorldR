// Political jurisdiction config — one entry per state + national placeholder.
// isLocked: true = "Coming Soon" treatment (not clickable).
// isActive: true = this jurisdiction has a live political cycle in the DB.
// This is the authoritative display-order list for the JurisdictionSwitcher.
export const JURISDICTIONS = [
  { id: 'ironvale',  name: 'Ironvale',  isLocked: false, isActive: true  },
  { id: 'drennport', name: 'Drennport', isLocked: true,  isActive: false },
  { id: 'westport',  name: 'Westport',  isLocked: true,  isActive: false },
  { id: 'greenmere', name: 'Greenmere', isLocked: true,  isActive: false },
  { id: 'national',  name: 'National',  isLocked: true,  isActive: false }, // deferred
] as const;

export type JurisdictionId = (typeof JURISDICTIONS)[number]['id'];
export const DEFAULT_JURISDICTION_ID: JurisdictionId = 'ironvale';

// Legacy aliases — kept so any existing imports don't break immediately.
export const POL_ACTIVE_STATE_CODE = 'ironvale';
export const POL_ACTIVE_STATE_NAME = 'Ironvale';
