'use client';
import React from 'react';

interface TerminalPanelProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
  className?: string;
  fullHeight?: boolean;
}

export default function TerminalPanel({
  title, subtitle, children, headerAction, className = '', fullHeight = false
}: TerminalPanelProps) {
  return (
    <div className={`border border-premium-muted bg-[#080907]/90 flex flex-col rounded-sm shadow-lg backdrop-blur-md ${fullHeight ? 'h-full' : ''} ${className}`}>
      <div className="bg-[#0c0d0b] border-b border-zinc-900/60 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse shrink-0" />
          <h3 className="text-zinc-300 font-extrabold text-[10px] uppercase tracking-[0.15em] font-mono leading-none">{title}</h3>
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
