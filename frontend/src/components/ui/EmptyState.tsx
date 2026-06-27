'use client';
import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from './utils';
import Button from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  heading?: string;
  message: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  heading,
  message,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center py-12 px-6 gap-3',
      className,
    )}>
      <div className="w-10 h-10 rounded-full border border-[#23232b] bg-[#0c0d13] flex items-center justify-center mb-1">
        <Icon size={18} className="text-zinc-600" />
      </div>
      {heading && (
        <p className="text-[12px] font-semibold text-zinc-400">{heading}</p>
      )}
      <p className="text-[11px] text-zinc-600 max-w-[280px] leading-relaxed font-mono italic">
        {message}
      </p>
      {action && (
        <div className="mt-2">
          {action.href ? (
            <Button href={action.href} variant={action.variant ?? 'secondary'} size="sm">
              {action.label}
            </Button>
          ) : (
            <Button onClick={action.onClick} variant={action.variant ?? 'secondary'} size="sm">
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
