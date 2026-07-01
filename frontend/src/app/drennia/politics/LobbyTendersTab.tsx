import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { Briefcase, Landmark, Coins, AlertCircle, FileText, CheckCircle2, Crown } from 'lucide-react';
import { politicsApi, manufacturingApi } from '@/lib/api';

export default function LobbyTendersTab({ overview, character, parties }: any) {
  const [tenders, setTenders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [donateParty, setDonateParty] = useState('');
  const [donateAmount, setDonateAmount] = useState(1000);
  
  const [petitionParty, setPetitionParty] = useState('');
  const [petitionIssue, setPetitionIssue] = useState('industry_tax');
  const [petitionAmount, setPetitionAmount] = useState(0);

  // Tender form states
  const [tenderClass, setTenderClass] = useState('compact');
  const [tenderUnits, setTenderUnits] = useState(10);
  const [tenderMaxPrice, setTenderMaxPrice] = useState(15000);
  const [tenderDuration, setTenderDuration] = useState(4);

  // Bid form states
  const [bidModel, setBidModel] = useState('');
  const [bidPrice, setBidPrice] = useState(0);
  const [activeBidTenderId, setActiveBidTenderId] = useState<string | null>(null);

  const myCompany = character?.companies?.find((c: any) => c.industry_id === 'manufacturing');
  const isIronvaleCompany = myCompany && myCompany.headquarters_state_id?.includes('ironvale');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const tData = await politicsApi.getTenders();
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
      alert(err?.response?.data?.message || 'Donation failed');
    }
  };

  const handlePetition = async () => {
    if (!petitionParty || !petitionIssue) return alert('Invalid party or issue');
    try {
      await politicsApi.petitionParty(petitionParty, petitionIssue, petitionAmount);
      alert('Petition submitted successfully!');
      setPetitionAmount(0);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Petition failed');
    }
  };

  const handlePostTender = async () => {
    try {
      await politicsApi.postTender({
        vehicleClass: tenderClass,
        specFloor: { reliability_score: 50, safety_score: 50 }, // Stubbed basic spec
        unitsPerArc: tenderUnits,
        maxPrice: tenderMaxPrice,
        durationArcs: tenderDuration
      });
      alert('Tender posted successfully!');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to post tender');
    }
  };

  const handleBid = async (tenderId: string, maxPrice: number) => {
    if (!bidModel || bidPrice <= 0 || bidPrice > maxPrice) return alert('Invalid bid model or price');
    try {
      await politicsApi.bidTender(tenderId, {
        companyId: myCompany.id,
        modelId: bidModel,
        bidPrice
      });
      alert('Bid placed successfully!');
      setActiveBidTenderId(null);
      setBidModel('');
      setBidPrice(0);
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to place bid');
    }
  };

  const myParty = parties?.find((p: any) => p.leader_character_id === character?.id);
  const isGovLeader = myParty && overview?.council?.government?.members?.includes(myParty.id);
  const isGoverningPhase = overview?.cycle?.phase === 'governing';

  const openTenders = tenders.filter(t => t.status === 'open');
  const historyTenders = tenders.filter(t => t.status !== 'open');

  if (loading) return <div className="text-[#A79D8C] mt-6">Loading lobby data...</div>;

  return (
    <div className="flex flex-col gap-8 mt-6 animate-slide-in px-8">
      
      {/* SECTION: LOBBYING */}
      <div>
        <h2 className="text-[#F4EBD6] font-serif text-xl mb-4 flex items-center gap-2">
          <Landmark size={20} className="text-[#80704F]" />
          Lobbying & Influence
        </h2>
        <div className="flex flex-col md:flex-row gap-6">
          
          <Card title="Citizen Donation" icon={Coins} className="flex-1">
            <div className="flex flex-col gap-4">
              <p className="text-xs text-[#A79D8C]">Donate personal cash to a political party to increase your political influence.</p>
              
              <select className="bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={donateParty} onChange={e => setDonateParty(e.target.value)}>
                <option value="">Select a Party...</option>
                {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="flex items-center gap-2">
                <input type="number" min="0" className="flex-1 bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={donateAmount} onChange={e => setDonateAmount(Number(e.target.value))} />
                <span className="text-[#A79D8C]">₯</span>
              </div>

              <button onClick={handleDonate} className="w-full py-2 bg-[#1A1C23] border border-[#2A2630] text-[#E4DBCA] text-xs uppercase hover:bg-[#2A2630] transition-colors mt-2">
                Make Donation
              </button>
            </div>
          </Card>

          <Card title="Corporate Petition" icon={Briefcase} className="flex-1">
            {!isIronvaleCompany ? (
              <div className="p-8 text-center text-[#A79D8C] italic flex flex-col items-center">
                <AlertCircle size={24} className="mb-2 opacity-50" />
                You must own a manufacturing company headquartered in Ironvale to petition the government.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-[#A79D8C]">Petition a party to support a specific issue. Costs corporate treasury cash.</p>
                
                <select className="bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={petitionParty} onChange={e => setPetitionParty(e.target.value)}>
                  <option value="">Select a Party...</option>
                  {parties.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                <select className="bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={petitionIssue} onChange={e => setPetitionIssue(e.target.value)}>
                  <option value="industry_tax">Lower Industry Tax</option>
                  <option value="infrastructure">Improve Infrastructure</option>
                  <option value="manufacturing_subsidy">Manufacturing Subsidy</option>
                </select>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[#A79D8C]">Optional Lobbying Contribution (₯)</label>
                  <input type="number" min="0" className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={petitionAmount} onChange={e => setPetitionAmount(Number(e.target.value))} />
                </div>

                <button onClick={handlePetition} className="w-full py-2 bg-[#1A1C23] border border-[#2A2630] text-[#E4DBCA] text-xs uppercase hover:bg-[#2A2630] transition-colors mt-2">
                  Submit Petition
                </button>
              </div>
            )}
          </Card>

        </div>
      </div>

      <div className="border-t border-[#2A2630] my-2" />

      {/* SECTION: TENDERS */}
      <div>
        <h2 className="text-[#F4EBD6] font-serif text-xl mb-4 flex items-center gap-2">
          <FileText size={20} className="text-[#425E75]" />
          Government Procurement Tenders
        </h2>

        {isGovLeader && isGoverningPhase && (
          <Card title="Post New Tender (Government Only)" icon={Crown} className="mb-6 border-[#80704F]/30">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs text-[#A79D8C] mb-1">Vehicle Class</label>
                <select className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={tenderClass} onChange={e => setTenderClass(e.target.value)}>
                  <option value="compact">Compact</option>
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="truck">Truck</option>
                  <option value="sports">Sports</option>
                </select>
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-[#A79D8C] mb-1">Units/Arc</label>
                <input type="number" min="1" className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={tenderUnits} onChange={e => setTenderUnits(Number(e.target.value))} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-[#A79D8C] mb-1">Max Price (₯)</label>
                <input type="number" min="1" className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={tenderMaxPrice} onChange={e => setTenderMaxPrice(Number(e.target.value))} />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-[#A79D8C] mb-1">Duration (Arcs)</label>
                <input type="number" min="1" className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm" value={tenderDuration} onChange={e => setTenderDuration(Number(e.target.value))} />
              </div>
              <button onClick={handlePostTender} className="px-6 py-2 bg-[#80704F]/20 border border-[#80704F]/50 text-[#E4DBCA] text-sm uppercase hover:bg-[#80704F]/30 transition-colors">
                Post Tender
              </button>
            </div>
          </Card>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          <Card title="Open Tenders" icon={AlertCircle} className="flex-1">
            {openTenders.length === 0 ? (
              <div className="p-8 text-center text-[#A79D8C] italic">No open tenders at this time.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {openTenders.map(t => (
                  <div key={t.id} className="p-4 bg-[#11131A] border border-[#2A2630]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-[#F4EBD6] font-serif capitalize text-lg">{t.vehicle_class} Fleet</div>
                      <span className="text-xs text-[#A79D8C]">{t.units_per_arc} units/arc</span>
                    </div>
                    <div className="text-sm text-[#E4DBCA] mb-2 flex justify-between">
                      <span>Max Price: <span className="text-[#4D705C] font-mono">{Number(t.max_price).toLocaleString()} ₯</span></span>
                      <span>Duration: {t.duration_arcs} arcs</span>
                    </div>
                    <div className="text-xs text-[#A79D8C] mb-4">
                      {t.bids_count} bids currently placed {t.lowest_bid ? `(Lowest: ${Number(t.lowest_bid).toLocaleString()} ₯)` : ''}
                    </div>

                    {isIronvaleCompany ? (
                      activeBidTenderId === t.id ? (
                        <div className="p-3 bg-[#1A1C23] border border-[#2A2630] flex flex-col gap-3">
                          <select className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-xs" value={bidModel} onChange={e => setBidModel(e.target.value)}>
                            <option value="">Select qualifying model...</option>
                            {models.filter(m => m.vehicle_class === t.vehicle_class).map(m => (
                              <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <input type="number" placeholder="Bid Price" max={Number(t.max_price)} className="flex-1 bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-xs" value={bidPrice || ''} onChange={e => setBidPrice(Number(e.target.value))} />
                            <button onClick={() => handleBid(t.id, Number(t.max_price))} className="px-4 bg-[#4D705C]/20 border border-[#4D705C]/50 text-[#4D705C] hover:bg-[#4D705C]/30 text-xs uppercase">Submit</button>
                            <button onClick={() => setActiveBidTenderId(null)} className="px-3 bg-transparent text-[#A79D8C] hover:text-[#F4EBD6]">✕</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => setActiveBidTenderId(t.id)} className="w-full py-2 bg-[#1A1C23] border border-[#2A2630] text-[#E4DBCA] text-xs uppercase hover:bg-[#2A2630] transition-colors">
                          Place Bid
                        </button>
                      )
                    ) : (
                      <div className="text-center text-[10px] uppercase tracking-widest text-[#A79D8C] border-t border-[#2A2630] pt-2">
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
              <div className="p-8 text-center text-[#A79D8C] italic">No active or closed tenders.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {historyTenders.map(t => (
                  <div key={t.id} className="p-3 bg-[#11131A] border border-[#2A2630] text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="text-[#E4DBCA] capitalize">{t.vehicle_class} Fleet ({t.units_per_arc}/arc)</span>
                      <span className={`text-[10px] uppercase px-1 border ${t.status === 'active' ? 'text-[#4D705C] border-[#4D705C]/30 bg-[#4D705C]/10' : 'text-[#80704F] border-[#80704F]/30 bg-[#80704F]/10'}`}>
                        {t.status}
                      </span>
                    </div>
                    {t.awarded_company_id ? (
                      <div className="flex justify-between text-xs text-[#A79D8C]">
                        <span>Winner: <span className="text-[#E4DBCA]">{t.awarded_company_name || 'Unknown'}</span></span>
                        <span>{Number(t.awarded_price).toLocaleString()} ₯</span>
                      </div>
                    ) : (
                      <div className="text-xs text-[#A79D8C]">Closed without award</div>
                    )}
                    {t.status === 'active' && (
                      <div className="text-[10px] text-[#A79D8C] mt-2 text-right">
                        Remaining: {t.remaining_arcs} arcs
                      </div>
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
