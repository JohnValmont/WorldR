// ────────────────────────────────────────────────────────────────────────────
// WORLDr — Political Desk shared UI primitives ("Terminal-luxury" design system).
// Dark, sharp, gold-accented. Import these instead of hand-rolling panels so the
// desk stays visually consistent. All colours come from the T palette.
// ────────────────────────────────────────────────────────────────────────────
'use client';
import React from 'react';
import { T, MONO } from '../_lib/theme';

/** Uppercase section stamp with a leading gold tick. */
export function Stamp({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{ width: 3, height: 11, background: T.gold, borderRadius: 1, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: T.faint }}>
        {children}
      </span>
    </div>
  );
}

/** Sharp dark panel. `accent` adds a hairline gold top edge + soft glow for focus. */
export function Panel({
  title,
  action,
  accent = false,
  children,
  style,
}: {
  title?: string;
  action?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${accent ? T.goldLine : T.border}`,
        borderRadius: 4,
        padding: 20,
        boxShadow: accent ? `0 0 0 1px ${T.goldSoft}, 0 8px 30px rgba(0,0,0,0.35)` : 'none',
        ...style,
      }}
    >
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {title ? <Stamp>{title}</Stamp> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Compact stat tile: label + big tabular value + optional sub-line. */
export function StatTile({
  label,
  value,
  sub,
  tone = T.ivory,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
}) {
  return (
    <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4, padding: '14px 16px', minWidth: 0 }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 22, fontWeight: 700, color: tone, marginTop: 6, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
      {sub != null && <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

/** Labeled horizontal meter (0–100). Tone can be overridden or auto by value. */
export function Meter({
  label,
  value,
  display,
  tone,
  height = 6,
}: {
  label?: string;
  value: number | null;
  display?: string;
  tone?: string;
  height?: number;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const autoTone = value == null ? T.faint : pct >= 60 ? T.mint : pct >= 40 ? T.gold : T.red;
  const barTone = tone || autoTone;
  return (
    <div>
      {(label || display) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          {label && <span style={{ color: T.muted, fontSize: 11 }}>{label}</span>}
          {display != null && <span style={{ color: value == null ? T.faint : barTone, fontFamily: MONO, fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>{display}</span>}
        </div>
      )}
      <div style={{ height, background: T.bg, borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barTone, transition: 'width .4s ease' }} />
      </div>
    </div>
  );
}

export interface PhaseStep {
  key: string;
  label: string;
}

/** Horizontal phase timeline. The active phase glows gold; past phases are muted. */
export function PhaseTimeline({ steps, activeKey }: { steps: PhaseStep[]; activeKey?: string }) {
  const activeIdx = steps.findIndex((s) => s.key === activeKey);
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      {steps.map((s, i) => {
        const isActive = i === activeIdx;
        const isPast = activeIdx >= 0 && i < activeIdx;
        const color = isActive ? T.gold : isPast ? T.muted : T.faint;
        return (
          <React.Fragment key={s.key}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color,
                fontWeight: isActive ? 700 : 400,
                padding: isActive ? '4px 10px' : '4px 2px',
                borderRadius: 3,
                background: isActive ? T.goldSoft : 'transparent',
                border: isActive ? `1px solid ${T.goldLine}` : '1px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span style={{ color: T.border, fontSize: 12 }}>→</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
