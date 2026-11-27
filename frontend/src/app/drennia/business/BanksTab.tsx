'use client';
import React, { useState, useEffect } from 'react';
import BankPortal from './BankPortal';
import { Landmark, ShieldCheck, TrendingUp, ArrowRight, Wallet, Activity, Target, Building2, User, ChevronLeft } from 'lucide-react';

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

type GlobalSidebarTab = 'institutions' | 'profile' | 'debt' | 'treasury';

export default function BanksTab({ company, playerCash, onRefresh }: { company: any, playerCash: number, onRefresh?: () => void }) {
  const [activeSidebarTab, setActiveSidebarTab] = useState<GlobalSidebarTab>('institutions');
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);
  
  const [personalDossier, setPersonalDossier] = useState<any>(null);
  const [corporateDossier, setCorporateDossier] = useState<any>(null);
  const [institutionData, setInstitutionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          const list = res.data.filter((c: any) => c.industry_id !== 'finance' && c.status !== 'DELETED' && !c.name?.includes('[DELETED'));
          setMyCompanies(list);
          // The Business page clears its selected company on every tab but Companies, so
          // `company` is usually null here. Borrow for the player's operating company (a
          // character has at most one); the "Borrowing for" picker can still change it.
          setActiveCompany((prev: any) => prev || list[0] || null);
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
            onBack={() => setSelectedBankId(null)}
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
          loadError={loadError}
        />
      );
    }

    if (activeSidebarTab === 'debt') {
      return (
        <div className="pt-5 md:pt-0 md:pl-8 space-y-6 animate-slide-in">
          <h3 className="font-serif text-2xl font-bold text-zinc-100">Active Debt Schedule</h3>
          <div className="bg-[#13161E] border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Activity size={32} className="text-zinc-800 mb-4" />
            <div className="text-zinc-500 text-sm">No active debt facilities.</div>
          </div>
        </div>
      );
    }

    if (activeSidebarTab === 'treasury') {
      return (
        <div className="pt-5 md:pt-0 md:pl-8 space-y-6 animate-slide-in">
          <h3 className="font-serif text-2xl font-bold text-zinc-100">Treasury & Wealth</h3>
          <div className="bg-[#13161E] border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Wallet size={32} className="text-zinc-800 mb-4" />
            <div className="text-zinc-500 text-sm">Wealth management systems are currently offline.</div>
          </div>
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

          {(['institutions', 'profile', 'debt', 'treasury'] as const).map((tab) => {
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
                 tab === 'debt' ? 'Debt schedule' :
                 'Treasury'}
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
function FinancialProfile({ company, personalDossier, corporateDossier, loadError }: any) {
  // Every figure here comes from the bank's dossiers, which read real rows (cash, net
  // worth, book value, company debt, loans still owed). Players read every number as
  // a fact, so a missing figure is left out with a line saying when it will appear;
  // nothing is scaled, floored or filled in.
  const companyDossier = company && corporateDossier ? corporateDossier : null;

  return (
    <div className="flex w-full animate-slide-in flex-col gap-6 pb-10 pt-5 md:pl-8 md:pt-0">
      <div>
        <h2 className="mb-1 font-serif text-2xl font-bold text-ink">Credit profile</h2>
        <p className="text-[14px] text-ink-dim">What the State Bank sees when you ask for a loan. Figures are from your accounts as they stand now.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ProfileCard kicker="Personal" title="You" dossier={personalDossier}
          missing="Your personal credit file could not be loaded. Reopen the Banks tab to try again.">
          {personalDossier && (
            <>
              <dl>
                <Figure label="Cash in hand" value={money(personalDossier.metrics?.capacity)} />
                <Figure label="Net worth" value={money(personalDossier.metrics?.capital)} hint="Cash, company book value and shares, less what you owe." />
                <Figure label="Owed to the bank" value={money(owed(personalDossier.activeLoans))} />
                <Figure label="Monthly repayments" value={money(monthly(personalDossier.activeLoans))} />
                {personalDossier.personalLoanLimit !== undefined && (
                  <Figure label="Personal loan limit" value={money(personalDossier.personalLoanLimit)} hint="The most the bank will lend you personally, set by your net worth." />
                )}
              </dl>
              <LoanList loans={personalDossier.activeLoans}
                empty="No personal loan. If you borrow from the bank, the loan and what is left to repay appear here." />
            </>
          )}
        </ProfileCard>

        {!company ? (
          <section aria-label="Company credit" className="rounded-card border border-line bg-surface p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Company</div>
            <p className="mt-3 text-[14px] text-ink-dim">You don&apos;t run a company yet. Once you open one, its balance sheet and bank loans appear here.</p>
          </section>
        ) : (
          <ProfileCard kicker="Company" title={company.name} dossier={companyDossier}
            missing={loadError ? `The company's credit file could not be loaded: ${loadError}` : "The company's credit file could not be loaded. Reopen the Banks tab to try again."}>
            {companyDossier && <CompanyFigures dossier={companyDossier} />}
          </ProfileCard>
        )}
      </div>
    </div>
  );
}

function CompanyFigures({ dossier }: { dossier: any }) {
  const m = dossier.metrics || {};
  const assets = Number(m.totalAssets) || 0;
  const liabilities = Number(m.totalLiabilities) || 0;
  const share = assets > 0 ? Math.min(1, liabilities / assets) : null;
  return (
    <>
      <dl>
        <Figure label="Cash" value={money(m.capacity)} />
        <Figure label="Total assets" value={money(assets)} hint="Cash, cars in stock, land, owned plants and lines, shares held." />
        <Figure label="Liabilities" value={money(liabilities)} hint="Company debt plus bank loans still owed." />
        <Figure label="Book value" value={money(m.equity)} hint="Assets less liabilities." />
        <Figure label="Monthly repayments" value={money(monthly(dossier.activeLoans))} />
      </dl>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Debt to assets</span>
          {share !== null && <span className="font-mono text-[14px] font-semibold text-ink">{(share * 100).toFixed(1)}%</span>}
        </div>
        {share === null ? (
          <p className="mt-2 text-[13px] text-ink-faint">Appears once the company owns something: cash, cars, land or a plant.</p>
        ) : (
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-raised" aria-hidden="true">
            <div className={`h-full rounded-full ${share >= 0.8 ? 'bg-bad' : share >= 0.5 ? 'bg-warn' : 'bg-good'}`} style={{ width: `${share * 100}%` }} />
          </div>
        )}
      </div>

      <LoanList loans={dossier.activeLoans}
        empty="No bank loans. Facilities you take from a bank appear here with what is left to repay." />
    </>
  );
}

const RATING_TONE: Record<string, string> = { AAA: 'text-good', AA: 'text-good', A: 'text-good', BBB: 'text-accent', BB: 'text-accent', B: 'text-accent' };

function ProfileCard({ kicker, title, dossier, missing, children }: { kicker: string; title: string; dossier: any; missing: string; children: React.ReactNode }) {
  return (
    <section aria-label={`${kicker} credit`} className="rounded-card border border-line bg-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{kicker}</div>
          <h3 className="mt-1 truncate text-[18px] font-semibold text-ink">{title}</h3>
        </div>
        {dossier?.ratingTier && (
          <div className="shrink-0 text-right">
            <div className={`font-serif text-3xl font-bold leading-none ${RATING_TONE[dossier.ratingTier] || 'text-bad'}`}>{dossier.ratingTier}</div>
            <div className="mt-1 text-[12px] text-ink-dim">Score {dossier.riskScore}/100</div>
          </div>
        )}
      </div>
      <div className="mt-4">
        {dossier ? children : <p className="text-[14px] text-ink-dim">{missing}</p>}
      </div>
    </section>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt>
        <div className="text-[13px] text-ink-dim">{label}</div>
        {hint && <div className="text-[12px] text-ink-faint">{hint}</div>}
      </dt>
      <dd className="font-mono text-[14px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

const FACILITY_NAME: Record<string, string> = {
  personal: 'Personal loan', revolver: 'Revolving credit', term: 'Term loan', trade: 'Trade finance',
};

function LoanList({ loans, empty }: { loans: any[] | undefined; empty: string }) {
  const rows = Array.isArray(loans) ? loans : [];
  return (
    <div className="mt-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Bank loans</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-faint">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rows.map((l: any) => {
            const defaulted = String(l.status).toUpperCase() === 'DEFAULTED';
            return (
              <li key={l.id} className="rounded-control border border-line bg-raised px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-medium text-ink">
                    {FACILITY_NAME[l.facility_type] || l.facility_type}
                    {defaulted && <span className="ml-2 text-[12px] font-semibold text-bad">Defaulted</span>}
                  </span>
                  <span className="font-mono text-[14px] font-semibold text-ink">{money(l.remaining_principal)}</span>
                </div>
                <div className="mt-0.5 flex flex-wrap justify-between gap-x-3 text-[12px] text-ink-dim">
                  <span>{money(l.monthly_payment)} a month{l.months_remaining != null ? ` · ${l.months_remaining} months left` : ''}</span>
                  <span>{(Number(l.interest_rate) * 100).toFixed(2)}% a year</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function money(v: unknown): string {
  const n = Math.round(Number(v) || 0);
  return `${n < 0 ? '−' : ''}$${Math.abs(n).toLocaleString('en-US')}`;
}
const owed = (loans: any[] | undefined) => (loans || []).reduce((s, l) => s + (Number(l.remaining_principal) || 0), 0);
const monthly = (loans: any[] | undefined) => (loans || []).filter(l => String(l.status).toUpperCase() !== 'DEFAULTED').reduce((s, l) => s + (Number(l.monthly_payment) || 0), 0);

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
