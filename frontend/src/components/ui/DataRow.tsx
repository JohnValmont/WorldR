'use client';
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  /** Color variant for value */
  valueVariant?: 'default' | 'green' | 'red' | 'amber' | 'blue' | 'muted';
  /** Optional small badge after the value */
  badge?: React.ReactNode;
  /** Optional lucide icon before label */
  icon?: LucideIcon;
  /** Whether to show bottom border */
  border?: boolean;
  className?: string;
  onClick?: () => void;
}

const valueVariantMap: Record<string, string> = {
  default: 'text-zinc-100',
  green:   'text-terminal-green',
  red:     'text-terminal-red',
  amber:   'text-terminal-amber',
  blue:    'text-terminal-blue',
  muted:   'text-zinc-500',
};

export default function DataRow({
  label,
  value,
  valueVariant = 'default',
  badge,
  icon: Icon,
  border = true,
  className,
  onClick,
}: DataRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-baseline justify-between py-2.5',
        border && 'border-b border-[#23232b]',
        onClick && 'cursor-pointer',
        'hover:bg-zinc-900/50 -mx-1 px-1 rounded transition-colors duration-100',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-zinc-500 flex-shrink-0" />}
        <span className="text-[11px] text-zinc-400">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 ml-4">
        <span className={cn('text-[12px] font-mono font-semibold', valueVariantMap[valueVariant])}>
          {value}
        </span>
        {badge}
      </div>
    </div>
  );
}
