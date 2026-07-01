import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { Users, Crown, ShieldAlert } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { politicsApi } from '@/lib/api';
import { POL_COUNCIL_SEATS, POL_MAJORITY_SEATS } from '@/lib/politicsConstants';
import BillsPanel from './BillsPanel';

const PARTY_COLORS = [
  '#4D705C', // Drennia Green
  '#7A5858', // Rust
  '#425E75', // Slate Blue
  '#80704F', // Brass
  '#644D6C', // Deep Purple
  '#5C615D'  // Grey
];

export default function CouncilTab({ overview, character, parties }: any) {
  const [councilData, setCouncilData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCouncil = useCallback(async () => {
    try {
      setLoading(true);
      const data = await politicsApi.getCouncil();
      setCouncilData(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load council');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCouncil();
  }, [loadCouncil]);

  if (loading) return <div className="text-[#A79D8C] px-8">Loading council data...</div>;
  if (error) return <div className="text-[#B85555] p-4 bg-[#8F3D3D]/10 mx-8 border border-[#B85555]/30">{error}</div>;

  if (!councilData || !councilData.partySeats || councilData.partySeats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#A79D8C] border border-dashed border-[#2A2630] bg-[#11131A] mx-8 mt-4 rounded">
        <Users size={32} className="opacity-50 mb-4" />
        <h3 className="text-[#F4EBD6] font-serif text-lg mb-2">No Sitting Council</h3>
        <p className="text-sm text-center max-w-md">
          The legislature is currently empty. The next election will conclude at arc {overview?.cycle?.polling_arc || 'TBD'}.
        </p>
      </div>
    );
  }

  const { partySeats, premier, government } = councilData;

  const chartData = partySeats.map((p: any) => ({
    name: p.name,
    value: p.seats
  }));

  const myParty = parties?.find((p: any) => p.leader_character_id === character?.id);
  const isFormateur = myParty && partySeats.length > 0 && partySeats[0].partyId === myParty.id;
  const inFormation = overview?.cycle?.phase === 'formation';

  const handleCoalitionAction = async (action: string, targetId: string = '') => {
    try {
      await politicsApi.manageCoalition(action, targetId);
      loadCouncil();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to manage coalition');
    }
  };

  const statusColors: any = {
    majority: '#4D705C',
    coalition: '#5A6380',
    minority: '#8A5A4A',
    forming: '#80704F',
    none: '#4A4C53'
  };
  
  const statusLabels: any = {
    majority: 'Majority Government',
    coalition: 'Coalition Government',
    minority: 'Minority Government',
    forming: 'Formation in Progress',
    none: 'No Government'
  };

  return (
    <div className="flex flex-col gap-6 px-8 animate-slide-in">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* LEFT: Council Composition */}
        <div className="flex-1 flex flex-col gap-6">
          <Card title="Legislative Assembly" icon={Users} className="flex-1 min-h-[400px]">
            <div className="flex flex-col h-full relative">
              
              <div className="absolute top-0 right-0 text-[10px] uppercase tracking-wider text-[#A79D8C] border border-[#2A2630] px-2 py-1 bg-[#1A1C23]">
                {POL_COUNCIL_SEATS} Seats
              </div>

              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={180}
                      endAngle={0}
                    >
                      {chartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PARTY_COLORS[index % PARTY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1A1C23', border: '1px solid #2A2630', color: '#F4EBD6' }}
                      itemStyle={{ color: '#F4EBD6' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[130px] left-0 w-full text-center pointer-events-none">
                  <div className="text-[28px] font-serif text-[#F4EBD6] leading-none">{partySeats[0]?.seats || 0}</div>
                  <div className="text-[10px] text-[#A79D8C] uppercase tracking-widest mt-1">Lead Plurality</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto mt-2 border-t border-[#2A2630]/50 pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[#A79D8C] border-b border-[#2A2630]">
                      <th className="text-left font-normal pb-2">Party</th>
                      <th className="text-right font-normal pb-2">Seats</th>
                      <th className="text-right font-normal pb-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partySeats.map((p: any, i: number) => (
                      <tr key={p.partyId} className="border-b border-[#2A2630]/30 hover:bg-[#1A1C23]/50">
                        <td className="py-3 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PARTY_COLORS[i % PARTY_COLORS.length] }} />
                          <span className="text-[#F4EBD6]">{p.name}</span>
                        </td>
                        <td className="text-right py-3 text-[#E4DBCA]">{p.seats}</td>
                        <td className="text-right py-3 text-[#A79D8C]">{((p.seats / POL_COUNCIL_SEATS) * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          </Card>
        </div>

        {/* RIGHT: Government Details */}
        <div className="flex-1 flex flex-col gap-6">
          
          <Card title="Government Status" icon={Crown}>
            <div className="flex flex-col gap-4">
              
              {premier && (
                <div className="p-4 bg-[#11131A] border border-[#2A2630] flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase text-[#A79D8C] tracking-widest mb-1">Acting Premier</div>
                    <div className="text-[#F4EBD6] font-serif text-lg">{premier.partyName}</div>
                  </div>
                  <Crown size={24} className="text-[#A79D8C] opacity-30" />
                </div>
              )}

              <div className="p-4 bg-[#11131A] border border-[#2A2630]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#A79D8C] text-sm uppercase tracking-wider">Mandate</span>
                  <span className="px-2 py-1 text-xs" style={{ backgroundColor: `${statusColors[government?.status || 'none']}20`, color: statusColors[government?.status || 'none'], border: `1px solid ${statusColors[government?.status || 'none']}40` }}>
                    {statusLabels[government?.status || 'none']}
                  </span>
                </div>
                
                <div className="text-sm text-[#E4DBCA]">
                  <div className="mb-2 text-[#A79D8C]">Coalition Members:</div>
                  <div className="flex flex-wrap gap-2">
                    {government?.members?.map((memId: string) => {
                      const p = partySeats.find((ps: any) => ps.partyId === memId) || parties.find((pa: any) => pa.id === memId);
                      return (
                        <span key={memId} className="px-2 py-1 bg-[#1A1C23] border border-[#2A2630] rounded text-xs">
                          {p?.name || 'Unknown'}
                        </span>
                      );
                    })}
                    {(!government?.members || government.members.length === 0) && (
                      <span className="text-[#A79D8C] italic">None established</span>
                    )}
                  </div>
                </div>
              </div>

              {/* FORMATION ACTIONS */}
              {inFormation && myParty && (
                <div className="p-4 border border-[#80704F]/40 bg-[#80704F]/10 rounded">
                  <div className="flex items-center gap-2 mb-3 text-[#F4EBD6]">
                    <ShieldAlert size={16} className="text-[#80704F]" />
                    <span className="font-serif">Formation Phase Active</span>
                  </div>
                  
                  {isFormateur ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[#A79D8C] mb-2">You are the formateur. You may invite parties to join a coalition.</p>
                      <div className="flex gap-2">
                        <select id="inviteParty" className="flex-1 bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm">
                          <option value="">Select a party...</option>
                          {partySeats.filter((p: any) => p.partyId !== myParty.id && !government?.members?.includes(p.partyId)).map((p: any) => (
                            <option key={p.partyId} value={p.partyId}>{p.name} ({p.seats} seats)</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            const val = (document.getElementById('inviteParty') as HTMLSelectElement).value;
                            if (val) handleCoalitionAction('invite', val);
                          }}
                          className="px-4 py-2 bg-[#1A1C23] border border-[#2A2630] text-[#E4DBCA] text-xs uppercase hover:bg-[#2A2630] transition-colors"
                        >
                          Invite
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 justify-center">
                       <button onClick={() => handleCoalitionAction('accept')} className="px-4 py-2 bg-[#4D705C]/20 border border-[#4D705C]/50 text-[#4D705C] text-xs uppercase hover:bg-[#4D705C]/30 transition-colors">
                          Accept Invite
                        </button>
                        <button onClick={() => handleCoalitionAction('decline')} className="px-4 py-2 bg-[#B85555]/20 border border-[#B85555]/50 text-[#B85555] text-xs uppercase hover:bg-[#B85555]/30 transition-colors">
                          Decline
                        </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </Card>

        </div>
      </div>

      <BillsPanel overview={overview} character={character} parties={parties} />

    </div>
  );
}
