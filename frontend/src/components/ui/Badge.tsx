'use client';
import React from 'react';
import { cn } from './utils';

// ── Badge ──────────────────────────────────────────────────────────────────────

type BadgeVariant = 'amber' | 'green' | 'red' | 'blue' | 'zinc' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'xs' | 'sm';
  className?: string;
}

const badgeVariantMap: Record<BadgeVariant, string> = {
  amber:  'text-terminal-amber  border-terminal-amber/30  bg-terminal-amber/10',
  green:  'text-terminal-green  border-terminal-green/30  bg-terminal-green/10',
  red:    'text-terminal-red    border-terminal-red/30    bg-terminal-red/10',
  blue:   'text-terminal-blue   border-terminal-blue/30   bg-terminal-blue/10',
  zinc:   'text-zinc-400        border-zinc-700           bg-zinc-900/40',
  purple: 'text-purple-400      border-purple-800         bg-purple-950/40',
};

const dotVariantMap: Record<BadgeVariant, string> = {
  amber:  'bg-terminal-amber',
  green:  'bg-terminal-green',
  red:    'bg-terminal-red',
  blue:   'bg-terminal-blue',
  zinc:   'bg-zinc-400',
  purple: 'bg-purple-400',
};

export function Badge({ children, variant = 'zinc', dot = false, size = 'xs', className }: BadgeProps) {
  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
  return (
    <span className={cn(
      'inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono uppercase tracking-widest',
      textSize,
      badgeVariantMap[variant],
      className,
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotVariantMap[variant])} />}
      {children}
    </span>
  );
}

// ── StatusDot ─────────────────────────────────────────────────────────────────

type StatusDotVariant = 'live' | 'warning' | 'danger' | 'offline';

interface StatusDotProps {
  variant?: StatusDotVariant;
  label?: string;
  className?: string;
}

const dotColorMap: Record<StatusDotVariant, string> = {
  live:    'bg-terminal-green  shadow-[0_0_6px_#30d158]  animate-pulse-glow',
  warning: 'bg-terminal-amber  shadow-[0_0_6px_#ff9f0a]',
  danger:  'bg-terminal-red    shadow-[0_0_6px_#ff453a]',
  offline: 'bg-zinc-600',
};

const dotLabelMap: Record<StatusDotVariant, string> = {
  live:    'text-terminal-green',
  warning: 'text-terminal-amber',
  danger:  'text-terminal-red',
  offline: 'text-zinc-500',
};

export function StatusDot({ variant = 'offline', label, className }: StatusDotProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColorMap[variant])} />
      {label && (
        <span className={cn('text-[9px] font-mono uppercase tracking-widest', dotLabelMap[variant])}>
          {label}
        </span>
      )}
    </span>
  );
}

// Re-export for backward compat
export default Badge;
