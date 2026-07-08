// ─────────────────────────────────────────────────────
// WORLDr — Political Desk shared theme tokens (the "T" palette).
// Terminal-luxury: dark, sharp, constrained. Import { T } everywhere in the desk.
// ─────────────────────────────────────────────────────
export const T = {
  bg:        '#0d0e11',
  panel:     '#16171d',
  panel2:    '#1b1d24',
  raised:    '#20222b',
  border:    '#262833',
  borderSoft:'#1e2029',
  gold:      '#d4a24a',
  goldSoft:  'rgba(212,162,74,0.12)',
  goldLine:  'rgba(212,162,74,0.35)',
  ivory:     '#ece7dc',
  text:      '#cfcabd',
  muted:     '#8b8da0',
  faint:     '#5b5d70',
  mint:      '#5fbf8f',
  red:       '#c8624f',
  blue:      '#5f8fbf',
} as const;

export const MONO = "ui-monospace, 'SF Mono', 'IBM Plex Mono', Menlo, monospace";

/** Small uppercase section stamp style. */
export const stampStyle = {
  fontFamily: MONO,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.2em',
  fontSize: 10,
  color: T.faint,
};
