'use client';
// Shared pieces for the Nation and World tabs: flags, number formats, charts
// (recharts), the election timeline and the administrations record.
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { politicsApi } from '@/lib/api';
import { formatPolArc } from '@/lib/calendar';
import type { AdministrationNow, Chronicle, ChronicleAdministration, ChroniclePoint, ElectionOutlook, NationRow } from './types';
import { Chip, T, pct, signed } from './kit';

// ─── Look ───────────────────────────────────────────────────────────────────

/** One fixed colour per nation, in STARTER_NATIONS order (validated for colour-blind separation on the dark surface). */
export const NATION_COLOR: Record<string, string> = { national: '#3987e5', westmark: '#d95926', eryndor: '#199e70' };
export const nationColor = (code: string) => NATION_COLOR[code] ?? T.dim;
export const CARETAKER_COLOR = '#8A8C96';

const TIER_COLOR: Record<string, string> = {
  'Superpower': '#E8B84B', 'Great power': '#C9A2F0', 'Regional power': '#6FB7E8', 'Middle power': '#A3A4AC', 'Minor state': '#6E707A',
};
export const tierColor = (t: string | null | undefined) => (t ? TIER_COLOR[t] ?? T.dim : T.dim);

/** Big numbers, short: 10.4M, $346B, 1,240. */
export function compact(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e11 ? 0 : 1)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(0)}k`;
  return Math.round(n).toLocaleString();
}
export const bn = (n: number) => `${n < 0 ? '−' : ''}$${compact(Math.abs(n))}`;
export const months = (n: number) => `${n} month${n === 1 ? '' : 's'}`;

/** A server error, as a sentence. Admins get the real reason from the server; players a plain one. */
export function errorText(e: any, fallback: string): string {
  const msg = e?.response?.data?.error;
  if (msg && msg !== 'Internal Server Error') return msg;
  const status = e?.response?.status;
  if (status === 401) return 'Your session ended. Log in again.';
  if (status >= 500) return `${fallback} The server hit a problem; it has been logged.`;
  if (!e?.response) return `${fallback} Check your connection.`;
  return fallback;
}

/** A small flag drawn from the nation's recipe (pattern + colours). */
export function Flag({ flag, width = 44 }: { flag: NationRow['flag']; width?: number }) {
  const h = Math.round(width * 0.62);
  const c = flag.colors;
  return (
    <svg width={width} height={h} viewBox="0 0 100 62" role="img" aria-label="Flag" style={{ borderRadius: 4, flexShrink: 0, boxShadow: '0 0 0 1px rgba(255,255,255,0.15)' }}>
      {flag.pattern === 'tricolor-horizontal' && c.slice(0, 3).map((col, i) => <rect key={i} x="0" y={i * 62 / 3} width="100" height={62 / 3 + 0.5} fill={col} />)}
      {flag.pattern === 'tricolor-vertical' && c.slice(0, 3).map((col, i) => <rect key={i} x={i * 100 / 3} y="0" width={100 / 3 + 0.5} height="62" fill={col} />)}
      {flag.pattern === 'cross' && (<><rect width="100" height="62" fill={c[0]} /><rect x="30" y="0" width="12" height="62" fill={c[1]} /><rect x="0" y="25" width="100" height="12" fill={c[1]} /></>)}
      {flag.pattern === 'hoist-triangle-band' && (<><rect width="100" height="62" fill={c[0]} /><rect x="0" y="25" width="100" height="12" fill={c[1]} /><polygon points="0,0 38,31 0,62" fill={c[2] ?? c[1]} /></>)}
      {flag.emblem !== 'none' && flag.pattern !== 'cross' && <circle cx={flag.pattern === 'hoist-triangle-band' ? 13 : 50} cy="31" r="6" fill={flag.emblemColor} />}
    </svg>
  );
}

/** A banner washed in the nation's flag colours. */
export function heroBackground(flag: NationRow['flag']): string {
  const [a, b] = flag.colors;
  return `radial-gradient(120% 140% at 0% 0%, ${a}55 0%, transparent 55%), radial-gradient(90% 120% at 100% 0%, ${b ?? a}33 0%, transparent 60%), linear-gradient(180deg, #171A23 0%, ${T.surface} 100%)`;
}

