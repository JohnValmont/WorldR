"use client";

import React, { useState } from 'react';
import SelfAnalyticsDashboard from './SelfAnalyticsDashboard';
import MarketStructure from './MarketStructure';
import CompetitorResearch from './CompetitorResearch';
import { BarChart2, Globe, Search } from 'lucide-react';

interface AnalyticsDashboardProps {
  companyId: string;
  countryId: string;
}

export default function AnalyticsDashboard({ companyId, countryId }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'self' | 'market' | 'research'>('self');

  return (
    <div className="page-frame py-6">
      <header className="mb-6 flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div>
          {/* h2: the screen's PageHeader owns the page's only h1. */}
          <h2 className="m-0 font-display text-[22px] font-semibold text-ink">
            Market intelligence
          </h2>
          <p className="mt-1 text-[14px] text-ink-dim">
            Strategic analysis and performance metrics
          </p>
        </div>
        
        <div className="flex flex-wrap bg-[#13161E] border border-[#27272a] rounded-lg p-1">
          <button
            onClick={() => setActiveTab('self')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-outfit text-sm transition-all duration-200 ${
              activeTab === 'self' 
                ? 'bg-[#18181b] text-zinc-100 shadow-sm border border-[#3f3f46]' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>My Performance</span>
          </button>
          
          <button
            onClick={() => setActiveTab('market')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-outfit text-sm transition-all duration-200 ${
              activeTab === 'market' 
                ? 'bg-[#18181b] text-zinc-100 shadow-sm border border-[#3f3f46]' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Market Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('research')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-outfit text-sm transition-all duration-200 ${
              activeTab === 'research' 
                ? 'bg-[#18181b] text-zinc-100 shadow-sm border border-[#3f3f46]' 
                : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Competitor Research</span>
          </button>
        </div>
      </header>

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
