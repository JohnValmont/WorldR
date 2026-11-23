// ─── WORLDr Drennian Financial Ledger Theme ───────────────────────────────────
// Replaced green-heavy palette with charcoal, ink, brass-gold, ivory, burgundy,
// steel blue, and limited cash-mint accents.

export const livingWorldTheme = {
  colors: {
    background: {
      pageBg: '#0B0D12',
      pageBgAlt: '#0D0E14',
      panelBg: '#13161E',
      panelBgSoft: '#1B1F29',
      panelBgDeep: '#15110E',
      darkPaper: '#1E1B14',
    },
    borders: {
      borderMuted: 'rgba(232,184,75,0.12)',
      borderStrong: 'rgba(232,184,75,0.32)',
      borderCool: 'rgba(42,38,48,0.8)',
      borderSubtle: '#262B36',
    },
    text: {
      textPrimary: '#ECEAE4',
      textSecondary: '#C5B99A',
      textMuted: '#A3A4AC',
      textFaint: '#868994',
    },
    accents: {
      gold: '#E8B84B',
      goldBright: '#E0B85A',
      goldSoft: '#8A6E2A',
      cashMint: '#4FB286',
      emerald: '#4FB286',    // alias kept for backward-compat
      steelBlue: '#4B6382',
      dangerRed: '#D9625A',  // alias kept for backward-compat
      burgundy: '#8F3D3D',
      burgundyLight: '#D9625A',
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
  '--bg': '#0B0D12',
  '--panel': '#13161E',
  '--panel-soft': '#1B1F29',
  '--paper': '#1E1B14',
  '--border': '#262B36',
  '--gold': '#E8B84B',
  '--gold-bright': '#E0B85A',
  '--ivory': '#ECEAE4',
  '--muted': '#A3A4AC',
  '--mint': '#4FB286',
  '--steel': '#4B6382',
  '--burgundy': '#8F3D3D',
};
