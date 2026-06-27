'use client';
import React from 'react';
import { cn } from './utils';

interface ProgressBarProps {
  /** Progress from 0 to 100 */
  value: number;
  /** Optional max value, defaults to 100 */
  max?: number;
  /** Color variant */
  variant?: 'amber' | 'green' | 'blue' | 'red' | 'zinc';
  /** Show the percentage label inside or next to the bar */
  showLabel?: boolean;
  className?: string;
  barClassName?: string;
}

const bgMap: Record<string, string> = {
  amber: 'bg-terminal-amber',
  green: 'bg-terminal-green',
  blue:  'bg-terminal-blue',
  red:   'bg-terminal-red',
  zinc:  'bg-zinc-400',
};

const textMap: Record<string, string> = {
  amber: 'text-terminal-amber',
  green: 'text-terminal-green',
  blue:  'text-terminal-blue',
  red:   'text-terminal-red',
  zinc:  'text-zinc-400',
};

export default function ProgressBar({
  value,
  max = 100,
  variant = 'amber',
  showLabel = false,
  className,
  barClassName,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={cn('flex items-center gap-3 w-full', className)}>
      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden relative">
        <div
          className={cn(
            'absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out',
            bgMap[variant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-[10px] font-mono font-bold shrink-0 w-8 text-right', textMap[variant])}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}
