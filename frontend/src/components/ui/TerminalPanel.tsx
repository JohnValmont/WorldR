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
    <div className={`border border-zinc-800 bg-zinc-950 flex flex-col ${fullHeight ? 'h-full' : ''} ${className}`}>
      <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-amber-500 font-bold text-[10px] uppercase tracking-widest">{title}</h3>
          {subtitle && <span className="text-zinc-600 text-[9px] uppercase tracking-wider">{subtitle}</span>}
        </div>
        {headerAction && <div className="text-[10px]">{headerAction}</div>}
      </div>
      <div className="flex-1 p-3 overflow-auto">
        {children}
      </div>
    </div>
  );
}
