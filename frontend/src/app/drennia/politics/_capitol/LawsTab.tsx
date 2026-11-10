'use client';
import React, { useState } from 'react';
import type { Capitol, Law } from './types';
import { C, STAT_LABELS } from './theme';
import { politicsApi } from '@/lib/api';
import { Panel, Pill, BrassButton, useAction, Toast } from './ui';
import { formatPolArc } from '@/lib/calendar';

function EffectChips({ effects }: { effects: Record<string, number> }) {
  const entries = Object.entries(effects).filter(([, v]) => v);
  if (!entries.length) return <span className="text-[11px]" style={{ color: C.faint }}>No measurable effect</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([k, v]) => {
        const meta = STAT_LABELS[k];
        const good = meta ? (meta.good === 'high' ? v > 0 : v < 0) : v > 0;
        return (
          <span key={k} className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: good ? 'rgba(63,163,107,0.12)' : 'rgba(194,72,63,0.12)', color: good ? '#7FD3A2' : '#E88C84' }}>
            {meta?.name ?? k} {v > 0 ? '+' : ''}{v}
          </span>
        );
      })}
    </div>
  );
}

function LawCard({ law, cap, refresh }: { law: Law; cap: Capitol; refresh: () => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const act = useAction();
  const current = law.options.find(o => o.id === law.currentOptionId);
  const chosen = sel ? law.options.find(o => o.id === sel) : null;
  const openBill = cap.bills.find(b => b.status === 'proposed' && b.category === law.id);
  const byId = new Map(cap.parties.map(p => [p.id, p]));
  const me = cap.me;
  const supportSeats = chosen ? chosen.supporters.reduce((a, id) => a + (byId.get(id)?.seats ?? 0), 0) : 0;

  return (
    <article className="rounded-lg p-3.5" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif font-bold text-sm" style={{ color: C.ivory }}>{law.name}</h3>
          <div className="text-[10px]" style={{ color: C.muted }}>
            Takes ~{law.rolloutMonths} month{law.rolloutMonths === 1 ? '' : 's'} to start working{law.enactedArc != null ? ` · changed ${formatPolArc(law.enactedArc)}` : ' · original law'}
          </div>
        </div>
        {openBill && <Pill color={C.brass}>Bill pending</Pill>}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {law.options.map(o => {
          const isCur = o.id === law.currentOptionId;
          const isSel = o.id === sel;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setSel(isCur ? null : (isSel ? null : o.id))}
              className="text-[11px] px-2 py-1 rounded-md transition-colors text-left"
              style={isCur
                ? { background: C.brassSoft, color: C.ivory, border: `1px solid ${C.brass}` }
                : isSel ? { background: 'rgba(110,193,228,0.12)', color: '#BFE6F5', border: '1px solid rgba(110,193,228,0.6)' }
                : { color: C.ink, border: `1px solid ${C.lineSoft}` }}
              title={isCur ? 'Law in force' : 'Preview this change'}
            >
              {isCur && '● '}{o.name}
            </button>
          );
        })}
      </div>
      <div className="mt-2.5">
        <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: C.faint }}>{chosen ? `If changed to "${chosen.name}"` : `In force: ${current?.name ?? '—'}`}</div>
        <EffectChips effects={(chosen ?? current)?.effects ?? {}} />
      </div>
      {chosen && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: C.lineSoft }}>
          <div className="text-[11px]" style={{ color: C.ink }}>
            {chosen.supporters.length ? (
              <>Parties likely to back it: {chosen.supporters.map(id => <b key={id} style={{ color: byId.get(id)?.color }}> {byId.get(id)?.abbreviation}</b>)} <span style={{ color: C.muted }}>({supportSeats} of {cap.parliament.seats} seats, before whipping)</span></>
            ) : <span style={{ color: C.muted }}>No party in Parliament prefers this to the current law.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <BrassButton
              small
              disabled={!me?.canTableBill || !!openBill || act.busy}
              title={!me?.canTableBill ? 'Your party needs a seat in Parliament (and a government must exist) to table bills.' : openBill ? 'A bill on this law is already pending.' : undefined}
              onClick={() => act.run(() => politicsApi.proposeBill('policy_change', { category: law.id, option: chosen.id }).then(() => { setSel(null); refresh(); }), 'Bill tabled. Parliament votes on it next month.')}
            >
              Table this bill · {me?.tableBillApCost ?? 3} AP
            </BrassButton>
            {!me?.canTableBill && <span className="text-[10px]" style={{ color: C.muted }}>Needs a party with seats.</span>}
          </div>
        </div>
      )}
      <Toast msg={act.msg} />
    </article>
  );
}

export default function LawsTab({ cap, refresh }: { cap: Capitol; refresh: () => void }) {
  const groups = new Map<string, Law[]>();
  for (const l of cap.laws) {
    const k = l.ministry?.short ?? 'Other';
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  const minister = (short: string) => cap.cabinet.find(c => c.short === short);
  const be = cap.businessEffects;
  const pct = (m: number) => `${m >= 1 ? '+' : ''}${((m - 1) * 100).toFixed(1)}%`;

  return (
    <div className="space-y-4">
      <Panel kicker="Politics → business" title="What today's laws do to the car industry">
        {be ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Build costs', pct(be.costMultiplier), be.costMultiplier <= 1],
              ['Car demand', pct(be.demandMultiplier), be.demandMultiplier >= 1],
              ['Reliability bonus', `+${be.reliabilityBonus}`, true],
              ['Appeal bonus', `+${be.appealBonus}`, true],
            ].map(([k, v, good]) => (
              <div key={k as string} className="rounded-md p-2.5 text-center" style={{ background: 'rgba(10,14,24,0.55)', border: `1px solid ${C.lineSoft}` }}>
                <div className="font-mono text-base" style={{ color: v === '+0' || v === '+0.0%' ? C.ink : good ? '#7FD3A2' : '#E88C84' }}>{v as string}</div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{k as string}</div>
              </div>
            ))}
          </div>
        ) : <p className="text-xs" style={{ color: C.muted }}>No laws affecting business yet.</p>}
        <p className="text-[11px] mt-2.5" style={{ color: C.muted }}>Better public finances lower build costs; prosperity raises demand; law and order adds reliability; fairness adds appeal. Applied to every company each business month.</p>
      </Panel>

      {[...groups.entries()].map(([short, laws]) => {
        const m = minister(short);
        return (
          <Panel key={short} kicker={m ? m.title : 'Laws'} title={m?.holderName ? `${short} · ${m.holderName}` : short}>
            <div className="grid gap-3 md:grid-cols-2">
              {laws.map(l => <LawCard key={l.id} law={l} cap={cap} refresh={refresh} />)}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
