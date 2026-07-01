import React, { useState, useEffect, useCallback } from 'react';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

export default function PollsTab({ overview, parties }: any) {
  const [polls, setPolls] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await politicsApi.getPolls();
      setPolls(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  if (loading && !polls) return <div className="p-8 text-[#A79D8C] text-center">Crunching the numbers...</div>;
  if (error) return <div className="p-4 border border-[#B85555]/30 bg-[#B85555]/10 text-[#B85555]">{error}</div>;

  if (!polls || !polls.perParty || polls.perParty.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#2A2630] bg-[#11131A]">
        <h2 className="text-[#F4EBD6] font-serif text-xl mb-4">No Polling Data</h2>
        <p className="text-[#A79D8C] max-w-md">The polls will open once candidates are confirmed and campaigns begin.</p>
        <button onClick={fetchPolls} className="mt-6 px-6 py-2 border border-[#2A2630] text-[#E6D5B8] hover:bg-[#2A2630]">Refresh</button>
      </div>
    );
  }

  // Formatting data for Recharts
  const PARTY_COLORS = ['#B85555', '#4C8C4A', '#558CB8', '#D4AF37', '#8F9BA8', '#8A55B8'];

  const seatData = polls.perParty.map((p: any, idx: number) => {
    const partyRec = parties.find((party: any) => party.id === p.partyId);
    return {
      name: partyRec?.name || 'Unknown',
      seats: p.seats,
      color: PARTY_COLORS[idx % PARTY_COLORS.length]
    };
  }).filter((d: any) => d.seats > 0);

  const segmentData = SEGMENTS.map(seg => {
    const shares = polls.segmentShares[seg.key] || {};
    const segRow: any = { name: seg.label };
    polls.perCandidate.forEach((c: any, idx: number) => {
      const partyRec = parties.find((party: any) => party.id === c.partyId);
      const partyName = partyRec?.name || 'Unknown';
      segRow[partyName] = (shares[c.candidateId] || 0) * 100;
    });
    return segRow;
  });

  const partyNames = polls.perParty.map((p: any) => {
    return parties.find((party: any) => party.id === p.partyId)?.name || 'Unknown';
  });

  return (
    <div className="flex flex-col gap-8 animate-slide-in">
      <div className="flex justify-between items-center border-b border-[#2A2630] pb-4">
        <div>
          <h2 className="text-xl font-serif text-[#F4EBD6]">Live Polls Projection</h2>
          <p className="text-sm text-[#A79D8C]">Current projected council split based on accumulated campaign reach.</p>
        </div>
        <button 
          onClick={fetchPolls} 
          disabled={loading}
          className="px-4 py-2 bg-[#2A2630] text-[#E6D5B8] text-sm hover:bg-[#3D3D29] transition-colors"
        >
          {loading ? 'Refreshing...' : 'Refresh Polls'}
        </button>
      </div>
      
      <div className="bg-[#1A1A10] border border-[#3D3D29] p-3 text-[#D4AF37] text-sm text-center">
        PROJECTION ONLY. Final results will be calculated at the end of the Polling Arc.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-[#2A2630] bg-[#11131A] p-6 flex flex-col items-center">
          <h3 className="text-[#F4EBD6] font-serif mb-6 text-center">Projected Council Seats (Total 61)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={seatData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="seats"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {seatData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090A0F', borderColor: '#2A2630', color: '#F4EBD6' }}
                  itemStyle={{ color: '#E6D5B8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-[#2A2630] bg-[#11131A] p-6">
          <h3 className="text-[#F4EBD6] font-serif mb-6 text-center">Projected Vote Share by Segment (%)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={segmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2630" vertical={false} />
                <XAxis dataKey="name" stroke="#8F9BA8" tick={{ fill: '#8F9BA8', fontSize: 10 }} />
                <YAxis stroke="#8F9BA8" tick={{ fill: '#8F9BA8', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#090A0F', borderColor: '#2A2630', color: '#F4EBD6' }}
                  itemStyle={{ color: '#E6D5B8' }}
                  formatter={(value: any) => typeof value === 'number' ? value.toFixed(1) + '%' : value}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                {partyNames.map((name: string, index: number) => (
                  <Bar key={name} dataKey={name} stackId="a" fill={PARTY_COLORS[index % PARTY_COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
