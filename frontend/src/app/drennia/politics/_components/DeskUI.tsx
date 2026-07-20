// —
// WORLDr — Political Desk shared UI primitives (Pro Max redesign)
// "Power & Precision" design language — deep noir, sovereign blue, gold authority
// All colours from the T palette in theme.ts
// —
'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { T, MONO, HEADING, BODY, glassPanelStyle, tabularNums } from '../_lib/theme';

/** Tooltip wrapper that reveals rich data on hover. */
export function HoverData({
  label, children, tooltip,
}: { label?: string; children: React.ReactNode; tooltip: React.ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{
        cursor: 'help',
        borderBottom: `1px dashed rgba(255,255,255,0.15)`,
        paddingBottom: 1,
      }}>
        {label ? <span style={{ color: T.muted, fontSize: 12, fontWeight: 500, fontFamily: HEADING }}>{label}: </span> : null}
        {children}
      </div>
      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 14,
              background: 'rgba(7, 7, 18, 0.92)',
              backdropFilter: 'blur(48px)',
              WebkitBackdropFilter: 'blur(48px)',
              border: `1px solid rgba(255,255,255,0.1)`,
              borderTop: `1px solid rgba(255,255,255,0.22)`,
              boxShadow: '0 24px 48px rgba(0,0,0,0.85), 0 0 1px rgba(255,255,255,0.05)',
              padding: '14px 18px',
              borderRadius: 14,
              zIndex: 200,
              minWidth: 220,
              pointerEvents: 'none',
            }}
          >
            {/* Arrow tip */}
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 10, height: 10,
              background: 'rgba(7, 7, 18, 0.92)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderTop: 'none', borderLeft: 'none',
              rotate: '45deg',
            }} />
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Section stamp — left-bar accent + bold label */
export function Stamp({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  const color = accent || T.blueBright;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <span style={{
        width: 3, height: 18, background: `linear-gradient(180deg, ${color}, ${color}80)`,
        borderRadius: 2, display: 'inline-block', flexShrink: 0,
        boxShadow: `0 0 8px ${color}60`,
      }} />
      <span style={{
        fontFamily: HEADING, fontSize: 14, color: T.ivory,
        fontWeight: 600, letterSpacing: '-0.01em',
      }}>
        {children}
      </span>
    </div>
  );
}

