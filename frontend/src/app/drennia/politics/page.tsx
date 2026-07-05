'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageShell } from '@/components/ui';
import { politicsApi, characterApi } from '@/lib/api';
import { DEFAULT_JURISDICTION_ID, JURISDICTIONS, type JurisdictionId } from './_lib/session';
import PoliticsSidebar, { type PoliticsSection } from './_components/PoliticsSidebar';

import OverviewScreen   from './OverviewScreen';
import ElectionsScreen  from './ElectionsScreen';
import LegislatureScreen from './LegislatureScreen';
import AssemblyScreen   from './AssemblyScreen';
import PartyScreen      from './PartyScreen';
import WarRoomScreen    from './WarRoomScreen';
import LobbyScreen      from './LobbyScreen';

export default function PoliticsDesk() {
  const [activeSection, setActiveSection]   = useState<PoliticsSection>('overview');
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<JurisdictionId>(DEFAULT_JURISDICTION_ID);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const [character, setCharacter]                   = useState<any>(null);
  const [overview, setOverview]                     = useState<any>(null);
  const [parties, setParties]                       = useState<any[]>([]);
  const [latestGoverningEvent, setLatestGoverningEvent] = useState<any>(null);
  const [myAp, setMyAp]                             = useState<{ current_ap: number; ap_cap: number }>({ current_ap: 4, ap_cap: 4 });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        characterApi.getMe(),
        politicsApi.getState(),                              // multi-state overview
        politicsApi.getParties(selectedJurisdictionId),
        politicsApi.getLedger(20, selectedJurisdictionId),
        politicsApi.getMyAp(),
      ]);

      if (results[0].status === 'fulfilled') {
        const r = results[0].value;
        setCharacter(r.data || r);
      }
      if (results[1].status === 'fulfilled') {
        setOverview(results[1].value);
      } else {
        console.warn('Politics state error:', (results[1] as any).reason?.message);
      }
      if (results[2].status === 'fulfilled') {
        setParties(results[2].value);
      }
      if (results[3].status === 'fulfilled') {
        const ledger: any[] = Array.isArray(results[3].value) ? results[3].value : [];
        const govEvent = ledger.find((e: any) => typeof e.kind === 'string' && e.kind.startsWith('gov_'));
        if (govEvent) setLatestGoverningEvent(govEvent);
      }
      if (results[4].status === 'fulfilled') {
        setMyAp(results[4].value as { current_ap: number; ap_cap: number });
      }

      if (results.every(r => r.status === 'rejected')) {
        const firstReason = (results[0] as any).reason;
        setError(firstReason?.response?.data?.error || firstReason?.response?.data?.message || firstReason?.message || 'Failed to load politics data');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to load politics data');
    } finally {
      setLoading(false);
    }
  }, [selectedJurisdictionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived values
  const phase        = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const sessionYear  = overview?.sessionYear ?? overview?.year;

  // Build jurisdictionMeta for JurisdictionSwitcher phase dots
  const jurisdictionMeta = useMemo(() => {
    const meta: Record<string, { id: JurisdictionId; phase?: string }> = {};
    if (overview?.activeState) {
      meta[overview.activeState.code] = { id: overview.activeState.code as JurisdictionId, phase };
    }
    return meta;
  }, [overview, phase]);

  // Phase label for the header — reflects whichever jurisdiction is selected
  const displayPhase = useMemo(() => {
    const m = jurisdictionMeta[selectedJurisdictionId];
    return m?.phase ?? phase;
  }, [jurisdictionMeta, selectedJurisdictionId, phase]);

  const commonProps = {
    selectedJurisdictionId,
    onJurisdictionChange: setSelectedJurisdictionId,
    jurisdictionMeta,
    overview,
    character,
    parties,
    myAp,
    onRefresh: loadData,
  };

  if (loading)
    return (
      <PageShell className="py-6">
        <div className="text-[#A79D8C] px-8">Convening the Political Desk…</div>
      </PageShell>
    );
  if (error)
    return (
      <PageShell className="py-6">
        <div className="text-[#B85555] p-4 border border-[#B85555]/30 bg-[#8F3D3D]/10 mx-8">{error}</div>
      </PageShell>
    );

  const myParty = parties.find((p: any) => p.leader_character_id === (character?.id));

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#13141f' }}>

      {/* ── Top bar — Nationhood style ──────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-[#252637] shrink-0 bg-[#13141f]">
        {/* Left: breadcrumb */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6b6d8a] uppercase tracking-wider">Drennia</span>
          <span className="text-[#3a3b4d]">/</span>
          <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Politics</span>
        </div>

        {/* Right: status pills */}
        <div className="flex items-center gap-3">
          {/* Cash */}
          {character?.finances?.cash_in_hand != null && (
            <div className="px-3 py-1.5 bg-[#1c1d2e] border border-[#252637] rounded-lg text-[12px] font-mono font-bold text-white">
              ${Number(character.finances.cash_in_hand).toLocaleString()}
            </div>
          )}
          {/* AP pill — matches Nationhood "PARTY ACTIONS: N AVAILABLE" */}
          <div className="px-3 py-1.5 bg-[#e8752a] rounded-lg text-[11px] font-bold text-white uppercase tracking-wider">
            {myAp.current_ap} / {myAp.ap_cap} AP Available
          </div>
          {/* Phase */}
          <div className="px-3 py-1.5 bg-[#1c1d2e] border border-[#252637] rounded-lg text-[11px] text-[#8b8da8] uppercase tracking-wider">
            {displayPhase || 'Governing'}
          </div>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Sidebar */}
        <PoliticsSidebar
          active={activeSection}
          onSelect={setActiveSection}
          myPartyName={myParty?.name || 'Political Desk'}
          myPartyNation={overview?.activeState?.name || 'Ironvale'}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-[#13141f]">
          <div className="max-w-5xl mx-auto px-8 py-8">
            {activeSection === 'overview' && (
              <OverviewScreen
                overview={overview}
                character={character}
                parties={parties}
                latestGoverningEvent={latestGoverningEvent}
                myAp={myAp}
                onNavigate={setActiveSection}
              />
            )}
            {activeSection === 'elections' && (
              <ElectionsScreen {...commonProps} />
            )}
            {activeSection === 'legislature' && (
              <LegislatureScreen {...commonProps} />
            )}
            {activeSection === 'assembly' && (
              <AssemblyScreen {...commonProps} />
            )}
            {activeSection === 'party' && (
              <PartyScreen {...commonProps} />
            )}
            {activeSection === 'warroom' && (
              <WarRoomScreen {...commonProps} />
            )}
            {activeSection === 'lobby' && (
              <LobbyScreen {...commonProps} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
