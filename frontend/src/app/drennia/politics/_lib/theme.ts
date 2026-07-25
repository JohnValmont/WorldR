import React from 'react';

export const T = {
  bg:           '#090A0F',
  surface:      '#11131A',
  surfaceUp:    '#1E1A15',
  panel:        'rgba(17, 19, 26, 0.85)',
  panel2:       'rgba(23, 21, 27, 0.90)',
  panelHover:   'rgba(30, 26, 21, 0.95)',
  glass:        'rgba(255, 255, 255, 0.035)',
  border:       '#2A2630',
  borderSoft:   'rgba(42, 38, 48, 0.5)',
  borderActive: 'rgba(201,162,74,0.4)',
  borderAccent: 'rgba(201,162,74,0.22)',
  blue:         '#4B6382',
  blueBright:   '#627C9E',
  blueGlow:     'rgba(75, 99, 130, 0.22)',
  blueDim:      'rgba(75, 99, 130, 0.12)',
  blueLine:     'rgba(75, 99, 130, 0.45)',
  gold:         '#C9A24A',
  goldBright:   '#E3BA60',
  goldSoft:     'rgba(201, 162, 74, 0.12)',
  goldLine:     'rgba(201, 162, 74, 0.35)',
  goldGlow:     'rgba(201, 162, 74, 0.55)',
  mint:         '#36D399',
  mintDim:      'rgba(54, 211, 153, 0.12)',
  mintGlow:     'rgba(54, 211, 153, 0.4)',
  warning:      '#C9A24A',
  warningDim:   'rgba(201, 162, 74, 0.12)',
  red:          '#B85555',
  redDim:       'rgba(184, 85, 85, 0.12)',
  redGlow:      'rgba(184, 85, 85, 0.4)',
  info:         '#4B6382',
  ivory:        '#F4EBD6',
  text:         '#F4EBD6',
  muted:        '#A79D8C',
  faint:        '#6B6358',
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
  padding: '14px 16px',
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
