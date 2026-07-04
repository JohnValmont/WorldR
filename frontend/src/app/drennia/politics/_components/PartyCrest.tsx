'use client';
import React from 'react';
import { partyIdentity } from '../_lib/identity';

interface PartyCrestProps {
  name: string | undefined | null;
  size?: number;
  /** Override the accent color (else derived from party identity). */
  color?: string;
  className?: string;
  parties?: any[];
}

/**
 * PartyCrest — a small institutional monogram/crest avatar.
 * Muted, engraved feel: party color plate, embossed initials, thin bevel.
 */
export default function PartyCrest({ name, size = 36, color, className, parties }: PartyCrestProps) {
  const id = partyIdentity(name, parties);
  const accent = color || id.color;
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        background: `linear-gradient(155deg, ${accent}, ${accent}bb)`,
        border: `1px solid ${accent}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.35)`,
        borderRadius: 3,
        color: '#0b0b0f',
        fontFamily: 'var(--font-mono, monospace)',
        fontWeight: 800,
        fontSize: size * 0.36,
        letterSpacing: '0.04em',
        textShadow: '0 1px 0 rgba(255,255,255,0.25)',
        userSelect: 'none',
      }}
      aria-hidden
    >
      {id.monogram}
    </span>
  );
}
