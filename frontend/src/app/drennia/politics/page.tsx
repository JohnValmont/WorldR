'use client';
// Politics — "The Floor" (docs/POLITICS_FLOOR.md).
// One call (GET /politics/desk) drives the nation's screens; World Press reads GET /agency/front.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { politicsApi, worldApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useWorldClock, formatCountdown } from '@/hooks/useWorldClock';
import { formatPolArc } from '@/lib/calendar';

import { Btn, Chip, Energy, FloorApi, FloorContext, PartyDot, T, money } from './_floor/kit';
import DeskView from './_floor/DeskView';
import ChamberView from './_floor/ChamberView';
import VotersView from './_floor/VotersView';
import PartyView from './_floor/PartyView';
import ElectionNight from './_floor/ElectionNight';
import NationView from './_floor/NationView';
import CorridorsView from './_floor/CorridorsView';
import MapView from './_floor/MapView';
import WireView from './_floor/WireView';
import type { Notice } from './_floor/types';

type Tab = 'desk' | 'chamber' | 'corridors' | 'map' | 'voters' | 'party' | 'nation' | 'wire';
const TABS: { id: Tab; label: string }[] = [
  { id: 'desk', label: 'Desk' },
  { id: 'chamber', label: 'Chamber' },
  { id: 'corridors', label: 'Corridors' },
  { id: 'map', label: 'Map' },
  { id: 'voters', label: 'Voters' },
  { id: 'party', label: 'Party' },
  { id: 'nation', label: 'Nation' },
  { id: 'wire', label: 'World Press' },
];
const PHASE_LABEL: Record<string, string> = {
  governing: 'Parliament sitting', filing: 'Candidates filing', campaign: 'Election campaign', polling: 'Election day', formation: 'Forming a government',
};
const RUNG_LABEL: Record<string, string> = { citizen: 'Citizen', member: 'Party member', candidate: 'Candidate', mp: 'Member of Parliament', leader: 'Party leader', minister: 'Minister', premier: 'Head of government', statesman: 'World statesman' };
const SEEN_ELECTION_KEY = 'worldr_pol_election_seen';

class ViewBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[Politics] screen crashed:', error); }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl p-5 text-sm" style={{ background: T.badSoft, border: `1px solid ${T.bad}`, color: T.text }}>
          <div className="font-semibold mb-1">This screen hit an error.</div>
          <div className="opacity-70 mb-3">{this.state.error.message}</div>
          <button className="underline" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** The inbox: what happened while you were away. Opening it marks everything read. */
