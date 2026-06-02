'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getContracts, getPlayerCompany, initializeContractsIfEmpty, saveContract, type Contract, type Company } from '../../../lib/businessCore';
import Link from 'next/link';

const GOLD = '#c9a84c';

export default function ContractsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [biddingOn, setBiddingOn] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidNote, setBidNote] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      const myCompany = getPlayerCompany(cf.name);
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

    // Determine if player has already bid
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

  if (!authorized) return null;

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: '#7E8378' }}>
        <div className="text-2xl mb-4">🔒</div>
        <div className="text-sm font-bold mb-2" style={{ color: '#F4EBD6' }}>Contracts Locked</div>
        <div className="text-[11px]">You must register a company to bid on commercial contracts.</div>
        <Link href="/drennia/chronicle" className="mt-6 px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
          Go to Chronicle
        </Link>
      </div>
    );
  }

  const openContracts = contracts.filter(c => c.status === 'open');

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F4EBD6' }}>Public Contract Board</h1>
        <p className="text-[12px] mt-1" style={{ color: '#B9B09B' }}>Available tenders and logistics runs posted by state and private operators.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-4">
        {openContracts.length === 0 ? (
          <div className="text-[11px]" style={{ color: '#7E8378' }}>No public contracts available at this time.</div>
        ) : (
          <div className="flex flex-col gap-4">
            {openContracts.map(ctr => {
              const myBid = ctr.bids.find(b => b.companyId === company.id);
              return (
                <div key={ctr.id} className="p-5 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
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

                  {myBid ? (
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
      </div>
    </div>
  );
}
