// —
// WORLDr — Political Desk shared theme tokens (the "T" palette).
// Synthesized from UI Pro Max skill: Dark Mode OLED (#7) + Glassmorphism (#3)
// Color palette: Government/Public Service (colors.csv row 13) + Financial Dashboard (row 6)
// Typography: Corporate Trust — Lexend + Source Sans 3 (typography.csv row 16)
// —
import React from 'react';

export const T = {
  // ── Base Surfaces (OLED-optimised dark) ──
  bg:           '#020617',   // Deep OLED black-navy
  surface:      '#0A0E27',   // Deep navy base
  panel:        'rgba(15, 23, 42, 0.75)',   // Card background
  panel2:       'rgba(26, 37, 64, 0.80)',   // Elevated card
  raised:       'rgba(30, 41, 59, 0.88)',   // Hovered / raised state
  glass:        'rgba(255, 255, 255, 0.03)',

  // ── Borders ──
  border:       'rgba(51, 65, 85, 0.8)',    // Subtle separators (#334155 @ 80%)
  borderSoft:   'rgba(51, 65, 85, 0.4)',
  borderGlow:   'rgba(3, 105, 161, 0.5)',   // Focus / active glow

  // ── Primary Accent — Political Authority Blue ──
  blue:         '#0369A1',                  // Accent primary (government blue)
  blueBright:   '#38BDF8',                  // Hover highlights, sparklines
  blueGlow:     'rgba(3, 105, 161, 0.25)',
  blueDim:      'rgba(3, 105, 161, 0.15)',
  blueLine:     'rgba(3, 105, 161, 0.5)',

  // ── Gold — Legacy accent kept for backwards compatibility ──
  gold:         '#E3B666',
  goldSoft:     'rgba(227, 182, 102, 0.15)',
  goldLine:     'rgba(227, 182, 102, 0.4)',
  goldGlow:     'rgba(227, 182, 102, 0.6)',

  // ── Status Semantics ──
  mint:         '#22C55E',                  // Positive: approval up, bills passed
  mintDim:      'rgba(34, 197, 94, 0.15)',
  warning:      '#F59E0B',                  // Warning: declining polls, caution
  warningDim:   'rgba(245, 158, 11, 0.15)',
  red:          '#EF4444',                  // Danger: crisis, scandal, collapse
  redDim:       'rgba(239, 68, 68, 0.15)',
  info:         '#818CF8',                  // Intelligence, forecasts

  // ── Typography ──
  ivory:        '#F1F5F9',                  // Primary readable text
  text:         '#CBD5E1',                  // Body text
  muted:        '#94A3B8',                  // Labels, helper text
  faint:        '#475569',                  // Timestamps, disabled
} as const;

// UI Pro Max typography.csv row 16 — Corporate Trust
// "Lexend designed for readability. Excellent accessibility."
export const HEADING = "'Lexend', system-ui, sans-serif";
export const BODY    = "'Source Sans 3', system-ui, sans-serif";
export const MONO    = "ui-monospace, 'SF Mono', 'IBM Plex Mono', Menlo, monospace";
// Legacy alias for backwards compat
export const SANS    = BODY;

/** Small uppercase section stamp style. */
export const stampStyle = {
  fontFamily: MONO,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.22em',
  fontSize: 10,
  color: T.blueBright,
  fontWeight: 600,
  opacity: 0.85,
};

/** Reusable AAA Panel Style — glassmorphism from styles.csv row 3 */
export const glassPanelStyle: React.CSSProperties = {
  background: T.panel,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: `1px solid ${T.border}`,
  borderTop: `1px solid rgba(148, 163, 184, 0.18)`,
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.04)',
  padding: '14px 16px',
  transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
};

/** Hoverable card — adds lift on hover via CSS class `hover-lift` */
export const interactiveCardStyle: React.CSSProperties = {
  ...glassPanelStyle,
  background: T.panel2,
  cursor: 'pointer',
};

/** Typography style for crisp tabular numbers */
export const tabularNums: React.CSSProperties = {
  fontFamily: MONO,
  fontVariantNumeric: 'tabular-nums',
};

/** Crisis severity helpers */
export function crisisColor(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? T.red : severity === 'warning' ? T.warning : T.info;
}
export function crisisDim(severity: 'critical' | 'warning' | 'info') {
  return severity === 'critical' ? T.redDim : severity === 'warning' ? T.warningDim : 'rgba(129, 140, 248, 0.12)';
}

/** Trend arrow + colour for a numeric delta */
export function trendProps(delta: number | null) {
  if (delta == null) return { arrow: '—', color: T.faint };
  if (delta > 0)     return { arrow: '▲', color: T.mint };
  if (delta < 0)     return { arrow: '▼', color: T.red };
  return { arrow: '→', color: T.muted };
}
