// Political jurisdiction config — all 5 jurisdictions (4 state assemblies + 1 national parliament).
// isLocked: false = unlocked & interactive.
// isActive: true = this jurisdiction has a live political cycle in the DB.
// Authoritative display-order list for the JurisdictionSwitcher.
export const JURISDICTIONS = [
  { id: 'national',  name: 'National Parliament', isLocked: false, isActive: true },
  { id: 'ironvale',  name: 'Ironvale Assembly',   isLocked: false, isActive: true },
  { id: 'drennport', name: 'Drennport Assembly',  isLocked: false, isActive: true },
  { id: 'westport',  name: 'Westport Assembly',   isLocked: false, isActive: true },
  { id: 'greenmere', name: 'Greenmere Assembly',  isLocked: false, isActive: true },
] as const;

export type JurisdictionId = (typeof JURISDICTIONS)[number]['id'];
export const DEFAULT_JURISDICTION_ID: JurisdictionId = 'national';

// Legacy aliases
export const POL_ACTIVE_STATE_CODE = 'national';
export const POL_ACTIVE_STATE_NAME = 'National Parliament';
