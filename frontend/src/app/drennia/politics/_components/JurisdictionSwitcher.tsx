'use client';
import React from 'react';
import { Lock } from 'lucide-react';
import { JURISDICTIONS, type JurisdictionId } from '../_lib/session';

// Phase-to-dot-color map matching PhaseTimeline colors.
const PHASE_COLOR: Record<string, string> = {
  filing:    '#C9A24A',
  campaign:  '#558CB8',
  polling:   '#7A5C86',
  formation: '#4D8C6A',
  governing: '#4D705C',
};

interface JurisdictionMeta {
  id: JurisdictionId;
  phase?: string;
  badge?: number; // attention count
}

interface JurisdictionSwitcherProps {
  selected: JurisdictionId;
  onChange: (id: JurisdictionId) => void;
  /** Live phase/badge data keyed by jurisdiction id — passed from page-level overview. */
  meta?: Partial<Record<JurisdictionId, JurisdictionMeta>>;
}

export default function JurisdictionSwitcher({
  selected,
  onChange,
  meta = {},
}: JurisdictionSwitcherProps) {
  return (
    <div className="flex items-center gap-0 border-b border-[#2A2630] bg-[#0D0F14] overflow-x-auto no-scrollbar mb-6">
      <div className="px-3 py-2 shrink-0">
        <div className="text-[8px] font-mono uppercase tracking-[0.28em] text-[#6B6358]">Scope</div>
      </div>
      <div className="flex">
        {JURISDICTIONS.map((j) => {
          const isSelected = selected === j.id;
          const isLocked = j.isLocked;
          const m = meta[j.id];
          const phase = m?.phase;
          const badge = m?.badge;
          const dotColor = phase ? (PHASE_COLOR[phase] ?? '#6B6358') : '#2A2630';

          return (
            <button
              key={j.id}
              onClick={() => { if (!isLocked) onChange(j.id as JurisdictionId); }}
              disabled={isLocked}
              title={isLocked ? 'Coming Soon' : j.name}
              className={[
                'relative flex items-center gap-2 px-4 py-3 text-[10px] font-mono uppercase tracking-[0.12em] whitespace-nowrap transition-colors duration-150 border-b-2',
                isSelected && !isLocked
                  ? 'border-terminal-amber text-terminal-amber font-bold'
                  : isLocked
                  ? 'border-transparent text-[#3A3630] cursor-not-allowed'
                  : 'border-transparent text-[#6B6358] hover:text-[#A79D8C] cursor-pointer',
              ].join(' ')}
            >
              {/* Phase dot */}
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: isLocked ? '#2A2630' : dotColor }}
              />

              {j.name}

              {isLocked && <Lock size={9} className="text-[#3A3630] ml-0.5" />}

              {/* Attention badge */}
              {!isLocked && badge != null && badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] leading-none bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/30 rounded-sm">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
