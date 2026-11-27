'use client';
import React, { useState, useEffect } from 'react';
import BankPortal from './BankPortal';
import LoanSchedule, { BankLoan, fetchMyLoans } from './LoanSchedule';
import { Landmark, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const T = {
  bg: '#0B0D12',
  panel: '#13161E',
  panelSoft: '#1B1F29',
  paper: '#1E1B14',
  border: '#262B36',
  borderGold: 'rgba(232,184,75,0.22)',
  gold: '#E8B84B',
  ivory: '#ECEAE4',
  muted: '#A3A4AC',
  faint: '#868994',
  mint: '#4FB286',
  steel: '#4B6382',
  burgundy: '#8F3D3D',
  red: '#D9625A',
};

const BANKS = [
  {
    id: 'drennia-national',
    name: 'State Bank of Drennia',
    description: 'The central state banking authority. Provides foundational accounts, personal loans, and strictly regulated corporate facilities.',
    color: '#4B6382',
    accent: 'bg-[#4B6382]/10 border-[#4B6382]',
    facilities: ['personal', 'executive', 'tla', 'growth', 'distressed'] // Combining facilities for now since it's the only bank
  }
];

type GlobalSidebarTab = 'institutions' | 'profile' | 'debt';

export default function BanksTab({ company, playerCash, onRefresh }: { company: any, playerCash: number, onRefresh?: () => void }) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<GlobalSidebarTab>('institutions');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  
  const [personalDossier, setPersonalDossier] = useState<any>(null);
  const [corporateDossier, setCorporateDossier] = useState<any>(null);
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Every bank loan the player owes, personal and company (GET /banks/loans).
  const [loans, setLoans] = useState<BankLoan[]>([]);
  const [loansError, setLoansError] = useState<string | null>(null);

  const reloadLoans = () => fetchMyLoans()
    .then(list => { setLoans(list); setLoansError(null); })
    .catch(err => {
      console.error('Failed to load loans:', err);
      setLoansError(err?.response?.data?.error || 'Could not load your loans. Try again in a moment.');
    });

  const [myCompanies, setMyCompanies] = useState<any[]>([]);
  const [activeCompany, setActiveCompany] = useState<any>(company);

  useEffect(() => {
    if (company && !activeCompany) {
      setActiveCompany(company);
    }
  }, [company, activeCompany]);

  useEffect(() => {
    import('@/lib/api').then(({ companyApi }) => {
      if (companyApi) {
        companyApi.getMy().then(res => {
          setMyCompanies(res.data.filter((c: any) => c.industry_id !== 'finance' && c.status !== 'DELETED' && !c.name?.includes('[DELETED')));
        }).catch(err => console.error(err));
      }
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    import('@/lib/api').then(({ api }) => {
      const promises = [];
      
      // Always fetch personal
      promises.push(
        api.get('/banks/dossier/personal').then(res => {
          if (mounted) setPersonalDossier(res.data);
        }).catch(err => {
          console.error('Failed to load personal dossier:', err);
        })
      );

      // Fetch corporate if company exists
      if (activeCompany && activeCompany.id) {
        promises.push(
          api.get(`/banks/dossier/${activeCompany.id}`).then(res => {
            if (mounted) setCorporateDossier(res.data);
          }).catch(err => {
            console.error('Failed to load corporate dossier:', err);
            if (mounted) setLoadError(err?.response?.data?.error || 'Backend failed to return portfolio data.');
          })
        );
      }

      // Loans owed by the player and every company they own.
      promises.push(reloadLoans());

      // Fetch institution data
      promises.push(
        api.get('/banks/institution/drennia-national').then(res => {
          if (mounted) setInstitutionData(res.data);
        }).catch(err => {
          console.error('Failed to load institution data:', err);
        })
      );

      Promise.all(promises).then(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => { mounted = false; };
  }, [activeCompany?.id]);

  const handleTakeLoan = async (type: 'personal' | 'corporate', facilityType: string, amount: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { api } = await import('@/lib/api');
      let res;
      if (type === 'personal') {
        res = await api.post(`/banks/loan/personal/take`, { facilityType, principalAmount: amount });
      } else {
        res = await api.post(`/banks/loan/${activeCompany.id}/take`, { facilityType, principalAmount: amount });
      }
      alert(`Loan Secured! Monthly Payment: $${res.data.monthlyPayment}`);
      if (onRefresh) onRefresh();
      
      // Re-fetch dossier
      if (type === 'personal') {
        const pd = await api.get('/banks/dossier/personal');
        setPersonalDossier(pd.data);
      } else {
        const cd = await api.get(`/banks/dossier/${activeCompany.id}`);
        setCorporateDossier(cd.data);
      }
      await reloadLoans();
      
    } catch (e: any) {
      console.error('Loan application error:', e);
      alert(e.response?.data?.error || e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingColor = (tier: string) => {
    if (['AAA', 'AA', 'A'].includes(tier)) return T.mint;
    if (['BBB', 'BB', 'B'].includes(tier)) return T.gold;
    return T.red;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center w-full min-h-[500px] bg-[#0B0D12]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Landmark size={32} className="text-terminal-amber opacity-50" />
          <div className="text-[11px] text-zinc-500 uppercase tracking-widest">Accessing Financial District...</div>
        </div>
      </div>
    );
  }

  // Handle sub-routing
  const renderContent = () => {
    if (activeSidebarTab === 'institutions') {
      if (selectedBankId) {
        return (
          <BankPortal 
            bank={BANKS.find(b => b.id === selectedBankId)!} 
            company={activeCompany}
            playerCash={playerCash}
            personalDossier={personalDossier}
            corporateDossier={corporateDossier}
            institutionData={institutionData}
            loadError={loadError}
            loans={loans}
            loansError={loansError}
            onBack={() => { setSelectedBankId(null); reloadLoans(); }}
            onTakeLoan={handleTakeLoan}
            isSubmitting={isSubmitting}
            getRatingColor={getRatingColor}
            myCompanies={myCompanies}
            onSelectCompany={(cId: string) => {
               const c = myCompanies.find(x => x.id === cId);
               if (c) setActiveCompany(c);
            }}
          />
        );
      } else {
        return (
          <FinancialDistrict 
            banks={BANKS}
            onSelectBank={setSelectedBankId}
          />
        );
      }
    }
    
    if (activeSidebarTab === 'profile') {
      return (
        <FinancialProfile 
          company={activeCompany}
          personalDossier={personalDossier}
          corporateDossier={corporateDossier}
          getRatingColor={getRatingColor}
        />
      );
    }

    if (activeSidebarTab === 'debt') {
      return (
        <div className="pt-5 md:pt-0 md:pl-8 space-y-6 animate-slide-in">
          <div>
            <h2 className="font-serif text-2xl font-bold text-ink">Active debt schedule</h2>
            <p className="text-sm text-ink-dim mt-1">Your personal loan and the bank loans of every company you own.</p>
          </div>
          {loansError ? (
            <div role="alert" className="bg-surface border border-line rounded-card p-6 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-bad">{loansError}</span>
              <button type="button" onClick={() => reloadLoans()} className="btn-secondary text-xs px-3 py-1.5">Try again</button>
            </div>
          ) : (
            <LoanSchedule
              loans={loans}
              emptyMessage="When you or one of your companies borrows from a bank, each loan appears here with what is left to pay, the monthly payment and when it ends."
              emptyAction={{
                label: 'Open a bank',
                onClick: () => { setActiveSidebarTab('institutions'); setSelectedBankId(BANKS[0].id); },
              }}
            />
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col">
      {/* Optional Top Bar if needed, but since it's full screen, it's covered by sidebar layout */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        
        {/* ── MASTER SIDEBAR ── */}
        <nav aria-label="Bank sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-line pb-2 md:w-[220px] md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-4">
          {myCompanies.length > 0 && (
            <div className="mb-3 hidden flex-col gap-1.5 md:flex">
              <label htmlFor="bank-company" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Borrowing for</label>
              <select
                  id="bank-company"
                  className="terminal-input !py-2 !text-[13px]"
                  value={activeCompany?.id || ''}
                  onChange={(e) => {
                    const found = myCompanies.find(c => c.id === e.target.value);
                    if (found) setActiveCompany(found);
                  }}
                >
                  {myCompanies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>
          )}

          {(['institutions', 'profile', 'debt'] as const).map((tab) => {
            const isActive = activeSidebarTab === tab;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveSidebarTab(tab);
                  // Optional: if they click institutions again, reset to marketplace view
                  if (tab === 'institutions' && activeSidebarTab === 'institutions') {
                    setSelectedBankId(null);
                  }
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`whitespace-nowrap rounded-control px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors
                  ${isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-ink-dim hover:bg-white/5 hover:text-ink'}`}
              >
                {tab === 'institutions' ? 'Banks' :
                 tab === 'profile' ? 'Credit profile' :
                 'Debt schedule'}
              </button>
            );
          })}
        </nav>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="min-w-0 flex-1">
          {renderContent()}
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTITUTIONS MARKETPLACE (FINANCIAL DISTRICT)
// ─────────────────────────────────────────────────────────────────────────────
function FinancialDistrict({ banks, onSelectBank }: any) {
  return (
    <div className="flex flex-col animate-slide-in w-full pb-10 pt-5 md:pt-0 md:pl-8 space-y-8">
      
      <div>
        <h2 className="font-serif text-2xl font-bold text-zinc-100 mb-2">Banking Institutions</h2>
        <p className="text-sm text-zinc-400">Select an institution to view their specific lending facilities and requirements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank: any) => (
          <div 
            key={bank.id} 
            className="bg-[#13161E] border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors cursor-pointer group relative overflow-hidden flex flex-col"
            onClick={() => onSelectBank(bank.id)}
          >
            {/* Hover flare */}
            <div className="absolute -inset-10 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle, ${bank.color} 0%, transparent 70%)` }} />
            
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 rounded bg-[#1E1B14] border border-zinc-800 flex items-center justify-center shadow-inner" style={{ color: bank.color }}>
                <Landmark size={20} />
              </div>
              <div className="font-serif font-bold text-zinc-100 text-lg leading-tight">{bank.name}</div>
            </div>
            
            <div className="text-xs text-zinc-400 mb-6 flex-1 relative z-10 leading-relaxed">
              {bank.description}
            </div>
            
            <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center relative z-10">
              <span className="text-[10px] uppercase text-zinc-500">Enter Portal</span>
              <ArrowRight size={14} className="text-zinc-600 group-hover:text-zinc-300 transition-colors transform group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL PROFILE
// ─────────────────────────────────────────────────────────────────────────────
function FinancialProfile({ company, personalDossier, corporateDossier, getRatingColor }: any) {
  // Only measured inputs from the credit dossiers (no invented axes or placeholder values:
  // players read every chart as fact). Each is scaled to 0-100 for the shape.
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  const radarData = [
    { subject: 'Character', value: clamp(personalDossier?.metrics?.character || 0) },
    { subject: 'Capacity', value: clamp(((personalDossier?.metrics?.capacity || 0) + (corporateDossier?.metrics?.capacity || 0)) / 50000) },
    { subject: 'Capital', value: clamp(((personalDossier?.metrics?.capital || 0) + (corporateDossier?.metrics?.capital || 0)) / 2000000) },
    { subject: 'Collateral', value: clamp(((personalDossier?.metrics?.collateral || 0) + (corporateDossier?.metrics?.collateral || 0)) / 2000000) },
  ];

  const totalCapital = Math.max(0, (personalDossier?.metrics?.capital || 0) + (corporateDossier?.metrics?.capital || 0));
  const totalCollateral = Math.max(0, (personalDossier?.metrics?.collateral || 0) + (corporateDossier?.metrics?.collateral || 0));

  return (
    <div className="flex flex-col animate-slide-in w-full pb-10 pt-5 md:pt-0 md:pl-8 space-y-10">
      <div>
        <h2 className="font-serif text-2xl font-bold text-zinc-100 mb-2">Unified Credit Profile</h2>
        <p className="text-sm text-zinc-400">Your consolidated financial health and credit standing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scores */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-[#13161E] border border-zinc-800 rounded-lg p-6 flex-1 flex flex-col justify-center">
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Personal Rating</div>
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-serif font-bold" style={{ color: getRatingColor(personalDossier?.ratingTier || 'D') }}>
                {personalDossier?.ratingTier || 'N/A'}
              </div>
              <div className="text-xs text-zinc-400">Score: {personalDossier?.riskScore || 0}/100</div>
            </div>
          </div>
          <div className={`bg-[#13161E] border border-zinc-800 rounded-lg p-6 flex-1 flex flex-col justify-center ${!company ? 'opacity-50 grayscale' : ''}`}>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Corporate Rating</div>
            {company ? (
              <div className="flex items-baseline gap-3">
                <div className="text-4xl font-serif font-bold" style={{ color: getRatingColor(corporateDossier?.ratingTier || 'D') }}>
                  {corporateDossier?.ratingTier || 'N/A'}
                </div>
                <div className="text-xs text-zinc-400">Score: {corporateDossier?.riskScore || 0}/100</div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic mt-2">No active company</div>
            )}
          </div>
        </div>

        {/* Radar Chart */}
        <div className="col-span-1 bg-[#13161E] border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center min-h-[250px]">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 w-full text-center">Credit factors</div>
          <div className="w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#262B36" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#A3A4AC', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Credit" dataKey="value" stroke={T.gold} fill={T.gold} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Capital figures (real dossier numbers) */}
        <div className="col-span-1 flex flex-col justify-center gap-4 rounded-card border border-line bg-surface p-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Capital (you + company)</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-ink">${totalCapital.toLocaleString('en-US')}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Collateral</div>
            <div className="mt-1 font-mono text-[22px] font-semibold text-ink">${totalCollateral.toLocaleString('en-US')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// BankPortal moved to BankPortal.tsx

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function MetricRow({ label, value, desc, alert = false }: { label: string, value: string, desc: string, alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
      <div>
        <div className="text-[11px] text-zinc-300 font-medium">{label}</div>
        <div className="text-[10px] text-zinc-500">{desc}</div>
      </div>
      <div className={`text-[12px] font-mono font-bold ${alert ? 'text-[#D9625A]' : 'text-[#ECEAE4]'}`}>
        {value}
      </div>
    </div>
  );
}

function FacilityCard({ 
  title, rate, desc, amount, type, dossier, onApply, isSubmitting, 
  reqRating, reqCharacter, reqCapacity, isDistressedOnly, accentColor
}: any) {
  
  let disabledReason = null;
  
  if (!dossier) disabledReason = "Loading...";
  else if (reqRating && !reqRating.includes(dossier.ratingTier)) disabledReason = "Rating Too Low";
  else if (reqCharacter !== undefined && dossier.metrics.character < reqCharacter) disabledReason = "Reputation Too Low";
  else if (reqCapacity !== undefined && dossier.metrics.capacity < reqCapacity) disabledReason = "Negative Cashflow";
  else if (isDistressedOnly && (dossier.metrics.capacity >= 0 && dossier.ratingTier !== 'D' && dossier.ratingTier !== 'CCC')) disabledReason = "Not Distressed";

  return (
    <div className={`bg-[#1E1B14] border ${isDistressedOnly ? 'border-[#8F3D3D]' : 'border-[#262B36]'} p-5 rounded-lg flex flex-col hover:border-zinc-700 transition-colors`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`text-sm font-bold ${isDistressedOnly ? 'text-[#ff8888]' : 'text-[#ECEAE4]'}`}>{title}</div>
        <div className={`text-xs font-mono font-bold ${isDistressedOnly ? 'text-[#ff8888]' : ''}`} style={{ color: !isDistressedOnly ? accentColor : undefined }}>{rate}</div>
      </div>
      <div className="text-[11px] text-[#A3A4AC] mb-6 flex-1 leading-relaxed">{desc}</div>
      
      {disabledReason ? (
        <button disabled className="w-full bg-[#13161E] border border-zinc-800 text-zinc-600 py-2.5 text-[10px] uppercase tracking-widest rounded cursor-not-allowed">
          {disabledReason}
        </button>
      ) : (
        <button 
          onClick={() => onApply(type, amount)}
          disabled={isSubmitting}
          className={`w-full py-2.5 text-[10px] uppercase tracking-widest rounded transition-all shadow-sm
            ${isDistressedOnly 
              ? 'bg-[#8F3D3D]/10 border border-[#8F3D3D] text-[#ff8888] hover:bg-[#8F3D3D]/30'
              : 'border hover:opacity-80'
          } ${isSubmitting ? 'opacity-50 cursor-wait' : ''}`}
          style={!isDistressedOnly ? { 
            borderColor: accentColor, 
            color: accentColor,
            backgroundColor: `${accentColor}15` // 15 hex alpha for ~8% opacity
          } : undefined}
        >
          {isSubmitting ? 'Processing...' : `Apply for $${(amount/1000).toFixed(0)}k`}
        </button>
      )}
    </div>
  );
}
