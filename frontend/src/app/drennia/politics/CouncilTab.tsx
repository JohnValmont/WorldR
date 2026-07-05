'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { Users, Crown, ShieldAlert } from 'lucide-react';
import { politicsApi } from '@/lib/api';
import { POL_COUNCIL_SEATS, POL_MAJORITY_SEATS } from '@/lib/politicsConstants';
import { partyColor, partyIdentity } from './_lib/identity';
import Hemicycle from './_components/Hemicycle';
import PartyStanding from './_components/PartyStanding';
import PartyCrest from './_components/PartyCrest';
import BillsPanel from './BillsPanel';

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
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to load council');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCouncil();
  }, [loadCouncil]);

  if (loading) return <div className="text-[#A79D8C] px-2">Reading the chamber roll…</div>;
  if (error)
    return <div className="text-[#B85555] p-4 bg-[#8F3D3D]/10 border border-[#B85555]/30">{error}</div>;

  if (!councilData || !councilData.partySeats || councilData.partySeats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#A79D8C] border border-dashed border-[#2A2630] bg-[#11131A] rounded">
        <Users size={32} className="opacity-50 mb-4" />
        <h3 className="text-[#F4EBD6] font-serif text-lg mb-2">The Chamber is Empty</h3>
        <p className="text-sm text-center max-w-md">
          No sitting Council. The next election concludes at month {overview?.cycle?.polling_arc || 'TBD'}.
        </p>
      </div>
    );
  }

  const { partySeats, premier, government } = councilData;

  const hemiParties = partySeats
    .filter((p: any) => p.seats > 0)
    .map((p: any) => ({ name: p.name, seats: p.seats, color: partyColor(p.name, parties) }));

  const myParty = parties?.find((p: any) => p.leader_character_id === character?.id);
  const isFormateur = myParty && partySeats.length > 0 && partySeats[0].partyId === myParty.id;
  const inFormation = overview?.cycle?.phase === 'formation';
  const leadSeats = partySeats[0]?.seats || 0;

  const handleCoalitionAction = async (action: string, targetId: string = '') => {
    try {
      await politicsApi.manageCoalition(action, targetId);
      loadCouncil();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to manage coalition');
    }
  };

  const statusColors: any = {
    majority: '#4D8C6A', coalition: '#5A6380', minority: '#8A5A4A', forming: '#B0863E', none: '#4A4C53',
  };
  const statusLabels: any = {
    majority: 'Majority Government', coalition: 'Coalition Government', minority: 'Minority Government',
    forming: 'Formation in Progress', none: 'No Government',
  };
  const govStatus = government?.status || 'none';

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* THE CHAMBER — hemicycle hero */}
        <Card title="The Chamber" icon={Users} className="min-h-[400px]">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-[#A79D8C]">
                {POL_COUNCIL_SEATS} Seats · {POL_MAJORITY_SEATS} for majority
              </span>
            </div>
            <Hemicycle
              parties={hemiParties}
              totalSeats={POL_COUNCIL_SEATS}
              majority={POL_MAJORITY_SEATS}
              centerValue={leadSeats}
              centerLabel="Lead Plurality"
            />
            <div className="mt-3 border-t border-[#2A2630]/50 pt-3 flex flex-col gap-0.5">
              {partySeats.map((p: any) => (
                <PartyStanding
                  key={p.partyId}
                  name={p.name}
                  seats={p.seats}
                  totalSeats={POL_COUNCIL_SEATS}
                  isMine={myParty?.id === p.partyId}
                  showLeader
                  parties={parties}
                />
              ))}
            </div>
          </div>
        </Card>

        {/* GOVERNMENT */}
        <div className="flex flex-col gap-6">
          <Card title="Government" icon={Crown}>
            <div className="flex flex-col gap-4">
              {premier && (
                <div className="p-4 bg-[#11131A] border border-[#2A2630] flex items-center gap-3">
                  <PartyCrest name={premier.partyName} size={44} />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase text-[#A79D8C] tracking-widest mb-0.5">
                      State Premier
                    </div>
                    <div className="text-[#F4EBD6] font-serif text-lg truncate">
                      {partyIdentity(premier.partyName, parties).leader}
                    </div>
                    <div className="text-[11px] text-[#A79D8C] truncate">{premier.partyName}</div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-[#11131A] border border-[#2A2630]">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[#A79D8C] text-sm uppercase tracking-wider">Mandate</span>
                  <span
                    className="px-2 py-1 text-xs"
                    style={{
                      backgroundColor: `${statusColors[govStatus]}20`,
                      color: statusColors[govStatus],
                      border: `1px solid ${statusColors[govStatus]}40`,
                    }}
                  >
                    {statusLabels[govStatus]}
                  </span>
                </div>
                <div className="text-sm text-[#E4DBCA]">
                  <div className="mb-2 text-[#A79D8C] text-xs uppercase tracking-wider">Governing Bloc</div>
                  <div className="flex flex-wrap gap-2">
                    {government?.members?.map((memId: string) => {
                      const p =
                        partySeats.find((ps: any) => ps.partyId === memId) ||
                        parties.find((pa: any) => pa.id === memId);
                      return (
                        <span
                          key={memId}
                          className="flex items-center gap-1.5 px-2 py-1 bg-[#1A1C23] border border-[#2A2630] rounded text-xs"
                        >
                          <PartyCrest name={p?.name} size={16} parties={parties} />
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

              {/* FORMATION ACTIONS (logic unchanged) */}
              {inFormation && myParty && (
                <div className="p-4 border border-[#B0863E]/40 bg-[#B0863E]/10 rounded">
                  <div className="flex items-center gap-2 mb-3 text-[#F4EBD6]">
                    <ShieldAlert size={16} className="text-[#B0863E]" />
                    <span className="font-serif">Formation Phase Active</span>
                  </div>
                  {isFormateur ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-[#A79D8C] mb-2">
                        You are the formateur. Invite parties to join a governing coalition.
                      </p>
                      <div className="flex gap-2">
                        <select
                          id="inviteParty"
                          className="flex-1 bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm"
                        >
                          <option value="">Select a party…</option>
                          {partySeats
                            .filter((p: any) => p.partyId !== myParty.id && !government?.members?.includes(p.partyId))
                            .map((p: any) => (
                              <option key={p.partyId} value={p.partyId}>
                                {p.name} ({p.seats} seats)
                              </option>
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
                      <button
                        onClick={() => handleCoalitionAction('accept')}
                        className="px-4 py-2 bg-[#4D8C6A]/20 border border-[#4D8C6A]/50 text-[#4D8C6A] text-xs uppercase hover:bg-[#4D8C6A]/30 transition-colors"
                      >
                        Accept Invite
                      </button>
                      <button
                        onClick={() => handleCoalitionAction('decline')}
                        className="px-4 py-2 bg-[#B85555]/20 border border-[#B85555]/50 text-[#B85555] text-xs uppercase hover:bg-[#B85555]/30 transition-colors"
                      >
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
