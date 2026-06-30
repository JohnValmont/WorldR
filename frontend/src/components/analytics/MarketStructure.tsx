"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { api } from '@/lib/api';

interface MarketSegment {
  segmentId: string;
  marketName: string;
  totalUnitsSold: number;
  totalRevenue: number;
  averageSalePrice: number;
  saturationSignal: 'Underserved' | 'Saturated' | 'Balanced';
}

interface MarketStructureData {
  arc: { orbit: number; arc: number };
  segments: MarketSegment[];
}

interface MarketStructureProps {
  countryId: string;
}

export default function MarketStructure({ countryId }: MarketStructureProps) {
  const [data, setData] = useState<MarketStructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketStructure = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/market/structure/${countryId}/last-arc`);
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load market structure.');
      } finally {
        setLoading(false);
      }
    };

    if (countryId) fetchMarketStructure();
  }, [countryId]);

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-zinc-400">
        <p className="font-outfit animate-pulse flex items-center gap-2">
          <Database className="w-4 h-4" /> Loading Market Aggregates...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 text-red-500 border border-red-900 rounded-md bg-[#0c0d13]">
        <p className="font-outfit">Error: {error}</p>
      </div>
    );
  }

  if (data.segments.length === 0) {
    return (
      <div className="w-full p-8 text-zinc-300 font-outfit border border-[#23232b] rounded-lg bg-[#0c0d13]">
        <h2 className="text-xl font-cinzel text-zinc-100 mb-2">Market Overview</h2>
        <p>No market data available yet. Complete an arc to see analytics.</p>
      </div>
    );
  }

  const chartData = data.segments.map(s => ({
    name: s.marketName,
    Volume: s.totalUnitsSold,
    AvgPrice: Math.round(s.averageSalePrice)
  }));

  const getSignalColor = (signal: string) => {
    if (signal === 'Underserved') return 'text-[#30d158]';
    if (signal === 'Saturated') return 'text-[#ff453a]'; // Red
    return 'text-[#0a84ff]'; // Blue
  };

  const getSignalIcon = (signal: string) => {
    if (signal === 'Underserved') return <Activity className="w-4 h-4 text-[#30d158]" />;
    if (signal === 'Saturated') return <AlertTriangle className="w-4 h-4 text-[#ff453a]" />;
    return <CheckCircle className="w-4 h-4 text-[#0a84ff]" />;
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      
      {/* Chart Section */}
      <div className="bg-[#0c0d13] border border-[#27272a] rounded-lg p-6 shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-cinzel text-zinc-200">Total Market Volume by Segment</h3>
          <span className="text-xs font-mono text-zinc-500 px-2 py-1 border border-[#27272a] rounded">
            Arc {data.arc.orbit}.{data.arc.arc}
          </span>
        </div>
        <div className="h-72 w-full font-mono text-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23232b" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa' }} />
              <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa' }} />
              <Tooltip 
                cursor={{ fill: '#18181b' }}
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', fontFamily: 'JetBrains Mono, monospace' }}
                formatter={(value: number, name: string) => [
                  name === 'AvgPrice' ? `$${value.toLocaleString()}` : value.toLocaleString(), 
                  name === 'Volume' ? 'Total Volume' : 'Avg Sale Price'
                ]}
              />
              <Bar dataKey="Volume" fill="#5e5ce6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segments Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.segments.map(segment => (
          <div key={segment.segmentId} className="bg-[#0c0d13] border border-[#27272a] rounded-lg p-5 flex flex-col shadow-sm">
            
            <div className="flex justify-between items-start mb-4 border-b border-[#23232b] pb-3">
              <h4 className="text-lg font-cinzel font-semibold text-zinc-100">
                {segment.marketName}
              </h4>
              <div className={`flex items-center space-x-1.5 px-2.5 py-1 bg-[#18181b] border border-[#27272a] rounded-md text-xs font-outfit uppercase tracking-wider ${getSignalColor(segment.saturationSignal)}`}>
                {getSignalIcon(segment.saturationSignal)}
                <span>{segment.saturationSignal}</span>
              </div>
            </div>
            
            <div className="space-y-3 mt-1">
              <div className="flex justify-between items-end">
                <span className="font-outfit text-sm text-zinc-400">Total Volume</span>
                <span className="font-mono text-zinc-200 text-lg">{segment.totalUnitsSold.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="font-outfit text-sm text-zinc-400">Avg Sale Price</span>
                <span className="font-mono text-emerald-400 text-lg">${Math.round(segment.averageSalePrice).toLocaleString()}</span>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
