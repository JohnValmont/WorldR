'use client';
import React from 'react';
import { cn } from './utils';

/**
 * The header every game screen uses: a small gold kicker, a display title (the page's h1),
 * one line of description, an optional right-hand slot (a balance, a clock) and an optional
 * row below it (usually <Tabs inset="none" />). Keeps titles, spacing and type identical
 * across Money, World, Exchange, Investments and the rest.
 */
export default function PageHeader({
  kicker, title, description, aside, children, className,
}: {
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('shrink-0 border-b border-line', className)}>
      <div className={cn('page-frame pt-5', !children && 'pb-5')}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {kicker && <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">{kicker}</div>}
          <h1 className="m-0 font-display text-[26px] font-semibold leading-tight tracking-wide text-ink">{title}</h1>
          {description && <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-ink-dim">{description}</p>}
        </div>
        {aside && <div className="flex shrink-0 items-end gap-4">{aside}</div>}
      </div>
      {/* The header draws the bottom rule full-bleed, so a Tabs row inside drops its own. */}
      {children && <div className="mt-4 -mx-1 [&>*]:border-b-0">{children}</div>}
      </div>
    </header>
  );
}

/** A labelled figure for PageHeader's aside: "CASH IN HAND / $1,500,000". */
export function HeaderStat({ label, value, tone = 'ink' }: { label: string; value: React.ReactNode; tone?: 'ink' | 'good' | 'accent' }) {
  const color = tone === 'good' ? 'text-good' : tone === 'accent' ? 'text-accent' : 'text-ink';
  return (
    <div className="text-right">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className={cn('font-mono text-[20px] font-semibold leading-tight', color)}>{value}</div>
    </div>
  );
}
