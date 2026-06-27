'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from './utils';

interface SectionHeadingProps {
  children: React.ReactNode;
  /** Lucide icon */
  icon?: LucideIcon;
  /** Small uppercase stamp / tag (e.g. "STEP 1 OF 7") */
  stamp?: string;
  /** Right-aligned action link or element */
  action?: React.ReactNode;
  /** View-all href shorthand */
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
}

export default function SectionHeading({
  children,
  icon: Icon,
  stamp,
  action,
  viewAllHref,
  viewAllLabel = 'View All →',
  className,
}: SectionHeadingProps) {
  const right = action ?? (viewAllHref ? (
    <Link
      href={viewAllHref}
      className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors duration-150"
    >
      {viewAllLabel}
    </Link>
  ) : null);

  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-2">
        {Icon && <Icon size={13} className="text-terminal-amber" />}
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber font-bold">
          {children}
        </span>
        {stamp && (
          <span className="text-[8px] font-mono text-zinc-600 border border-[#23232b] px-1.5 py-0.5 tracking-[0.1em] uppercase">
            {stamp}
          </span>
        )}
      </div>
      {right}
    </div>
  );
}
