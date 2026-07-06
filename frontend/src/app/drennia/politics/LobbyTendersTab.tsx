'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { Briefcase, Coins, AlertCircle, FileText, CheckCircle2, Crown } from 'lucide-react';
import { politicsApi, manufacturingApi } from '@/lib/api';
import Masthead from './_components/Masthead';

export default function LobbyTendersTab({ overview, character, parties, stateId }: any) {
  const [tenders, setTenders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [donateParty, setDonateParty] = useState('');
  const [donateAmount, setDonateAmount] = useState(1000);

  const [petitionParty, setPetitionParty] = useState('');
  const [petitionIssue, setPetitionIssue] = useState('industry_tax');
  const [petitionAmount, setPetitionAmount] = useState(0);

  const [tenderClass, setTenderClass] = useState('compact');
  const [tenderUnits, setTenderUnits] = useState(10);
  const [tenderMaxPrice, setTenderMaxPrice] = useState(15000);
  const [tenderDuration, setTenderDuration] = useState(4);

  const [bidModel, setBidModel] = useState('');
  const [bidPrice, setBidPrice] = useState(0);
  const [activeBidTenderId, setActiveBidTenderId] = useState<string | null>(null);

  const myCompany = character?.companies?.find((c: any) => c.industry_id === 'manufacturing');
  const isIronvaleCompany = myCompany && myCompany.headquarters_state_id?.includes('ironvale');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tData = await politicsApi.getTenders(stateId);
      setTenders(tData);
      if (myCompany) {
        const mData = await manufacturingApi.getModelSnapshots(myCompany.id);
        setModels(mData.data || mData);
      }
    } catch (err) {
      console.error('Failed to load tenders/models:', err);
    } finally {
      setLoading(false);
    }
  }, [myCompany]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDonate = async () => {
    if (!donateParty || donateAmount <= 0) return alert('Invalid party or amount');
    try {
      await politicsApi.donateToParty(donateParty, donateAmount);
      alert('Donation successful!');
      setDonateAmount(1000);
      setDonateParty('');
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Donation failed');
    }
  };

  const handlePetition = async () => {
    if (!petitionParty || !petitionIssue) return alert('Invalid party or issue');
    try {
      await politicsApi.petitionParty(petitionParty, petitionIssue, petitionAmount);
      alert('Petition submitted successfully!');
      setPetitionAmount(0);
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Petition failed');
    }
  };

  const handlePostTender = async () => {
    try {
      await politicsApi.postTender({
        vehicleClass: tenderClass,
        specFloor: { reliability_score: 50, safety_score: 50 },
        unitsPerArc: tenderUnits,
        maxPrice: tenderMaxPrice,
        durationArcs: tenderDuration,
      }, stateId);
      alert('Tender posted successfully!');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to post tender');
    }
  };

  const handleBid = async (tenderId: string, maxPrice: number) => {
    if (!bidModel || bidPrice <= 0 || bidPrice > maxPrice) return alert('Invalid bid model or price');
    try {
      await politicsApi.bidTender(tenderId, { companyId: myCompany.id, modelId: bidModel, bidPrice });
      alert('Bid placed successfully!');
      setActiveBidTenderId(null);
      setBidModel('');
      setBidPrice(0);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to place bid');
    }
  };

  const myParty = parties?.find((p: any) => p.leader_character_id === character?.id);
  const isGovLeader = myParty && overview?.council?.government?.members?.includes(myParty.id);
  const isGoverningPhase = overview?.cycle?.phase === 'governing';

  const openTenders = tenders.filter((t) => t.status === 'open');
  const historyTenders = tenders.filter((t) => t.status !== 'open');

  const sectionLabel = (text: string) => (
    <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#e8752a] font-bold mb-4">{text}</div>
  );

  if (loading) return <div className="text-[#8b8da8]">Loading the lobby…</div>;

  return (
    <div className="flex flex-col gap-8 animate-slide-in">
      <Masthead
        overline="The Lobby"
        title="Lobby & Procurement"
        subtitle="Where cash, companies, and the Council meet — donate, petition, and bid for state contracts."
      />

      {/* LOBBYING */}
      <div>
        {sectionLabel('Lobbying & Influence')}
        <div className="flex flex-col md:flex-row gap-6">
          <Card title="Citizen Donation" icon={Coins} className="flex-1">
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[#8b8da8]">Donate personal cash to a party to increase your political influence.</p>
              <select className="bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={donateParty} onChange={(e) => setDonateParty(e.target.value)}>
                <option value="">Select a Party…</option>
                {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="number" min="0" className="flex-1 bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={donateAmount} onChange={(e) => setDonateAmount(Number(e.target.value))} />
                <span className="text-[#8b8da8]">₮</span>
              </div>
              <button onClick={handleDonate} className="w-full py-2 bg-[#1a1b2e] border border-[#252637] text-white text-xs uppercase hover:bg-[#252637] hover:text-[#e8752a] transition-colors mt-2 tracking-wider">
                Make Donation
              </button>
            </div>
          </Card>

          <Card title="Corporate Petition" icon={Briefcase} className="flex-1">
            {!isIronvaleCompany ? (
              <div className="p-8 text-center text-[#8b8da8] italic flex flex-col items-center">
                <AlertCircle size={24} className="mb-2 opacity-50" />
                You must own a manufacturing company headquartered in Ironvale to petition the government.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-[#8b8da8]">Petition a party to support a specific issue. Costs corporate treasury cash.</p>
                <select className="bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={petitionParty} onChange={(e) => setPetitionParty(e.target.value)}>
                  <option value="">Select a Party…</option>
                  {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={petitionIssue} onChange={(e) => setPetitionIssue(e.target.value)}>
                  <option value="industry_tax">Lower Industry Tax</option>
                  <option value="infrastructure">Improve Infrastructure</option>
                  <option value="manufacturing_subsidy">Manufacturing Subsidy</option>
                </select>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#8b8da8]">Optional Lobbying Contribution (₮)</label>
                  <input type="number" min="0" className="w-full bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={petitionAmount} onChange={(e) => setPetitionAmount(Number(e.target.value))} />
                </div>
                <button onClick={handlePetition} className="w-full py-2 bg-[#1a1b2e] border border-[#252637] text-white text-xs uppercase hover:bg-[#252637] hover:text-[#e8752a] transition-colors mt-2 tracking-wider">
                  Submit Petition
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="border-t border-[#252637]" />

      {/* TENDERS */}
      <div>
        {sectionLabel('Government Procurement Tenders')}

        {isGovLeader && isGoverningPhase && (
          <Card title="Post New Tender (Government Only)" icon={Crown} className="mb-6 border-[#e8752a]/30">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-[#8b8da8] mb-1">Vehicle Class</label>
                <select className="w-full bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={tenderClass} onChange={(e) => setTenderClass(e.target.value)}>
                  <option value="compact">Compact</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="truck">Truck</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-[#8b8da8] mb-1">Units/Month</label>
                <input type="number" min="1" className="w-full bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={tenderUnits} onChange={(e) => setTenderUnits(Number(e.target.value))} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-[#8b8da8] mb-1">Max Price (₮)</label>
                <input type="number" min="1" className="w-full bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={tenderMaxPrice} onChange={(e) => setTenderMaxPrice(Number(e.target.value))} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-[#8b8da8] mb-1">Duration (Months)</label>
                <input type="number" min="1" className="w-full bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-sm focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={tenderDuration} onChange={(e) => setTenderDuration(Number(e.target.value))} />
              </div>
              <button onClick={handlePostTender} className="px-6 py-2 bg-[#e8752a]/20 border border-[#e8752a]/50 text-white text-sm uppercase hover:bg-[#e8752a]/30 transition-colors tracking-wider">
                Post Tender
              </button>
            </div>
          </Card>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <Card title="Open Tenders" icon={AlertCircle} className="flex-1">
            {openTenders.length === 0 ? (
              <div className="p-8 text-center text-[#8b8da8] italic">No open tenders at this time.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {openTenders.map((t) => (
                  <div key={t.id} className="p-4 bg-[#1c1d2e] border border-[#252637]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-white font-serif capitalize text-lg">{t.vehicle_class} Fleet</div>
                      <span className="text-xs text-[#8b8da8]">{t.units_per_month} units/month</span>
                    </div>
                    <div className="text-sm text-[#c4c6d8] mb-2 flex justify-between">
                      <span>Max Price: <span className="text-green-400 font-mono">₮{Number(t.max_price).toLocaleString()}</span></span>
                      <span>Duration: {t.duration_arcs} months</span>
                    </div>
                    <div className="text-xs text-[#8b8da8] mb-4">
                      {t.bids_count} bids currently placed {t.lowest_bid ? `(Lowest: ₮${Number(t.lowest_bid).toLocaleString()})` : ''}
                    </div>
                    {isIronvaleCompany ? (
                      activeBidTenderId === t.id ? (
                        <div className="p-3 bg-[#1a1b2e] border border-[#252637] flex flex-col gap-3">
                          <select className="w-full bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-xs focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={bidModel} onChange={(e) => setBidModel(e.target.value)}>
                            <option value="">Select qualifying model…</option>
                            {models.filter((m) => m.vehicle_class === t.vehicle_class).map((m) => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input type="number" placeholder="Bid Price" max={Number(t.max_price)} className="flex-1 bg-[#13141f] border border-[#252637] text-[#c4c6d8] p-2 text-xs focus:border-[#e8752a] focus:outline-none focus:ring-1 focus:ring-[#e8752a] transition-all" value={bidPrice || ''} onChange={(e) => setBidPrice(Number(e.target.value))} />
                            <button onClick={() => handleBid(t.id, Number(t.max_price))} className="px-4 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 text-xs uppercase tracking-wider">Submit</button>
                            <button onClick={() => setActiveBidTenderId(null)} className="px-3 bg-transparent text-[#8b8da8] hover:text-white">✕</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setActiveBidTenderId(t.id)} className="w-full py-2 bg-[#1a1b2e] border border-[#252637] text-white text-xs uppercase hover:bg-[#252637] hover:text-[#e8752a] transition-colors tracking-wider">
                          Place Bid
                        </button>
                      )
                    ) : (
                      <div className="text-center text-[10px] uppercase tracking-widest text-[#8b8da8] border-t border-[#252637] pt-2">
                        Must own an Ironvale company to bid
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Tender History" icon={CheckCircle2} className="flex-1">
            {historyTenders.length === 0 ? (
              <div className="p-8 text-center text-[#8b8da8] italic">No active or closed tenders.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {historyTenders.map((t) => (
                  <div key={t.id} className="p-3 bg-[#1c1d2e] border border-[#252637] text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#c4c6d8] capitalize">{t.vehicle_class} Fleet ({t.units_per_month}/month)</span>
                      <span className={`text-[10px] uppercase px-1 border tracking-wider ${t.status === 'active' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-[#e8752a] border-[#e8752a]/30 bg-[#e8752a]/10'}`}>
                        {t.status}
                      </span>
                    </div>
                    {t.awarded_company_id ? (
                      <div className="flex justify-between text-xs text-[#8b8da8]">
                        <span>Winner: <span className="text-[#c4c6d8]">{t.awarded_company_name || 'Unknown'}</span></span>
                        <span>₮{Number(t.awarded_price).toLocaleString()}</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[#8b8da8]">Closed without award</div>
                    )}
                    {t.status === 'active' && (
                      <div className="text-[10px] text-[#8b8da8] mt-2 text-right">Remaining: {t.remaining_arcs} months</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
