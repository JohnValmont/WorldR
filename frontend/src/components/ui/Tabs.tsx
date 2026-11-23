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
}

interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  sticky?: boolean;
  top?: number;
}

export default function Tabs({
  tabs,
  activeId,
  onChange,
  className,
  sticky = false,
  top = 0,
}: TabsProps) {
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
        'w-full border-b border-[#262B36] bg-[#0B0D12]/90 backdrop-blur-md z-20 overflow-x-auto no-scrollbar',
        sticky && 'sticky',
        className
      )}
      style={sticky ? { top: `${top}px` } : undefined}
    >
      <div ref={containerRef} className="flex relative px-4 md:px-6">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          const isDisabled = tab.disabled || tab.locked;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
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
    </div>
  );
}
