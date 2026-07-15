// ─────────────────────────────────────────────────────
// WORLDr — Political Desk shared theme tokens (the "T" palette).
// AAA Luxury Strategy: Deep obsidian, frosted glass, glowing gold accents.
// ─────────────────────────────────────────────────────
export const T = {
  // Base backgrounds (dark, rich depth)
  bg:        '#08090C', // Deep obsidian
  
  // Panels & Glassmorphism
  panel:     'rgba(18, 20, 26, 0.65)',
  panel2:    'rgba(26, 29, 38, 0.75)',
  raised:    'rgba(35, 38, 51, 0.85)',
  glass:     'rgba(255, 255, 255, 0.02)',
  
  // Borders (Soft highlights for 3D effect)
  border:    'rgba(255, 255, 255, 0.08)',
  borderSoft:'rgba(255, 255, 255, 0.04)',
  borderGlow:'rgba(212, 162, 74, 0.4)',
  
  // Accents
  gold:      '#E3B666',
  goldSoft:  'rgba(227, 182, 102, 0.15)',
  goldLine:  'rgba(227, 182, 102, 0.4)',
  goldGlow:  'rgba(227, 182, 102, 0.6)',
  
  // Typography
  ivory:     '#F5F2EB',
  text:      '#D8D4CA',
  muted:     '#9496A6',
  faint:     '#5D6073',
  
  // Status Colors
  mint:      '#43C78B',
  red:       '#E05246',
  blue:      '#4892D4',
} as const;

export const MONO = "ui-monospace, 'SF Mono', 'IBM Plex Mono', Menlo, monospace";
export const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** Small uppercase section stamp style. */
export const stampStyle = {
  fontFamily: MONO,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.25em',
  fontSize: 10,
  color: T.gold,
  fontWeight: 600,
  opacity: 0.8,
};

/** Reusable AAA Panel Style */
export const glassPanelStyle: React.CSSProperties = {
  background: T.panel,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: `1px solid ${T.border}`,
  borderRadius: '8px',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
  padding: '24px',
  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
};

/** Reusable AAA Card Style (Hoverable) */
export const interactiveCardStyle: React.CSSProperties = {
  ...glassPanelStyle,
  background: T.panel2,
  cursor: 'pointer',
};
