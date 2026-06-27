'use client';
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
        'w-full border-b border-[#23232b] bg-[#090A0F]/90 backdrop-blur-md z-20 overflow-x-auto no-scrollbar',
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
                'flex items-center gap-2 px-4 py-3.5 text-[10px] font-mono uppercase tracking-[0.1em] whitespace-nowrap transition-colors duration-200 outline-none relative z-10',
                isActive
                  ? 'text-terminal-amber font-bold'
                  : isDisabled
                  ? 'text-zinc-700 cursor-not-allowed'
                  : 'text-zinc-500 hover:text-zinc-300 cursor-pointer'
              )}
              title={tab.locked ? 'Register a company to unlock' : undefined}
            >
              {Icon && <Icon size={12} className={isActive ? 'text-terminal-amber' : 'text-zinc-500'} />}
              <span>{tab.label}</span>
              {tab.locked && <span className="ml-1 text-zinc-600">🔒</span>}
            </button>
          );
        })}
        {/* Animated Underline */}
        <div
          className="absolute bottom-0 h-[2px] bg-terminal-amber transition-all duration-300 ease-out shadow-[0_-2px_8px_#ff9f0a]"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>
    </div>
  );
}
