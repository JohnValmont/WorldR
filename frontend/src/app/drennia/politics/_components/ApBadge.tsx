'use client';
import React from 'react';
import { Zap } from 'lucide-react';

interface ApBadgeProps {
  current: number;
  cap: number;
  /** Size variant — 'sm' for inline card badge, 'lg' for the profile strip */
  size?: 'sm' | 'lg';
  className?: string;
}

/** Displays current/cap AP with a lightning-bolt icon.
 *  Color shifts: green when full, amber when mid, red when 0.
 */
export default function ApBadge({ current, cap, size = 'sm', className = '' }: ApBadgeProps) {
  const frac = cap > 0 ? current / cap : 0;
  const color =
    current === 0   ? 'text-[#B85555] border-[#B85555]/40 bg-[#8F3D3D]/10'
    : frac >= 0.75  ? 'text-[#4D8C6A] border-[#4D8C6A]/40 bg-[#4D8C6A]/10'
    : frac >= 0.4   ? 'text-terminal-amber border-terminal-amber/40 bg-terminal-amber/10'
                    : 'text-[#B8855A] border-[#B8855A]/40 bg-[#8F5A3D]/10';

  if (size === 'lg') {
    return (
      <div className={`flex flex-col items-center gap-1 border p-3 ${color} ${className}`}>
        <div className="flex items-center gap-1.5">
          <Zap size={13} />
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-70">Action Points</span>
        </div>
        <div className="text-2xl font-serif font-bold">
          {current}<span className="text-base opacity-50">/{cap}</span>
        </div>
        <div className="flex gap-0.5 mt-1">
          {Array.from({ length: cap }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-1.5 rounded-sm transition-all ${
                i < current ? 'opacity-100' : 'opacity-20'
              }`}
              style={{ background: 'currentColor' }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border rounded-sm ${color} ${className}`}
      title={`${current} / ${cap} Action Points`}
    >
      <Zap size={9} />
      {current}/{cap} AP
    </span>
  );
}
