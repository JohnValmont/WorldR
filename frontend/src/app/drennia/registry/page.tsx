'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCompanies, NPC_COMPANIES, type Company } from '../../../lib/businessCore';

export default function RegistryPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    
    // Combine real created companies with NPC companies for multiplayer feel
    const playerCompanies = getCompanies();
    const all = [...playerCompanies, ...NPC_COMPANIES];
    setCompanies(all);
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F4EBD6' }}>Public Company Registry</h1>
        <p className="text-[12px] mt-1" style={{ color: '#B9B09B' }}>The official Drennia ledger of registered operating companies.</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#7E8378' }}>
              <th className="pb-2 font-mono uppercase tracking-widest">Company</th>
              <th className="pb-2 font-mono uppercase tracking-widest">State</th>
              <th className="pb-2 font-mono uppercase tracking-widest">Sector</th>
              <th className="pb-2 font-mono uppercase tracking-widest">Reputation</th>
              <th className="pb-2 font-mono uppercase tracking-widest">Reliability</th>
              <th className="pb-2 font-mono uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map(co => (
              <tr key={co.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }} className="hover:bg-white/5 transition-colors">
                <td className="py-3">
                  <div className="font-bold" style={{ color: '#F4EBD6' }}>{co.name}</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: '#7E8378' }}>{co.legalStructure} · {co.ownerName}</div>
                </td>
                <td className="py-3" style={{ color: '#B9B09B' }}>{co.state}</td>
                <td className="py-3" style={{ color: '#B9B09B' }}>{co.sector}</td>
                <td className="py-3" style={{ color: '#c9a84c' }}>{co.reputation}</td>
                <td className="py-3" style={{ color: '#34d399' }}>{co.reliability}</td>
                <td className="py-3">
                  <span className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                    {co.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
