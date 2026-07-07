'use client';
import React from 'react';
import { AXES, type Axis } from '@/lib/politicsConstants';
import { AXIS_LABELS, PLATFORM_STANCES } from '../_lib/identity';

interface PlatformBarsProps {
  platform: Record<string, number>;
  className?: string;
}

function stanceFor(axis: Axis, value: number) {
  const stances = PLATFORM_STANCES[axis];
  if (value <= 33) return stances[0];
  if (value >= 67) return stances[2];
  return stances[1];
}

/** Compact 5-axis horizontal bar readout. Used in DoctrineGallery preview and PartyTab. */
export default function PlatformBars({ platform, className = '' }: PlatformBarsProps) {
  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      {AXES.map((axis) => {
        const value = platform[axis] ?? 50;
        const stance = stanceFor(axis, value);
        const pct = value; // 0-100 maps directly to bar width %

        return (
          <div key={axis}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-[#6b6d8a] font-mono">
                {AXIS_LABELS[axis].label}
              </span>
              <span
                className={[
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider',
                  value <= 33
                    ? 'bg-[#A33A3A]/20 text-[#c96060]'
                    : value >= 67
                    ? 'bg-[#3A6A8A]/20 text-[#5a9aba]'
                    : 'bg-[#2A2B3D] text-[#8b8da8]',
                ].join(' ')}
              >
                {stance.name}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[#1a1b2e] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background:
                    value <= 33
                      ? '#A33A3A'
                      : value >= 67
                      ? '#3A6A8A'
                      : '#e8752a',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
