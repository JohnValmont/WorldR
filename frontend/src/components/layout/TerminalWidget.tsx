import React from 'react';

interface TerminalWidgetProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerAction?: React.ReactNode;
}

export default function TerminalWidget({
  title,
  subtitle = 'LIVE',
  children,
  headerAction,
}: TerminalWidgetProps) {
  return (
    <div className="border border-zinc-800 bg-zinc-950 flex flex-col h-full overflow-hidden text-zinc-100 font-mono">
      {/* Widget Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h2 className="text-amber-500 font-bold text-xs uppercase tracking-wider">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {headerAction && <div className="text-[10px]">{headerAction}</div>}
          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{subtitle}</span>
        </div>
      </div>

      {/* Widget Body */}
      <div className="flex-1 p-3 overflow-y-auto text-xs scrollbar-thin">
        {children}
      </div>
    </div>
  );
}
