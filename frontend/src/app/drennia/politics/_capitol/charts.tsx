'use client';
import React, { useMemo, useState } from 'react';
import type { CapitolParty, PollPoint } from './types';
import { C, PHASES, fmtPct } from './theme';
import { formatPolArc } from '@/lib/calendar';

// ─── Hemicycle ──────────────────────────────────────────────────────────────

interface SeatDot { x: number; y: number; angle: number; r: number }

function layoutHemicycle(total: number, rows: number): SeatDot[] {
  const radii = Array.from({ length: rows }, (_, i) => 0.46 + (0.54 * i) / Math.max(1, rows - 1));
  const sumR = radii.reduce((a, b) => a + b, 0);
  const perRow = radii.map(r => Math.floor((total * r) / sumR));
  let left = total - perRow.reduce((a, b) => a + b, 0);
  for (let i = rows - 1; left > 0; i = (i - 1 + rows) % rows, left--) perRow[i]++;
  const dots: SeatDot[] = [];
  radii.forEach((r, i) => {
    const n = perRow[i];
    for (let k = 0; k < n; k++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI - (Math.PI * k) / (n - 1);
      dots.push({ x: r * Math.cos(angle), y: r * Math.sin(angle), angle, r });
    }
  });
  // Left-to-right wedges: sort by angle (left = PI), outer rows first within a wedge.
  return dots.sort((a, b) => b.angle - a.angle || b.r - a.r);
}

/**
 * The chamber: one dot per seat, parties seated left to right by ideology.
 * Government parties are ringed in brass. Empty seats (before the first
 * election) are grey.
 */
export function Hemicycle({ parties, total, majority, governmentIds, size = 420, showLegend = true }: {
  parties: CapitolParty[]; total: number; majority: number; governmentIds: string[]; size?: number; showLegend?: boolean;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = total > 120 ? 8 : total > 60 ? 6 : 4;
  const dots = useMemo(() => layoutHemicycle(total, rows), [total, rows]);
  const seated = parties.filter(p => p.seats > 0); // already ordered by lean (left first)
  const owner: (CapitolParty | null)[] = [];
  for (const p of seated) for (let i = 0; i < p.seats; i++) owner.push(p);
  while (owner.length < total) owner.push(null);
  const dotR = 0.54 / (rows * 1.75);
  const gov = new Set(governmentIds);
  const govSeats = seated.filter(p => gov.has(p.id)).reduce((a, p) => a + p.seats, 0);

  return (
    <div>
      <svg viewBox="-1.08 -1.08 2.16 1.24" width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }} role="img" aria-label={`Parliament chamber, ${total} seats`}>
        <path d="M-1.04,0 A1.04,1.04 0 0 1 1.04,0" fill="none" stroke={C.line} strokeWidth="0.006" transform="scale(1,-1)" />
        <g transform="scale(1,-1)">
          {dots.map((d, i) => {
            const p = owner[i];
            const dim = hover && p?.id !== hover;
            return (
              <circle
                key={i}
                cx={d.x} cy={d.y} r={dotR}
                fill={p ? p.color : '#2A3142'}
                opacity={dim ? 0.25 : 1}
                stroke={p && gov.has(p.id) ? C.brass : 'none'}
                strokeWidth={dotR * 0.45}
                onMouseEnter={() => p && setHover(p.id)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{p ? `${p.name} — ${p.seats} seats` : 'Empty seat'}</title>
              </circle>
            );
          })}
        </g>
        <text x="0" y="-0.04" textAnchor="middle" fontSize="0.19" fill={C.ivory} fontFamily="Cinzel, serif" fontWeight="700">{seated.length ? govSeats || '—' : total}</text>
        <text x="0" y="0.1" textAnchor="middle" fontSize="0.058" fill={C.muted} letterSpacing="0.01">
          {seated.length ? (govSeats ? `government seats · ${majority} for a majority` : `no government · ${majority} for a majority`) : `seats · first election pending`}
        </text>
      </svg>
      {showLegend && seated.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
          {seated.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: C.ink }}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: p.color, boxShadow: gov.has(p.id) ? `0 0 0 2px ${C.brass}` : undefined }} />
              <span>{p.abbreviation}</span>
              <span className="font-mono" style={{ color: C.ivory }}>{p.seats}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Seat bar (projection or sitting) with majority marker ──────────────────

