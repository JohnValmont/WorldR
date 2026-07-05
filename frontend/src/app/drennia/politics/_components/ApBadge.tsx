'use client';
import React from 'react';
import { Zap } from 'lucide-react';

interface ApBadgeProps {
  current: number;
  cap: number;
  size?: 'sm' | 'lg';
  className?: string;
}

/** Nationhood-style AP badge: orange pill for SM, stat card for LG */
export default function ApBadge({ current, cap, size = 'sm', className = '' }: ApBadgeProps) {
  const isEmpty = current === 0;

  if (size === 'lg') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`text-3xl font-bold ${isEmpty ? 'text-[#6b6d8a]' : 'text-white'}`}>
          {current}
        </div>
        <div className="flex flex-col justify-center">
          <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] leading-none">of {cap}</div>
          <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] leading-none mt-0.5">AP left</div>
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded-full ${
        isEmpty
          ? 'bg-[#2a2b3d] text-[#6b6d8a]'
          : 'bg-[#e8752a] text-white'
      } ${className}`}
      title={`${current} / ${cap} Action Points`}
    >
      <Zap size={9} />
      {current} AP
    </span>
  );
}
