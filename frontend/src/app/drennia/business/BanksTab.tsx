'use client';
import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, TrendingUp, ArrowRight, Wallet, Activity, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const T = {
  bg: '#090A0F',
  panel: '#11131A',
  panelSoft: '#17151B',
  paper: '#1E1A15',
  border: '#2A2630',
  borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  faint: '#6B6358',
  mint: '#36D399',
  steel: '#4B6382',
  burgundy: '#8F3D3D',
  red: '#B85555',
};

type BankingTabId = 'dashboard' | 'personal' | 'corporate' | 'debt' | 'treasury';

export default function BanksTab({ company, onRefresh }: { company: any, onRefresh?: () => void }) {
  const [activeTab, setActiveTab] = useState<BankingTabId>('dashboard');
  
  const [personalDossier, setPersonalDossier] = useState<any>(null);
  const [corporateDossier, setCorporateDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (company && company.id) {
        promises.push(
          api.get(`/banks/dossier/${company.id}`).then(res => {
            if (mounted) setCorporateDossier(res.data);
          }).catch(err => {
            console.error('Failed to load corporate dossier:', err);
          })
        );
      }

      Promise.all(promises).then(() => {
        if (mounted) setLoading(false);
      });
    });

    return () => { mounted = false; };
  }, [company?.id]);

  const handleTakeLoan = async (type: 'personal' | 'corporate', facilityType: string, amount: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { api } = await import('@/lib/api');
      let res;
      if (type === 'personal') {
        res = await api.post(`/banks/loan/personal/take`, { facilityType, principalAmount: amount });
      } else {
        res = await api.post(`/banks/loan/${company.id}/take`, { facilityType, principalAmount: amount });
      }
      alert(`Loan Secured! Monthly Payment: $${res.data.monthlyPayment}`);
      if (onRefresh) onRefresh();
      
      // Re-fetch dossier
      if (type === 'personal') {
        const pd = await api.get('/banks/dossier/personal');
        setPersonalDossier(pd.data);
      } else {
        const cd = await api.get(`/banks/dossier/${company.id}`);
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

  const getChartData = (dossier: any) => {
    if (!dossier) return [];
    return [
      { month: 'M-5', score: Math.max(0, dossier.riskScore - 15) },
      { month: 'M-4', score: Math.max(0, dossier.riskScore - 12) },
      { month: 'M-3', score: Math.max(0, dossier.riskScore - 5) },
      { month: 'M-2', score: Math.min(100, dossier.riskScore + 8) },
      { month: 'M-1', score: Math.min(100, dossier.riskScore + 2) },
      { month: 'Now', score: dossier.riskScore },
    ];
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center w-full min-h-[500px]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Landmark size={32} className="text-terminal-amber opacity-50" />
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Accessing Banking Network...</div>
        </div>
      </div>
    );
  }

  const renderDossier = (type: 'personal' | 'corporate') => {
    const activeDossier = type === 'personal' ? personalDossier : corporateDossier;
    const chartData = getChartData(activeDossier);

    return (
      <div className="max-w-6xl space-y-6 animate-slide-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Card */}
          <div className="lg:col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none">
              <ShieldCheck size={200} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-6">
                {type === 'personal' ? 'Personal Credit Rating' : 'Corporate Credit Rating'}
              </div>
              
              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-6xl font-serif font-bold" style={{ color: getRatingColor(activeDossier?.ratingTier || 'D') }}>
                  {activeDossier?.ratingTier || 'N/A'}
                </div>
                <div className="text-sm font-mono text-zinc-400">
                  Score: {activeDossier?.riskScore || 0}/100
                </div>
              </div>
            </div>
            
            <div className="text-xs text-zinc-400 mt-6 leading-relaxed relative z-10">
              {type === 'personal' 
                ? 'Your personal rating affects consumer loan rates and background checks. Maintain high cash reserves to improve.'
                : 'Corporate rating governs bond yields, term loans, and covenant strictness. Operating profit is the primary driver.'}
            </div>
          </div>

          {/* Metrics Breakdown */}
          <div className="lg:col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-6">The 5 C's of Credit</div>
            <div className="space-y-4">
              <MetricRow label="Character" value={activeDossier?.metrics?.character?.toFixed(1) || '0.0'} desc="Reputation & History" />
              <MetricRow 
                label="Capacity" 
                value={`$${(activeDossier?.metrics?.capacity || 0).toLocaleString()}`} 
                desc="Cashflow & Liquidity" 
                alert={activeDossier?.metrics?.capacity < 0}
              />
              <MetricRow label="Capital" value={`$${(activeDossier?.metrics?.capital || 0).toLocaleString()}`} desc="Net Worth / Book Value" />
              <MetricRow label="Collateral" value={`$${(activeDossier?.metrics?.collateral || 0).toLocaleString()}`} desc="Asset Backing" />
              <MetricRow label="Conditions" value={activeDossier?.metrics?.conditions || 'Unknown'} desc="Macro Environment" />
            </div>
          </div>

          {/* Chart */}
          <div className="lg:col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-6 flex flex-col">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-6 flex items-center justify-between">
              <span>Rating Trajectory</span>
              <TrendingUp size={12} className="text-terminal-amber" />
            </div>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2630" vertical={false} />
                  <XAxis dataKey="month" stroke="#6B6358" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B6358" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E1A15', border: '1px solid #2A2630', fontSize: '12px' }}
                    itemStyle={{ color: '#C9A24A' }}
                  />
                  <Line type="monotone" dataKey="score" stroke="#C9A24A" strokeWidth={2} dot={{ fill: '#1E1A15', stroke: '#C9A24A', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <Wallet size={14} className="text-zinc-500" />
          <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-400">Available Credit Facilities</h3>
        </div>

        {/* Facilities List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {type === 'personal' ? (
            <>
              <FacilityCard 
                title="Personal Term Loan"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.06)*100).toFixed(1) : '?'}%`}
                desc="Unsecured standard term loan for personal use. 5-year amortization."
                amount={50000}
                type="personal"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => handleTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqRating={['AAA', 'AA', 'A', 'BBB', 'BB', 'B']}
              />
              <FacilityCard 
                title="Executive Line of Credit"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.04)*100).toFixed(1) : '?'}%`}
                desc="Revolving credit facility for high net worth individuals."
                amount={250000}
                type="personal"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => handleTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqRating={['AAA', 'AA', 'A']}
              />
            </>
          ) : (
            <>
              <FacilityCard 
                title="Senior Term Loan A (TLA)"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.04)*100).toFixed(1) : '?'}%`}
                desc="Fixed monthly amortizing loan over 3-5 years. Covenants include dividend block."
                amount={250000}
                type="tla"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => handleTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqRating={['AAA', 'AA', 'A', 'BBB', 'BB', 'B']}
                reqCapacity={0}
              />
              <FacilityCard 
                title="Growth Capital Loan"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.07)*100).toFixed(1) : '?'}%`}
                desc="For scaling proven brands. Requires minimum 50 Reputation score. Amortizing high yield debt."
                amount={100000}
                type="growth"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => handleTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqCharacter={50}
              />
              <FacilityCard 
                title="Distressed Bailout Facility"
                rate="22.0% Fixed"
                desc="Extreme risk mezzanine debt for severely distressed companies. High interest, strict covenants."
                amount={50000}
                type="distressed"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => handleTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                isDistressedOnly={true}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#090A0F]">
      {/* Top Navigation Bar for Banks */}
      <div className="flex items-center px-6 py-4 border-b border-zinc-800 bg-[#11131A] shrink-0">
        <Landmark size={18} className="text-terminal-amber mr-3" />
        <h2 className="font-serif text-xl font-bold text-zinc-100 m-0">Drennia National Bank</h2>
      </div>

      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        {/* ── INTERNAL SUB-NAV (LEFT SIDEBAR) ── */}
        <div className="flex md:flex-col gap-1.5 md:min-w-[220px] md:max-w-[220px] md:border-r border-zinc-800 pr-5 pt-5 overflow-x-auto bg-[#090A0F]">
          {(['dashboard', 'personal', 'corporate', 'debt', 'treasury'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const isLocked = tab === 'corporate' && !company;
            return (
              <button
                key={tab}
                disabled={isLocked}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-[12px] font-semibold text-left whitespace-nowrap rounded-r-md border-l-2 transition-colors cursor-pointer
                  ${isLocked ? 'text-zinc-700 bg-transparent border-transparent cursor-not-allowed'
                  : isActive
                    ? 'text-terminal-amber bg-terminal-amber/10 border-terminal-amber'
                    : 'text-zinc-500 bg-transparent border-transparent hover:text-zinc-300 hover:bg-zinc-800/40'}`}
              >
                {tab === 'dashboard' ? 'Overview' : 
                 tab === 'personal' ? 'Personal Credit' : 
                 tab === 'corporate' ? 'Corporate Credit' : 
                 tab === 'debt' ? 'Debt Schedule' : 'Treasury & Deposits'}
                 {isLocked && ' 🔒'}
              </button>
            );
          })}
        </div>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#090A0F]">
          {activeTab === 'dashboard' && (
            <div className="max-w-4xl space-y-6 animate-slide-in">
              <h3 className="font-serif text-2xl font-bold text-zinc-100">Financial Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Summary */}
                <div className="bg-[#11131A] border border-zinc-800 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Personal Profile</div>
                    <Target size={14} className="text-zinc-600" />
                  </div>
                  <div className="text-4xl font-serif font-bold mb-1" style={{ color: getRatingColor(personalDossier?.ratingTier || 'D') }}>
                    {personalDossier?.ratingTier || 'N/A'}
                  </div>
                  <div className="text-xs text-zinc-400">Score: {personalDossier?.riskScore || 0}/100</div>
                  <div className="mt-4 pt-4 border-t border-zinc-800/50">
                    <button onClick={() => setActiveTab('personal')} className="text-xs text-terminal-amber hover:text-zinc-300 flex items-center gap-1 transition-colors">
                      View Credit Dossier <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
                
                {/* Corporate Summary */}
                <div className={`bg-[#11131A] border border-zinc-800 rounded-lg p-6 ${!company ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Corporate Profile</div>
                    <Activity size={14} className="text-zinc-600" />
                  </div>
                  {company ? (
                    <>
                      <div className="text-4xl font-serif font-bold mb-1" style={{ color: getRatingColor(corporateDossier?.ratingTier || 'D') }}>
                        {corporateDossier?.ratingTier || 'N/A'}
                      </div>
                      <div className="text-xs text-zinc-400">Score: {corporateDossier?.riskScore || 0}/100</div>
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <button onClick={() => setActiveTab('corporate')} className="text-xs text-terminal-amber hover:text-zinc-300 flex items-center gap-1 transition-colors">
                          View Commercial Facilities <ArrowRight size={12} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col h-full justify-center">
                      <div className="text-sm text-zinc-500 mb-2">No active company registered.</div>
                      <div className="text-xs text-zinc-600">Start a business to unlock corporate banking.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personal' && renderDossier('personal')}
          {activeTab === 'corporate' && company && renderDossier('corporate')}

          {activeTab === 'debt' && (
            <div className="max-w-4xl space-y-6 animate-slide-in">
              <h3 className="font-serif text-2xl font-bold text-zinc-100">Debt Schedule</h3>
              <div className="bg-[#11131A] border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
                <Activity size={32} className="text-zinc-800 mb-4" />
                <div className="text-zinc-500 text-sm">No active debt facilities.</div>
                <div className="text-zinc-600 text-xs mt-2">Active loans will appear here.</div>
              </div>
            </div>
          )}

          {activeTab === 'treasury' && (
            <div className="max-w-4xl space-y-6 animate-slide-in">
              <h3 className="font-serif text-2xl font-bold text-zinc-100">Treasury & Deposits</h3>
              <div className="bg-[#11131A] border border-zinc-800 border-dashed rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
                <Wallet size={32} className="text-zinc-800 mb-4" />
                <div className="text-zinc-500 text-sm">Treasury services are currently unavailable.</div>
                <div className="text-zinc-600 text-xs mt-2">High-yield deposits and CDs coming in a future update.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, desc, alert = false }: { label: string, value: string, desc: string, alert?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
      <div>
        <div className="text-[11px] text-zinc-300 font-medium">{label}</div>
        <div className="text-[9px] text-zinc-500">{desc}</div>
      </div>
      <div className={`text-[12px] font-mono font-bold ${alert ? 'text-[#B85555]' : 'text-[#F4EBD6]'}`}>
        {value}
      </div>
    </div>
  );
}

function FacilityCard({ 
  title, rate, desc, amount, type, dossier, onApply, isSubmitting, 
  reqRating, reqCharacter, reqCapacity, isDistressedOnly 
}: any) {
  
  let disabledReason = null;
  
  if (!dossier) disabledReason = "Loading...";
  else if (reqRating && !reqRating.includes(dossier.ratingTier)) disabledReason = "Rating Too Low";
  else if (reqCharacter !== undefined && dossier.metrics.character < reqCharacter) disabledReason = "Reputation Too Low";
  else if (reqCapacity !== undefined && dossier.metrics.capacity < reqCapacity) disabledReason = "Negative Cashflow";
  else if (isDistressedOnly && (dossier.metrics.capacity >= 0 && dossier.ratingTier !== 'D' && dossier.ratingTier !== 'CCC')) disabledReason = "Not Distressed";

  return (
    <div className={`bg-[#1E1A15] border ${isDistressedOnly ? 'border-[#8F3D3D]' : 'border-[#2A2630]'} p-5 rounded-lg flex flex-col`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`text-sm font-bold ${isDistressedOnly ? 'text-[#ff8888]' : 'text-[#F4EBD6]'}`}>{title}</div>
        <div className={`text-xs font-mono font-bold ${isDistressedOnly ? 'text-[#ff8888]' : 'text-[#36D399]'}`}>{rate}</div>
      </div>
      <div className="text-[11px] text-[#A79D8C] mb-6 flex-1 leading-relaxed">{desc}</div>
      
      {disabledReason ? (
        <button disabled className="w-full bg-[#11131A] border border-zinc-800 text-zinc-600 py-2.5 text-[10px] font-mono uppercase tracking-widest rounded cursor-not-allowed">
          {disabledReason}
        </button>
      ) : (
        <button 
          onClick={() => onApply(type, amount)}
          disabled={isSubmitting}
          className={`w-full py-2.5 text-[10px] font-mono uppercase tracking-widest rounded transition-colors ${
            isDistressedOnly 
              ? 'bg-[#8F3D3D]/10 border border-[#8F3D3D] text-[#ff8888] hover:bg-[#8F3D3D]/30'
              : 'bg-terminal-amber/10 border border-terminal-amber text-terminal-amber hover:bg-terminal-amber/20'
          } ${isSubmitting ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isSubmitting ? 'Processing...' : `Apply for $${(amount/1000).toFixed(0)}k`}
        </button>
      )}
    </div>
  );
}
