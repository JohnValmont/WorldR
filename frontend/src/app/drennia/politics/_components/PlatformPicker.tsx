'use client';
import React from 'react';
import { AXES, type Axis } from '@/lib/politicsConstants';
import { PLATFORM_STANCES, AXIS_LABELS } from '../_lib/identity';

interface PlatformPickerProps {
  platform: Record<string, number>;
  onChange?: (axis: string, value: number) => void;
  disabled?: boolean;
}

function stanceIndexFor(value: number): number {
  if (value <= 33) return 0;
  if (value >= 67) return 2;
  return 1;
}

export default function PlatformPicker({ platform, onChange, disabled = false }: PlatformPickerProps) {
  return (
    <div className="flex flex-col gap-5">
      {AXES.map((axis) => {
        const stances = PLATFORM_STANCES[axis as Axis];
        const currentValue = platform[axis] ?? 50;
        const selectedIdx = stanceIndexFor(currentValue);

        return (
          <div key={axis}>
            <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-[#A79D8C] mb-2">
              {AXIS_LABELS[axis as Axis].label}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {stances.map((stance, idx) => {
                const isSelected = selectedIdx === idx;
                return (
                  <button
                    key={stance.value}
                    onClick={() => !disabled && onChange?.(axis, stance.value)}
                    disabled={disabled}
                    className={[
                      'relative text-left p-3 rounded border transition-all duration-150 focus:outline-none',
                      disabled ? 'opacity-60 cursor-default' : 'cursor-pointer',
                      isSelected
                        ? 'border-terminal-amber bg-[#1A1810] shadow-[0_0_0_1px_rgba(218,165,32,0.25)]'
                        : 'border-[#2A2630] bg-[#0D0E14] hover:border-[#3D3645] hover:bg-[#111219]',
                    ].join(' ')}
                  >
                    {isSelected && (
                      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-terminal-amber" />
                    )}
                    <span
                      className={[
                        'inline-block text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5',
                        isSelected ? 'bg-terminal-amber/20 text-terminal-amber' : 'bg-[#1E1D24] text-[#6B6358]',
                      ].join(' ')}
                    >
                      {stance.lean}
                    </span>
                    <div className={['text-sm font-semibold leading-tight mb-1', isSelected ? 'text-[#F4EBD6]' : 'text-[#C4BAA8]'].join(' ')}>
                      {stance.name}
                    </div>
                    <div className="text-[10px] text-[#6B6358] leading-relaxed">
                      {stance.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
