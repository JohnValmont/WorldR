import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { politicsApi } from '@/lib/api';
import { formatGameDate } from '@/lib/calendar';

export default function BillsPanel({ overview, character, parties, stateId }: any) {
  const [bills, setBills] = useState<any[]>([]);
  const [activePolicy, setActivePolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [proposeType, setProposeType] = useState('industry_tax');
  const [taxRate, setTaxRate] = useState(0);

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);
      const data = await politicsApi.getBills(stateId);
      setBills(data.bills || []);
      setActivePolicy(data.activePolicy || null);
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handlePropose = async () => {
    try {
      let params = {};
      if (proposeType === 'industry_tax') {
        params = { rate: taxRate / 100 }; // Send as 0.20 for 20%
      }
      await politicsApi.proposeBill(proposeType, params, stateId);
      loadBills();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to propose bill');
    }
  };

  const handleVote = async (billId: string, vote: string) => {
    try {
      await politicsApi.voteBill(billId, vote);
      loadBills();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || 'Failed to vote on bill');
    }
  };

  const myParty = parties?.find((p: any) => p.leader_character_id === character?.id);
  const isGovLeader = myParty && overview?.council?.government?.members?.includes(myParty.id);
  const isGoverningPhase = overview?.cycle?.phase === 'governing';
  const canPropose = isGovLeader && isGoverningPhase;
  
  // Actually, any seated councillor can vote
  const isSeated = overview?.council?.partySeats?.some((ps: any) => ps.partyId === myParty?.id);

  if (loading) return <div className="text-[#A79D8C] mt-6">Loading bills...</div>;

  return (
    <div className="flex flex-col gap-6 mt-6 animate-slide-in">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* LEFT: Active Policy & Propose */}
        <div className="flex-1 flex flex-col gap-6">
          <Card title="Active Policies" icon={CheckCircle2}>
            <div className="p-4 bg-[#11131A] border border-[#2A2630]">
              <div className="text-[#A79D8C] text-sm uppercase tracking-wider mb-2">Industry Tax Rate</div>
              <div className="text-[#F4EBD6] font-serif text-2xl">
                {activePolicy ? (Number(activePolicy.industry_tax_rate) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-[#A79D8C] mt-2">Deducted from manufacturing net profits at month-end resolution.</p>
            </div>
            {/* Stubs for other policies */}
            <div className="p-4 bg-[#11131A] border border-[#2A2630] border-t-0 opacity-50">
              <div className="text-[#A79D8C] text-sm uppercase tracking-wider mb-2">Infrastructure Level</div>
              <div className="text-[#F4EBD6] font-serif text-xl">Level {activePolicy?.infrastructure_level || 1}</div>
              <p className="text-[10px] text-[#A79D8C] uppercase tracking-widest mt-1">Coming Soon</p>
            </div>
          </Card>

          {canPropose && (
            <Card title="Propose Bill" icon={FileText}>
              <div className="flex flex-col gap-4">
                <select 
                  className="w-full bg-[#090A0F] border border-[#2A2630] text-[#E4DBCA] p-2 text-sm"
                  value={proposeType}
                  onChange={e => setProposeType(e.target.value)}
                >
                  <option value="industry_tax">Change Industry Tax</option>
                  <option value="infrastructure" disabled>Infrastructure Bill (Coming Soon)</option>
                  <option value="manufacturing_subsidy" disabled>Manufacturing Subsidy (Coming Soon)</option>
                  <option value="labour_policy" disabled>Labour Policy (Coming Soon)</option>
                </select>

                {proposeType === 'industry_tax' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[#A79D8C] text-xs">Proposed Rate: {taxRate}%</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="40" 
                      step="1" 
                      value={taxRate} 
                      onChange={e => setTaxRate(Number(e.target.value))} 
                      className="w-full accent-[#4D705C]"
                    />
                    <p className="text-xs text-[#A79D8C] mt-1">Allowed range: 0% - 40%</p>
                  </div>
                )}

                <button 
                  onClick={handlePropose}
                  className="w-full py-2 bg-[#1A1C23] border border-[#2A2630] text-[#E4DBCA] text-xs uppercase hover:bg-[#2A2630] transition-colors mt-2"
                >
                  Submit Proposal
                </button>
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT: Bill History */}
        <div className="flex-1 flex flex-col gap-6">
          <Card title="Legislative Docket" icon={FileText}>
            {bills.length === 0 ? (
              <div className="p-8 text-center text-[#A79D8C] italic">No bills have been proposed this cycle.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {bills.map(bill => {
                  const t = bill.tally;
                  const total = t.yea + t.nay + t.abstain;
                  const yeaPct = total > 0 ? (t.yea / total) * 100 : 0;
                  const nayPct = total > 0 ? (t.nay / total) * 100 : 0;

                  return (
                    <div key={bill.id} className="p-4 bg-[#11131A] border border-[#2A2630]">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[#F4EBD6] font-serif capitalize">{bill.type.replace('_', ' ')} Bill</span>
                          <span className="text-xs text-[#A79D8C] ml-2">{formatGameDate(bill.proposed_arc)}</span>
                        </div>
                        <span className={`px-2 py-1 text-[10px] uppercase border ${
                          bill.status === 'passed' || bill.status === 'active' ? 'text-[#4D705C] border-[#4D705C]/30 bg-[#4D705C]/10' :
                          bill.status === 'failed' ? 'text-[#B85555] border-[#B85555]/30 bg-[#B85555]/10' :
                          'text-[#80704F] border-[#80704F]/30 bg-[#80704F]/10'
                        }`}>
                          {bill.status}
                        </span>
                      </div>
                      
                      <div className="text-sm text-[#E4DBCA] mb-4">
                        {bill.type === 'industry_tax' && `Proposes changing Industry Tax to ${Number(bill.params.rate) * 100}%`}
                      </div>

                      <div className="flex flex-col gap-1 mb-4">
                        <div className="flex justify-between text-xs text-[#A79D8C]">
                          <span>Yea: {t.yea}</span>
                          <span>Abstain: {t.abstain}</span>
                          <span>Nay: {t.nay}</span>
                        </div>
                        <div className="w-full h-2 bg-[#2A2630] flex">
                          <div className="h-full bg-[#4D705C]" style={{ width: `${yeaPct}%` }} />
                          <div className="h-full bg-[#B85555] ml-auto" style={{ width: `${nayPct}%` }} />
                        </div>
                        <div className="text-right text-[10px] text-[#A79D8C] mt-1">
                          Projection: {bill.projectedPass ? 'Pass' : 'Fail'}
                        </div>
                      </div>

                      {bill.status === 'proposed' && isSeated && (
                        <div className="flex gap-2 border-t border-[#2A2630] pt-3 mt-2">
                          <button onClick={() => handleVote(bill.id, 'yea')} className="flex-1 py-1 bg-[#4D705C]/10 border border-[#4D705C]/30 text-[#4D705C] text-xs hover:bg-[#4D705C]/20 transition-colors">Vote YEA</button>
                          <button onClick={() => handleVote(bill.id, 'nay')} className="flex-1 py-1 bg-[#B85555]/10 border border-[#B85555]/30 text-[#B85555] text-xs hover:bg-[#B85555]/20 transition-colors">Vote NAY</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