export function SeatBar({ parties, seats, total, majority }: { parties: CapitolParty[]; seats: Record<string, number>; total: number; majority: number }) {
  const ordered = parties.filter(p => (seats[p.id] || 0) > 0);
  return (
    <div>
      <div className="relative h-7 rounded-md overflow-hidden flex" style={{ background: '#1C2333' }}>
        {ordered.map(p => (
          <div key={p.id} title={`${p.name}: ${seats[p.id]} seats`} style={{ width: `${(100 * seats[p.id]) / total}%`, background: p.color }} className="h-full flex items-center justify-center text-[10px] font-semibold text-white/90 overflow-hidden whitespace-nowrap">
            {seats[p.id] >= 8 ? `${p.abbreviation} ${seats[p.id]}` : ''}
          </div>
        ))}
        <div className="absolute top-[-3px] bottom-[-3px] w-[2px]" style={{ left: `${(100 * majority) / total}%`, background: C.ivory }} />
      </div>
      <div className="relative h-4 text-[10px] mt-1" style={{ color: C.muted }}>
        <span className="absolute -translate-x-1/2" style={{ left: `${(100 * majority) / total}%` }}>{majority} = majority</span>
      </div>
    </div>
  );
}

// ─── Poll trend chart ───────────────────────────────────────────────────────

