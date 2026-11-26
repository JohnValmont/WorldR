"use client";

import React, { useState } from 'react';
import SelfAnalyticsDashboard from './SelfAnalyticsDashboard';
import MarketStructure from './MarketStructure';
import CompetitorResearch from './CompetitorResearch';
import { BarChart2, Globe, Search } from 'lucide-react';
import Tabs, { TabItem } from '@/components/ui/Tabs';

type AnalyticsTab = 'self' | 'market' | 'research';
const ANALYTICS_TABS: TabItem[] = [
  { id: 'self', label: 'My performance', icon: BarChart2 },
  { id: 'market', label: 'Market overview', icon: Globe },
  { id: 'research', label: 'Competitor research', icon: Search },
];

interface AnalyticsDashboardProps {
  companyId: string;
  countryId: string;
}

export default function AnalyticsDashboard({ companyId, countryId }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('self');

  return (
    <div className="page-frame py-6">
      <header className="mb-4">
        <div>
          {/* h2: the screen's PageHeader owns the page's only h1. */}
          <h2 className="m-0 font-display text-[22px] font-semibold text-ink">
            Market intelligence
          </h2>
          <p className="mt-1 text-[14px] text-ink-dim">
            Strategic analysis and performance metrics
          </p>
        </div>

      </header>

      <Tabs
        inset="none"
        label="Market intelligence sections"
        tabs={ANALYTICS_TABS}
        activeId={activeTab}
        onChange={(id) => setActiveTab(id as AnalyticsTab)}
      />

      <div className="mt-6">
        {activeTab === 'self' && (
          <div className="animate-in fade-in duration-500">
            <SelfAnalyticsDashboard companyId={companyId} />
          </div>
        )}
        {activeTab === 'market' && (
          <MarketStructure countryId={countryId} />
        )}
        {activeTab === 'research' && (
          <CompetitorResearch companyId={companyId} countryId={countryId} />
        )}
      </div>
    </div>
  );
}
