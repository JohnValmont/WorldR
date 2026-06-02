'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCompanies, NPC_COMPANIES, type Company } from '../../../lib/businessCore';

const GOLD = '#D6B35F';

export default function RegistryPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [hasPlayerCompany, setHasPlayerCompany] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    let cfName = '';
    if (fileStr) {
      const cf = JSON.parse(fileStr);
      cfName = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
    }

    const playerCompanies = getCompanies();
    setHasPlayerCompany(playerCompanies.some(c => c.ownerCharacterId === cfName));

    const all = [...playerCompanies, ...NPC_COMPANIES];
    setCompanies(all);
    setAuthorized(true);
  }, [router]);

  const handleSendOffer = (e: React.MouseEvent, co: Company) => {
    e.stopPropagation();
    if (!hasPlayerCompany) {
      alert("You must register a company first to send business offers.");
      return;
    }
    // For v1 foundation: Alert simple feedback
    alert(`Business Offer drafted for ${co.name}. (Sending offers to be built in next module)`);
  };

  if (!authorized) return null;

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#F4EBD6' }}>Public Company Registry</h1>
        <p className="text-[12px] mt-1" style={{ color: '#B9B09B' }}>The official Drennia ledger of registered operating companies.</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-4">
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
            {companies.map(co => {
              const isSelected = selectedCompanyId === co.id;
              return (
                <React.Fragment key={co.id}>
                  <tr 
                    onClick={() => setSelectedCompanyId(isSelected ? null : co.id)}
                    style={{ borderBottom: isSelected ? 'none' : '1px solid rgba(255,255,255,0.04)' }} 
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="py-3">
                      <div className="font-bold flex items-center gap-2" style={{ color: '#F4EBD6' }}>
                        {co.name}
                        {isSelected && <span className="text-[10px] text-gray-500">▼</span>}
                        {!isSelected && <span className="text-[10px] text-gray-700">▶</span>}
                      </div>
                      <div className="text-[9px] font-mono mt-0.5" style={{ color: '#7E8378' }}>{co.legalStructure} · {co.ownerName}</div>
                    </td>
                    <td className="py-3" style={{ color: '#B9B09B' }}>{co.state}</td>
                    <td className="py-3" style={{ color: '#B9B09B' }}>{co.sector}</td>
                    <td className="py-3" style={{ color: GOLD }}>{co.reputation}</td>
                    <td className="py-3" style={{ color: '#34d399' }}>{co.reliability}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px]" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
                        {co.status}
                      </span>
                    </td>
                  </tr>
                  {isSelected && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td colSpan={6} className="py-4 px-4 bg-black/40">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm font-bold mb-2" style={{ color: '#F4EBD6' }}>{co.name} Profile</div>
                            <div className="text-[10px] text-gray-400 max-w-md leading-relaxed mb-4">
                              Registered on {new Date(co.registeredAt).toLocaleDateString()}. Specializes in {co.sector} operations within {co.state}. 
                              Estimated operational capacity: {co.capacity}. Currently holds {co.activeContracts.length} active public contracts.
                            </div>
                          </div>
                          <div>
                            <button onClick={(e) => handleSendOffer(e, co)} className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-colors" style={{ background: 'rgba(96, 165, 250, 0.1)', border: '1px solid rgba(96, 165, 250, 0.3)', color: '#60a5fa' }}>
                              Send Business Offer
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
