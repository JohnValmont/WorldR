'use client';
import { Lock } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from './utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  locked?: boolean;
  /** Small count after the label (hidden when 0). */
  badge?: number;
  /** 'warn' tints the badge for something that needs attention. */
  tone?: 'warn';
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  sticky?: boolean;
  top?: number;
  /** Accessible name for the tab group, e.g. "Business sections". */
  label?: string;
  /** Right-aligned content in the tab row (e.g. a link to a related screen). */
  trailing?: React.ReactNode;
  /** Horizontal padding of the tab row; pages with their own gutter pass 'none'. */
  inset?: 'page' | 'none';
}

export default function Tabs({
  tabs,
  activeId,
  onChange,
  className,
  sticky = false,
  top = 0,
  label = 'Sections',
  trailing,
  inset = 'page',
}: TabsProps) {
  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const enabled = tabs.filter(t => !t.disabled && !t.locked);
    const i = enabled.findIndex(t => t.id === activeId);
    const next = e.key === 'Home' ? enabled[0] : e.key === 'End' ? enabled[enabled.length - 1]
      : enabled[(i + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    if (next) { e.preventDefault(); onChange(next.id); containerRef.current?.querySelector<HTMLElement>(`[data-tab="${next.id}"]`)?.focus(); }
  };
  // A small trick for animated underline
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const activeTab = containerRef.current.querySelector('[data-state="active"]') as HTMLElement;
    if (activeTab) {
      setIndicatorStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    }
  }, [activeId, tabs]);

  return (
    <div
      className={cn(
        'w-full border-b border-line bg-bg/90 backdrop-blur-md z-20 overflow-x-auto scrollbar-hide',
        sticky && 'sticky',
        className
      )}
      style={sticky ? { top: `${top}px` } : undefined}
    >
      <div className={cn('flex items-center', inset === 'page' && 'page-frame')}>
      <div ref={containerRef} role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex relative items-center">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          const isDisabled = tab.disabled || tab.locked;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled || undefined}
              tabIndex={isActive ? 0 : -1}
              data-tab={tab.id}
              data-state={isActive ? 'active' : 'inactive'}
              onClick={() => {
                if (!isDisabled) onChange(tab.id);
              }}
              disabled={isDisabled}
              className={cn(
                'flex items-center gap-2 px-3.5 py-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 relative z-10',
                isActive
                  ? 'text-accent font-semibold'
                  : isDisabled
                  ? 'text-ink-faint cursor-not-allowed'
                  : 'text-ink-dim hover:text-ink cursor-pointer'
              )}
              title={tab.locked ? 'Register a company to unlock' : undefined}
            >
              {Icon && <Icon size={14} className={isActive ? 'text-accent' : 'text-ink-faint'} />}
              <span>{tab.label}</span>
              {tab.locked && <Lock size={12} className="ml-0.5 text-ink-faint" aria-label="locked" />}
              {tab.badge != null && tab.badge > 0 && (
                <span className={cn('rounded-full px-1.5 text-[11px] font-semibold leading-[18px]', tab.tone === 'warn' ? 'bg-warn/20 text-warn' : 'bg-accent/15 text-accent')}>{tab.badge}</span>
              )}
            </button>
          );
        })}
        {/* Animated Underline */}
        <div
          className="absolute bottom-0 h-[2px] rounded-full bg-accent transition-all duration-300 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>
      {trailing && <div className="ml-auto flex shrink-0 items-center pl-4">{trailing}</div>}
      </div>
    </div>
  );
}