function Inbox({ notices, onOpen, onRead }: { notices: { unread: number; items: Notice[] } | undefined; onOpen: (tab: string | null) => void; onRead: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const unread = notices?.unread ?? 0;
  const items = notices?.items ?? [];
  return (
    <div className="relative" ref={ref}>
      <button type="button" id="inbox" aria-label={`Inbox, ${unread} unread`} title="What happened while you were away"
        onClick={() => { const next = !open; setOpen(next); if (next && unread > 0) onRead(); }}
        className="relative inline-flex items-center gap-1 rounded-lg px-2 py-1" style={{ border: `1px solid ${T.line}`, color: T.text }}>
        <span aria-hidden>✉</span><span>Inbox</span>
        {unread > 0 && <span className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]" style={{ background: T.accent, color: '#17130A' }}>{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 z-50 w-[min(92vw,380px)] max-h-[70vh] overflow-y-auto rounded-xl p-2 shadow-2xl" style={{ background: T.raised, border: `1px solid ${T.lineStrong}` }}>
          {items.length === 0 ? <div className="p-3 text-xs" style={{ color: T.dim }}>Nothing yet. Offers, challenges, votes on your bills and your world rank will show up here.</div> :
            items.map(n => (
              <button key={n.id} type="button" onClick={() => { setOpen(false); onOpen(n.tab); }}
                className="w-full text-left rounded-lg px-3 py-2 hover:opacity-90" style={{ background: n.read ? 'transparent' : T.accentSoft }}>
                <div className="text-xs leading-snug" style={{ color: T.text }}>{n.text}</div>
                <div className="text-[10px] mt-0.5" style={{ color: T.faint }}>{formatPolArc(n.arc, false)}</div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export default function PoliticsPage() {
  const [tab, setTab] = useState<Tab>('desk');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [electionOpen, setElectionOpen] = useState(false);
  const [seenElection, setSeenElection] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { clock, polSecondsToTick, isPolTickStalled } = useWorldClock();
  const user = useAuthStore(s => s.user);
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const isAdmin = user?.role === 'admin' || isAdminDynamic;
  useEffect(() => { authApi.me().then(res => setIsAdminDynamic(!!res.data?.isAdmin)).catch(() => {}); }, []);
  useEffect(() => { try { setSeenElection(localStorage.getItem(SEEN_ELECTION_KEY)); } catch { /* private mode */ } }, []);

  const { data: desk, error, mutate } = useSWR('politics-desk', () => politicsApi.getDesk(), { refreshInterval: 30_000 });

  const notify = useCallback((ok: boolean, text: string) => {
    setToast({ ok, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ok ? 4500 : 7000);
  }, []);

  const act = useCallback<FloorApi['act']>(async (fn, okText) => {
    setBusy(true);
    try {
      const res = await fn();
      await mutate();
      const text = typeof okText === 'function' ? okText(res) : okText ?? res?.text ?? res?.message;
      if (text) notify(res?.tone ? res.tone !== 'bad' : true, text);
      return res ?? true;
    } catch (e: any) {
      notify(false, e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong');
      return false;
    } finally { setBusy(false); }
  }, [mutate, notify]);

  const api = useMemo<FloorApi | null>(() => desk ? ({
    desk, refresh: () => mutate(), act, busy, go: (t: string) => setTab((TABS.find(x => x.id === t)?.id ?? 'desk') as Tab),
  }) : null, [desk, mutate, act, busy]);

  const openElection = () => {
    setElectionOpen(true);
    const id = desk?.desk.election?.cycleId;
    if (id) { try { localStorage.setItem(SEEN_ELECTION_KEY, id); } catch { /* private mode */ } setSeenElection(id); }
  };

  const forceTick = () => act(() => worldApi.forcePoliticsTick(), 'The month has turned.');

  const me = desk?.me ?? null;
  const pending = desk && me
    ? desk.desk.hand.filter(h => h.status === 'open').length
      + (me.voteMode ? desk.bills.filter(b => b.status === 'proposed' && !b.myVote).length : 0)
      + (desk.desk.deals?.incoming.length ?? 0)
      + (desk.desk.handshakesIncoming ?? 0)
    : 0;
  const el = desk?.desk.election;
  const freshElection = !!el?.hasResults && seenElection !== el.cycleId;
  const countdown = clock?.status === 'paused' ? 'Paused' : isPolTickStalled ? 'Delayed' : polSecondsToTick != null ? formatCountdown(polSecondsToTick) : '--:--';

  return (
    <div className="min-h-screen" style={{ background: T.bg, color: T.text }}>
      <header style={{ borderBottom: `1px solid ${T.line}` }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: T.accent }}>{desk?.nation.officialName ?? 'Politics'}</div>
              <div className="flex flex-wrap items-baseline gap-x-3 text-sm" style={{ color: T.dim }}>
                {desk && <span className="font-serif text-lg font-bold" style={{ color: T.text }}>{formatPolArc(desk.calendar.arc, false)}</span>}
                {desk && <span>{PHASE_LABEL[desk.calendar.phase] ?? desk.calendar.phase}</span>}
                <span title="Time until the month turns: votes are counted, polls update, new decisions arrive">next month in <span className="font-mono" style={{ color: T.text }}>{countdown}</span></span>
              </div>
            </div>
            {me && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: T.dim }} id="me-bar">
                <span className="inline-flex items-center gap-1.5">
                  {me.party && <PartyDot color={me.party.color} />}
                  <span className="font-semibold" style={{ color: T.text }}>{me.name}</span>
                  <span>{me.office ?? RUNG_LABEL[me.rung] ?? me.rung}{me.isPartyLeader && !me.office ? ', party leader' : ''}{me.background ? ` · ${me.background.label}` : ''}</span>
                </span>
                <span className="inline-flex items-center gap-1.5" title="Energy: what you can do. Each month adds 12; unused energy carries over, up to 24."><Energy current={me.ap.current} cap={me.ap.cap} /></span>
                <span title="Trust: how far voters believe you. Counts in the district you stand in, and in every deal you offer.">Trust <strong style={{ color: T.text }}>{me.credibility}</strong></span>
                <span title="Clout: your weight among politicians. Needed to lead a party.">Clout <strong style={{ color: T.text }}>{me.influence}</strong></span>
                {me.cash != null && <span title="Your own money">{money(me.cash)}</span>}
                <Inbox notices={desk!.desk.notices} onOpen={(t) => t && setTab((TABS.find(x => x.id === t)?.id ?? 'desk') as Tab)} onRead={() => politicsApi.markNoticesRead().then(() => mutate()).catch(() => {})} />
              </div>
            )}
          </div>
          <nav className="flex gap-1 mt-3 -mb-px overflow-x-auto" aria-label="Politics sections">
            {TABS.map(t => (
              <button key={t.id} id={`tab-${t.id}`} type="button" onClick={() => setTab(t.id)}
                className="px-4 py-2.5 text-sm font-semibold whitespace-nowrap"
                style={{ color: tab === t.id ? T.text : T.faint, borderBottom: `2px solid ${tab === t.id ? T.accent : 'transparent'}` }}>
                {t.label}
                {t.id === 'desk' && pending > 0 && <span className="ml-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]" style={{ background: T.accent, color: '#17130A' }}>{pending}</span>}
              </button>
            ))}
            {isAdmin && (
              <span className="ml-auto self-center hidden sm:inline">
                <Btn small kind="quiet" onClick={forceTick} disabled={busy} title="Admin only: end the politics month now" id="admin-tick">⚡ End month</Btn>
              </span>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
        {!desk && !error && <div className="py-24 text-center text-xs uppercase tracking-[0.3em]" style={{ color: T.faint }}>Opening the session…</div>}
        {error && !desk && (
          <div className="rounded-2xl p-5 text-sm" style={{ background: T.badSoft, border: `1px solid ${T.bad}` }}>
            Couldn&apos;t load politics: {String((error as any)?.response?.data?.error || (error as any)?.message || error)}
            <button className="ml-3 underline" onClick={() => mutate()}>Retry</button>
          </div>
        )}
        {desk && api && (
          <FloorContext.Provider value={api}>
            {freshElection && (
              <button type="button" onClick={openElection} id="election-banner"
                className="w-full text-left rounded-2xl p-4 mb-4 flex items-center justify-between gap-3"
                style={{ background: T.accentSoft, border: `1px solid ${T.accent}` }}>
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: T.accent }}>The results are in</span>
                  <span className="font-serif text-lg font-bold" style={{ color: T.text }}>{desk.nation.shortName} has voted. Watch election night.</span>
                </span>
                <Chip color={T.accent} filled>Watch</Chip>
              </button>
            )}
            <ViewBoundary key={tab}>
              {tab === 'desk' && <DeskView />}
              {tab === 'chamber' && <ChamberView />}
              {tab === 'corridors' && <CorridorsView />}
              {tab === 'map' && <MapView />}
              {tab === 'voters' && <VotersView onReplay={openElection} />}
              {tab === 'party' && <PartyView />}
              {tab === 'nation' && <NationView />}
              {tab === 'wire' && <WireView />}
            </ViewBoundary>
            {electionOpen && el && <ElectionNight onClose={() => setElectionOpen(false)} />}
          </FloorContext.Provider>
        )}
      </main>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-5 z-[60] max-w-[92vw] sm:max-w-lg rounded-xl px-4 py-3 text-sm shadow-2xl" role="status" id="toast"
          style={{ background: T.raised, border: `1px solid ${toast.ok ? T.good : T.bad}`, color: T.text }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
