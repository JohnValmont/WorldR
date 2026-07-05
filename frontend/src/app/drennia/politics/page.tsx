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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        characterApi.getMe(),
        politicsApi.getState(),                              // multi-state overview
        politicsApi.getParties(selectedJurisdictionId),
        politicsApi.getLedger(20, selectedJurisdictionId),
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

  return (
    <div className="flex flex-col" style={{ height: '100%', background: '#090A0F' }}>

      {/* ── Header ─────────────────────────────── */}
      <div className="border-b border-[#2A2630] px-6 pt-5 pb-4 shrink-0">
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-1">
          Drennia · Politics
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-2xl md:text-3xl font-serif text-[#F4EBD6] tracking-wide">
            Political Desk
          </h1>
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6B6358]">Session</div>
            <div className="text-sm font-mono text-[#A79D8C]">
              {displayPhase ? String(displayPhase).toUpperCase() : '—'}
              {sessionYear != null && <span className="text-[#6B6358]"> · Yr {sessionYear}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body: Sidebar + Content ─────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Sidebar */}
        <PoliticsSidebar active={activeSection} onSelect={setActiveSection} />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <PageShell className="py-6">
            {activeSection === 'overview' && (
              <OverviewScreen
                overview={overview}
                character={character}
                parties={parties}
                latestGoverningEvent={latestGoverningEvent}
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
          </PageShell>
        </main>
      </div>
    </div>
  );
}
