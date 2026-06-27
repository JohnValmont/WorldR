'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

interface TerminalPanelProps {
  title: string;
  subtitle?: string;
  /** Lucide icon for the header */
  icon?: LucideIcon;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export default function TerminalPanel({
  title,
  subtitle,
  icon: Icon,
  children,
  headerAction,
  className = '',
  fullHeight = false,
}: TerminalPanelProps) {
  return (
    <div className={cn(
      'border border-[#23232b] bg-[#0c0d13] flex flex-col rounded-xl shadow-card',
      fullHeight && 'h-full',
      className,
    )}>
      {/* Header */}
      <div className="bg-[#0a0b11] border-b border-[#23232b] px-4 py-2.5 flex items-center justify-between shrink-0 rounded-t-xl">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-amber shadow-amber-glow animate-pulse-glow shrink-0" />
          {Icon && <Icon size={11} className="text-terminal-amber opacity-70" />}
          <h3 className="text-zinc-300 font-bold text-[10px] uppercase tracking-[0.15em] font-mono leading-none">
            {title}
          </h3>
          {subtitle && (
            <>
              <span className="text-zinc-700 font-mono text-[9px]">•</span>
              <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">{subtitle}</span>
            </>
          )}
        </div>
        {headerAction && <div className="text-[10px] font-mono">{headerAction}</div>}
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {children}
      </div>
    </div>
  );
}
