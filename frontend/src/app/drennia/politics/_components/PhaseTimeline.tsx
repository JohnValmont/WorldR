'use client';
import React from 'react';
import { PHASE_ORDER, phaseIndex } from '../_lib/identity';

interface PhaseTimelineProps {
  phase: string | undefined;
  /** Months/arcs until the next phase (optional). */
  countdown?: number;
  className?: string;
}

/**
 * PhaseTimeline — the election-cycle session shown as a linear stepper:
 * Filing → Campaign → Polling → Formation → Governing. The active phase glows;
 * completed phases are filled; upcoming are muted. Reads at 400px and up.
 */
export default function PhaseTimeline({ phase, countdown, className }: PhaseTimelineProps) {
  const current = phaseIndex(phase);
  return (
    <div className={className}>
      <div className="flex items-stretch gap-1.5">
        {PHASE_ORDER.map((p, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'todo';
          return (
            <div key={p.key} className="flex-1 min-w-0">
              <div
                className={
                  'h-1 rounded-full transition-colors ' +
                  (state === 'done'
                    ? 'bg-terminal-amber/50'
                    : state === 'active'
                    ? 'bg-terminal-amber animate-pulse-glow'
                    : 'bg-[#2A2630]')
                }
              />
              <div
                className={
                  'mt-1.5 text-[8px] sm:text-[9px] font-mono uppercase tracking-[0.12em] truncate ' +
                  (state === 'active'
                    ? 'text-terminal-amber font-bold'
                    : state === 'done'
                    ? 'text-[#A79D8C]'
                    : 'text-[#6B6358]')
                }
              >
                <span className="sm:hidden">{p.short}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      {current >= 0 && (
        <p className="mt-2.5 text-[11px] text-[#A79D8C]">
          {PHASE_ORDER[current].description}
          {countdown != null && countdown > 0 && (
            <span className="text-[#F4EBD6]">
              {' '}
              · next phase in {countdown} {countdown === 1 ? 'month' : 'months'}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
