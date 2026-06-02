'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPlayerCompany, type Company } from '../../../lib/businessCore';
import Link from 'next/link';

const GOLD = '#c9a84c';

export default function CompanyPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      const playerCharacterId = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
      const myCompany = getPlayerCompany(cf.name);
      setCompany(myCompany || null);
    }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  if (!company) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: '#7E8378' }}>
        <div className="text-2xl mb-4">🔒</div>
        <div className="text-sm font-bold mb-2" style={{ color: '#F4EBD6' }}>Company Desk Locked</div>
        <div className="text-[11px]">You must register a company in the Chronicle to access this desk.</div>
        <Link href="/drennia/chronicle" className="mt-6 px-6 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#F4EBD6' }}>
          Go to Chronicle
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-1" style={{ color: GOLD }}>Official Company Record</div>
          <h1 className="text-3xl font-bold" style={{ color: '#F4EBD6' }}>{company.name}</h1>
          <div className="text-[11px] mt-1 font-mono" style={{ color: '#7E8378' }}>
            {company.legalStructure} · {company.state} · {company.sector}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: '#7E8378' }}>Company Cash</div>
          <div className="text-2xl font-bold font-mono" style={{ color: '#34d399' }}>₯{company.companyCash.toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: '#7E8378' }}>Monthly Revenue</div>
          <div className="text-lg font-bold font-mono" style={{ color: '#34d399' }}>₯{company.monthlyRevenue.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: '#7E8378' }}>Monthly Costs</div>
          <div className="text-lg font-bold font-mono" style={{ color: '#f87171' }}>₯{company.monthlyCosts.toLocaleString()}</div>
        </div>
        <div className="p-4 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: '#7E8378' }}>Status</div>
          <div className="text-lg font-bold" style={{ color: '#F4EBD6' }}>{company.status}</div>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-y-auto">
        <div className="p-5 rounded-sm" style={{ background: 'rgba(201,168,76,0.03)', border: `1px solid ${GOLD}20` }}>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: GOLD }}>Operations & Standing</div>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>Owner</span>
              <span style={{ color: '#B9B09B' }}>{company.ownerName}</span>
            </div>
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>Capacity</span>
              <span style={{ color: '#B9B09B' }}>{company.capacity} / {company.capacity} available</span>
            </div>
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>Reputation</span>
              <span style={{ color: GOLD }}>{company.reputation}</span>
            </div>
            <div>
              <span className="block text-[9px] font-mono uppercase tracking-widest" style={{ color: '#7E8378' }}>Reliability</span>
              <span style={{ color: '#34d399' }}>{company.reliability}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#7E8378' }}>Suggested Next Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/drennia/contracts" className="flex flex-col items-center justify-center p-4 rounded-sm transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: GOLD }}>View Contract Board</span>
              <span className="text-[9px] text-gray-500 mt-1">Bid on public tenders</span>
            </Link>
            <Link href="/drennia/registry" className="flex flex-col items-center justify-center p-4 rounded-sm transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#F4EBD6' }}>View Public Registry</span>
              <span className="text-[9px] text-gray-500 mt-1">Scout competitors</span>
            </Link>
            <button className="flex flex-col items-center justify-center p-4 rounded-sm transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#34d399' }}>Create Contract</span>
              <span className="text-[9px] text-gray-500 mt-1">Post a tender</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-sm transition-colors hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#60a5fa' }}>Send Business Offer</span>
              <span className="text-[9px] text-gray-500 mt-1">Direct B2B</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
