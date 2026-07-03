'use client';
import React from 'react';

interface MastheadProps {
  /** Small overline stamp, e.g. "IRONVALE STATE COUNCIL". */
  overline?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned slot (session/year, actions). */
  right?: React.ReactNode;
  className?: string;
}

/**
 * Masthead — an institutional page header in the newspaper/Hansard voice.
 * Serif title, hairline rules, muted overline. Sets the tone of a real chamber.
 */
export default function Masthead({ overline, title, subtitle, right, className }: MastheadProps) {
  return (
    <header className={`border-b border-[#2A2630] pb-4 ${className || ''}`}>
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {overline && (
            <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-1.5">
              {overline}
            </div>
          )}
          <h1 className="font-serif text-[#F4EBD6] text-2xl md:text-3xl leading-tight tracking-wide truncate">
            {title}
          </h1>
          {subtitle && <p className="text-[#A79D8C] text-xs md:text-sm mt-1">{subtitle}</p>}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  );
}
