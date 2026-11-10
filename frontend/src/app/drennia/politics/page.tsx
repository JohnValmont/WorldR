'use client';
// Politics — "The Capitol" (Phase 2 rebuild, docs/REVIVAL_PLAN.md).
// Open to every player. One read model (GET /politics/capitol) drives the new
// Overview / Nation / Parliament / Laws / Elections screens; the older detailed
// screens (campaign desk, party HQ, lobby, legacy) stay available as tabs.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { politicsApi, characterApi, worldApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useWorldClock, formatCountdown } from '@/hooks/useWorldClock';
import { formatPolArc } from '@/lib/calendar';
import { DEFAULT_JURISDICTION_ID } from './_lib/session';

import { C, PHASES } from './_capitol/theme';
import { CapitolSkyline, NationFlag } from './_capitol/art';
import OverviewTab from './_capitol/OverviewTab';
import NationTab from './_capitol/NationTab';
import ParliamentTab from './_capitol/ParliamentTab';
import LawsTab from './_capitol/LawsTab';
import ElectionsTab from './_capitol/ElectionsTab';

import ElectionsScreen from './ElectionsScreen';
import PartyScreen from './PartyScreen';
import LobbyScreen from './LobbyScreen';
import LegacyScreen from './LegacyScreen';

type Tab = 'overview' | 'nation' | 'parliament' | 'laws' | 'elections' | 'campaign' | 'party' | 'lobby' | 'legacy';
const TABS: { id: Tab; label: string; legacy?: boolean }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'nation', label: 'Nation' },
  { id: 'parliament', label: 'Parliament' },
  { id: 'laws', label: 'Laws' },
  { id: 'elections', label: 'Elections' },
  { id: 'campaign', label: 'Campaign desk', legacy: true },
  { id: 'party', label: 'Party HQ', legacy: true },
  { id: 'lobby', label: 'Lobby', legacy: true },
  { id: 'legacy', label: 'Legacy', legacy: true },
];
// Older screens navigate with their own ids; map them onto the new tabs.
const LEGACY_NAV: Record<string, Tab> = {
  overview: 'overview', nation: 'nation', development: 'nation', elections: 'campaign', legislature: 'parliament',
  assembly: 'parliament', policy: 'laws', party: 'party', lobby: 'lobby', legacy: 'legacy', map: 'elections',
};

