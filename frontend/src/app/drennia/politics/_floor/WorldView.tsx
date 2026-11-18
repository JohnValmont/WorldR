'use client';
// World: every nation side by side. The ranking, how each has moved over time,
// who governs each one, when each votes next, and how they get along.
import React, { useMemo, useState } from 'react';
import { formatPolArc } from '@/lib/calendar';
import type { ChronicleNation, NationRow } from './types';
import { Card, Chip, Label, Meter, T, pct, useFloor } from './kit';
import {
  AdministrationBadge, CARETAKER_COLOR, Flag, METRICS, MetricTabs, Sparkline, TrendChart, Trend, compact, bn, electionLine,
  errorText, heroBackground, metricById, months, nationColor, tierColor, useChronicle,
} from './worldKit';

const score = (n: NationRow) => n.sim?.rating ?? n.power.overall;
const MEDAL = ['#E8B84B', '#C7CBD6', '#C08A5B'];

function RankCard({ n, rank, history }: { n: NationRow; rank: number; history: ChronicleNation | undefined }) {
  const color = nationColor(n.polStateCode);
  const sim = n.sim;
  return (
    <Card className="p-0 overflow-hidden" tone={n.mine ? 'accent' : undefined}>
      <div className="p-4" style={{ background: heroBackground(n.flag) }}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex items-center justify-center rounded-full font-serif font-bold text-sm" style={{ width: 28, height: 28, background: `${MEDAL[rank - 1] ?? T.raised}22`, color: MEDAL[rank - 1] ?? T.dim, border: `1px solid ${MEDAL[rank - 1] ?? T.line}` }}>{rank}</span>
          </div>
          <Flag flag={n.flag} width={52} />
          <div className="min-w-0 flex-1">
            <div className="font-serif text-xl font-bold leading-tight truncate" style={{ color: T.text }}>{n.name}</div>
            <div className="text-[11px] truncate" style={{ color: T.dim }}>{n.government}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-serif text-3xl font-bold leading-none" style={{ color: T.text }}>{sim ? sim.rating.toFixed(1) : n.power.overall}</div>
            <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>of 100</div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {sim && <Chip color={tierColor(sim.tier)} filled>{sim.tier}</Chip>}
          {sim && <Trend value={sim.ratingTrend} />}
          {n.mine && <Chip color={T.accent} filled>your nation</Chip>}
        </div>
        {history && <div className="mt-2"><Sparkline points={history.series} metric={metricById('rating')} color={color} height={38} /></div>}
      </div>
      <div className="p-4 space-y-3">
        {n.administration && <AdministrationBadge a={n.administration} />}
        <div className="text-xs rounded-lg px-2.5 py-1.5 flex items-center gap-2" style={{ background: n.election?.phase === 'formation' || n.election?.phase === 'polling' ? T.accentSoft : T.raised, color: T.dim }}>
          <span aria-hidden>🗳</span><span>{electionLine(n.election)}</span>
        </div>
        {sim && (
          <div className="grid grid-cols-3 gap-2">
            <Stat2 label="GDP / yr" value={bn(sim.gdpYearly)} />
            <Stat2 label="Jobless" value={pct(sim.unemployment, 1)} bad={sim.unemployment > 0.08} />
            <Stat2 label="Approval" value={`${Math.round(n.approval)}%`} bad={n.approval < 50} />
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px]" style={{ color: T.faint }}>
          <span>Players</span>
          <span className="inline-flex gap-[3px]">{Array.from({ length: n.cap }, (_, k) => <span key={k} className="inline-block rounded-full" style={{ width: 7, height: 7, background: k < n.players ? color : 'rgba(255,255,255,0.14)' }} />)}</span>
          <span className="font-mono">{n.players}/{n.cap}</span>
          <span className="ml-auto">{n.leadParty ? `${n.governmentSeats} of ${n.seats} seats` : `${n.seats}-seat ${n.legislatureName}`}</span>
        </div>
      </div>
    </Card>
  );
}

function Stat2({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="rounded-lg py-1.5 text-center" style={{ background: T.raised }}>
      <div className="font-mono text-sm" style={{ color: bad ? T.bad : T.text }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>{label}</div>
    </div>
  );
}

/** Each pillar of the rating, one bar per nation. */
function Pillars({ nations }: { nations: NationRow[] }) {
  const ids = nations[0]?.sim?.pillars.map(p => p.id) ?? [];
  if (!ids.length) return null;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>What the rating is made of</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>0–100 each</span>
      </div>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {ids.map(id => {
          const rows = nations.map(n => ({ n, p: n.sim!.pillars.find(x => x.id === id)! })).filter(r => r.p);
          const top = Math.max(...rows.map(r => r.p.value));
          return (
            <div key={id}>
              <div className="text-xs font-semibold mb-1" style={{ color: T.text }}>{rows[0]?.p.name}</div>
              <div className="space-y-1">
                {rows.map(({ n, p }) => (
                  <div key={n.polStateCode} className="flex items-center gap-2">
                    <span className="w-16 text-[11px] truncate" style={{ color: T.dim }}>{n.name}</span>
                    <div className="flex-1"><Meter value={p.value} color={nationColor(n.polStateCode)} height={6} /></div>
                    <span className="w-7 text-right font-mono text-[11px]" style={{ color: p.value === top ? T.text : T.faint }}>{Math.round(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Head-to-head numbers; the best in each row is marked. */
function Compare({ nations }: { nations: NationRow[] }) {
  const rows: { label: string; get: (n: NationRow) => number | null; fmt: (v: number) => string; lower?: boolean }[] = [
    { label: 'World rating', get: n => n.sim?.rating ?? null, fmt: v => v.toFixed(1) },
    { label: 'Output a year', get: n => n.sim?.gdpYearly ?? null, fmt: bn },
    { label: 'Per person', get: n => n.sim?.gdpPerPerson ?? null, fmt: bn },
    { label: 'Population', get: n => n.sim?.population ?? null, fmt: compact },
    { label: 'Unemployment', get: n => n.sim?.unemployment ?? null, fmt: v => pct(v, 1), lower: true },
    { label: 'Debt / GDP', get: n => n.sim?.budget.debtRatio ?? null, fmt: v => pct(v, 0), lower: true },
    { label: 'Trade balance', get: n => n.sim?.trade.balanceYearly ?? null, fmt: bn },
    { label: 'Approval', get: n => n.approval, fmt: v => `${Math.round(v)}%` },
  ];
  return (
    <Card className="p-4 overflow-x-auto">
      <Label>Head to head</Label>
      <table className="mt-2 w-full text-sm" style={{ minWidth: 420 }}>
        <thead>
          <tr className="text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>
            <th className="text-left font-semibold py-1.5" />
            {nations.map(n => (
              <th key={n.polStateCode} className="text-right font-semibold py-1.5">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block rounded-full" style={{ width: 8, height: 8, background: nationColor(n.polStateCode) }} />{n.name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const vals = nations.map(r.get);
            const known = vals.filter((v): v is number => v != null);
            const best = known.length ? (r.lower ? Math.min(...known) : Math.max(...known)) : null;
            return (
              <tr key={r.label} style={{ borderTop: `1px solid ${T.line}` }}>
                <td className="py-1.5 text-xs" style={{ color: T.dim }}>{r.label}</td>
                {vals.map((v, i) => (
                  <td key={i} className="py-1.5 text-right font-mono text-xs" style={{ color: v != null && v === best ? T.accent : T.text }}>
                    {v == null ? '—' : r.fmt(v)}{v != null && v === best && known.length > 1 ? ' ★' : ''}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-2 text-[11px]" style={{ color: T.faint }}>★ best in the world on that measure. The rating is for comparison only: it never moves votes.</p>
    </Card>
  );
}

const relWord = (s: number) => (s >= 75 ? 'Allies' : s >= 60 ? 'Friendly' : s >= 40 ? 'Neutral' : s >= 25 ? 'Cool' : 'Hostile');
const relColor = (s: number) => (s >= 60 ? T.good : s >= 40 ? T.dim : T.bad);

/** How every pair of nations gets along, and the treaties between them. */
function Relations({ nations }: { nations: NationRow[] }) {
  const pairs: { a: NationRow; b: NationRow; score: number; treaties: string[] }[] = [];
  nations.forEach((a, i) => nations.slice(i + 1).forEach(b => {
    const r = a.sim?.foreign.relations.find(x => x.code === b.polStateCode);
    if (!r) return;
    const treaties = (a.sim?.foreign.treaties ?? []).filter(t => t.with === b.polStateCode && t.status === 'active').map(t => t.name);
    pairs.push({ a, b, score: r.score, treaties });
  }));
  if (!pairs.length) return null;
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label>Relations</Label>
        <span className="text-[11px]" style={{ color: T.faint }}>50 is neutral</span>
      </div>
      <div className="mt-3 space-y-3">
        {pairs.map(p => (
          <div key={`${p.a.polStateCode}-${p.b.polStateCode}`} className="rounded-xl p-3" style={{ background: T.raised }}>
            <div className="flex items-center gap-2">
              <Flag flag={p.a.flag} width={26} />
              <span className="text-sm font-semibold" style={{ color: T.text }}>{p.a.name}</span>
              <span className="flex-1 mx-1 h-px" style={{ background: `linear-gradient(90deg, ${nationColor(p.a.polStateCode)}, ${relColor(p.score)}, ${nationColor(p.b.polStateCode)})` }} />
              <span className="text-sm font-semibold" style={{ color: T.text }}>{p.b.name}</span>
              <Flag flag={p.b.flag} width={26} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1"><Meter value={p.score} color={relColor(p.score)} marker={50} height={5} /></div>
              <span className="text-xs whitespace-nowrap" style={{ color: relColor(p.score) }}>{relWord(p.score)} · <span className="font-mono">{Math.round(p.score)}</span></span>
            </div>
            {p.treaties.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{p.treaties.map(t => <Chip key={t} color={t.toLowerCase().includes('embargo') ? T.bad : T.good} filled>{t}</Chip>)}</div>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Changes of government across the world, newest first. */
function WorldTimeline({ history }: { history: ChronicleNation[] }) {
  const events = history.flatMap(n => n.administrations.filter(a => a.startArc != null).map(a => ({ n, a })))
    .sort((x, y) => (y.a.startArc! - x.a.startArc!) || x.n.name.localeCompare(y.n.name)).slice(0, 12);
  return (
    <Card className="p-4">
      <Label>Changes of government</Label>
      {events.length === 0
        ? <p className="mt-2 text-sm" style={{ color: T.dim }}>The world&apos;s record of governments starts when the next month turns.</p>
        : (
          <ol className="mt-3 space-y-2">
            {events.map(({ n, a }) => (
              <li key={`${n.code}-${a.id}`} className="flex items-start gap-3 text-sm">
                <span className="w-16 shrink-0 font-mono text-[11px] pt-0.5" style={{ color: T.faint }}>{formatPolArc(a.startArc!, true)}</span>
                <span className="mt-1.5 inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: nationColor(n.code) }} />
                <span className="min-w-0" style={{ color: T.dim }}>
                  <strong style={{ color: T.text }}>{n.name}:</strong> the <strong style={{ color: a.kind === 'caretaker' ? CARETAKER_COLOR : T.text }}>{a.name}</strong>
                  {a.kind === 'caretaker' ? ` takes charge until a government forms (${a.headTitle} ${a.headName}).` : ` takes office under ${a.headTitle} ${a.headName}${a.partyName ? ` (${a.partyName})` : ''}.`}
                  {!a.current && a.endArc != null && <span style={{ color: T.faint }}> Served {months(a.months)}.</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
    </Card>
  );
}

export default function WorldView() {
  const { desk } = useFloor();
  const { data: chronicle, error } = useChronicle();
  const nations = useMemo(() => [...desk.desk.world].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)), [desk.desk.world]);
  const order = desk.desk.world.map(n => n.polStateCode); // fixed order for colours and legends
  const [metric, setMetric] = useState('rating');
  const m = metricById(metric);
  const history = chronicle?.nations ?? [];
  const series = order.map(code => {
    const h = history.find(x => x.code === code);
    const n = desk.desk.world.find(x => x.polStateCode === code)!;
    return { key: code, name: n.name, color: nationColor(code), points: h?.series ?? [] };
  });
  const players = desk.desk.world.reduce((a, n) => a + n.players, 0);
  const leader = nations[0];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 100% 0%, rgba(57,135,229,0.22) 0%, transparent 55%), radial-gradient(100% 120% at 0% 100%, rgba(217,89,38,0.16) 0%, transparent 55%), linear-gradient(180deg,#171A23,#12141B)', border: `1px solid ${T.line}` }}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.accent }}>The world stage · {formatPolArc(desk.calendar.arc, false)}</div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight mt-1" style={{ color: T.text }}>{desk.desk.world.length} nations. One ranking.</h2>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: T.dim }}>
          They started on level terms. What each becomes, from Minor state to Superpower, is decided by whoever governs it.
          {leader?.sim ? ` ${leader.name} leads with ${leader.sim.rating.toFixed(1)}.` : ''} {players} player{players === 1 ? '' : 's'} in the world.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {nations.map((n, i) => <RankCard key={n.polStateCode} n={n} rank={i + 1} history={history.find(h => h.code === n.polStateCode)} />)}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label>The race over time</Label>
            <div className="font-serif text-lg font-bold" style={{ color: T.text }}>{m.label}</div>
          </div>
          <MetricTabs value={metric} onChange={setMetric} ids={METRICS.map(x => x.id)} />
        </div>
        <div className="mt-2 flex flex-wrap gap-3" aria-label="Legend">
          {series.map(s => {
            const lastP = [...s.points].reverse().find(p => m.value(p) != null);
            return (
              <span key={s.key} className="inline-flex items-center gap-1.5 text-xs" style={{ color: T.dim }}>
                <span className="inline-block rounded-full" style={{ width: 10, height: 3, background: s.color }} />{s.name}
                {lastP && <span className="font-mono" style={{ color: T.text }}>{m.format(m.value(lastP)!)}</span>}
              </span>
            );
          })}
        </div>
        <div className="mt-2">
          {error && !chronicle
            ? <p className="text-sm py-10 text-center" style={{ color: T.bad }}>{errorText(error, 'Couldn’t load the world’s history.')}</p>
            : <TrendChart series={series} metric={m} height={300} />}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Compare nations={nations} />
        <Pillars nations={nations} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <WorldTimeline history={history} />
        <Relations nations={desk.desk.world} />
      </div>
    </div>
  );
}
