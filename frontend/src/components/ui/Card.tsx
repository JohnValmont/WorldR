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
        'rounded-xl border border-[#23232b] bg-[#0c0d13]',
        'transition-all duration-150',
        hover && 'hover:border-zinc-700 hover:bg-[#0e0f17] cursor-pointer',
        accent && 'border-l-2 border-l-terminal-amber',
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
                {Icon && <Icon size={11} className="text-terminal-amber opacity-80" />}
                {kicker && (
                  <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-terminal-amber">
                    {kicker}
                  </span>
                )}
              </div>
            )}
            {title && (
              <h2 className="text-sm font-semibold text-zinc-100 font-sans leading-tight">
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
