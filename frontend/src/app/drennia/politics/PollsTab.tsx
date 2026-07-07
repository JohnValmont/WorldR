'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { politicsApi } from '@/lib/api';
import { SEGMENTS, POL_COUNCIL_SEATS, POL_MAJORITY_SEATS } from '@/lib/politicsConstants';
import { partyColor } from './_lib/identity';
import Hemicycle from './_components/Hemicycle';
import PartyStanding from './_components/PartyStanding';
import PersonaCard from './_components/PersonaCard';
import PoliticalPulse from './PoliticalPulse';

export default function PollsTab({ overview, parties, stateId }: any) {
  const [polls, setPolls] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPolls = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await politicsApi.getPolls(stateId);
      setPolls(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls]);

  const partyName = (id: string) => parties.find((p: any) => p.id === id)?.name || 'Unknown';

  if (loading && !polls) return <div className="p-8 text-[#8b8da8] text-center">Crunching the numbers…</div>;
  if (error) return <div className="p-4 border border-red-500/30 bg-red-500/10 text-red-400">{error}</div>;

  if (!polls || !polls.perParty || polls.perParty.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#252637] bg-[#1c1d2e]">
        <h2 className="text-white font-serif text-xl mb-4">The Polls Are Closed</h2>
        <p className="text-[#8b8da8] max-w-md">Projections open once candidates are confirmed and campaigns begin.</p>
        <button onClick={fetchPolls} className="mt-6 px-6 py-2 border border-[#252637] text-white hover:bg-[#252637] hover:text-[#e8752a] transition-colors uppercase text-xs tracking-wider">Refresh</button>
      </div>
    );
  }

  const hemiParties = polls.perParty
    .map((p: any) => ({ name: partyName(p.partyId), seats: p.seats, color: partyColor(partyName(p.partyId), parties) }))
    .filter((d: any) => d.seats > 0)
    .sort((a: any, b: any) => b.seats - a.seats);

  const segLeaders = SEGMENTS.map((seg) => {
    const shares = polls.segmentShares?.[seg.key] || {};
    let bestCand: string | null = null;
    let bestShare = 0;
    Object.entries(shares).forEach(([candId, share]: any) => {
      if (share > bestShare) { bestShare = share; bestCand = candId; }
    });
    const cand = polls.perCandidate?.find((c: any) => c.candidateId === bestCand);
    const name = cand ? partyName(cand.partyId) : undefined;
    return { seg, name, share: bestShare, color: name ? partyColor(name, parties) : undefined };
  });

  const lead = hemiParties[0];

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      <PoliticalPulse pulse={polls?.pulse} />

      <div className="flex justify-between items-end border-b border-[#252637] pb-4">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-[#e8752a] mb-1">Election Night</div>
          <h2 className="text-2xl font-serif text-white">Projected Result</h2>
          <p className="text-sm text-[#8b8da8]">Live seat projection from accumulated campaign reach.</p>
        </div>
        <button
          onClick={fetchPolls}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#252637] text-white text-xs uppercase tracking-wider hover:bg-[#252637] hover:text-[#e8752a] transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> {loading ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      <div className="bg-[#1c1d2e] border border-[#e8752a]/30 p-3 text-[#e8752a] text-xs text-center tracking-wide">
        PROJECTION ONLY — final results are declared at the close of the Polling month.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="border border-[#252637] bg-[#1c1d2e] p-5">
          <Hemicycle
            parties={hemiParties}
            totalSeats={POL_COUNCIL_SEATS}
            majority={POL_MAJORITY_SEATS}
            centerValue={lead?.seats || 0}
            centerLabel={lead ? `${lead.name} lead` : 'No lead'}
          />
        </div>
        <div className="border border-[#252637] bg-[#1c1d2e] p-5">
          <div className="text-[10px] uppercase tracking-widest text-[#8b8da8] mb-2">Projected Standings</div>
          <div className="flex flex-col gap-0.5">
            {hemiParties.map((p: any) => (
              <PartyStanding key={p.name} name={p.name} seats={p.seats} totalSeats={POL_COUNCIL_SEATS} showLeader parties={parties} />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e8752a] font-bold mb-3">
          Battle for the Blocs
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {segLeaders.map(({ seg, name, share, color }) => (
            <PersonaCard
              key={seg.key}
              segmentKey={seg.key}
              label={seg.label}
              size={seg.size}
              leadingParty={name}
              leadingColor={color}
              leadingShare={share}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
