// ─── WORLDr Drennian Financial Ledger Theme ───────────────────────────────────
// Replaced green-heavy palette with charcoal, ink, brass-gold, ivory, burgundy,
// steel blue, and limited cash-mint accents.

export const livingWorldTheme = {
  colors: {
    background: {
      pageBg: '#090A0F',
      pageBgAlt: '#0D0E14',
      panelBg: '#11131A',
      panelBgSoft: '#17151B',
      panelBgDeep: '#15110E',
      darkPaper: '#1E1A15',
    },
    borders: {
      borderMuted: 'rgba(201,162,74,0.12)',
      borderStrong: 'rgba(201,162,74,0.32)',
      borderCool: 'rgba(42,38,48,0.8)',
      borderSubtle: '#2A2630',
    },
    text: {
      textPrimary: '#F4EBD6',
      textSecondary: '#C5B99A',
      textMuted: '#A79D8C',
      textFaint: '#6B6358',
    },
    accents: {
      gold: '#C9A24A',
      goldBright: '#E0B85A',
      goldSoft: '#8A6E2A',
      cashMint: '#36D399',
      emerald: '#36D399',    // alias kept for backward-compat
      steelBlue: '#4B6382',
      dangerRed: '#B85555',  // alias kept for backward-compat
      burgundy: '#8F3D3D',
      burgundyLight: '#B85555',
      warningAmber: '#C08B3D',
    },
  },
  effects: {
    shadowPanel: '0 18px 50px rgba(0,0,0,0.5)',
    shadowCard: '0 4px 20px rgba(0,0,0,0.35)',
    radiusLarge: '4px',
    radiusMedium: '3px',
    radiusSmall: '2px',
  },
};

// ─── Design tokens as CSS variables (for use in globals.css if needed) ──────────
export const CSS_VARS = {
  '--bg': '#090A0F',
  '--panel': '#11131A',
  '--panel-soft': '#17151B',
  '--paper': '#1E1A15',
  '--border': '#2A2630',
  '--gold': '#C9A24A',
  '--gold-bright': '#E0B85A',
  '--ivory': '#F4EBD6',
  '--muted': '#A79D8C',
  '--mint': '#36D399',
  '--steel': '#4B6382',
  '--burgundy': '#8F3D3D',
};
