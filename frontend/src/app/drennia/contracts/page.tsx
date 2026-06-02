'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getContracts, getPlayerCompany, initializeContractsIfEmpty, saveContract, evaluateContractBids, createPlayerContract, type Contract, type Company } from '../../../lib/businessCore';
import Link from 'next/link';
import { DRENNIA_STATES } from '../../../data/business/drenniaDistricts';

const GOLD = '#c9a84c';

export default function ContractsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [biddingOn, setBiddingOn] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidNote, setBidNote] = useState('');
  
  const [isCreating, setIsCreating] = useState(false);
  const [newContract, setNewContract] = useState({
    title: '', description: '', requiredSector: 'Trade & Commerce',
    payment: 100, deadlineDays: 3, penalty: 20, 
    originState: 'Drennport State', destinationState: 'Drennport State', visibility: 'public' as const
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      const myCompany = getPlayerCompany(typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name);
      setCompany(myCompany || null);
    }
    
    initializeContractsIfEmpty();
    setContracts(getContracts());
    setAuthorized(true);
  }, [router]);

  const handlePlaceBid = (contractId: string) => {
    if (!company) return;
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const existingBidIndex = contract.bids.findIndex(b => b.companyId === company.id);
    const newBid = { companyId: company.id, amount: bidAmount, note: bidNote, timestamp: new Date().toISOString() };
    
    const updatedContract = { ...contract };
    if (existingBidIndex >= 0) {
      updatedContract.bids[existingBidIndex] = newBid;
    } else {
      updatedContract.bids.push(newBid);
    }

    saveContract(updatedContract);
    setContracts(getContracts());
    setBiddingOn(null);
    setBidAmount(0);
    setBidNote('');
  };

  const handleEvaluateAll = () => {
    contracts.filter(c => c.status === 'open').forEach(c => evaluateContractBids(c.id));
    setContracts(getContracts());
  };

  const handleCreateContract = () => {
    if (!company) return;
    if (!newContract.title.trim()) return alert('Needs a title.');
    
    createPlayerContract({
      issuerCompanyId: company.id,
      issuerName: company.name,
      title: newContract.title,
      description: newContract.description,
      requiredSector: newContract.requiredSector,
      payment: newContract.payment,
      deadlineDays: newContract.deadlineDays,
      penalty: newContract.penalty,
      originState: newContract.originState,
      destinationState: newContract.destinationState,
      requiredCapacity: 1, // Default for now
      visibility: newContract.visibility
    });

    setContracts(getContracts());
    setIsCreating(false);
    
    // Reset form
    setNewContract({
      title: '', description: '', requiredSector: 'Trade & Commerce',
      payment: 100, deadlineDays: 3, penalty: 20, 
      originState: 'Drennport State', destinationState: 'Drennport State', visibility: 'public'
    });
  };

  if (!authorized) return null;

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: '#7E8378' }}>
        <div className="text-2xl mb-4">🔒</div>
        <div className="text-sm font-bold mb-2" style={{ color: '#F4EBD6' }}>Contracts Locked</div>
        <div className="text-[11px]">Contracts unlock after company registration.</div>
        <Link href="/drennia/chronicle" className="mt-6 px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
          Go to Chronicle
        </Link>
      </div>
    );
  }

  const openContracts = contracts.filter(c => c.status === 'open');
  const awardedContracts = contracts.filter(c => c.status === 'awarded');

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden max-w-4xl mx-auto w-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F4EBD6' }}>Public Contract Board</h1>
          <p className="text-[12px] mt-1" style={{ color: '#B9B09B' }}>Available tenders and logistics runs posted by state and private operators.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setIsCreating(!isCreating)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors" style={{ background: isCreating ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
            {isCreating ? 'Cancel Creation' : 'Create Contract'}
          </button>
          <button onClick={handleEvaluateAll} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', color: GOLD }}>
            Simulate Issuer Reviews
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        {isCreating && (
          <div className="mb-8 p-6 rounded-sm bg-black/40 border border-white/10">
            <h2 className="text-sm font-bold mb-4" style={{ color: '#F4EBD6' }}>Draft New Tender</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Contract Title</label>
                <input type="text" value={newContract.title} onChange={e => setNewContract({...newContract, title: e.target.value})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Required Sector</label>
                <select value={newContract.requiredSector} onChange={e => setNewContract({...newContract, requiredSector: e.target.value})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                  <option>Trade & Commerce</option>
                  <option>Shipping & Logistics</option>
                  <option>Retail & Consumer</option>
                  <option>Finance</option>
                  <option>Manufacturing</option>
                  <option>Agriculture & Food</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Description</label>
              <textarea value={newContract.description} onChange={e => setNewContract({...newContract, description: e.target.value})} rows={3} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }} />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Max Payment (₯)</label>
                <input type="number" value={newContract.payment} onChange={e => setNewContract({...newContract, payment: Number(e.target.value)})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#34d399' }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Penalty (₯)</label>
                <input type="number" value={newContract.penalty} onChange={e => setNewContract({...newContract, penalty: Number(e.target.value)})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#f87171' }} />
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Deadline (Days)</label>
                <input type="number" value={newContract.deadlineDays} onChange={e => setNewContract({...newContract, deadlineDays: Number(e.target.value)})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Origin State</label>
                <select value={newContract.originState} onChange={e => setNewContract({...newContract, originState: e.target.value})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                  {DRENNIA_STATES.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase tracking-widest text-gray-500 mb-1 block">Destination State</label>
                <select value={newContract.destinationState} onChange={e => setNewContract({...newContract, destinationState: e.target.value})} className="w-full px-3 py-2 text-xs rounded-sm outline-none" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}>
                  {DRENNIA_STATES.map(s => <option key={s.name}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleCreateContract} className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: '#0a0b0f' }}>
              Post Contract to Board
            </button>
            <div className="text-[9px] mt-2 text-gray-500 italic">* Future support for real players interacting with this contract.</div>
          </div>
        )}

        {openContracts.length === 0 ? (
          <div className="text-[11px]" style={{ color: '#7E8378' }}>No public contracts available at this time.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {openContracts.map(ctr => {
              const myBid = ctr.bids.find(b => b.companyId === company.id);
              const isMine = ctr.issuerCompanyId === company.id;
              return (
                <div key={ctr.id} className="p-5 rounded-sm relative" style={{ background: 'rgba(255,255,255,0.02)', border: isMine ? `1px solid ${GOLD}40` : '1px solid rgba(255,255,255,0.06)' }}>
                  {isMine && <div className="absolute top-0 right-0 px-2 py-1 text-[8px] uppercase tracking-widest font-bold" style={{ background: `${GOLD}20`, color: GOLD }}>Your Tender</div>}
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-bold" style={{ color: '#F4EBD6' }}>{ctr.title}</div>
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: GOLD }}>Issued by {ctr.issuerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] font-bold font-mono" style={{ color: '#34d399' }}>Max Pay: ₯{ctr.payment}</div>
                      <div className="text-[9px] font-mono" style={{ color: '#f87171' }}>Penalty: ₯{ctr.penalty}</div>
                    </div>
                  </div>
                  
                  <div className="text-[11px] mb-4 leading-relaxed" style={{ color: '#B9B09B' }}>{ctr.description}</div>
                  
                  <div className="flex gap-4 mb-4 text-[9px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>
                    <span>Sector: {ctr.requiredSector}</span>
                    <span>Deadline: {ctr.deadlineDays} Days</span>
                    <span>Cap Req: {ctr.requiredCapacity}</span>
                  </div>

                  {isMine ? (
                     <div className="text-[10px] font-mono" style={{ color: '#7E8378' }}>
                       Current Bids: {ctr.bids.length}
                     </div>
                  ) : myBid ? (
                    <div className="p-3 text-[10px] rounded-sm" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                      You have submitted a bid of <strong>₯{myBid.amount}</strong> for this contract. The issuer is reviewing.
                    </div>
                  ) : biddingOn === ctr.id ? (
                    <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#F4EBD6' }}>Submit Bid</div>
                      <div className="flex gap-2 items-center mb-2">
                        <span className="text-sm font-mono text-white">₯</span>
                        <input type="number" min={1} max={ctr.payment} value={bidAmount || ''} onChange={e => setBidAmount(Number(e.target.value))} placeholder="Your offer"
                          className="w-32 rounded-sm px-3 py-1.5 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#34d399' }} />
                      </div>
                      <input type="text" value={bidNote} onChange={e => setBidNote(e.target.value)} placeholder="Optional note to issuer"
                          className="w-full rounded-sm px-3 py-1.5 text-sm outline-none mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }} />
                      <div className="flex gap-2">
                        <button onClick={() => handlePlaceBid(ctr.id)} disabled={bidAmount <= 0} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm disabled:opacity-40" style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: '#0a0b0f' }}>
                          Submit Bid
                        </button>
                        <button onClick={() => setBiddingOn(null)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', color: '#F4EBD6' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setBiddingOn(ctr.id); setBidAmount(Math.floor(ctr.payment * 0.9)); }} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
                      Place Bid
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {awardedContracts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4" style={{ color: '#F4EBD6' }}>Recently Awarded</h2>
            <div className="flex flex-col gap-2">
              {awardedContracts.map(ctr => {
                const isWinner = ctr.awardedToCompanyId === company.id;
                const isMine = ctr.issuerCompanyId === company.id;
                return (
                  <div key={ctr.id} className="p-3 rounded-sm flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <div className="text-xs font-bold flex gap-2 items-center" style={{ color: '#7E8378' }}>
                        {ctr.title}
                        {isMine && <span className="text-[8px] uppercase font-bold" style={{ color: GOLD }}>Your Tender</span>}
                      </div>
                      <div className="text-[9px] font-mono mt-0.5" style={{ color: '#B9B09B' }}>Issued by {ctr.issuerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono" style={{ color: GOLD }}>Awarded to: {isWinner ? 'You' : 'Another Firm'}</div>
                      <div className="text-[9px] font-mono" style={{ color: '#34d399' }}>Status: In Progress</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
