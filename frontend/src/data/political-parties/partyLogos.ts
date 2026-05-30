import type { PartyLogoOption, PartyColor } from './partyTypes';

// ── Party Logo Options ────────────────────────────────────────────────────────

export const PARTY_LOGOS: PartyLogoOption[] = [
  { id: 'eagle',    name: 'Eagle'    },
  { id: 'star',     name: 'Star'     },
  { id: 'shield',   name: 'Shield'   },
  { id: 'torch',    name: 'Torch'    },
  { id: 'lion',     name: 'Lion'     },
  { id: 'wreath',   name: 'Wreath'   },
  { id: 'crown',    name: 'Crown'    },
  { id: 'mountain', name: 'Mountain' },
  { id: 'sun',      name: 'Sun'      },
  { id: 'scales',   name: 'Scales'   },
  { id: 'flag',     name: 'Flag'     },
  { id: 'globe',    name: 'Globe'    },
];

// ── Party Color Palette ───────────────────────────────────────────────────────

export const PARTY_COLORS: PartyColor[] = [
  { id: 'gold',   name: 'Gold',   hex: '#f59e0b' },
  { id: 'blue',   name: 'Blue',   hex: '#3b82f6' },
  { id: 'red',    name: 'Red',    hex: '#ef4444' },
  { id: 'green',  name: 'Green',  hex: '#22c55e' },
  { id: 'purple', name: 'Purple', hex: '#a855f7' },
  { id: 'white',  name: 'White',  hex: '#e4e4e7' },
  { id: 'slate',  name: 'Slate',  hex: '#64748b' },
  { id: 'orange', name: 'Orange', hex: '#f97316' },
];