/** Premium glassmorphism panel with optional title and action slot */
export function Panel({
  title, action, accent = false, children, style, kicker,
}: {
  title?: string;
  action?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
  kicker?: string;
}) {
  return (
    <motion.div
      whileHover={accent ? { y: -1, boxShadow: '0 16px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)' } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        ...glassPanelStyle,
        border: `1px solid ${accent ? 'rgba(255,255,255,0.10)' : T.border}`,
        borderTop: `1px solid ${accent ? 'rgba(255,255,255,0.20)' : 'rgba(255, 255, 255, 0.12)'}`,
        ...style,
      }}
    >
      {(kicker || title || action) && (
        <div style={{ marginBottom: 20 }}>
          {kicker && (
            <div style={{
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.22em',
              textTransform: 'uppercase', color: T.blueBright,
              marginBottom: 8, fontWeight: 600, opacity: 0.8,
            }}>{kicker}</div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {title ? <Stamp>{title}</Stamp> : <span />}
            {action}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  );
}

/** Animated stat tile with glow accent */
export function StatTile({
  label, value, sub, tone = T.ivory, kicker,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
  kicker?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.015, borderColor: 'rgba(255,255,255,0.13)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      style={{
        background: 'linear-gradient(145deg, rgba(13,13,24,0.9), rgba(8,8,18,0.95))',
        border: `1px solid ${T.border}`,
        borderTop: `1px solid rgba(255,255,255,0.10)`,
        borderRadius: 14,
        padding: '12px 14px',
        minWidth: 0,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Subtle corner glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 60, height: 60,
        background: `radial-gradient(circle at top right, ${tone}10, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      {kicker && (
        <div style={{
          fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: T.faint, marginBottom: 4, fontWeight: 600,
        }}>{kicker}</div>
      )}
      <div style={{ fontFamily: HEADING, fontSize: 12, fontWeight: 500, color: T.muted, marginBottom: 10 }}>{label}</div>
      <div style={{ ...tabularNums, fontSize: 18, fontWeight: 700, color: tone, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub != null && <div style={{ fontSize: 11, color: T.faint, marginTop: 8, fontFamily: HEADING }}>{sub}</div>}
    </motion.div>
  );
}

/** Smooth gradient progress meter */
export function Meter({
  label, value, display, tone, height = 5,
}: {
  label?: string;
  value: number | null;
  display?: string;
  tone?: string;
  height?: number;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const autoTone = value == null ? T.faint : pct >= 60 ? T.mint : pct >= 35 ? T.warning : T.red;
  const barTone = tone || autoTone;
  return (
    <div>
      {(label || display) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
          {label && <span style={{ color: T.muted, fontSize: 11.5, fontWeight: 500, fontFamily: HEADING }}>{label}</span>}
          {display != null && (
            <span style={{
              color: value == null ? T.faint : barTone,
              ...tabularNums, fontSize: 12, fontWeight: 700,
              textShadow: `0 0 10px ${barTone}50`,
            }}>{display}</span>
          )}
        </div>
      )}
      <div style={{
        height, background: `rgba(255,255,255,0.04)`,
        borderRadius: height / 2, overflow: 'hidden',
        border: `1px solid rgba(255,255,255,0.02)`,
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.25, 0.8, 0.25, 1] }}
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${barTone}CC, ${barTone})`,
            borderRadius: height / 2,
            boxShadow: `0 0 14px ${barTone}60`,
          }}
        />
      </div>
    </div>
  );
}

export interface PhaseStep { key: string; label: string; }

/** Horizontal phase timeline with connector lines */
export function PhaseTimeline({ steps, activeKey }: { steps: PhaseStep[]; activeKey?: string }) {
  const activeIdx = steps.findIndex((s) => s.key === activeKey);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((s, i) => {
        const isActive = i === activeIdx;
        const isPast = activeIdx >= 0 && i < activeIdx;
        const nodeColor = isActive ? T.blueBright : isPast ? T.mint : T.faint;
        return (
          <React.Fragment key={s.key}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {/* Circle node */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: nodeColor,
                boxShadow: isActive ? `0 0 10px ${nodeColor}` : 'none',
                transition: 'all 0.3s ease',
              }} />
              <span style={{
                fontFamily: HEADING, fontSize: 11,
                color: isActive ? T.ivory : isPast ? T.muted : T.faint,
                fontWeight: isActive ? 600 : 400,
                whiteSpace: 'nowrap',
                padding: '3px 8px',
                borderRadius: 5,
                background: isActive ? T.blueDim : 'transparent',
                border: isActive ? `1px solid ${T.borderAccent}` : '1px solid transparent',
                transition: 'all 0.3s ease',
              }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                height: 1, flex: 1, minWidth: 16,
                background: isPast
                  ? `linear-gradient(90deg, ${T.mint}60, ${T.faint}40)`
                  : `rgba(255,255,255,0.07)`,
                marginBottom: 18,
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Primary action button */
export function PrimaryBtn({
  onClick, children, disabled, icon, small,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
  small?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: small ? '7px 14px' : '10px 20px',
        borderRadius: 10,
        background: disabled
          ? 'rgba(255,255,255,0.05)'
          : hover
          ? `linear-gradient(135deg, #5F7EFF, #4F6EF7)`
          : `linear-gradient(135deg, #4F6EF7, #3A5BE0)`,
        border: disabled ? `1px solid rgba(255,255,255,0.06)` : `1px solid rgba(79,110,247,0.5)`,
        boxShadow: (!disabled && hover) ? '0 4px 20px rgba(79,110,247,0.4)' : 'none',
        color: disabled ? T.faint : T.ivory,
        fontSize: small ? 12 : 13,
        fontWeight: 600,
        fontFamily: HEADING,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
        letterSpacing: '-0.01em',
        userSelect: 'none',
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/** Ghost/outline button */
export function GhostBtn({
  onClick, children, disabled, small, tone,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  small?: boolean;
  tone?: string;
}) {
  const [hover, setHover] = useState(false);
  const c = tone || 'rgba(255,255,255,0.6)';
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '6px 12px' : '9px 16px',
        borderRadius: 9,
        background: hover && !disabled ? 'rgba(255,255,255,0.05)' : 'transparent',
        border: `1px solid ${hover && !disabled ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'}`,
        color: disabled ? T.faint : hover ? T.ivory : c,
        fontSize: small ? 12 : 13,
        fontWeight: 500,
        fontFamily: HEADING,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.18s ease',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </button>
  );
}

/** Status badge pill */
export function Badge({
  children, tone = T.info,
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: `${tone}18`,
      border: `1px solid ${tone}40`,
      color: tone,
      fontSize: 11, fontWeight: 600,
      fontFamily: MONO, letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: tone, flexShrink: 0 }} />
      {children}
    </span>
  );
}
