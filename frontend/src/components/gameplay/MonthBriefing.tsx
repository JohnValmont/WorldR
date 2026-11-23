'use client';
// "A new month" briefing: the game's core beat is the month turning every few hours, and it used
// to pass without a moment. When the player opens the game and the politics month has moved on
// since they last looked, show what actually changed — their money, trust, clout, energy, their
// nation's approval, decisions waiting and the newest notices. Every number is real (from GET
// /politics/desk, the same SWR cache the Desk and Home use) and every change is measured against
// the snapshot stored when they last saw a month. Never on a first visit, never on top of
// What's New, one per month, skippable with Escape.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { CalendarDays, X, ArrowRight } from 'lucide-react';
import { politicsApi } from '../../lib/api';
import { formatPolArc } from '../../lib/calendar';
import { BUILD } from '../../lib/design/tokens';
import type { Desk } from '../../app/drennia/politics/_floor/types';

const SNAPSHOT_KEY = 'worldr_month_snapshot_v1';
const NOTICE_LIMIT = 3;

interface Snapshot { characterId: string; arc: number; cash: number | null; credibility: number; influence: number; approval: number | null; ap?: number }

function read(): Snapshot | null {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || 'null'); } catch { return null; }
}
function write(s: Snapshot) {
  try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s)); } catch { /* private mode: briefing simply won't repeat */ }
}
function snapshotOf(desk: Desk): Snapshot | null {
  if (!desk.me) return null;
  return {
    characterId: desk.me.characterId, arc: desk.calendar.arc, cash: desk.me.cash,
    credibility: desk.me.credibility, influence: desk.me.influence, approval: desk.approval?.live ?? null, ap: desk.me.ap.current,
  };
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
function Delta({ value, unit = '', format }: { value: number; unit?: string; format?: (n: number) => string }) {
  if (Math.abs(value) < 0.05) return <span className="text-ink-faint">no change</span>;
  const up = value > 0;
  const shown = format ? format(Math.abs(value)) : `${Math.abs(value) % 1 === 0 ? Math.abs(value) : Math.abs(value).toFixed(1)}${unit}`;
  return <span className={up ? 'text-good' : 'text-bad'}>{up ? '+' : '−'}{shown}</span>;
}

export default function MonthBriefing() {
  // Shares the Desk/Home cache; no polling of its own (those screens refresh it).
  const { data: desk } = useSWR<Desk>('politics-desk', () => politicsApi.getDesk(), { revalidateOnFocus: false });
  const [before, setBefore] = useState<Snapshot | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!desk?.me) return;
    const now = snapshotOf(desk);
    if (!now) return;
    const prev = read();
    // First visit, or a different character on this browser: just remember where we are.
    if (!prev || prev.characterId !== now.characterId) { write(now); return; }
    if (now.arc <= prev.arc) return;
    // What's New for this build still to come? Don't stack two dialogs; show next time.
    try { if (!localStorage.getItem(`worldr_seen_build_${BUILD.version}`)) return; } catch { return; }
    setBefore(prev);
  }, [desk]);

  const dismiss = () => {
    if (desk) { const now = snapshotOf(desk); if (now) write(now); }
    setBefore(null);
  };

  useEffect(() => {
    if (!before) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [before]);

  const view = useMemo(() => {
    if (!before || !desk?.me) return null;
    const me = desk.me;
    const months = desk.calendar.arc - before.arc;
    const decisions = desk.desk.hand.filter(c => c.status === 'open').length;
    const notices = desk.desk.notices.items.filter(n => !n.read).slice(0, NOTICE_LIMIT);
    const nation = desk.desk.world.find(n => n.mine);
    return { me, months, decisions, notices, nation };
  }, [before, desk]);

  if (!before || !desk || !view) return null;
  const { me, months, decisions, notices, nation } = view;
  const approval = desk.approval?.live ?? null;

  const rows: { label: string; value: React.ReactNode; delta: React.ReactNode }[] = [
    ...(me.cash != null ? [{ label: 'Your money', value: money(me.cash), delta: before.cash != null ? <Delta value={me.cash - before.cash} format={money} /> : null }] : []),
    { label: 'Trust', value: me.credibility, delta: <Delta value={me.credibility - before.credibility} /> },
    { label: 'Clout', value: me.influence, delta: <Delta value={me.influence - before.influence} /> },
    ...(approval != null ? [{ label: `${nation?.name ?? 'National'} approval`, value: `${Math.round(approval)}%`, delta: before.approval != null ? <Delta value={approval - before.approval} unit=" pts" /> : null }] : []),
    { label: 'Energy', value: `${me.ap.current} / ${me.ap.cap}`, delta: before.ap != null ? <Delta value={me.ap.current - before.ap} /> : null },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="month-briefing-title">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in-up" onClick={dismiss} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[20px] border border-accent/40 bg-surface shadow-pop animate-fade-in-up">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        <header className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              <CalendarDays size={13} aria-hidden />{months === 1 ? 'A new month' : `${months} months have passed`}
            </div>
            <h2 id="month-briefing-title" className="font-display text-[26px] font-semibold leading-tight text-ink">{formatPolArc(desk.calendar.arc, false)}</h2>
            <p className="mt-1 text-[13px] text-ink-dim">Since you last looked, {formatPolArc(before.arc, false)}.</p>
          </div>
          <button ref={closeRef} type="button" onClick={dismiss} aria-label="Close briefing" className="-mr-2 rounded-full p-2 text-ink-faint transition-colors hover:bg-raised hover:text-ink">
            <X size={18} />
          </button>
        </header>

        <dl className="mx-6 mt-5 divide-y divide-line rounded-2xl border border-line bg-raised/40">
          {rows.map(r => (
            <div key={r.label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
              <dt className="text-[13px] text-ink-dim">{r.label}</dt>
              <dd className="m-0 flex items-baseline gap-3 font-mono text-[14px]">
                <span className="text-ink">{r.value}</span>
                {r.delta && <span className="min-w-[88px] text-right text-[12px]">{r.delta}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {notices.length > 0 && (
          <div className="mx-6 mt-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">New for you</div>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {notices.map(n => <li key={n.id} className="text-[13px] leading-snug text-ink-dim">• {n.text}</li>)}
            </ul>
          </div>
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4">
          <span className="text-[13px] text-ink-dim">{decisions > 0 ? `${decisions} decision${decisions === 1 ? '' : 's'} waiting on your Desk` : 'No decisions waiting'}</span>
          <div className="flex gap-2">
            <button type="button" onClick={dismiss} className="btn-ghost">Later</button>
            <Link href="/drennia/politics?tab=desk" onClick={dismiss} className="btn-primary">Open the Desk <ArrowRight size={15} aria-hidden /></Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
