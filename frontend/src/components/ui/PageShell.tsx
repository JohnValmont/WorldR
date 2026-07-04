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
      <div className={cn('w-full px-4 md:px-6', className)}>
        {/* Single column on mobile/tablet, content + sidebar split at lg+.
            The lg breakpoint lives in globals.css (.page-shell-grid) so the
            sidebar width can stay a runtime prop via the --sidebar-w var. */}
        <div
          className="page-shell-grid"
          style={{ '--sidebar-w': `${sidebarWidth}px` } as React.CSSProperties}
        >
          <div className="min-w-0 flex flex-col gap-6">{children}</div>
          <div className="flex flex-col gap-5 lg:sticky lg:top-0">{sidebar}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full px-4 md:px-6 flex flex-col gap-6', className)}>
      {children}
    </div>
  );
}
