"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { api } from '@/lib/api';

interface AnalyticsModel {
  modelId: string;
  modelName: string;
  unitsSold: number;
  revenue: number;
  reasonCode: string;
}

interface AnalyticsSegment {
  segmentId: string;
  marketName: string;
  targetSegment: string;
  totalUnitsSold: number;
  totalRevenue: number;
  marketShareEstimate: number;
  mainReasonCode: string;
  trend: 'up' | 'down' | 'neutral';
  advisorText: string;
  models: AnalyticsModel[];
}

interface AnalyticsData {
  month: { year: number; month: number };
  segments: AnalyticsSegment[];
}

interface SelfAnalyticsDashboardProps {
  companyId: string;
}

export default function SelfAnalyticsDashboard({ companyId }: SelfAnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/companies/${companyId}/manufacturing/analytics`);
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error || err.response?.data?.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    };

    if (companyId) fetchAnalytics();
  }, [companyId]);

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-[#090A0F] text-zinc-400">
        <p className="font-outfit animate-pulse">Loading Analytics Data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full p-6 bg-[#090A0F] text-red-500 border border-red-900 rounded-md">
        <p className="font-outfit">Error: {error}</p>
      </div>
    );
  }

  if (data.segments.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-6 py-8 bg-[#090A0F] text-zinc-300 font-outfit border border-[#23232b] rounded-lg">
        <h2 className="text-2xl font-cinzel text-zinc-100 mb-4">Market Intelligence</h2>
        <p>No sales data available yet. Complete a month to see analytics.</p>
      </div>
    );
  }

  const chartData = data.segments.map(s => ({
    name: s.targetSegment || s.marketName,
    Units: s.totalUnitsSold,
    Revenue: s.totalRevenue
  }));

  return (
    <div className="w-full text-zinc-300">
      
      {/* Chart Section */}
      <div className="bg-[#0c0d13] border border-[#27272a] rounded-lg p-6 mb-8 shadow-md">
        <h3 className="text-xl font-cinzel text-zinc-200 mb-6">Units Sold by Segment</h3>
        <div className="h-72 w-full font-mono text-sm">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23232b" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" tick={{ fill: '#a1a1aa' }} />
              <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa' }} />
              <Tooltip 
                cursor={{ fill: '#18181b' }}
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#e4e4e7', fontFamily: 'JetBrains Mono, monospace' }}
              />
              <Bar dataKey="Units" fill="#0a84ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Segments Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.segments.map(segment => (
          <div key={segment.segmentId} className="bg-[#0c0d13] border border-[#27272a] rounded-lg p-5 flex flex-col justify-between shadow-sm">
            
            <div className="mb-4">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-lg font-cinzel font-semibold text-zinc-100">
                  {segment.targetSegment || segment.marketName}
                </h4>
                <div className="flex items-center space-x-1 px-2 py-1 bg-[#18181b] border border-[#27272a] rounded text-xs">
                  {segment.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                  {segment.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  {segment.trend === 'neutral' && <Minus className="w-3 h-3 text-zinc-500" />}
                  <span className="font-mono text-zinc-300">{(segment.marketShareEstimate * 100).toFixed(1)}% Share</span>
                </div>
              </div>
              
              <div className="space-y-1 my-4">
                <div className="flex justify-between text-sm">
                  <span className="font-outfit text-zinc-400">Total Units Sold</span>
                  <span className="font-mono text-zinc-200">{segment.totalUnitsSold.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-outfit text-zinc-400">Total Revenue</span>
                  <span className="font-mono text-emerald-400">${segment.totalRevenue.toLocaleString('en-US')}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#23232b]">
              <div className="flex items-start space-x-2">
                <Info className="w-5 h-5 text-[#ff9f0a] flex-shrink-0 mt-0.5" />
                <p className="font-outfit text-sm text-[#ff9f0a] leading-relaxed">
                  {segment.advisorText}
                </p>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