export function Trend({ value, digits = 1, suffix = '', lowerIsBetter = false }: { value: number | null | undefined; digits?: number; suffix?: string; lowerIsBetter?: boolean }) {
  if (value == null || Math.abs(value) < 0.5 * 10 ** -digits) return null;
  const good = lowerIsBetter ? value < 0 : value > 0;
  return <span className="text-[11px] font-mono whitespace-nowrap" style={{ color: good ? T.good : T.bad }}>{value > 0 ? '▲' : '▼'} {signed(value, digits)}{suffix}</span>;
}

export function Stat({ label, value, bad, sub }: { label: string; value: string; bad?: boolean; sub?: React.ReactNode }) {
  return (
    <div className="rounded-lg py-1.5 px-2 text-center" style={{ background: T.raised }}>
      <div className="font-mono text-sm" style={{ color: bad ? T.bad : T.text }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{label}</div>
      {sub}
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────────────────────

/** The world's history (all nations), shared by the Nation and World tabs. */
export function useChronicle() {
  return useSWR<Chronicle>('politics-chronicle', () => politicsApi.getChronicle(), { refreshInterval: 60_000 });
}

export interface MetricSpec {
  id: string; label: string; short: string;
  value: (p: ChroniclePoint) => number | null;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
  /** A change shown in a tooltip or tile, from the first value to the second. */
  delta: (a: number, b: number) => { value: number; digits: number; suffix: string };
  /** The smallest span the y axis shows around this value, so small moves are not drawn as cliffs. */
  minSpan: (mid: number) => number;
}
export const METRICS: MetricSpec[] = [
  { id: 'rating', label: 'World rating', short: 'Rating', value: p => p.rating, format: v => v.toFixed(1), delta: (a, b) => ({ value: b - a, digits: 1, suffix: '' }), minSpan: () => 8 },
  { id: 'gdp', label: 'Output a year (GDP)', short: 'GDP', value: p => p.gdpYearly, format: v => bn(v), delta: (a, b) => ({ value: a ? (b / a - 1) * 100 : 0, digits: 1, suffix: '%' }), minSpan: mid => Math.abs(mid) * 0.08 },
  { id: 'jobless', label: 'Unemployment', short: 'Jobless', value: p => p.unemployment, format: v => pct(v, 1), lowerIsBetter: true, delta: (a, b) => ({ value: (b - a) * 100, digits: 1, suffix: ' pts' }), minSpan: () => 0.03 },
  { id: 'approval', label: 'Government approval', short: 'Approval', value: p => p.approval, format: v => `${Math.round(v)}%`, delta: (a, b) => ({ value: b - a, digits: 0, suffix: ' pts' }), minSpan: () => 16 },
  { id: 'perPerson', label: 'Output per person', short: 'Per person', value: p => (p.gdpYearly && p.population ? p.gdpYearly / p.population : null), format: v => bn(v), delta: (a, b) => ({ value: a ? (b / a - 1) * 100 : 0, digits: 1, suffix: '%' }), minSpan: mid => Math.abs(mid) * 0.08 },
  { id: 'population', label: 'Population', short: 'People', value: p => p.population, format: v => compact(v), delta: (a, b) => ({ value: a ? (b / a - 1) * 100 : 0, digits: 2, suffix: '%' }), minSpan: mid => Math.abs(mid) * 0.03 },
  { id: 'debt', label: 'Public debt (share of GDP)', short: 'Debt', value: p => (p.debt != null && p.gdpYearly ? p.debt / p.gdpYearly : null), format: v => pct(v, 0), lowerIsBetter: true, delta: (a, b) => ({ value: (b - a) * 100, digits: 1, suffix: ' pts' }), minSpan: () => 0.15 },
];
export const metricById = (id: string) => METRICS.find(m => m.id === id) ?? METRICS[0];

export function MetricTabs({ value, onChange, ids }: { value: string; onChange: (id: string) => void; ids?: string[] }) {
  const list = ids ? METRICS.filter(m => ids.includes(m.id)) : METRICS;
  return (
    <div role="tablist" aria-label="Chart measure" className="flex flex-wrap gap-1">
      {list.map(m => (
        <button key={m.id} type="button" role="tab" aria-selected={value === m.id} onClick={() => onChange(m.id)}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: value === m.id ? T.accentSoft : 'transparent', color: value === m.id ? T.accent : T.faint, border: `1px solid ${value === m.id ? T.accent : T.line}` }}>
          {m.short}
        </button>
      ))}
    </div>
  );
}

// ─── Charts ─────────────────────────────────────────────────────────────────

const AXIS = { fontSize: 10, fill: T.faint };
const GRID = 'rgba(255,255,255,0.06)';

function ChartTooltip({ active, payload, label, metric, series }: any) {
  if (!active || !payload?.length) return null;
  const rows = (series as { key: string; name: string; color: string }[])
    .map(s => ({ ...s, v: payload.find((p: any) => p.dataKey === s.key)?.value }))
    .filter(r => r.v != null)
    .sort((a, b) => (metric.lowerIsBetter ? a.v - b.v : b.v - a.v));
  return (
    <div className="rounded-lg px-3 py-2 text-xs shadow-2xl" style={{ background: T.raised, border: `1px solid ${T.lineStrong}`, color: T.text }}>
      <div className="mb-1 text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{formatPolArc(label, false)}</div>
      {rows.map(r => (
        <div key={r.key} className="flex items-center gap-2">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: r.color }} />
          <span style={{ color: T.dim }}>{r.name}</span>
          <span className="ml-auto pl-3 font-mono">{metric.format(r.v)}</span>
        </div>
      ))}
    </div>
  );
}

