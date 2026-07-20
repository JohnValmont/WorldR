import React from 'react';

export const T = {
  bg:           '#020204',
  surface:      '#07070F',
  surfaceUp:    '#0D0D18',
  panel:        'rgba(13, 13, 24, 0.85)',
  panel2:       'rgba(18, 18, 30, 0.90)',
  panelHover:   'rgba(22, 22, 38, 0.95)',
  glass:        'rgba(255, 255, 255, 0.035)',
  border:       'rgba(255, 255, 255, 0.07)',
  borderSoft:   'rgba(255, 255, 255, 0.035)',
  borderActive: 'rgba(255, 255, 255, 0.18)',
  borderAccent: 'rgba(99, 120, 255, 0.35)',
  blue:         '#4F6EF7',
  blueBright:   '#7B9FFF',
  blueGlow:     'rgba(79, 110, 247, 0.22)',
  blueDim:      'rgba(79, 110, 247, 0.12)',
  blueLine:     'rgba(79, 110, 247, 0.45)',
  gold:         '#D4A843',
  goldBright:   '#F0C060',
  goldSoft:     'rgba(212, 168, 67, 0.12)',
  goldLine:     'rgba(212, 168, 67, 0.35)',
  goldGlow:     'rgba(212, 168, 67, 0.55)',
  mint:         '#10D67A',
  mintDim:      'rgba(16, 214, 122, 0.12)',
  mintGlow:     'rgba(16, 214, 122, 0.4)',
  warning:      '#F0A500',
  warningDim:   'rgba(240, 165, 0, 0.12)',
  red:          '#F04040',
  redDim:       'rgba(240, 64, 64, 0.12)',
  redGlow:      'rgba(240, 64, 64, 0.4)',
  info:         '#7B9FFF',
  ivory:        '#F0F4FF',
  text:         '#C8D0E8',
  muted:        '#8890A8',
  faint:        '#454D65',
} as const;

export const HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const BODY    = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
export const MONO    = "'JetBrains Mono', 'Fira Code', ui-monospace, Menlo, monospace";
export const SANS    = BODY;

export const stampStyle = {
  fontFamily: MONO,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.20em',
  fontSize: 9.5,
  color: T.blueBright,
  fontWeight: 600,
};

export const glassPanelStyle: React.CSSProperties = {
  background: T.panel,
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: `1px solid ${T.border}`,
  borderTop: `1px solid rgba(255, 255, 255, 0.12)`,
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)',
  padding: '24px',
  transition: 'all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
};

export const interactiveCardStyle: React.CSSProperties = {
  ...glassPanelStyle,
  background: T.panel2,
  cursor: 'pointer',
};

export const tabularNums: React.CSSProperties = {
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
};

export function crisisColor(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? T.red : severity === 'warning' ? T.warning : T.info;
}
export function crisisDim(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? T.redDim : severity === 'warning' ? T.warningDim : 'rgba(123, 159, 255, 0.10)';
}

export function trendProps(delta: number | null) {
  if (delta == null) return { arrow: '\u2014', color: T.faint };
  if (delta > 0)     return { arrow: '\u25b2', color: T.mint };
  if (delta < 0)     return { arrow: '\u25bc', color: T.red };
  return { arrow: '\u2192', color: T.muted };
}
