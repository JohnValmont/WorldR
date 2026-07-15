// —
// WORLDr — Political Desk shared UI primitives ("Terminal-luxury" design system).
// Dark, sharp, gold-accented. Import these instead of hand-rolling panels so the
// desk stays visually consistent. All colours come from the T palette.
// —
'use client';
import React from 'react';
import { T, MONO, glassPanelStyle, tabularNums } from '../_lib/theme';

/** Uppercase section stamp with a leading gold tick. */
export function Stamp({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
      <span style={{ width: 3, height: 11, background: T.gold, borderRadius: 1, display: 'inline-block', flexShrink: 0, boxShadow: `0 0 6px ${T.goldLine}` }} />
      <span style={{ fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10, color: T.gold, opacity: 0.85, textShadow: `0 0 4px ${T.goldSoft}` }}>
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
        ...glassPanelStyle,
        border: `1px solid ${accent ? T.goldLine : T.border}`,
        borderTop: `1px solid ${accent ? T.gold : 'rgba(255, 255, 255, 0.15)'}`,
        boxShadow: accent ? `0 4px 24px rgba(227, 182, 102, 0.15), inset 0 1px 0 rgba(227, 182, 102, 0.2)` : glassPanelStyle.boxShadow,
        ...style,
      }}
    >
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
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
    <div style={{ 
      background: 'linear-gradient(180deg, rgba(35, 38, 51, 0.85) 0%, rgba(26, 29, 38, 0.75) 100%)', 
      border: `1px solid ${T.border}`, 
      borderTop: `1px solid rgba(255,255,255,0.1)`, 
      borderRadius: 6, 
      padding: '16px', 
      minWidth: 0,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.faint }}>{label}</div>
      <div style={{ ...tabularNums, fontSize: 24, fontWeight: 700, color: tone, marginTop: 8, lineHeight: 1, textShadow: tone === T.gold ? `0 0 12px ${T.goldSoft}` : 'none' }}>{value}</div>
      {sub != null && <div style={{ fontFamily: MONO, fontSize: 10.5, color: T.muted, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

/** Labeled horizontal meter (0—100). Segmented sci-fi look. */
export function Meter({
  label,
  value,
  display,
  tone,
  height = 8,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ color: T.muted, fontSize: 11, fontWeight: 500 }}>{label}</span>}
          {display != null && <span style={{ color: value == null ? T.faint : barTone, ...tabularNums, fontSize: 11, textShadow: `0 0 6px ${barTone}40` }}>{display}</span>}
        </div>
      )}
      <div style={{ 
        height, 
        background: `rgba(0,0,0,0.5)`, 
        borderRadius: 2, 
        border: `1px solid ${T.borderSoft}`,
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, height: '100%',
          width: `${pct}%`,
          background: barTone,
          boxShadow: `0 0 10px ${barTone}`,
          transition: 'width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)',
        }} />
        {/* Segmentation overlay */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, right: 0, bottom: 0,
          background: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          zIndex: 1
        }} />
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
            {i < steps.length - 1 && <span style={{ color: T.border, fontSize: 12 }}>—</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