/** Time is months (arcs) on the x axis; one line per series. Administration bands shade who governed when. */
export function TrendChart({ series, metric, height = 260, bands, empty }: {
  series: { key: string; name: string; color: string; points: ChroniclePoint[] }[];
  metric: MetricSpec; height?: number;
  bands?: { from: number; to: number; color: string; label: string }[];
  empty?: string;
}) {
  const data = useMemo(() => {
    const byArc = new Map<number, any>();
    for (const s of series) for (const p of s.points) {
      const v = metric.value(p);
      if (v == null) continue;
      const row = byArc.get(p.arc) ?? { arc: p.arc };
      row[s.key] = v;
      byArc.set(p.arc, row);
    }
    return [...byArc.values()].sort((a, b) => a.arc - b.arc);
  }, [series, metric]);
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-xl text-xs text-center px-6" style={{ height, background: T.raised, color: T.faint }}>
        {empty ?? 'The chart fills in as months close. Come back after the next month turns.'}
      </div>
    );
  }
  const first = data[0].arc, last = data[data.length - 1].arc;
  const values = data.flatMap(d => series.map(x => d[x.key]).filter((v: any) => v != null)) as number[];
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = Math.max(hi - lo, metric.minSpan((lo + hi) / 2));
  const pad = (span - (hi - lo)) / 2 + span * 0.08;
  // Round the axis to a readable step (1, 2, 2.5 or 5 times a power of ten).
  const raw = (span + 2 * pad) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map(k => k * pow).find(v => v >= raw) ?? raw;
  const yDomain: [number, number] = [Math.floor((lo - pad) / step) * step, Math.ceil((hi + pad) / step) * step];
  const yTicks: number[] = [];
  for (let v = yDomain[0]; v <= yDomain[1] + step / 2; v += step) yTicks.push(Number(v.toPrecision(12)));
  // Only bands wide enough to read get a label.
  const labelMin = (last - first) * 0.14;
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {bands?.filter(b => b.to > first && b.from < last).map((b, i) => (
            <ReferenceArea key={i} x1={Math.max(b.from, first)} x2={Math.min(b.to, last)} fill={b.color} fillOpacity={0.09} stroke="none"
              label={b.to - b.from >= labelMin ? { value: b.label, position: 'insideTopLeft', fill: T.faint, fontSize: 10 } : undefined} />
          ))}
          <XAxis dataKey="arc" type="number" domain={[first, last]} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }}
            tickFormatter={(a: number) => formatPolArc(a, true)} minTickGap={36} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} domain={yDomain} ticks={yTicks} interval={0} tickFormatter={(v: number) => metric.format(v)} />
          <Tooltip content={<ChartTooltip metric={metric} series={series} />} cursor={{ stroke: T.lineStrong, strokeWidth: 1 }} />
          {series.map(s => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false}
              activeDot={{ r: 4, stroke: T.surface, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A tiny trend line for a stat tile. */
export function Sparkline({ points, metric, color = T.accent, height = 34 }: { points: ChroniclePoint[]; metric: MetricSpec; color?: string; height?: number }) {
  const data = points.map(p => ({ arc: p.arc, v: metric.value(p) })).filter(d => d.v != null);
  if (data.length < 2) return <div style={{ height }} />;
  const id = `spark-${metric.id}-${color.replace('#', '')}`;
  return (
    <div style={{ width: '100%', height }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['auto', 'auto']} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** A headline number with its trend over the last year and a sparkline. */
export function MetricTile({ metric, points, color, note }: { metric: MetricSpec; points: ChroniclePoint[]; color?: string; note?: string }) {
  const vals = points.map(p => ({ arc: p.arc, v: metric.value(p) })).filter(d => d.v != null) as { arc: number; v: number }[];
  const lastP = vals[vals.length - 1];
  const yearAgo = vals.find(d => d.arc >= (lastP?.arc ?? 0) - 12) ?? vals[0];
  const d = lastP && yearAgo && yearAgo !== lastP ? metric.delta(yearAgo.v, lastP.v) : null;
  return (
    <div className="rounded-xl p-3 flex flex-col" style={{ background: T.raised, border: `1px solid ${T.line}` }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{metric.label}</div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="font-serif text-2xl font-bold" style={{ color: T.text }}>{lastP ? metric.format(lastP.v) : '—'}</span>
        {d && <Trend value={d.value} digits={d.digits} suffix={d.suffix} lowerIsBetter={metric.lowerIsBetter} />}
      </div>
      <div className="text-[10px]" style={{ color: T.faint }}>{note ?? (d ? `since ${formatPolArc(yearAgo.arc, true)}` : 'first month')}</div>
      <div className="mt-auto pt-1"><Sparkline points={points} metric={metric} color={color} /></div>
    </div>
  );
}

// ─── Elections ──────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'governing', label: 'Governing' },
  { id: 'filing', label: 'Candidates file' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'polling', label: 'Election day' },
  { id: 'formation', label: 'Forming a government' },
] as const;

/** One line for the header and the world cards. */
export function electionLine(e: ElectionOutlook | null | undefined): string {
  if (!e) return 'No election scheduled';
  if (e.phase === 'polling') return 'Election day: votes are counted when this month turns';
  if (e.phase === 'formation') return `Forming a government${e.formationEndArc != null ? ` · deadline ${formatPolArc(e.formationEndArc, true)}` : ''}`;
  return `Next election ${formatPolArc(e.electionArc, true)} · in ${months(e.monthsToElection)}`;
}

/** Where the nation is in the election cycle, with the dates of each stage. */
export function ElectionTimeline({ phase, arc, filingArc, campaignArc, electionArc, formationEndArc, monthsToElection, nextEstimate, nation }: {
  phase: string; arc: number; filingArc: number; campaignArc: number; electionArc: number; formationEndArc: number; monthsToElection: number;
  nextEstimate?: number | null; nation: string;
}) {
  const idx = STAGES.findIndex(s => s.id === phase);
  const when: Record<string, string> = {
    governing: 'now', filing: formatPolArc(filingArc, true), campaign: formatPolArc(campaignArc, true),
    polling: formatPolArc(electionArc, true), formation: `until ${formatPolArc(formationEndArc, true)}`,
  };
  const headline = phase === 'formation'
    ? `${nation} voted in ${formatPolArc(electionArc, false)}. Parties are forming a government.`
    : phase === 'polling' ? `${nation} votes this month.`
    : `${nation} votes in ${formatPolArc(electionArc, false)}`;
  return (
    <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.line}` }} id="election-timeline">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: T.accent }}>The election</div>
          <div className="font-serif text-lg font-bold leading-snug" style={{ color: T.text }}>{headline}</div>
        </div>
        {phase !== 'formation' && phase !== 'polling' && (
          <div className="text-right">
            <div className="font-serif text-3xl font-bold leading-none" style={{ color: T.text }}>{monthsToElection}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>month{monthsToElection === 1 ? '' : 's'} to go</div>
          </div>
        )}
        {phase === 'formation' && nextEstimate != null && (
          <div className="text-right text-xs" style={{ color: T.dim }}>Next election about<br /><strong style={{ color: T.text }}>{formatPolArc(nextEstimate, false)}</strong></div>
        )}
      </div>
      <ol className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Election cycle">
        {STAGES.map((s, i) => {
          const done = i < idx, now = i === idx;
          return (
            <li key={s.id} className="min-w-0">
              <div className="h-1.5 rounded-full" style={{ background: now ? T.accent : done ? 'rgba(232,184,75,0.4)' : 'rgba(255,255,255,0.1)' }} />
              <div className="mt-1.5 text-[11px] font-semibold truncate" style={{ color: now ? T.text : done ? T.dim : T.faint }}>{s.label}</div>
              <div className="text-[10px] font-mono truncate" style={{ color: now ? T.accent : T.faint }}>{now && s.id !== 'formation' ? 'now' : when[s.id]}</div>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px]" style={{ color: T.faint }}>
        Filing opens {formatPolArc(filingArc, false)}: stand for a district before then. Votes are counted on election day and a government must form by {formatPolArc(formationEndArc, false)}.
        Until it does, the head of state&apos;s caretaker government keeps the country running.
      </p>
    </div>
  );
}

// ─── Administrations ────────────────────────────────────────────────────────

export function AdministrationBadge({ a, compactView = false }: { a: AdministrationNow | ChronicleAdministration; compactView?: boolean }) {
  const caretaker = a.kind === 'caretaker';
  const color = caretaker ? CARETAKER_COLOR : a.partyColor ?? T.accent;
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="mt-1 inline-block rounded-sm shrink-0" style={{ width: 4, height: compactView ? 26 : 34, background: color }} aria-hidden />
      <div className="min-w-0">
        <div className={`font-serif font-bold leading-tight ${compactView ? 'text-sm truncate' : 'text-base'}`} style={{ color: T.text }}>{a.name}</div>
        <div className="text-[11px] truncate" style={{ color: T.dim }}>
          {a.headTitle} {a.headName}{caretaker ? ' · interim' : a.partyName ? ` · ${a.partyName}${a.coalition.length ? ` + ${a.coalition.length}` : ''}` : ''}
          {a.isPlayer && <span style={{ color: T.accent }}> · player</span>}
        </div>
      </div>
    </div>
  );
}

function ChangeCell({ label, value, digits, suffix, lowerIsBetter, scale = 1 }: { label: string; value: number | null | undefined; digits: number; suffix: string; lowerIsBetter?: boolean; scale?: number }) {
  return (
    <div className="rounded-lg px-2 py-1.5" style={{ background: T.bg }}>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{label}</div>
      {value == null || Math.abs(value * scale) < 0.5 * 10 ** -digits
        ? <div className="text-xs font-mono" style={{ color: T.faint }}>no change</div>
        : <Trend value={value * scale} digits={digits} suffix={suffix} lowerIsBetter={lowerIsBetter} />}
    </div>
  );
}

/** Who ruled, from when to when, and what changed. Newest first. */
export function AdministrationHistory({ list, nation }: { list: ChronicleAdministration[]; nation: string }) {
  const [open, setOpen] = useState<string | null>(list[0]?.id ?? null);
  if (list.length === 0) {
    return <p className="text-sm" style={{ color: T.dim }}>The record of {nation}&apos;s administrations starts when the next month turns.</p>;
  }
  return (
    <ol className="relative space-y-3" aria-label={`Administrations of ${nation}`}>
      <span className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: T.line }} aria-hidden />
      {list.map(a => {
        const color = a.kind === 'caretaker' ? CARETAKER_COLOR : a.partyColor ?? T.accent;
        const isOpen = open === a.id;
        return (
          <li key={a.id ?? a.name} className="relative pl-6">
            <span className="absolute left-0 top-3 inline-block rounded-full" style={{ width: 15, height: 15, background: T.surface, border: `3px solid ${color}`, boxShadow: a.current ? `0 0 0 4px ${color}33` : undefined }} aria-hidden />
            <button type="button" className="w-full text-left rounded-xl p-3" onClick={() => setOpen(isOpen ? null : a.id)}
              style={{ background: T.raised, border: `1px solid ${a.current ? color : T.line}` }} aria-expanded={isOpen}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-serif text-base font-bold" style={{ color: T.text }}>{a.name}</span>
                    {a.current && <Chip color={T.accent}>in office</Chip>}
                    {a.kind === 'caretaker' && <Chip color={CARETAKER_COLOR}>caretaker</Chip>}
                  </div>
                  <div className="text-[11px]" style={{ color: T.dim }}>
                    {a.headTitle} {a.headName}{a.isPlayer ? ' (player)' : ''}
                    {a.partyName ? ` · ${a.partyName}` : ''}{a.coalition.length ? ` with ${a.coalition.join(', ')}` : ''}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-right" style={{ color: T.faint }}>
                  {a.startArc != null ? formatPolArc(a.startArc, true) : '—'} → {a.endArc != null ? formatPolArc(a.endArc, true) : 'today'}
                  <div>{months(a.months)} · {a.laws.count} law{a.laws.count === 1 ? '' : 's'}</div>
                </div>
              </div>
              {isOpen && a.change && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  <ChangeCell label="Rating" value={a.change.rating} digits={1} suffix="" />
                  <ChangeCell label="GDP" value={a.change.gdpGrowth} digits={1} suffix="%" scale={100} />
                  <ChangeCell label="Jobless" value={a.change.unemployment} digits={1} suffix=" pts" scale={100} lowerIsBetter />
                  <ChangeCell label="Approval" value={a.change.approval} digits={0} suffix=" pts" />
                  <ChangeCell label="People" value={a.change.population != null && a.start?.population ? a.change.population / a.start.population : null} digits={2} suffix="%" scale={100} />
                  <ChangeCell label="Debt / GDP" value={a.change.debt != null && a.start?.gdpYearly ? a.change.debt / a.start.gdpYearly : null} digits={1} suffix=" pts" scale={100} lowerIsBetter />
                </div>
              )}
              {isOpen && (
                <div className="mt-2 text-[11px]" style={{ color: T.dim }}>
                  {a.laws.titles.length > 0
                    ? <>Laws passed: {a.laws.titles.join(' · ')}{a.laws.count > a.laws.titles.length ? ` and ${a.laws.count - a.laws.titles.length} more` : ''}.</>
                    : a.kind === 'caretaker' ? 'No laws passed while the caretaker government served.' : 'No laws passed yet.'}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Shaded periods for a nation chart: one per administration. */
export function administrationBands(list: ChronicleAdministration[], nowArc: number) {
  return list.filter(a => a.startArc != null).map(a => ({
    from: a.startArc!, to: a.endArc ?? nowArc,
    color: a.kind === 'caretaker' ? CARETAKER_COLOR : a.partyColor ?? T.accent,
    label: a.name.replace(/ (Administration|Caretaker Government)$/, a.kind === 'caretaker' ? ' (caretaker)' : ''),
  }));
}
