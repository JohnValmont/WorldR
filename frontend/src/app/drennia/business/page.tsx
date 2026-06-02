'use client';
// Business tab — locked until company registration conditions are met.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const GOLD = '#c9a84c';

export default function BusinessPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [cash, setCash] = useState(0);
  const [businessRecordCount, setBusinessRecordCount] = useState(0);
  const [contactCount, setContactCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    const fileStr = localStorage.getItem('worldr_citizen_file_v1');
    if (!fileStr) { router.replace('/start/character'); return; }
    setAuthorized(true);

    const cf = JSON.parse(fileStr);
    const c = cf.personalMoney ?? cf.money ?? 0;
    setCash(c);

    const recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
    const br = recs.filter((r: any) => r.type === 'business').length;
    const cr = recs.filter((r: any) => r.type === 'contact').length;
    setBusinessRecordCount(br);
    setContactCount(cr);

    const comps = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
    setCompanies(comps);
    setUnlocked(c >= 500 && br >= 1 && cr >= 1);
  }, [router]);

  if (!authorized) return null;

  const openChronicle = () => router.push('/drennia/chronicle');

  if (companies.length > 0) {
    const company = companies[0];
    return (
      <div className="max-w-lg mx-auto py-12 px-4">
        <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-2" style={{ color: `${GOLD}60` }}>Your Company</div>
        <div className="text-2xl font-bold mb-1" style={{ color: '#F4EBD6' }}>{company.name}</div>
        <div className="text-[11px] font-mono mb-6" style={{ color: '#7E8378' }}>
          {company.legalStructure} · {company.sector} · {company.state}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: 'Company Cash', value: `₯${(company.cash || 0).toLocaleString()}`, color: '#34d399' },
            { label: 'Monthly Revenue', value: `₯${(company.monthlyRevenue || 0).toLocaleString()}`, color: '#60a5fa' },
            { label: 'Monthly Costs', value: `₯${(company.monthlyCosts || 0).toLocaleString()}`, color: '#f87171' },
            { label: 'Reputation', value: `${company.reputation || 0}`, color: GOLD },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-sm" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="text-[9px] font-mono uppercase tracking-widest mb-1" style={{ color: '#7E8378' }}>{item.label}</div>
              <div className="text-lg font-bold font-mono" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="text-[10px] font-mono" style={{ color: '#3f4b47' }}>
          Registered: {new Date(company.createdAt).toLocaleDateString()}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-12 px-4">
      <div className="text-[9px] font-mono uppercase tracking-[0.3em] mb-2" style={{ color: `${GOLD}60` }}>Business Registry</div>
      <div className="text-2xl font-bold mb-4" style={{ color: '#F4EBD6' }}>
        {unlocked ? 'Registration Available' : 'Registry Locked'}
      </div>

      {unlocked ? (
        <>
          <p className="text-sm mb-6" style={{ color: '#B9B09B' }}>
            You have met the requirements for Sole Trader registration. Open The Chronicle to begin the registration process.
          </p>
          <button onClick={openChronicle}
            className="px-6 py-3 text-sm font-bold uppercase tracking-widest rounded-sm"
            style={{ background: `linear-gradient(135deg, ${GOLD}, #a8882e)`, color: '#0a0b0f' }}>
            Open Chronicle → Register Company
          </button>
        </>
      ) : (
        <>
          <p className="text-sm mb-6" style={{ color: '#B9B09B' }}>
            Build cash, business records, and contacts in Drennia first.
          </p>
          <div className="flex flex-col gap-3 mb-6">
            {[
              { label: 'Cash ₯500+', met: cash >= 500, current: `₯${cash.toLocaleString()}`, target: '₯500' },
              { label: '1+ Business Record', met: businessRecordCount >= 1, current: `${businessRecordCount}`, target: '1' },
              { label: '1+ Business Contact', met: contactCount >= 1, current: `${contactCount}`, target: '1' },
            ].map(req => (
              <div key={req.label} className="flex items-center justify-between p-3 rounded-sm"
                style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${req.met ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: req.met ? '#34d399' : '#3f4b47' }} />
                  <span className="text-xs" style={{ color: req.met ? '#F4EBD6' : '#7E8378' }}>{req.label}</span>
                </div>
                <span className="text-xs font-mono" style={{ color: req.met ? '#34d399' : '#7E8378' }}>{req.current}</span>
              </div>
            ))}
          </div>
          <button onClick={openChronicle}
            className="px-6 py-3 text-sm font-semibold uppercase tracking-widest rounded-sm"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>
            ← Return to Chronicle
          </button>
        </>
      )}
    </div>
  );
}
