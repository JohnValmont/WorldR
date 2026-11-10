'use client';
import React from 'react';
import type { Capitol } from './types';
import { C, STAT_LABELS } from './theme';
import { NationFlag, CoatOfArms } from './art';
import { Panel, Pill } from './ui';
import { StatBar } from './charts';

const REGION_SHAPES: Record<string, { d: string; label: [number, number] }> = {
  // Stylised map of Drennia (not to scale): coast to the west, hills to the east.
  westport: { d: 'M40,70 C60,40 120,30 150,50 L170,120 C150,150 110,170 70,160 C40,150 25,110 40,70 Z', label: [100, 105] },
  drennport: { d: 'M150,50 C190,30 250,35 275,60 L270,125 C240,140 200,135 170,120 Z', label: [220, 92] },
  ironvale: { d: 'M275,60 C320,50 360,70 370,110 C372,150 340,170 300,170 L270,125 Z', label: [322, 118] },
  greenmere: { d: 'M70,160 C110,170 150,150 170,120 L270,125 L300,170 C280,210 200,225 130,215 C90,208 65,190 70,160 Z', label: [190, 182] },
};

export default function NationTab({ cap }: { cap: Capitol }) {
  const n = cap.nation;
  const flag = n.flag;
  const seatsByRegion: Record<string, number> = {};
  for (const d of cap.districts) seatsByRegion[d.region] = (seatsByRegion[d.region] || 0) + d.seats;
  const facts: [string, React.ReactNode][] = [
    ['Government', n.government],
    ['Capital', n.capital],
    ['Head of state', n.headOfState ? `${n.headOfState.title} ${n.headOfState.name}` : null],
    ['Head of government', cap.premier ? `Premier ${cap.premier.name}` : 'Caretaker (no election yet)'],
    ['Legislature', `${n.legislature.name}, ${n.legislature.seats} seats`],
    ['Term', n.legislature.termMonths ? `${n.legislature.termMonths / 12} years` : null],
    ['Population', cap.state.population ? cap.state.population.toLocaleString() : null],
    ['Registered voters', cap.state.registeredVoters ? cap.state.registeredVoters.toLocaleString() : null],
    ['Currency', n.currency],
    ['Demonym', n.demonym],
  ];

  return (
    <div className="space-y-4">
      <Panel pad={false}>
        <div className="grid md:grid-cols-[auto_1fr] gap-6 p-5 sm:p-6 items-center">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <div className="rounded-sm" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5)' }}><NationFlag spec={flag} width={220} /></div>
            <div className="hidden sm:block"><CoatOfArms spec={flag} size={96} /></div>
          </div>
          <div className="text-center md:text-left">
            <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.brass }}>Starter nation</div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold mt-1" style={{ color: C.ivory }}>{n.officialName}</h2>
            {n.motto && <p className="font-serif italic mt-1" style={{ color: C.ink }}>&ldquo;{n.motto}&rdquo;</p>}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-xs">
              {facts.filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b py-1" style={{ borderColor: C.lineSoft }}>
                  <dt style={{ color: C.muted }}>{k}</dt><dd className="text-right" style={{ color: C.ivory }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel kicker="Founding law" title="The Constitution">
          <ol className="space-y-2.5">
            {(n.constitution ?? []).map((a, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-relaxed" style={{ color: C.ink }}>
                <span className="font-serif font-bold shrink-0 w-6 text-right" style={{ color: C.brass }}>{['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][i] ?? i + 1}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
          {n.headOfState && <p className="text-xs mt-4 pt-3 border-t" style={{ color: C.muted, borderColor: C.lineSoft }}><b style={{ color: C.ink }}>{n.headOfState.title}:</b> {n.headOfState.role}</p>}
          {n.legislature.electoralSystem && <p className="text-xs mt-2" style={{ color: C.muted }}><b style={{ color: C.ink }}>Elections:</b> {n.legislature.electoralSystem}</p>}
        </Panel>

        <Panel kicker="Geography" title="Regions">
          <svg viewBox="20 20 370 215" width="100%" className="mb-3" role="img" aria-label="Map of Drennia's regions">
            <path d="M20,235 L20,20 L60,20 C40,60 25,110 40,150 C50,190 40,220 20,235 Z" fill="#0F2236" opacity="0.8" />
            {Object.entries(REGION_SHAPES).map(([code, s]) => (
              <g key={code}>
                <path d={s.d} fill={C.stone2} stroke={C.brass} strokeOpacity="0.5" strokeWidth="1.2" />
                <text x={s.label[0]} y={s.label[1] - 4} textAnchor="middle" fontSize="11" fontFamily="Cinzel, serif" fontWeight="700" fill={C.ivory}>{n.regions?.find(r => r.code === code)?.name}</text>
                <text x={s.label[0]} y={s.label[1] + 10} textAnchor="middle" fontSize="9" fill={C.muted}>{seatsByRegion[code] ?? 0} seats</text>
              </g>
            ))}
            <circle cx="215" cy="62" r="4" fill={C.crimson} stroke={C.ivory} strokeWidth="1" />
            <text x="223" y="58" fontSize="8" fill={C.ink}>capital</text>
          </svg>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {(n.regions ?? []).map(r => (
              <div key={r.code} className="rounded-lg p-3" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm" style={{ color: C.ivory }}>{r.name}</span>
                  <Pill>{seatsByRegion[r.code] ?? 0} seats</Pill>
                </div>
                <p className="text-[11px] mt-1" style={{ color: C.ink }}>{r.character}</p>
                <p className="text-[10px] mt-1" style={{ color: C.muted }}>{r.economy}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel kicker="Statistics" title="National conditions">
        <p className="text-xs mb-3" style={{ color: C.muted }}>50 is normal. Laws push these up or down over months or years. Several of them feed into business costs and car demand.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
          {Object.entries(STAT_LABELS).map(([k, s]) => <StatBar key={k} name={s.name} value={cap.stats[k] ?? 50} good={s.good} blurb={s.blurb} />)}
        </div>
      </Panel>
    </div>
  );
}
