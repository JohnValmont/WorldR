'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { PageShell, Tabs } from '@/components/ui';
import { politicsApi, characterApi } from '@/lib/api';
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const charRes = await characterApi.getMe();
      setCharacter(charRes.data || charRes);
      
      const overviewData = await politicsApi.getState();
      setOverview(overviewData);
      
      const partiesData = await politicsApi.getParties();
      setParties(partiesData);
      
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load politics data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <PageShell className="py-6"><div className="text-[#A79D8C] px-8">Loading Political Desk...</div></PageShell>;
  if (error) return <PageShell className="py-6"><div className="text-[#B85555] p-4 border border-[#B85555]/30 bg-[#8F3D3D]/10 mx-8">{error}</div></PageShell>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#090A0F' }}>
      <div style={{ padding: '24px 32px 0 32px', borderBottom: '1px solid #2A2630' }}>
        <h1 style={{ fontSize: '24px', fontFamily: 'serif', color: '#F4EBD6', marginBottom: '16px' }}>Political Desk</h1>
        <Tabs
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'party', label: 'Party' },
            { id: 'campaign', label: 'Campaign' },
            { id: 'polls', label: 'Polls' },
            { id: 'council', label: 'Council & Government' },
            { id: 'lobby', label: 'Lobby & Tenders' }
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
      </div>

      <div className="flex-1 overflow-y-auto animate-slide-in">
        {activeTab === 'overview' && <PageShell className="py-6"><OverviewTab overview={overview} character={character} parties={parties} onNavigateToParty={() => setActiveTab('party')} /></PageShell>}
        {activeTab === 'party' && <PageShell className="py-6"><PartyTab overview={overview} character={character} parties={parties} onRefresh={loadData} /></PageShell>}
        {activeTab === 'campaign' && <PageShell className="py-6"><CampaignTab overview={overview} character={character} parties={parties} onRefresh={loadData} /></PageShell>}
        {activeTab === 'polls' && <PageShell className="py-6"><PollsTab overview={overview} parties={parties} /></PageShell>}
        {activeTab === 'council' && <PageShell className="py-6"><CouncilTab overview={overview} character={character} parties={parties} /></PageShell>}
        
        {activeTab === 'lobby' && (
          <PageShell className="py-6">
            <LobbyTendersTab overview={overview} character={character} parties={parties} />
          </PageShell>
        )}
      </div>
    </div>
  );
}
