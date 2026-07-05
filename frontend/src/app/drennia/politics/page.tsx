'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PageShell, Tabs } from '@/components/ui';
import { politicsApi, characterApi } from '@/lib/api';
import { POL_ACTIVE_STATE_NAME } from './_lib/session';
import OverviewTab from './OverviewTab';
import PartyTab from './PartyTab';
import CampaignTab from './CampaignTab';
import PollsTab from './PollsTab';
import CouncilTab from './CouncilTab';
import LobbyTendersTab from './LobbyTendersTab';

export default function PoliticsDesk() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [character, setCharacter] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [latestGoverningEvent, setLatestGoverningEvent] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        characterApi.getMe(),
        politicsApi.getState(),
        politicsApi.getParties(),
        politicsApi.getLedger(20),
      ]);

      if (results[0].status === 'fulfilled') {
        const r = results[0].value;
        setCharacter(r.data || r);
      }
      if (results[1].status === 'fulfilled') {
        setOverview(results[1].value);
      } else {
        console.warn('Politics state endpoint error:', (results[1] as any).reason?.message);
      }
      if (results[2].status === 'fulfilled') {
        setParties(results[2].value);
      } else {
        console.warn('Politics parties endpoint error:', (results[2] as any).reason?.message);
      }
      if (results[3].status === 'fulfilled') {
        const ledger: any[] = Array.isArray(results[3].value) ? results[3].value : [];
        const govEvent = ledger.find((e: any) => typeof e.kind === 'string' && e.kind.startsWith('gov_'));
        if (govEvent) setLatestGoverningEvent(govEvent);
      }

      // Only block the page if ALL three failed
      if (results.every(r => r.status === 'rejected')) {
        setError((results[0] as any).reason?.response?.data?.message || 'Failed to load politics data');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to load politics data');
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    loadData();
  }, [loadData]);

  const phase = overview?.cyclePhase || overview?.cycle?.phase;
  const sessionYear = overview?.sessionYear ?? overview?.year;

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#090A0F' }}>
      <div style={{ padding: '20px 24px 0' }} className="border-b border-[#2A2630]">
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-1">
          {overview?.activeState ? `${overview.activeState.name} · Politics` : 'Politics'}
        </div>
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <h1 className="text-2xl md:text-3xl font-serif text-[#F4EBD6] tracking-wide">Political Desk</h1>
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#6B6358]">Session</div>
            <div className="text-sm font-mono text-[#A79D8C]">
              {phase ? String(phase).toUpperCase() : '—'}
              {sessionYear != null && <span className="text-[#6B6358]"> · Yr {sessionYear}</span>}
            </div>
          </div>
        </div>

        <Tabs
          tabs={[
            { id: 'overview', label: 'The Session' },
            { id: 'party', label: 'Your Party' },
            { id: 'campaign', label: 'War Room' },
            { id: 'polls', label: 'Election Night' },
            { id: 'council', label: 'The Chamber' },
            { id: 'lobby', label: 'The Lobby' },
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 overflow-y-auto animate-slide-in">
        {activeTab === 'overview' && (
          <PageShell className="py-6">
            <OverviewTab overview={overview} character={character} parties={parties} latestGoverningEvent={latestGoverningEvent} onNavigateToParty={() => setActiveTab('party')} />
          </PageShell>
        )}
        {activeTab === 'party' && (
          <PageShell className="py-6">
            <PartyTab overview={overview} character={character} parties={parties} onRefresh={loadData} />
          </PageShell>
        )}
        {activeTab === 'campaign' && (
          <PageShell className="py-6">
            <CampaignTab overview={overview} character={character} parties={parties} onRefresh={loadData} />
          </PageShell>
        )}
        {activeTab === 'polls' && (
          <PageShell className="py-6">
            <PollsTab overview={overview} parties={parties} />
          </PageShell>
        )}
        {activeTab === 'council' && (
          <PageShell className="py-6">
            <CouncilTab overview={overview} character={character} parties={parties} />
          </PageShell>
        )}
        {activeTab === 'lobby' && (
          <PageShell className="py-6">
            <LobbyTendersTab overview={overview} character={character} parties={parties} />
          </PageShell>
        )}
      </div>
    </div>
  );
}