class TabErrorBoundary extends React.Component<{ children: React.ReactNode; tab: string }, { error: Error | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error(`[Politics] ${this.props.tab} tab crashed:`, error); }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-xl p-6 text-sm" style={{ background: 'rgba(194,72,63,0.08)', border: '1px solid rgba(194,72,63,0.35)', color: '#E88C84' }}>
          <div className="font-semibold mb-1">This screen hit an error.</div>
          <div className="opacity-70 mb-3">{this.state.error.message}</div>
          <button className="underline" onClick={() => this.setState({ error: null })}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PoliticsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const { clock, polSecondsToTick, isPolTickStalled } = useWorldClock();
  const user = useAuthStore(s => s.user);
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const isAdmin = user?.role === 'admin' || isAdminDynamic;
  useEffect(() => { authApi.me().then(res => setIsAdminDynamic(!!res.data?.isAdmin)).catch(() => {}); }, []);

  const { data: cap, error, mutate } = useSWR('politics-capitol', () => politicsApi.getCapitol(), { refreshInterval: 30_000 });
  const refresh = useCallback(() => { mutate(); }, [mutate]);

  // Data for the older screens, fetched only when one of them is open.
  const legacyOpen = TABS.find(t => t.id === tab)?.legacy;
  const { data: character, mutate: mChar } = useSWR(legacyOpen ? 'politics-me' : null, () => characterApi.getMe().then((r: any) => r.data || r));
  const { data: overview, mutate: mOver } = useSWR(legacyOpen ? 'politicsState' : null, () => politicsApi.getState());
  const { data: parties = [], mutate: mParties } = useSWR(legacyOpen ? ['parties', DEFAULT_JURISDICTION_ID] : null, () => politicsApi.getParties(DEFAULT_JURISDICTION_ID));
  const { data: apData, mutate: mAp } = useSWR(legacyOpen ? 'myAp' : null, () => politicsApi.getMyAp());
  const { data: pcData, mutate: mPc } = useSWR(legacyOpen ? 'myPc' : null, () => politicsApi.getMyPc());
  const legacyRefresh = useCallback(async () => { await Promise.all([mChar(), mOver(), mParties(), mAp(), mPc(), mutate()]); }, [mChar, mOver, mParties, mAp, mPc, mutate]);
  const legacyProps = useMemo(() => ({
    selectedJurisdictionId: DEFAULT_JURISDICTION_ID,
    onJurisdictionChange: () => {},
    jurisdictionMeta: overview?.activeState ? { [overview.activeState.code]: { id: overview.activeState.code } } : {},
    overview, character, parties,
    myAp: (apData as any) || { current_ap: 0, ap_cap: 12 },
    myPc: (pcData as any) || { current_pc: 0, pc_cap: 10 },
    onRefresh: legacyRefresh,
    onNavigate: (id: string) => setTab(LEGACY_NAV[id] ?? 'overview'),
  }), [overview, character, parties, apData, pcData, legacyRefresh]);

  const go = (t: string) => setTab((TABS.find(x => x.id === t)?.id ?? LEGACY_NAV[t] ?? 'overview') as Tab);

  const forceTick = async () => {
    if (advancing) return;
    setAdvancing(true);
    try { await worldApi.forcePoliticsTick(); await mutate(); }
    catch (e: any) { alert(e?.response?.data?.error || e?.message || 'Failed to advance the politics month'); }
    finally { setAdvancing(false); }
  };

  const phase = cap ? PHASES.find(p => p.key === cap.calendar.phase) : null;

  return (
    <div className="min-h-screen" style={{ background: C.night, color: C.ivory }}>
      {/* ── Banner ── */}
      <header className="relative overflow-hidden" style={{ borderBottom: `1px solid ${C.line}` }}>
        <CapitolSkyline className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,14,24,0.92) 0%, rgba(10,14,24,0.55) 55%, rgba(10,14,24,0.85) 100%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-4">
          <div className="flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="shrink-0 sm:hidden"><NationFlag spec={cap?.nation.flag} width={52} /></div>
              <div className="shrink-0 hidden sm:block"><NationFlag spec={cap?.nation.flag} width={84} /></div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.25em]" style={{ color: C.brass }}>{cap?.nation.government ?? 'Politics'}</div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold leading-tight truncate">{cap?.nation.officialName ?? 'The Capitol'}</h1>
                {cap?.nation.motto && <div className="text-xs italic truncate" style={{ color: C.ink }}>&ldquo;{cap.nation.motto}&rdquo;</div>}
              </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 text-right">
              {cap && (
                <>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Date</div>
                    <div className="font-mono text-sm">{formatPolArc(cap.calendar.arc)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Phase</div>
                    <div className="text-sm font-semibold" style={{ color: C.brass }}>{phase?.label}</div>
                  </div>
                </>
              )}
              <div>
                <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>Next month</div>
                <div className="font-mono text-sm">
                  {clock?.status === 'paused' ? 'Paused' : isPolTickStalled ? 'Delayed' : polSecondsToTick != null ? formatCountdown(polSecondsToTick) : '--:--'}
                </div>
              </div>
              {cap?.me && (
                <div className="hidden sm:block">
                  <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>AP</div>
                  <div className="font-mono text-sm" style={{ color: C.brass }}>{cap.me.ap.current}/{cap.me.ap.cap}</div>
                </div>
              )}
              {isAdmin && (
                <button onClick={forceTick} disabled={advancing} className="text-[10px] font-mono uppercase tracking-wider px-2 py-1.5 rounded border disabled:opacity-50" style={{ borderColor: 'rgba(147,51,234,0.5)', color: '#D8B4FE' }} title="Admin only: run the next politics month now">
                  {advancing ? '…' : '⚡ Tick'}
                </button>
              )}
            </div>
          </div>
        </div>
        {/* ── Tabs ── */}
        <nav className="relative max-w-7xl mx-auto px-2 sm:px-4 overflow-x-auto" aria-label="Politics sections">
          <div className="flex gap-1 min-w-max">
            {TABS.map((t, i) => (
              <React.Fragment key={t.id}>
                {t.legacy && !TABS[i - 1]?.legacy && <span className="w-px my-2 mx-1" style={{ background: C.line }} />}
                <button
                  id={`tab-${t.id}`}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className="px-3 py-2.5 text-[13px] font-semibold transition-colors relative"
                  style={{ color: tab === t.id ? C.ivory : C.muted }}
                >
                  {t.label}
                  {tab === t.id && <span className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full" style={{ background: C.brass }} />}
                </button>
              </React.Fragment>
            ))}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        {!cap && !error && (
          <div className="py-24 text-center text-xs uppercase tracking-[0.3em]" style={{ color: C.muted }}>Convening Parliament…</div>
        )}
        {error && !cap && (
          <div className="rounded-xl p-5 text-sm" style={{ background: 'rgba(194,72,63,0.08)', border: '1px solid rgba(194,72,63,0.35)', color: '#E88C84' }}>
            Couldn&apos;t load politics: {String((error as any)?.response?.data?.error || (error as any)?.message || error)}
            <button className="ml-3 underline" onClick={() => mutate()}>Retry</button>
          </div>
        )}
        {cap && (
          <TabErrorBoundary key={tab} tab={tab}>
            {tab === 'overview' && <OverviewTab cap={cap} go={go} />}
            {tab === 'nation' && <NationTab cap={cap} />}
            {tab === 'parliament' && <ParliamentTab cap={cap} refresh={refresh} />}
            {tab === 'laws' && <LawsTab cap={cap} refresh={refresh} />}
            {tab === 'elections' && <ElectionsTab cap={cap} go={go} />}
            {legacyOpen && !overview && <div className="py-16 text-center text-xs" style={{ color: C.muted }}>Loading…</div>}
            {tab === 'campaign' && overview && <ElectionsScreen {...(legacyProps as any)} />}
            {tab === 'party' && overview && <PartyScreen {...(legacyProps as any)} />}
            {tab === 'lobby' && overview && <LobbyScreen {...(legacyProps as any)} />}
            {tab === 'legacy' && character && <LegacyScreen character={character} />}
          </TabErrorBoundary>
        )}
      </main>
    </div>
  );
}
