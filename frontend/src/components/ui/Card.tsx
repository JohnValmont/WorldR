'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Small uppercase label above the title */
  kicker?: string;
  /** Lucide icon next to the kicker */
  icon?: LucideIcon;
  /** Card title */
  title?: string;
  /** Right-aligned header slot (e.g. badge or link) */
  headerSlot?: React.ReactNode;
  /** Enable subtle hover border brightness */
  hover?: boolean;
  /** Amber left border accent */
  accent?: boolean;
  /** Extra padding variant */
  pad?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: React.CSSProperties;
}

const padMap = { sm: 'p-4', md: 'p-5', lg: 'p-6' };

export default function Card({
  children,
  className,
  kicker,
  icon: Icon,
  title,
  headerSlot,
  hover = false,
  accent = false,
  pad = 'md',
  onClick,
  style,
}: CardProps) {
  const hasHeader = kicker || title || headerSlot;

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        // Same material as the politics Card (_floor/kit.tsx): sheen, hairline, soft depth.
        'rounded-2xl border border-line bg-surface shadow-card',
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.035)_0%,rgba(255,255,255,0)_38%)]',
        'transition-all duration-150',
        hover && 'hover:border-line-strong hover:bg-raised cursor-pointer',
        accent && 'border-accent/50',
        onClick && 'cursor-pointer',
        padMap[pad],
        className,
      )}
    >
      {hasHeader && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-0.5">
            {(kicker || Icon) && (
              <div className="flex items-center gap-1.5">
                {Icon && <Icon size={13} className="text-accent" />}
                {kicker && (
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
                    {kicker}
                  </span>
                )}
              </div>
            )}
            {title && (
              <h2 className="text-[17px] font-semibold text-ink font-sans leading-tight">
                {title}
              </h2>
            )}
          </div>
          {headerSlot && <div className="flex items-center">{headerSlot}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
