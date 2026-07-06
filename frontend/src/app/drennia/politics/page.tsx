'use client';
import React, { useState, useMemo, useCallback } from 'react';
import useSWR from 'swr';
import { PageShell } from '@/components/ui';
import { politicsApi, characterApi } from '@/lib/api';
import { DEFAULT_JURISDICTION_ID, JURISDICTIONS, type JurisdictionId } from './_lib/session';
import PoliticsSidebar, { type PoliticsSection } from './_components/PoliticsSidebar';

import OverviewScreen   from './OverviewScreen';
import ElectionsScreen  from './ElectionsScreen';
import LegislatureScreen from './LegislatureScreen';
import AssemblyScreen   from './AssemblyScreen';
import PartyScreen      from './PartyScreen';
import LobbyScreen      from './LobbyScreen';

export default function PoliticsDesk() {
  const [activeSection, setActiveSection]   = useState<PoliticsSection>('overview');
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<JurisdictionId>(DEFAULT_JURISDICTION_ID);
  const { data: character, mutate: mutateChar, error: errChar } = useSWR('me', () => characterApi.getMe().then(res => res.data || res));
  const { data: overview, mutate: mutateOver, error: errOver } = useSWR('politicsState', () => politicsApi.getState());
  const { data: parties = [], mutate: mutateParties, error: errParties } = useSWR(['parties', selectedJurisdictionId], () => politicsApi.getParties(selectedJurisdictionId));
  const { data: ledger = [], mutate: mutateLedger } = useSWR(['ledger', selectedJurisdictionId], () => politicsApi.getLedger(20, selectedJurisdictionId));
  const { data: myApData, mutate: mutateAp } = useSWR('myAp', () => politicsApi.getMyAp());

  const myAp = (myApData as { current_ap: number; ap_cap: number }) || { current_ap: 0, ap_cap: 4 };

  const loadData = useCallback(async () => {
    await Promise.all([
      mutateChar(), mutateOver(), mutateParties(), mutateLedger(), mutateAp()
    ]);
  }, [mutateChar, mutateOver, mutateParties, mutateLedger, mutateAp]);

  const latestGoverningEvent = useMemo(() => {
    const arr = Array.isArray(ledger) ? ledger : [];
    return arr.find((e: any) => typeof e.kind === 'string' && e.kind.startsWith('gov_'));
  }, [ledger]);

  const loading = !character && !errChar && !overview && !errOver;
  const error = errChar || errOver || errParties;


  const phase        = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const sessionYear  = overview?.sessionYear ?? overview?.year;

  const jurisdictionMeta = useMemo(() => {
    const meta: Record<string, { id: JurisdictionId; phase?: string }> = {};
    if (overview?.activeState) {
      meta[overview.activeState.code] = { id: overview.activeState.code as JurisdictionId, phase };
    }
    return meta;
  }, [overview, phase]);

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
        <div className="text-[#B85555] p-4 border border-[#B85555]/30 bg-[#8F3D3D]/10 mx-8">{String(error?.message || error)}</div>
      </PageShell>
    );

  const myParty = parties.find((p: any) => p.leader_character_id === (character?.id));

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#13141f' }}>

      {/* ── Top bar ──────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-[#252637] shrink-0 bg-[#13141f]">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6b6d8a] uppercase tracking-wider">Drennia</span>
          <span className="text-[#3a3b4d]">/</span>
          <span className="text-[11px] text-white font-semibold uppercase tracking-wider">Politics</span>
        </div>

        <div className="flex items-center gap-3">
          {character?.finances?.cash_in_hand != null && (
            <div className="px-3 py-1.5 bg-[#1c1d2e] border border-[#252637] rounded-lg text-[12px] font-mono font-bold text-white">
              ${Number(character.finances.cash_in_hand).toLocaleString()}
            </div>
          )}
          <div className="px-3 py-1.5 bg-[#e8752a] rounded-lg text-[11px] font-bold text-white uppercase tracking-wider">
            {myAp.current_ap} / {myAp.ap_cap} AP Available
          </div>
          <div className="px-3 py-1.5 bg-[#1c1d2e] border border-[#252637] rounded-lg text-[11px] text-[#8b8da8] uppercase tracking-wider">
            {displayPhase || 'Governing'}
          </div>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        <PoliticsSidebar
          active={activeSection}
          onSelect={setActiveSection}
          myPartyName={myParty?.name || 'Political Desk'}
          myPartyNation={overview?.activeState?.name || 'Ironvale'}
        />

        <main className="flex-1 overflow-y-auto bg-[#13141f]">
          <div className="max-w-5xl mx-auto px-8 py-8">
            {loading ? (
              <div className="text-[#A79D8C] p-8 flex items-center justify-center">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#A79D8C] rounded-full" />
                  <div className="w-2 h-2 bg-[#A79D8C] rounded-full" />
                  <div className="w-2 h-2 bg-[#A79D8C] rounded-full" />
                  <span className="ml-2 font-mono text-xs uppercase tracking-widest">Loading Records...</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-[#B85555] p-4 border border-[#B85555]/30 bg-[#8F3D3D]/10 mx-8">
                {String(error?.message || error)}
              </div>
            ) : activeSection === 'overview' ? (
              <OverviewScreen
                overview={overview}
                character={character}
                parties={parties}
                latestGoverningEvent={latestGoverningEvent}
                myAp={myAp}
                onNavigate={setActiveSection}
                onRefresh={loadData}
              />
            ) : activeSection === 'elections' ? (
              <ElectionsScreen {...commonProps} />
            ) : activeSection === 'legislature' ? (
              <LegislatureScreen {...commonProps} />
            ) : activeSection === 'assembly' ? (
              <AssemblyScreen {...commonProps} />
            ) : activeSection === 'party' ? (
              <PartyScreen {...commonProps} />
            ) : activeSection === 'lobby' ? (
              <LobbyScreen {...commonProps} />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
