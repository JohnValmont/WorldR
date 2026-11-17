'use client';
// Election night: the last election replayed district by district.
import React, { useEffect, useMemo, useState } from 'react';
import { formatPolArc } from '@/lib/calendar';
import { Btn, PartyDot, T, useFloor } from './kit';

const STEP_MS = 900;

export default function ElectionNight({ onClose }: { onClose: () => void }) {
  const { desk } = useFloor();
  const el = desk.desk.election!;
  // Smallest districts declare first, the big cities last, as on a real election night.
  const order = useMemo(() => [...el.districts].sort((a, b) => a.seats - b.seats || a.name.localeCompare(b.name)), [el]);
  const [shown, setShown] = useState(0);
  const done = shown >= order.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setShown(s => s + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [shown, done]);

  const totals: Record<string, number> = {};
  for (const d of order.slice(0, shown)) for (const [pid, n] of Object.entries(d.won)) totals[pid] = (totals[pid] || 0) + n;
  const declared = Object.values(totals).reduce((a, b) => a + b, 0);
  const total = desk.parliament.seats;
  const majority = desk.parliament.majority;
  const ranked = desk.parties.map(p => ({ p, seats: totals[p.id] || 0 })).sort((a, b) => b.seats - a.seats);
  const current = shown > 0 ? order[shown - 1] : null;
  const winner = done ? ranked[0] : null;
  const gov = desk.parliament.government;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: T.bg }} role="dialog" aria-modal="true" aria-label="Election night">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: T.accent }}>Election night · {formatPolArc(el.arc, false)}</div>
            <h2 className="font-serif text-3xl font-bold mt-1" style={{ color: T.text }}>
              {done ? (winner && winner.seats >= majority ? `${winner.p.name} wins a majority` : `No majority: ${winner?.p.name} is largest`) : `${declared} of ${total} seats declared`}
            </h2>
          </div>
          <div className="flex gap-2">
            {!done && <Btn small onClick={() => setShown(order.length)} id="election-skip">Skip to result</Btn>}
            <Btn small kind="primary" onClick={onClose} id="election-close">Close</Btn>
          </div>
        </div>

        <div className="mt-6 space-y-2.5">
          {ranked.map(({ p, seats }) => {
            const before = el.previousSeats[p.id];
            const diff = done && before != null ? seats - before : null;
            return (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-40 sm:w-52 shrink-0 flex items-center gap-2 text-sm truncate" style={{ color: T.text }}><PartyDot color={p.color} size={10} /><span className="truncate">{p.name}</span></div>
                <div className="relative flex-1 h-6 rounded-md overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div className="absolute inset-y-0 left-0 transition-all duration-700" style={{ width: `${(seats / total) * 100}%`, background: p.color }} />
                  <div className="absolute inset-y-0 w-px" style={{ left: `${(majority / total) * 100}%`, background: T.text, opacity: 0.7 }} />
                </div>
                <div className="w-10 text-right font-mono text-lg font-bold" style={{ color: T.text }}>{seats}</div>
                <div className="w-10 text-right font-mono text-xs" style={{ color: diff == null || diff === 0 ? T.faint : diff > 0 ? T.good : T.bad }}>{diff == null ? '' : diff > 0 ? `+${diff}` : diff}</div>
              </div>
            );
          })}
          <div className="text-[11px]" style={{ color: T.faint }}>The line marks the {majority} seats needed to govern alone.</div>
        </div>

        <div className="mt-6 rounded-2xl p-4 min-h-[84px]" style={{ background: T.surface, border: `1px solid ${T.line}` }} aria-live="polite">
          {done ? (
            <div className="text-sm" style={{ color: T.text }}>
              {gov
                ? <>The government: <strong>{gov.memberPartyIds.map(id => desk.parties.find(p => p.id === id)?.name).join(' + ')}</strong> with {gov.seats} seats{desk.premier ? `, under Premier ${desk.premier.name}` : ''}.</>
                : 'Parties are now negotiating to form a government.'}
            </div>
          ) : current ? (
            <>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: T.faint }}>Declared</div>
              <div className="font-serif text-xl font-bold" style={{ color: T.text }}>{current.name} <span className="text-sm font-sans font-normal" style={{ color: T.faint }}>{current.seats} seats</span></div>
              <div className="flex flex-wrap gap-3 mt-1 text-sm">
                {Object.entries(current.won).sort((a, b) => b[1] - a[1]).map(([pid, n]) => {
                  const p = desk.parties.find(x => x.id === pid);
                  return <span key={pid} className="inline-flex items-center gap-1.5" style={{ color: T.dim }}><PartyDot color={p?.color ?? T.faint} />{p?.abbreviation} <strong style={{ color: T.text }}>{n}</strong></span>;
                })}
              </div>
            </>
          ) : <div className="text-sm" style={{ color: T.dim }}>The polls have closed. First results any moment…</div>}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {order.map((d, i) => {
            const lead = Object.entries(d.won).sort((a, b) => b[1] - a[1])[0];
            const p = lead ? desk.parties.find(x => x.id === lead[0]) : null;
            const on = i < shown;
            return (
              <div key={d.id} className="rounded-lg px-2 py-1.5 text-[11px] truncate transition-colors duration-500"
                style={{ background: on ? (p?.color ?? T.raised) : T.surface, color: on ? '#0C0E13' : T.faint, fontWeight: on ? 700 : 400 }}>
                {d.name}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
