'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { Lock } from 'lucide-react';
import { politicsApi, characterApi, worldApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DEFAULT_JURISDICTION_ID, type JurisdictionId } from './_lib/session';
import { JURISDICTION_MODEL } from './_lib/model';
import { formatGameDateShort } from '@/lib/calendar';
import { useWorldClock, formatCountdown } from '@/hooks/useWorldClock';

import OverviewScreen    from './OverviewScreen';
import NationScreen      from './NationScreen';
import ElectionsScreen   from './ElectionsScreen';
import LegislatureScreen from './LegislatureScreen';
import PolicyScreen      from './PolicyScreen';
import AssemblyScreen    from './AssemblyScreen';
import PartyScreen       from './PartyScreen';
import LobbyScreen       from './LobbyScreen';
import LegacyScreen      from './LegacyScreen';
import DevelopmentScreen from './DevelopmentScreen';

import PoliticsSidebar from './_components/PoliticsSidebar';
import { PageShell } from '@/components/ui';

// ─── Sub-tab types ────────────────────────────────────────────────────────────
type SubTab = 'overview' | 'nation' | 'development' | 'elections' | 'legislature' | 'assembly' | 'policy' | 'party' | 'lobby' | 'legacy';

export default function PoliticsDesk() {
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<JurisdictionId>(DEFAULT_JURISDICTION_ID);
  const { clock, polSecondsToTick, isPolTickStalled } = useWorldClock();

  // 'politics-me' avoids a cache collision with the DRX exchange page's 'me' key.
  const POLL_MS = 30_000;

  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const [isAdvancingPol, setIsAdvancingPol] = useState(false);
  const user = useAuthStore(state => state.user);

  const isSuperAdminEmail = user?.email && (
    user.email.toLowerCase() === 'kyxplayss@gmail.com' ||
    user.email.toLowerCase() === 'infoforbiddengaming@gmail.com'
  );
  const isAdmin = user?.role === 'admin' || isSuperAdminEmail || isAdminDynamic;

  useEffect(() => {
    authApi.me().then(res => setIsAdminDynamic(res.data.isAdmin)).catch(() => {});
  }, []);

  const { data: character, mutate: mutateChar, error: errChar } = useSWR(isAdmin ? 'politics-me' : null, () => characterApi.getMe().then((res: any) => res.data || res), { refreshInterval: POLL_MS });
  const { data: overview, mutate: mutateOver, error: errOver } = useSWR(isAdmin ? 'politicsState' : null, () => politicsApi.getState(), { refreshInterval: POLL_MS });
  const { data: parties = [], mutate: mutateParties, error: errParties } = useSWR(isAdmin ? ['parties', selectedJurisdictionId] : null, () => politicsApi.getParties(selectedJurisdictionId), { refreshInterval: POLL_MS });
  const { data: ledger = [], mutate: mutateLedger } = useSWR(isAdmin ? ['ledger', selectedJurisdictionId] : null, () => politicsApi.getLedger(20, selectedJurisdictionId), { refreshInterval: POLL_MS });
  const { data: myApData, mutate: mutateAp } = useSWR(isAdmin ? 'myAp' : null, () => politicsApi.getMyAp(), { refreshInterval: POLL_MS });
  const { data: myPcData, mutate: mutatePc } = useSWR(isAdmin ? 'myPc' : null, () => politicsApi.getMyPc(), { refreshInterval: POLL_MS });

  const myAp = (myApData as { current_ap: number; ap_cap: number }) || { current_ap: 0, ap_cap: 12 };
  const myPc = (myPcData as { current_pc: number; pc_cap: number }) || { current_pc: 0, pc_cap: 10 };

  const loadData = useCallback(async () => {
    await Promise.all([mutateChar(), mutateOver(), mutateParties(), mutateLedger(), mutateAp(), mutatePc()]);
  }, [mutateChar, mutateOver, mutateParties, mutateLedger, mutateAp, mutatePc]);

  const handleForcePolTick = async () => {
    if (isAdvancingPol) return;
    setIsAdvancingPol(true);
    try {
      const res = await worldApi.forcePoliticsTick();
      const result = res?.data ?? res;
      if (result?.status === 'success' || result?.data?.status === 'ticked') {
        await loadData();
        window.location.reload();
        return;
      }
      alert(result?.message || 'Politics tick executed');
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to advance politics tick');
    } finally {
      setIsAdvancingPol(false);
    }
  };

  const loading = isAdmin && !character && !errChar && !overview && !errOver;
  const error = errChar || errOver || errParties;

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-screen bg-[#090A0F] text-zinc-100 items-center justify-center p-6 select-none font-mono">
        <div className="max-w-md w-full bg-zinc-950/80 border border-zinc-800/80 p-8 rounded-xl backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-5 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <Lock size={26} />
          </div>
          <div className="text-[11px] font-bold text-amber-500/90 tracking-widest uppercase mb-1">Restricted Access</div>
          <h1 className="text-xl font-bold text-zinc-100 font-sans mb-3">Political Desk Locked</h1>
          <p className="text-xs text-zinc-400 font-sans leading-relaxed mb-6">
            The Political Desk is currently restricted to Administrators during closed pre-release testing. Check back in a future update!
          </p>
          <a
            href="/drennia/chronicle"
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg transition-all border border-zinc-700 shadow-md flex items-center gap-2"
          >
            ← Return to Chronicle
          </a>
        </div>
      </div>
    );
  }

  const jMeta = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;

  const jurisdictionMeta = useMemo(() => {
    const meta: Record<string, any> = {};
    if (overview?.activeState) meta[overview.activeState.code] = { id: overview.activeState.code };
    return meta;
  }, [overview]);

  const commonProps = {
    selectedJurisdictionId,
    onJurisdictionChange: setSelectedJurisdictionId,
    jurisdictionMeta,
    overview,
    character,
    parties,
    myAp,
    myPc,
    onRefresh: loadData,
    onNavigate: setActiveTab,
  };

  const myParty = overview?.globalParty || (Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id || p.members?.some((m: any) => m.character_id === character?.id || m.id === character?.id)) : undefined);

  return (
    <div className="flex flex-col h-screen bg-[#090A0F] text-zinc-100 overflow-hidden">
      
      {/* ─── Compact Header ─── */}
      <header className="flex-none bg-zinc-950 border-b border-zinc-900/60 sticky top-0 z-20 backdrop-blur-xl supports-[backdrop-filter]:bg-zinc-950/80">
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[0_0_10px_rgba(79,110,247,0.3)]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/><path d="M3 10 12 4l9 6"/>
              </svg>
            </div>
            <div className="text-[13px] font-bold text-[#F4EBD6]">Political Desk</div>
          </div>
          
          <div className="flex items-center gap-6">
            {character?.political?.credibility != null && (
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Credibility</span>
                <span className="text-sm font-bold text-zinc-100 font-mono">{character.political.credibility}</span>
              </div>
            )}
            {character?.finances?.cash_in_hand != null && (
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Liquid Cash</span>
                <span className="text-sm font-bold text-[#36D399] font-mono">${Number(character.finances.cash_in_hand).toLocaleString()}</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-bold">AP ({myAp.current_ap}/{myAp.ap_cap})</span>
              <span className="text-sm font-bold text-terminal-amber font-mono">{myAp.current_ap}</span>
            </div>
            {overview?.cycle?.currentArc != null && (
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Current Date</span>
                <span className="text-sm font-bold text-zinc-100 font-mono">{formatGameDateShort(overview.cycle.currentArc)}</span>
              </div>
            )}
            {clock && clock.status !== 'paused' && (
              <div className="flex flex-col min-w-[90px]">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Next Month</span>
                <span className={`text-sm font-bold font-mono ${polSecondsToTick != null && polSecondsToTick <= 60 ? 'text-terminal-amber animate-pulse' : 'text-zinc-100'}`}>
                  {isPolTickStalled ? 'DELAYED' : polSecondsToTick != null ? formatCountdown(polSecondsToTick) : '--:--:--'}
                </span>
              </div>
            )}
            {clock?.status === 'paused' && (
              <div className="flex flex-col min-w-[90px]">
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono font-bold">Next Month</span>
                <span className="text-sm font-bold font-mono text-zinc-500">PAUSED</span>
              </div>
            )}
            {isAdmin && (
              <button
                onClick={handleForcePolTick}
                disabled={isAdvancingPol}
                className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded border border-purple-500/50 bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800/80 hover:to-indigo-800/80 text-purple-200 shadow-[0_0_12px_rgba(147,51,234,0.25)] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isAdvancingPol ? 'PROCESSING...' : '⚡ FORCE POL TICK'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Sidebar + Main Content Row ─── */}
      <div className="flex flex-1 overflow-hidden">
        <PoliticsSidebar
          active={activeTab}
          onSelect={(id) => setActiveTab(id as SubTab)}
          myPartyName={myParty?.name}
          myPartyNation={jMeta?.name}
          partyColor={myParty?.identity?.color || myParty?.colorHex}
        />

        <div className="flex-1 overflow-y-auto bg-[#090A0F]">
          <PageShell className="py-6 px-8">
            {loading ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono uppercase tracking-widest">
                Convening the Political Desk...
              </div>
            ) : error ? (
              <div className="bg-[#B85555]/10 border border-[#B85555]/40 text-[#B85555] p-4 rounded-xl text-sm">
                {String((error as any)?.response?.data?.error || (error as any)?.message || error)}
              </div>
            ) : (
              <>
                {activeTab === 'overview' && <OverviewScreen overview={overview} character={character} parties={parties} myAp={myAp} selectedJurisdictionId={selectedJurisdictionId} onNavigate={setActiveTab} onRefresh={loadData} />}
                {activeTab === 'nation' && <NationScreen selectedJurisdictionId={selectedJurisdictionId} onJurisdictionChange={setSelectedJurisdictionId} jurisdictionMeta={jurisdictionMeta} overview={overview} ledger={ledger} />}
                {activeTab === 'development' && <DevelopmentScreen overview={overview} selectedJurisdictionId={selectedJurisdictionId} />}
                {activeTab === 'elections' && <ElectionsScreen {...commonProps} />}
                {activeTab === 'legislature' && <LegislatureScreen {...commonProps} />}
                {activeTab === 'policy' && <PolicyScreen {...commonProps} />}
                {activeTab === 'assembly' && <AssemblyScreen {...commonProps} />}
                {activeTab === 'party' && <PartyScreen {...commonProps} />}
                {activeTab === 'lobby' && <LobbyScreen {...commonProps} />}
                {activeTab === 'legacy' && <LegacyScreen character={character} />}
              </>
            )}
          </PageShell>
        </div>
      </div>
    </div>
  );
}
