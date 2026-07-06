'use client';
import React from 'react';
import { Factory, Truck, Building2, Landmark, Home, LucideIcon } from 'lucide-react';
import { SEGMENT_PERSONAS } from '../_lib/identity';

const ICONS: Record<string, LucideIcon> = { Factory, Truck, Building2, Landmark, Home };

interface PersonaCardProps {
  segmentKey: string;
  label: string;
  size: number; // 0..1 share of electorate
  /** Optional leading party name in this bloc (for the projection view). */
  leadingParty?: string;
  leadingColor?: string;
  leadingShare?: number; // 0..1
}

/**
 * PersonaCard — a voter segment rendered as a person/place, not a table row.
 * Shows the bloc nickname, its electorate weight, its leaning, and (optionally)
 * who's currently winning it.
 */
export default function PersonaCard({
  segmentKey,
  label,
  size,
  leadingParty,
  leadingColor,
  leadingShare,
}: PersonaCardProps) {
  const persona = SEGMENT_PERSONAS[segmentKey];
  const Icon = persona ? ICONS[persona.icon] : Landmark;
  const accent = persona?.color || '#4A6178';
  return (
    <div className="p-3.5 border border-[#252637] bg-[#1c1d2e] rounded-sm flex flex-col gap-2">
      <div className="flex items-center gap-2.5">
        <span
          className="flex items-center justify-center rounded-sm shrink-0"
          style={{ width: 34, height: 34, background: `${accent}22`, border: `1px solid ${accent}55` }}
        >
          <Icon size={16} style={{ color: accent }} />
        </span>
        <div className="min-w-0">
          <div className="text-white text-sm truncate">{persona?.nickname || label}</div>
          <div className="text-[10px] text-[#8b8da8] truncate">{label}</div>
        </div>
        <span className="ml-auto text-[#c4c6d8] font-mono text-sm shrink-0">
          {(size * 100).toFixed(0)}%
        </span>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-[#8b8da8]">
        {persona?.lean}
      </div>

      {leadingParty != null && (
        <div className="pt-2 border-t border-[#252637]">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-[#8b8da8] uppercase tracking-wider">Leading</span>
            <span className="text-white truncate ml-2">{leadingParty}</span>
          </div>
          <div className="h-1.5 w-full bg-[#13141f] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.round((leadingShare || 0) * 100)}%`, background: leadingColor || accent }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
