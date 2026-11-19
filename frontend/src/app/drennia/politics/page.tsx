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
import NationView, { NATION_SECTION_KEY } from './_floor/NationView';
import CorridorsView from './_floor/CorridorsView';
import MapView from './_floor/MapView';
import WireView from './_floor/WireView';
import WorldView from './_floor/WorldView';
import { Flag, electionLine } from './_floor/worldKit';
import {
  Building2, Clock, Crown, Flag as FlagIcon, Globe2, Landmark, LayoutDashboard, Map as MapIcon, MessagesSquare, Newspaper, ShieldCheck, Users,
  Vote as VoteIcon, Wallet, Zap, Lock, CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react';
import type { Notice } from './_floor/types';
import { preloadTabs } from './_floor/tabData';

type Tab = 'desk' | 'chamber' | 'corridors' | 'map' | 'voters' | 'party' | 'nation' | 'world' | 'wire';
const TABS: { id: Tab; label: string }[] = [
  { id: 'desk', label: 'Desk' },
  { id: 'chamber', label: 'Chamber' },
  { id: 'corridors', label: 'Corridors' },
  { id: 'map', label: 'Map' },
  { id: 'voters', label: 'Voters' },
  { id: 'party', label: 'Party' },
  { id: 'nation', label: 'Nation' },
  { id: 'world', label: 'World' },
  { id: 'wire', label: 'World Press' },
];
const TAB_ICON: Record<Tab, React.ComponentType<{ size?: number; style?: React.CSSProperties; 'aria-hidden'?: boolean }>> = {
  desk: LayoutDashboard, chamber: Landmark, corridors: MessagesSquare, map: MapIcon, voters: Users, party: FlagIcon, nation: Building2, world: Globe2, wire: Newspaper,
};
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
  const [toast, setToast] = useState<{ ok: boolean | 'info'; text: string } | null>(null);
  const [electionOpen, setElectionOpen] = useState(false);
  const [seenElection, setSeenElection] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { clock, polSecondsToTick, isPolTickStalled } = useWorldClock();
  const user = useAuthStore(s => s.user);
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const isAdmin = user?.role === 'admin' || isAdminDynamic;
  useEffect(() => { authApi.me().then(res => setIsAdminDynamic(!!res.data?.isAdmin)).catch(() => {}); }, []);
  useEffect(() => { try { setSeenElection(localStorage.getItem(SEEN_ELECTION_KEY)); } catch { /* private mode */ } }, []);
  // Deep links from other screens (e.g. the Chronicle): /drennia/politics?tab=nation&section=budget
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const section = q.get('section');
      if (section) sessionStorage.setItem(NATION_SECTION_KEY, section);
      const t = TABS.find(x => x.id === q.get('tab'));
      if (t) setTab(t.id);
    } catch { /* private mode */ }
  }, []);

  const { data: desk, error, mutate } = useSWR('politics-desk', () => politicsApi.getDesk(), { refreshInterval: 30_000 });

  const notify = useCallback((ok: boolean | 'info', text: string) => {
    setToast({ ok, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), ok === true ? 4500 : 7000);
  }, []);

  // An action shows its result as soon as the server answers; the desk reloads
  // in the background (it used to wait for the whole desk first, doubling the wait).
  const [refreshing, setRefreshing] = useState(0);
  const act = useCallback<FloorApi['act']>(async (fn, okText) => {
    setBusy(true);
    try {
      const res = await fn();
      const text = typeof okText === 'function' ? okText(res) : okText ?? res?.text ?? res?.message;
      if (text) notify(res?.tone ? res.tone !== 'bad' : true, text);
      setRefreshing(n => n + 1);
      mutate().catch(() => {}).finally(() => setRefreshing(n => n - 1));
      return res ?? true;
    } catch (e: any) {
      notify(false, e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Something went wrong');
      return false;
    } finally { setBusy(false); }
  }, [mutate, notify]);

  // Once the desk is on screen, warm the other tabs' data so switching is instant.
  const hasDesk = !!desk;
  useEffect(() => {
    if (!hasDesk) return;
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(preloadTabs, { timeout: 1500 }) : setTimeout(preloadTabs, 300);
    return () => { if (w.cancelIdleCallback && w.requestIdleCallback) w.cancelIdleCallback(id); else clearTimeout(id); };
  }, [hasDesk]);

  const api = useMemo<FloorApi | null>(() => desk ? ({
    desk, refresh: () => mutate(), act, busy, notify,
    // go('nation:budget') opens a tab at one of its sections (the tab reads NATION_SECTION_KEY on mount).
    go: (target: string) => {
      const [t, section] = target.split(':');
      if (section) { try { sessionStorage.setItem(NATION_SECTION_KEY, section); } catch { /* private mode */ } }
      setTab((TABS.find(x => x.id === t)?.id ?? 'desk') as Tab);
    },
  }) : null, [desk, mutate, act, busy, notify]);

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
  const myNation = desk?.desk.world.find(n => n.mine) ?? null;
  const freshElection = !!el?.hasResults && seenElection !== el.cycleId;
  const countdown = clock?.status === 'paused' ? 'Paused' : isPolTickStalled ? 'Delayed' : polSecondsToTick != null ? formatCountdown(polSecondsToTick) : '--:--';

  const rung = me ? `${me.office ?? RUNG_LABEL[me.rung] ?? me.rung}${me.isPartyLeader && !me.office && me.rung !== 'leader' ? ', party leader' : ''}` : '';
  const initials = me ? me.name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() : '';
  const navBadge = (id: Tab) => (id === 'desk' && pending > 0 ? pending : 0);
  // The election chip: during the count and coalition talks it opens the talks (Nation → Coalition), otherwise the overview.
  const openElection2 = () => {
    const talking = ['polling', 'formation'].includes(myNation?.election?.phase ?? '');
    try { sessionStorage.setItem(NATION_SECTION_KEY, talking ? 'coalition' : 'overview'); } catch { /* private mode */ }
    setTab('nation');
  };

  return (
    <div className="min-h-screen" style={{
      color: T.text,
      background: `radial-gradient(1100px 520px at 0% -10%, rgba(232,184,75,0.07), transparent 60%), radial-gradient(900px 480px at 100% -5%, ${(myNation?.flag.colors[0] ?? '#3987e5')}22, transparent 60%), ${T.bg}`,
    }}>
      {/* Command bar: the nation and the clock on the left, you on the right. */}
      <header style={{ borderBottom: `1px solid ${T.line}`, background: 'linear-gradient(180deg, rgba(20,23,31,0.92), rgba(12,14,19,0.6))', backdropFilter: 'blur(8px)' }}>
        <div className="mx-auto max-w-[1720px] px-4 sm:px-6 xl:px-8 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex items-center gap-3 min-w-0">
            {myNation && <Flag flag={myNation.flag} width={46} />}
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] truncate" style={{ color: T.accent }}>{desk?.nation.officialName ?? 'Politics'}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: T.dim }}>
                {desk && <span className="font-serif text-xl font-bold leading-none" style={{ color: T.text }}>{formatPolArc(desk.calendar.arc, false)}</span>}
                {desk && !myNation?.election && <span>{PHASE_LABEL[desk.calendar.phase] ?? desk.calendar.phase}</span>}
                <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.line}` }}
                  title="Time until the month turns: votes are counted, polls update, new decisions arrive">
                  <Clock size={12} aria-hidden />next month <span className="font-mono" style={{ color: T.text }}>{countdown}</span>
                </span>
                {refreshing > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: T.faint }} role="status" aria-live="polite">
                    <Loader2 size={12} className="animate-spin" aria-hidden />Updating
                  </span>
                )}
                {myNation?.election && (
                  <button type="button" id="election-chip" onClick={openElection2} title={["polling", "formation"].includes(myNation.election.phase) ? "Coalition talks" : "When your nation votes next"}
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: myNation.election.phase === 'governing' ? 'rgba(255,255,255,0.04)' : T.accentSoft, border: `1px solid ${myNation.election.phase === 'governing' ? T.line : T.accent}`, color: myNation.election.phase === 'governing' ? T.dim : T.accent }}>
                    <VoteIcon size={12} aria-hidden />{electionLine(myNation.election)}
                  </button>
                )}
              </div>
            </div>
          </div>
          {me && (
            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: T.dim }} id="me-bar">
              <div className="flex items-center gap-2.5 rounded-2xl pl-1.5 pr-3 py-1.5" style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${T.line}` }}>
                <span className="inline-flex items-center justify-center rounded-xl font-bold text-sm shrink-0"
                  style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${me.party?.color ?? '#3A4050'}, #1C202B)`, color: '#fff', boxShadow: `0 0 0 2px ${me.party?.color ?? T.line}55` }}>{initials}</span>
                <div className="leading-tight min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: T.text }}>{me.name}</div>
                  <div className="text-[11px] truncate" style={{ color: T.faint }}>{rung}{me.background ? ` · ${me.background.label}` : ''}</div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl px-3 py-2 max-w-full" style={{ background: 'rgba(255,255,255,0.035)', border: `1px solid ${T.line}` }}>
                <span className="inline-flex items-center gap-1.5" title="Energy: what you can do. Each month adds 12; unused energy carries over, up to 24."><Zap size={13} style={{ color: T.accent }} aria-hidden /><Energy current={me.ap.current} cap={me.ap.cap} /></span>
                <span className="hidden sm:inline-block w-px h-4" style={{ background: T.line }} />
                <span title="Trust: how far voters believe you. Counts in the district you stand in, and in every deal you offer." className="inline-flex items-center gap-1"><ShieldCheck size={13} aria-hidden />Trust <strong style={{ color: T.text }}>{me.credibility}</strong></span>
                <span title="Clout: your weight among politicians. Needed to lead a party." className="inline-flex items-center gap-1"><Crown size={13} aria-hidden />Clout <strong style={{ color: T.text }}>{me.influence}</strong></span>
                {me.cash != null && <span title="Your own money" className="inline-flex items-center gap-1"><Wallet size={13} aria-hidden /><strong style={{ color: T.text }}>{money(me.cash)}</strong></span>}
              </div>
              <Inbox notices={desk!.desk.notices} onOpen={(t) => t && setTab((TABS.find(x => x.id === t)?.id ?? 'desk') as Tab)} onRead={() => politicsApi.markNoticesRead().then(() => mutate()).catch(() => {})} />
            </div>
          )}
        </div>
        {/* Below wide screens: tabs across the top. */}
        <nav className="xl:hidden mx-auto max-w-[1720px] px-2 sm:px-4 flex gap-1 overflow-x-auto" aria-label="Politics sections">
          {TABS.map(t => {
            const Icon = TAB_ICON[t.id];
            const n = navBadge(t.id);
            return (
              <button key={t.id} id={`tab-${t.id}`} type="button" onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                className={`my-2 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${tab === t.id ? '' : 'text-[#A3A4AC] bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 hover:text-[#ECEAE4]'}`}
                style={tab === t.id
                  ? { color: T.text, background: 'linear-gradient(180deg, rgba(232,184,75,0.22), rgba(232,184,75,0.08))', borderColor: 'rgba(232,184,75,0.6)' }
                  : undefined}>
                <Icon size={15} aria-hidden />{t.label}
                {n > 0 && <span className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[18px] h-[18px]" style={{ background: T.accent, color: '#17130A' }}>{n}</span>}
              </button>
            );
          })}
          {isAdmin && (
            <span className="ml-auto self-center hidden sm:inline">
              <Btn small kind="ghost" onClick={forceTick} disabled={busy} title="Admin only: end the politics month now" id="admin-tick-top">⚡ End month</Btn>
            </span>
          )}
        </nav>
      </header>

      <div className="mx-auto max-w-[1720px] px-4 sm:px-6 xl:px-8 py-5 xl:py-6 xl:grid xl:grid-cols-[232px_minmax(0,1fr)] xl:gap-8">
        {/* Wide screens: a navigation rail on the left. */}
        <aside className="hidden xl:block">
          <nav className="sticky top-5 rounded-2xl p-2 space-y-1.5" aria-label="Politics sections"
            style={{ background: `linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0) 40%), ${T.surface}`, border: `1px solid ${T.line}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 40px -28px rgba(0,0,0,0.9)' }}>
            {TABS.map(t => {
              const Icon = TAB_ICON[t.id];
              const on = tab === t.id;
              const n = navBadge(t.id);
              return (
                <button key={t.id} id={`rail-${t.id}`} type="button" onClick={() => setTab(t.id)} aria-current={on ? 'page' : undefined}
                  className={`group w-full flex items-center gap-3 rounded-xl border px-2 py-2 text-sm font-semibold text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${on ? '' : 'text-[#A3A4AC] bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.07] hover:border-white/20 hover:text-[#ECEAE4] active:scale-[0.99]'}`}
                  style={on ? {
                    color: T.text,
                    background: 'linear-gradient(90deg, rgba(232,184,75,0.22), rgba(232,184,75,0.06))',
                    borderColor: 'rgba(232,184,75,0.6)',
                    boxShadow: '0 10px 24px -16px rgba(232,184,75,0.7), inset 0 1px 0 rgba(255,255,255,0.08)',
                  } : undefined}>
                  <span className={`inline-flex items-center justify-center rounded-lg shrink-0 transition-colors ${on ? '' : 'group-hover:bg-white/[0.08]'}`}
                    style={{ width: 32, height: 32, background: on ? T.accent : 'rgba(255,255,255,0.05)', color: on ? '#17130A' : T.dim }}>
                    <Icon size={17} aria-hidden />
                  </span>
                  <span className="flex-1">{t.label}</span>
                  {n > 0 && <span className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1.5 min-w-[20px] h-[20px]" style={{ background: on ? '#17130A' : T.accent, color: on ? T.accent : '#17130A' }}>{n}</span>}
                </button>
              );
            })}
            {isAdmin && (
              <div className="pt-2 mt-1" style={{ borderTop: `1px solid ${T.line}` }}>
                <Btn small full kind="ghost" onClick={forceTick} disabled={busy} title="Admin only: end the politics month now" id="admin-tick">⚡ End month</Btn>
              </div>
            )}
          </nav>
        </aside>

      <main className="min-w-0">
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
              {tab === 'world' && <WorldView />}
              {tab === 'wire' && <WireView />}
            </ViewBoundary>
            {electionOpen && el && <ElectionNight onClose={() => setElectionOpen(false)} />}
          </FloorContext.Provider>
        )}
      </main>
      </div>

      {toast && (() => {
        const tone = toast.ok === 'info' ? T.accent : toast.ok ? T.good : T.bad;
        const Icon = toast.ok === 'info' ? Lock : toast.ok ? CheckCircle2 : AlertTriangle;
        return (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] w-[min(92vw,520px)] rounded-2xl pl-4 pr-3 py-3 text-sm flex items-start gap-3" role="status" id="toast"
            style={{ background: 'linear-gradient(180deg, rgba(35,40,54,0.96), rgba(28,32,43,0.96))', backdropFilter: 'blur(10px)', border: `1px solid ${tone}66`, boxShadow: `0 24px 60px -20px rgba(0,0,0,0.9), 0 0 0 1px ${tone}1f, inset 3px 0 0 ${tone}`, color: T.text }}>
            <Icon size={18} style={{ color: tone, flexShrink: 0, marginTop: 1 }} aria-hidden />
            <span className="flex-1 leading-snug">{toast.text}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setToast(null)} className="px-1 -mr-1 leading-none text-lg" style={{ color: T.faint }}>×</button>
          </div>
        );
      })()}
    </div>
  );
}
