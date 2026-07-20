// —
// WORLDr — Political Desk shared UI primitives ("Terminal-luxury" design system).
// Dark, sharp, gold-accented. Import these instead of hand-rolling panels so the
// desk stays visually consistent. All colours come from the T palette.
// —
'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T, MONO, glassPanelStyle, tabularNums } from '../_lib/theme';

/** A tooltip wrapper that reveals rich data on hover. */
export function HoverData({ label, children, tooltip }: { label?: string; children: React.ReactNode; tooltip: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <div 
      className="hover-data-container" 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ cursor: 'help', borderBottom: `1px solid ${T.borderSoft}` }}>
        {label ? <span style={{ color: T.muted, fontSize: 13, fontWeight: 500 }}>{label}: </span> : null}
        {children}
      </div>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 12,
              background: 'rgba(5, 5, 10, 0.7)',
              backdropFilter: 'blur(40px)',
              border: `1px solid rgba(255, 255, 255, 0.1)`,
              borderTop: `1px solid rgba(255, 255, 255, 0.2)`,
              boxShadow: '0 16px 32px rgba(0,0,0,0.8)',
              padding: '16px 20px',
              borderRadius: 12,
              zIndex: 100,
              minWidth: 240,
              pointerEvents: 'none'
            }}
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Clean label for sections (replaces small uppercase stamp) */
export function Stamp({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <span style={{ width: 4, height: 16, background: 'rgba(255,255,255,0.8)', borderRadius: 2, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ fontFamily: T.HEADING, fontSize: 15, color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.02em' }}>
        {children}
      </span>
    </div>
  );
}

/** Smooth dark panel for content blocks. */
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
    <motion.div
      whileHover={accent ? { scale: 1.002, borderColor: 'rgba(255,255,255,0.15)' } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        ...glassPanelStyle,
        border: `1px solid ${accent ? 'rgba(255,255,255,0.12)' : T.border}`,
        borderTop: `1px solid ${accent ? 'rgba(255,255,255,0.25)' : 'rgba(255, 255, 255, 0.15)'}`,
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
    </motion.div>
  );
}

/** Beautiful spacious stat tile */
export function StatTile({
  label,
  value,
  sub,
  tone = '#FFFFFF',
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
}) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      style={{ 
        background: 'rgba(20, 20, 25, 0.3)', 
        border: `1px solid ${T.border}`, 
        borderTop: `1px solid rgba(255,255,255,0.08)`, 
        borderRadius: 12, 
        padding: '16px 20px', 
        minWidth: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      }}>
      <div style={{ fontFamily: T.HEADING, fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{label}</div>
      <div style={{ ...tabularNums, fontSize: 32, fontWeight: 600, color: tone, marginTop: 12, lineHeight: 1 }}>{value}</div>
      {sub != null && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>{sub}</div>}
    </motion.div>
  );
}

/** Smooth glowing progress bar without segmentations */
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
  const autoTone = value == null ? T.faint : pct >= 60 ? T.mint : pct >= 40 ? T.warning : T.red;
  const barTone = tone || autoTone;
  return (
    <div>
      {(label || display) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
          {label && <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 500 }}>{label}</span>}
          {display != null && <span style={{ color: value == null ? T.faint : barTone, ...tabularNums, fontSize: 13, fontWeight: 600 }}>{display}</span>}
        </div>
      )}
      <div style={{ 
        height, 
        background: `rgba(255,255,255,0.05)`, 
        borderRadius: height / 2, 
        border: `1px solid rgba(255,255,255,0.02)`,
        position: 'relative'
      }}>
        {/* Fill */ }
        <div style={{
          position: 'absolute',
          left: 0, top: 0, height: '100%',
          width: `${pct}%`,
          background: barTone,
          borderRadius: height / 2,
          boxShadow: `0 0 12px ${barTone}80`,
          transition: 'width 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)',
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
        const color = isActive ? '#FFFFFF' : isPast ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)';
        return (
          <React.Fragment key={s.key}>
            <span
              style={{
                fontFamily: T.HEADING,
                fontSize: 12,
                color,
                fontWeight: isActive ? 600 : 400,
                padding: isActive ? '6px 12px' : '6px 4px',
                borderRadius: 6,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: isActive ? `1px solid rgba(255,255,255,0.2)` : '1px solid transparent',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease',
              }}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: 12 }}>—</span>}
          </React.Fragment>
        );
      })}
    </div>
  );
}
