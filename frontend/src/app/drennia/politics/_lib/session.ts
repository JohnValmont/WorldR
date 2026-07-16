// Political jurisdiction config — one entry per state + national placeholder.
// isLocked: true = "Coming Soon" treatment (not clickable).
// isActive: true = this jurisdiction has a live political cycle in the DB.
// This is the authoritative display-order list for the JurisdictionSwitcher.
export const JURISDICTIONS = [
  { id: 'national',  name: 'National',  isLocked: false,  isActive: true },
] as const;

export type JurisdictionId = (typeof JURISDICTIONS)[number]['id'];
export const DEFAULT_JURISDICTION_ID: JurisdictionId = 'national';

// Legacy aliases — kept so any existing imports don't break immediately.
export const POL_ACTIVE_STATE_CODE = 'national';
export const POL_ACTIVE_STATE_NAME = 'National';
