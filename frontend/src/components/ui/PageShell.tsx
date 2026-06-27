'use client';
import React from 'react';
import { cn } from './utils';

interface PageShellProps {
  children: React.ReactNode;
  /** Optional right sidebar content */
  sidebar?: React.ReactNode;
  /** Sidebar width in pixels (default 340) */
  sidebarWidth?: number;
  className?: string;
}

/** Constrains content to max-w-7xl, applies standard padding, and optionally lays out a right sidebar */
export default function PageShell({ children, sidebar, sidebarWidth = 340, className }: PageShellProps) {
  if (sidebar) {
    return (
      <div className={cn('w-full max-w-7xl mx-auto px-4 md:px-6', className)}>
        <div
          className="grid gap-6 items-start"
          style={{ gridTemplateColumns: `1fr ${sidebarWidth}px` }}
        >
          <div className="min-w-0 flex flex-col gap-6">{children}</div>
          <div className="flex flex-col gap-5 sticky top-0">{sidebar}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-7xl mx-auto px-4 md:px-6 flex flex-col gap-6', className)}>
      {children}
    </div>
  );
}
