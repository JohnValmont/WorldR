import type { PartyLogoOption, PartyColor } from './partyTypes';

// ── Party Logo Options (39 total) ─────────────────────────────────────────────

export const PARTY_LOGOS: PartyLogoOption[] = [
  // Animals
  { id: 'eagle',    name: 'Eagle'    },
  { id: 'lion',     name: 'Lion'     },
  { id: 'dragon',   name: 'Dragon'   },
  { id: 'wolf',     name: 'Wolf'     },
  { id: 'bear',     name: 'Bear'     },
  { id: 'horse',    name: 'Horse'    },
  { id: 'falcon',   name: 'Falcon'   },
  { id: 'tiger',    name: 'Tiger'    },
  { id: 'phoenix',  name: 'Phoenix'  },
  { id: 'bull',     name: 'Bull'     },
  { id: 'dove',     name: 'Dove'     },
  // National / Political
  { id: 'crown',    name: 'Crown'    },
  { id: 'shield',   name: 'Shield'   },
  { id: 'star',     name: 'Star'     },
  { id: 'torch',    name: 'Torch'    },
  { id: 'wreath',   name: 'Wreath'   },
  { id: 'flag',     name: 'Flag'     },
  { id: 'globe',    name: 'Globe'    },
  { id: 'scales',   name: 'Scales'   },
  { id: 'castle',   name: 'Castle'   },
  // Nature / Sky
  { id: 'sun',      name: 'Sun'      },
  { id: 'moon',     name: 'Moon'     },
  { id: 'mountain', name: 'Mountain' },
  { id: 'tree',     name: 'Tree'     },
  { id: 'flame',    name: 'Flame'    },
  { id: 'leaf',     name: 'Leaf'     },
  { id: 'lightning',name: 'Lightning'},
  // Military / Maritime
  { id: 'sword',    name: 'Sword'    },
  { id: 'anchor',   name: 'Anchor'   },
  { id: 'tower',    name: 'Tower'    },
  { id: 'ship',     name: 'Ship'     },
  { id: 'compass',  name: 'Compass'  },
  // Social / Economic
  { id: 'book',      name: 'Book'      },
  { id: 'handshake', name: 'Handshake' },
  { id: 'gear',      name: 'Gear'      },
  { id: 'hammer',    name: 'Hammer'    },
  { id: 'eye',       name: 'Eye'       },
  { id: 'fist',      name: 'Fist'      },
  { id: 'bridge',    name: 'Bridge'    },
];

// ── Party Color Palette (24 options) ─────────────────────────────────────────

export const PARTY_COLORS: PartyColor[] = [
  { id: 'gold',        name: 'Gold',         hex: '#f59e0b' },
  { id: 'amber',       name: 'Amber',        hex: '#d97706' },
  { id: 'royal_blue',  name: 'Royal Blue',   hex: '#1d4ed8' },
  { id: 'sky',         name: 'Sky Blue',     hex: '#0ea5e9' },
  { id: 'navy',        name: 'Navy',         hex: '#1e3a5f' },
  { id: 'cyan',        name: 'Cyan',         hex: '#0891b2' },
  { id: 'teal',        name: 'Teal',         hex: '#0d9488' },
  { id: 'deep_red',    name: 'Deep Red',     hex: '#b91c1c' },
  { id: 'crimson',     name: 'Crimson',      hex: '#dc2626' },
  { id: 'rose',        name: 'Rose',         hex: '#e11d48' },
  { id: 'maroon',      name: 'Maroon',       hex: '#7f1d1d' },
  { id: 'emerald',     name: 'Emerald',      hex: '#059669' },
  { id: 'forest',      name: 'Forest Green', hex: '#166534' },
  { id: 'lime',        name: 'Lime',         hex: '#65a30d' },
  { id: 'purple',      name: 'Purple',       hex: '#7c3aed' },
  { id: 'violet',      name: 'Violet',       hex: '#8b5cf6' },
  { id: 'indigo',      name: 'Indigo',       hex: '#4338ca' },
  { id: 'orange',      name: 'Orange',       hex: '#ea580c' },
  { id: 'bronze',      name: 'Bronze',       hex: '#b45309' },
  { id: 'silver',      name: 'Silver',       hex: '#94a3b8' },
  { id: 'slate',       name: 'Slate',        hex: '#475569' },
  { id: 'charcoal',    name: 'Charcoal',     hex: '#374151' },
  { id: 'white',       name: 'White',        hex: '#f1f5f9' },
  { id: 'ivory',       name: 'Ivory',        hex: '#fef3c7' },
];