export function PollChart({ history, parties, height = 220 }: { history: PollPoint[]; parties: CapitolParty[]; height?: number }) {
  const W = 640, H = height, padL = 34, padR = 64, padT = 12, padB = 26;
  const points = history.filter(h => Object.keys(h.shares).length > 0);
  if (points.length < 2) {
    const last = points[0];
    if (!last) return <div className="text-sm py-8 text-center" style={{ color: C.muted }}>The first poll is taken at the end of the month.</div>;
    const ordered = [...parties].sort((a, b) => (last.shares[b.id] || 0) - (last.shares[a.id] || 0));
    const max = Math.max(...ordered.map(p => last.shares[p.id] || 0), 0.01);
    return (
      <div className="space-y-2">
        {ordered.map(p => (
          <div key={p.id} className="flex items-center gap-3 text-xs">
            <span className="w-10 font-semibold" style={{ color: C.ink }}>{p.abbreviation}</span>
            <div className="flex-1 h-3 rounded" style={{ background: '#1C2333' }}>
              <div className="h-3 rounded" style={{ width: `${(100 * (last.shares[p.id] || 0)) / max}%`, background: p.color }} />
            </div>
            <span className="w-12 text-right font-mono" style={{ color: C.ivory }}>{fmtPct(last.shares[p.id] || 0)}</span>
          </div>
        ))}
      </div>
    );
  }
  const arcs = points.map(p => p.arc);
  const minA = Math.min(...arcs), maxA = Math.max(...arcs);
  const maxShare = Math.max(0.1, ...points.flatMap(p => Object.values(p.shares))) * 1.15;
  const x = (a: number) => padL + ((a - minA) / Math.max(1, maxA - minA)) * (W - padL - padR);
  const y = (s: number) => padT + (1 - s / maxShare) * (H - padT - padB);
  const gridSteps = [0, 0.1, 0.2, 0.3, 0.4, 0.5].filter(s => s <= maxShare);
  const last = points[points.length - 1];
  // Spread end labels so they don't overlap.
  const labels = parties
    .filter(p => last.shares[p.id] != null)
    .map(p => ({ p, y: y(last.shares[p.id] || 0) }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 12) labels[i].y = labels[i - 1].y + 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Opinion poll trend">
      {gridSteps.map(s => (
        <g key={s}>
          <line x1={padL} x2={W - padR} y1={y(s)} y2={y(s)} stroke={C.lineSoft} />
          <text x={padL - 6} y={y(s) + 3} textAnchor="end" fontSize="10" fill={C.faint}>{Math.round(s * 100)}%</text>
        </g>
      ))}
      <text x={padL} y={H - 6} fontSize="10" fill={C.faint}>{formatPolArc(minA)}</text>
      <text x={W - padR} y={H - 6} fontSize="10" fill={C.faint} textAnchor="end">{formatPolArc(maxA)}</text>
      {parties.map(p => {
        const pts = points.filter(h => h.shares[p.id] != null).map(h => `${x(h.arc).toFixed(1)},${y(h.shares[p.id]).toFixed(1)}`);
        if (pts.length < 2) return null;
        return <polyline key={p.id} points={pts.join(' ')} fill="none" stroke={p.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />;
      })}
      {labels.map(({ p, y: ly }) => (
        <g key={p.id}>
          <circle cx={x(last.arc)} cy={y(last.shares[p.id] || 0)} r="3.5" fill={p.color} />
          <text x={W - padR + 8} y={ly + 4} fontSize="11" fill={C.ink} fontWeight="600">{p.abbreviation} <tspan fill={C.ivory} fontFamily="JetBrains Mono, monospace" fontWeight="400">{fmtPct(last.shares[p.id] || 0, 0)}</tspan></text>
        </g>
      ))}
    </svg>
  );
}

// ─── Approval dial ──────────────────────────────────────────────────────────

export function ApprovalDial({ value, size = 160, label = 'Government approval' }: { value: number; size?: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = Math.PI * (1 - v / 100);
  const nx = 50 + 36 * Math.cos(angle), ny = 54 - 36 * Math.sin(angle);
  const arc = (from: number, to: number) => {
    const a1 = Math.PI * (1 - from / 100), a2 = Math.PI * (1 - to / 100);
    return `M${50 + 40 * Math.cos(a1)},${54 - 40 * Math.sin(a1)} A40,40 0 0 1 ${50 + 40 * Math.cos(a2)},${54 - 40 * Math.sin(a2)}`;
  };
  const tone = v >= 55 ? C.yea : v <= 45 ? C.nay : C.brass;
  return (
    <svg viewBox="0 0 100 70" width={size} role="img" aria-label={`${label}: ${v.toFixed(0)}%`}>
      <path d={arc(0, 40)} stroke={C.nay} strokeOpacity="0.55" strokeWidth="7" fill="none" />
      <path d={arc(40, 60)} stroke={C.brass} strokeOpacity="0.55" strokeWidth="7" fill="none" />
      <path d={arc(60, 100)} stroke={C.yea} strokeOpacity="0.55" strokeWidth="7" fill="none" />
      <line x1="50" y1="54" x2={nx} y2={ny} stroke={C.ivory} strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="54" r="3.5" fill={C.ivory} />
      <text x="50" y="68" textAnchor="middle" fontSize="11" fontWeight="700" fill={tone} fontFamily="JetBrains Mono, monospace">{v.toFixed(0)}%</text>
    </svg>
  );
}

// ─── Election calendar ──────────────────────────────────────────────────────

export function PhaseTrack({ phase, arc, filingArc, campaignArc, electionArc, formationEndArc }: {
  phase: string; arc: number; filingArc: number; campaignArc: number; electionArc: number; formationEndArc: number;
}) {
  const at: Record<string, number> = { governing: arc, filing: filingArc, campaign: campaignArc, polling: electionArc, formation: electionArc + 1 };
  const idx = PHASES.findIndex(p => p.key === phase);
  return (
    <ol className="grid grid-cols-5 gap-1">
      {PHASES.map((p, i) => {
        const done = i < idx, current = i === idx;
        return (
          <li key={p.key} className="min-w-0">
            <div className="h-1.5 rounded-full" style={{ background: current ? C.brass : done ? 'rgba(201,162,39,0.45)' : '#222B3D' }} />
            <div className="mt-1.5 text-[11px] font-semibold truncate" style={{ color: current ? C.ivory : C.muted }}>{p.label}</div>
            <div className="text-[10px] font-mono truncate" style={{ color: C.faint }}>
              {p.key === 'governing' ? (current ? 'now' : '') : formatPolArc(p.key === 'formation' ? formationEndArc : at[p.key])}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── National stat bars ─────────────────────────────────────────────────────

export function StatBar({ name, value, good, blurb }: { name: string; value: number; good: 'high' | 'low'; blurb: string }) {
  const v = Math.max(0, Math.min(100, value));
  const goodness = good === 'high' ? v : 100 - v;
  const tone = goodness >= 55 ? C.yea : goodness <= 45 ? C.nay : C.brass;
  return (
    <div title={blurb}>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: C.ink }}>{name}</span>
        <span className="font-mono" style={{ color: tone }}>{v.toFixed(0)}</span>
      </div>
      <div className="h-1.5 rounded-full relative" style={{ background: '#1C2333' }}>
        <div className="absolute top-0 bottom-0 w-px" style={{ left: '50%', background: C.faint }} />
        <div className="h-1.5 rounded-full" style={{ width: `${v}%`, background: tone }} />
      </div>
    </div>
  );
}
