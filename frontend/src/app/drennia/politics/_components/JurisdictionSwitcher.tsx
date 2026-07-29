'use client';
import React from 'react';
import { JURISDICTIONS, type JurisdictionId } from '../_lib/session';
import { JURISDICTION_MODEL } from '../_lib/model';
import { Landmark, Building2, Lock } from 'lucide-react';

interface Props {
  selected: JurisdictionId;
  onChange: (id: JurisdictionId) => void;
  meta?: any;
}

export default function JurisdictionSwitcher({ selected, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800/60 rounded-xl p-1.5 backdrop-blur-md w-fit mb-4">
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider text-amber-400 border-r border-zinc-800/80">
        <Landmark size={14} className="text-amber-400" />
        <span>Jurisdiction</span>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {JURISDICTIONS.map((j) => {
          const isSelected = j.id === selected;
          const model = JURISDICTION_MODEL[j.id];
          const seats = model?.seats || 151;
          const icon = j.id === 'national' ? <Landmark size={13} /> : <Building2 size={13} />;

          return (
            <button
              key={j.id}
              onClick={() => {
                if (j.id !== 'national') {
                  window.alert("State assemblies are locked in Pre-Alpha. Coming soon!");
                  return;
                }
                onChange(j.id as JurisdictionId);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-amber-400/10 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.15)] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              } ${j.id !== 'national' ? 'opacity-60 hover:opacity-100' : ''}`}
            >
              {icon}
              <span>{j.name}</span>
              <span className={`flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-amber-400/20 text-amber-200' : 'bg-zinc-800 text-zinc-400'}`}>
                {seats} seats
                {j.id !== 'national' && <Lock size={10} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
