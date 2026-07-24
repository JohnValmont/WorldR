"use client";

import React, { useState, useEffect } from 'react';
import { Shield, Unlock, Lock, AlertCircle, ShoppingCart } from 'lucide-react';
import { api } from '@/lib/api';

interface CompetitorResearchProps {
  companyId: string;
  countryId: string;
}

interface ResearchResult {
  company_name: string;
  model_name: string;
  market_share_estimate: number;
  is_npc: boolean;
  sale_price: number | null;
  reliability_score: number | null;
  performance_score: number | null;
  fuel_efficiency_score: number | null;
  appeal_score: number | null;
  cargo_score: number | null;
}

interface MarketSegmentOption {
  id: string;
  name: string;
}

export default function CompetitorResearch({ companyId, countryId }: CompetitorResearchProps) {
  const [segments, setSegments] = useState<MarketSegmentOption[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResearchResult[] | null>(null);
  const [purchasedTier, setPurchasedTier] = useState<number | null>(null);

  useEffect(() => {
    // Fetch available markets for this country to populate dropdown
    const fetchMarkets = async () => {
      try {
        // We'll just fetch all markets for the company's country
        // For simplicity, we could rely on a generic endpoint, but let's use the company's markets endpoint if it returns them
        const res = await api.get(`/companies/${companyId}/manufacturing/markets`);
        const markets = res.data.markets || res.data.data?.markets || [];
        setSegments(markets);
        if (markets.length > 0) {
          setSelectedSegment(markets[0].id);
        }
      } catch (err) {
        console.error("Failed to load markets", err);
      }
    };
    fetchMarkets();
  }, [companyId]);

  const handlePurchase = async () => {
    if (!selectedSegment) return;
    try {
      setLoading(true);
      setError(null);
      
      const res = await api.post(`/companies/${companyId}/manufacturing/research`, {
        regionMarketId: selectedSegment,
        tier: selectedTier
      });
      
      setResults(res.data.data);
      setPurchasedTier(selectedTier);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to purchase research. Insufficient funds?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 text-zinc-300">
      
      {/* Purchase Controls */}
      <div className="bg-[#0c0d13] border border-[#27272a] rounded-lg p-6 shadow-md">
        <h3 className="text-xl font-cinzel text-zinc-200 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-zinc-400" /> Commission Market Research
        </h3>
        <p className="text-sm font-outfit text-zinc-400 mb-6 max-w-3xl">
          Purchase confidential intelligence on your competitors. Basic intelligence provides market share analysis, while comprehensive research unmasks the exact physical specifications and pricing strategies of competing models.
        </p>

        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wide">Target Segment</label>
            <select 
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded-md px-4 py-2 font-outfit text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {segments.length === 0 && <option value="">Loading segments...</option>}
              {segments.map(seg => (
                <option key={seg.id} value={seg.id}>{seg.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-xs font-mono text-zinc-500 mb-2 uppercase tracking-wide">Intelligence Tier</label>
            <select 
              value={selectedTier}
              onChange={(e) => setSelectedTier(Number(e.target.value))}
              className="w-full bg-[#18181b] border border-[#3f3f46] rounded-md px-4 py-2 font-outfit text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              <option value={1}>Tier 1: Basic Share Analysis ($25,000)</option>
              <option value={2}>Tier 2: Comprehensive Specs ($100,000)</option>
            </select>
          </div>

          <button 
            onClick={handlePurchase}
            disabled={loading || !selectedSegment}
            className="w-full md:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-outfit rounded-md transition-colors flex items-center justify-center gap-2 border border-indigo-700"
          >
            {loading ? (
              <span className="animate-pulse">Processing...</span>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span className="text-[#ff453a] font-bold mr-1">- ${selectedTier === 1 ? '25,000' : '100,000'}</span>
                Buy
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-[#1e0a0a] border border-[#ff453a] text-[#ff453a] rounded-md font-outfit text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}
      </div>

      {/* Results Table */}
      {results && (
        <div className="bg-[#0c0d13] border border-[#27272a] rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-[#23232b] bg-[#18181b] flex justify-between items-center">
            <h4 className="font-cinzel text-zinc-200">Intelligence Report</h4>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              {purchasedTier === 2 ? <Unlock className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-500" />}
              <span>Tier {purchasedTier} Clearances</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-outfit">
              <thead className="bg-[#121217] border-b border-[#23232b] text-zinc-400 font-mono text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Competitor</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3 text-right">Mkt Share</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-center" title="Reliability">REL</th>
                  <th className="px-4 py-3 text-center" title="Performance">PER</th>
                  <th className="px-4 py-3 text-center" title="Fuel Efficiency">EFF</th>
                  <th className="px-4 py-3 text-center" title="Appeal">APP</th>
                  <th className="px-4 py-3 text-center" title="Cargo">CGO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23232b]">
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-zinc-500 italic">No competitors found in this segment for the last month.</td>
                  </tr>
                ) : (
                  results.map((r, i) => (
                    <tr key={i} className="hover:bg-[#18181b] transition-colors">
                      <td className="px-4 py-3 text-zinc-200 font-medium">
                        {r.company_name}
                        {r.is_npc ? <span className="ml-2 text-[9px] text-zinc-500 border border-zinc-700 px-1 py-0.5 rounded uppercase tracking-wider">NPC</span> : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">{r.model_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">{(r.market_share_estimate * 100).toFixed(1)}%</td>
                      
                      {purchasedTier === 2 ? (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-zinc-200">${r.sale_price?.toLocaleString('en-US')}</td>
                          <td className="px-4 py-3 text-center font-mono">{r.reliability_score}</td>
                          <td className="px-4 py-3 text-center font-mono">{r.performance_score}</td>
                          <td className="px-4 py-3 text-center font-mono">{r.fuel_efficiency_score}</td>
                          <td className="px-4 py-3 text-center font-mono">{r.appeal_score}</td>
                          <td className="px-4 py-3 text-center font-mono">{r.cargo_score}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-right font-mono text-zinc-600">LOCKED</td>
                          <td className="px-4 py-3 text-center text-zinc-600">--</td>
                          <td className="px-4 py-3 text-center text-zinc-600">--</td>
                          <td className="px-4 py-3 text-center text-zinc-600">--</td>
                          <td className="px-4 py-3 text-center text-zinc-600">--</td>
                          <td className="px-4 py-3 text-center text-zinc-600">--</td>
                        </>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
