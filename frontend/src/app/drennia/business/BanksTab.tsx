'use client';
import React, { useState, useEffect } from 'react';
import { Landmark, ShieldCheck, TrendingUp, ArrowRight, Wallet, Activity, Target, Building2, User, ChevronLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center w-full min-h-[500px] bg-[#090A0F]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Landmark size={32} className="text-terminal-amber opacity-50" />
          <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-widest">Accessing Financial District...</div>
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
            company={company}
            playerCash={playerCash}
            personalDossier={personalDossier}
            corporateDossier={corporateDossier}
            onBack={() => setSelectedBankId(null)}
            onTakeLoan={handleTakeLoan}
            isSubmitting={isSubmitting}
            getRatingColor={getRatingColor}
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
          company={company}
          personalDossier={personalDossier}
          corporateDossier={corporateDossier}
          getRatingColor={getRatingColor}
        />
      );
    }

    if (activeSidebarTab === 'debt') {
      return (
        <div className="p-6 md:p-8 max-w-5xl space-y-6 animate-slide-in">
          <h3 className="font-serif text-2xl font-bold text-zinc-100">Active Debt Schedule</h3>
          <div className="bg-[#11131A] border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Activity size={32} className="text-zinc-800 mb-4" />
            <div className="text-zinc-500 text-sm">No active debt facilities.</div>
          </div>
        </div>
      );
    }

    if (activeSidebarTab === 'treasury') {
      return (
        <div className="p-6 md:p-8 max-w-5xl space-y-6 animate-slide-in">
          <h3 className="font-serif text-2xl font-bold text-zinc-100">Treasury & Wealth</h3>
          <div className="bg-[#11131A] border border-zinc-800 rounded-lg p-8 flex flex-col items-center justify-center min-h-[300px]">
            <Wallet size={32} className="text-zinc-800 mb-4" />
            <div className="text-zinc-500 text-sm">Wealth management systems are currently offline.</div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full bg-[#090A0F]">
      {/* Optional Top Bar if needed, but since it's full screen, it's covered by sidebar layout */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        
        {/* ── MASTER SIDEBAR ── */}
        <div className="flex md:flex-col gap-1.5 md:min-w-[220px] md:max-w-[220px] md:border-r border-zinc-800 pr-5 pt-5 overflow-x-auto bg-[#090A0F] shrink-0">
          <div className="px-4 mb-6 flex items-center gap-2">
            <Landmark size={18} className="text-terminal-amber" />
            <span className="font-serif text-lg font-bold text-zinc-100 uppercase tracking-widest text-[13px]">Financial District</span>
          </div>
          
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
                className={`px-4 py-3 text-[12px] font-semibold text-left whitespace-nowrap rounded-r-md border-l-2 transition-colors cursor-pointer
                  ${isActive
                    ? 'bg-zinc-800/40 text-terminal-amber border-terminal-amber'
                    : 'text-zinc-500 bg-transparent border-transparent hover:text-zinc-300 hover:bg-zinc-800/20'}`}
              >
                {tab === 'institutions' ? 'Banking Institutions' : 
                 tab === 'profile' ? 'Financial Profile' : 
                 tab === 'debt' ? 'Active Debt Schedule' : 
                 'Treasury & Wealth'}
              </button>
            );
          })}
        </div>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 overflow-y-auto bg-[#090A0F]">
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
    <div className="flex flex-col animate-slide-in w-full pb-10 p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      
      <div>
        <h2 className="font-serif text-2xl font-bold text-zinc-100 mb-2">Banking Institutions</h2>
        <p className="text-sm text-zinc-400">Select an institution to view their specific lending facilities and requirements.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank: any) => (
          <div 
            key={bank.id} 
            className="bg-[#11131A] border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors cursor-pointer group relative overflow-hidden flex flex-col"
            onClick={() => onSelectBank(bank.id)}
          >
            {/* Hover flare */}
            <div className="absolute -inset-10 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" style={{ background: `radial-gradient(circle, ${bank.color} 0%, transparent 70%)` }} />
            
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-10 h-10 rounded bg-[#1E1A15] border border-zinc-800 flex items-center justify-center shadow-inner" style={{ color: bank.color }}>
                <Landmark size={20} />
              </div>
              <div className="font-serif font-bold text-zinc-100 text-lg leading-tight">{bank.name}</div>
            </div>
            
            <div className="text-xs text-zinc-400 mb-6 flex-1 relative z-10 leading-relaxed">
              {bank.description}
            </div>
            
            <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center relative z-10">
              <span className="text-[10px] font-mono uppercase text-zinc-500">Enter Portal</span>
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
  // Fake some values for the Radar Chart if they don't exist
  const radarData = [
    { subject: 'Character', value: Math.max(10, Math.min(100, personalDossier?.metrics?.character || 50)) },
    { subject: 'Capacity', value: Math.max(10, Math.min(100, ((personalDossier?.metrics?.capacity || 0) + (corporateDossier?.metrics?.capacity || 0)) / 50000)) },
    { subject: 'Capital', value: Math.max(10, Math.min(100, ((personalDossier?.metrics?.capital || 0) + (corporateDossier?.metrics?.capital || 0)) / 2000000)) },
    { subject: 'Collateral', value: Math.max(10, Math.min(100, ((personalDossier?.metrics?.collateral || 0) + (corporateDossier?.metrics?.collateral || 0)) / 2000000)) },
    { subject: 'Conditions', value: 65 }, // Macro hardcoded
  ];

  // Pie chart data
  const totalAssets = Math.max(0, (personalDossier?.metrics?.capital || 0) + (corporateDossier?.metrics?.capital || 0));
  const pieData = [
    { name: 'Equity / Cash', value: totalAssets || 100000 },
    { name: 'Liabilities', value: 0 }, // Fake liabilities since we don't have debt loaded in dossier yet
  ];
  const COLORS = [T.mint, T.red];

  return (
    <div className="flex flex-col animate-slide-in w-full pb-10 p-6 md:p-8 max-w-7xl mx-auto space-y-10">
      <div>
        <h2 className="font-serif text-2xl font-bold text-zinc-100 mb-2">Unified Credit Profile</h2>
        <p className="text-sm text-zinc-400">Your consolidated financial health and credit standing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Scores */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="bg-[#11131A] border border-zinc-800 rounded-lg p-6 flex-1 flex flex-col justify-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Personal Rating</div>
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-serif font-bold" style={{ color: getRatingColor(personalDossier?.ratingTier || 'D') }}>
                {personalDossier?.ratingTier || 'N/A'}
              </div>
              <div className="text-xs text-zinc-400">Score: {personalDossier?.riskScore || 0}/100</div>
            </div>
          </div>
          <div className={`bg-[#11131A] border border-zinc-800 rounded-lg p-6 flex-1 flex flex-col justify-center ${!company ? 'opacity-50 grayscale' : ''}`}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Corporate Rating</div>
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
        <div className="col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center min-h-[250px]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2 w-full text-center">The 5 C's (Consolidated)</div>
          <div className="w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#2A2630" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#A79D8C', fontSize: 9 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Credit" dataKey="value" stroke={T.gold} fill={T.gold} fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center min-h-[250px]">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2 w-full text-center">Debt to Asset Ratio</div>
          <div className="w-full flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E1A15', border: '1px solid #2A2630', fontSize: '11px', color: '#F4EBD6' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center text manually */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
              <span className="text-[10px] font-mono text-zinc-500">NET WORTH</span>
              <span className="text-sm font-bold text-zinc-200">${(totalAssets).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK PORTAL
// ─────────────────────────────────────────────────────────────────────────────
function BankPortal({ bank, company, playerCash, personalDossier, corporateDossier, onBack, onTakeLoan, isSubmitting, getRatingColor }: any) {
  const [activeTab, setActiveTab] = useState<'accounts' | 'credit' | 'products'>('accounts');
  const [productsSubTab, setProductsSubTab] = useState<'personal' | 'corporate'>('personal');

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

  const renderAccounts = () => {
    return (
      <div className="w-full space-y-6 animate-slide-in mt-6">
        <h3 className="font-serif text-xl text-zinc-100">Deposit Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#11131A] border border-zinc-800 rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Personal Checking</div>
              <div className="text-3xl font-serif font-bold text-zinc-100">
                ${(playerCash || 0).toLocaleString()}
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button className="flex-1 bg-[#1E1A15] hover:bg-[#2A2630] border border-zinc-700 py-2 rounded text-[10px] font-mono uppercase tracking-widest text-zinc-300 transition-colors">Transfer</button>
              <button className="flex-1 bg-[#1E1A15] hover:bg-[#2A2630] border border-zinc-700 py-2 rounded text-[10px] font-mono uppercase tracking-widest text-zinc-300 transition-colors">Pay Bills</button>
            </div>
          </div>
          
          <div className={`bg-[#11131A] border border-zinc-800 rounded-lg p-6 flex flex-col justify-between ${!company ? 'opacity-50 grayscale' : ''}`}>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Business Operating Account</div>
              <div className="text-3xl font-serif font-bold text-zinc-100">
                {company ? `$${(company.finances?.available_cash || 0).toLocaleString()}` : 'No Active Account'}
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button disabled={!company} className="flex-1 bg-[#1E1A15] hover:bg-[#2A2630] border border-zinc-700 py-2 rounded text-[10px] font-mono uppercase tracking-widest text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Transfer</button>
              <button disabled={!company} className="flex-1 bg-[#1E1A15] hover:bg-[#2A2630] border border-zinc-700 py-2 rounded text-[10px] font-mono uppercase tracking-widest text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Payroll</button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-serif text-xl text-zinc-100 mb-4">Recent Activity</h3>
          <div className="bg-[#11131A] border border-zinc-800 rounded-lg flex flex-col items-center justify-center min-h-[150px] p-6 text-center">
            <Activity size={24} className="text-zinc-700 mb-2" />
            <div className="text-sm text-zinc-500">No recent transactions.</div>
          </div>
        </div>
      </div>
    );
  };

  const renderCredit = () => {
    return (
      <div className="w-full space-y-6 animate-slide-in mt-6">
        <h3 className="font-serif text-xl text-zinc-100">Active Debt Facilities</h3>
        <div className="bg-[#11131A] border border-zinc-800 rounded-lg flex flex-col items-center justify-center min-h-[250px] p-6 text-center">
          <Wallet size={32} className="text-zinc-700 mb-4" />
          <div className="text-sm text-zinc-400 mb-2">No active loans with {bank.name}.</div>
          <div className="text-xs text-zinc-600">Navigate to Products & Offers to apply for credit facilities.</div>
        </div>
      </div>
    );
  };

  const renderDossier = (type: 'personal' | 'corporate') => {
    const activeDossier = type === 'personal' ? personalDossier : corporateDossier;
    const chartData = getChartData(activeDossier);
    const availableFacilities = bank.facilities.filter((f: string) => 
      (type === 'personal' && ['personal', 'executive'].includes(f)) ||
      (type === 'corporate' && ['tla', 'growth', 'distressed'].includes(f))
    );

    return (
      <div className="w-full space-y-6 animate-slide-in mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Score Card */}
          <div className="lg:col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-10 -right-10 p-4 opacity-[0.03] pointer-events-none">
              <ShieldCheck size={200} />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-6">
                {type === 'personal' ? 'Personal Rating' : 'Corporate Rating'}
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
              <TrendingUp size={12} style={{ color: bank.color }} />
            </div>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2630" vertical={false} />
                  <XAxis dataKey="month" stroke="#6B6358" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B6358" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E1A15', border: '1px solid #2A2630', fontSize: '12px' }}
                    itemStyle={{ color: bank.color }}
                  />
                  <Line type="monotone" dataKey="score" stroke={bank.color} strokeWidth={2} dot={{ fill: '#1E1A15', stroke: bank.color, strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2">
          <Wallet size={14} className="text-zinc-500" />
          <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-400">Available Facilities</h3>
        </div>

        {/* Facilities List */}
        {availableFacilities.length === 0 ? (
          <div className="bg-[#1E1A15] border border-zinc-800 p-8 rounded-lg flex flex-col items-center justify-center">
            <ShieldCheck size={24} className="text-zinc-600 mb-2" />
            <div className="text-sm text-zinc-400">This institution does not offer {type} loan facilities.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableFacilities.includes('personal') && (
              <FacilityCard 
                title="Personal Term Loan"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.06)*100).toFixed(1) : '?'}%`}
                desc="Unsecured standard term loan for personal use. 5-year amortization."
                amount={50000}
                type="personal"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => onTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqRating={['AAA', 'AA', 'A', 'BBB', 'BB', 'B']}
                accentColor={bank.color}
              />
            )}
            {availableFacilities.includes('executive') && (
              <FacilityCard 
                title="Executive Line of Credit"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.04)*100).toFixed(1) : '?'}%`}
                desc="Revolving credit facility for high net worth individuals."
                amount={250000}
                type="personal" // Backend still uses 'personal' endpoint
                dossier={activeDossier}
                onApply={(facType: string, a: number) => onTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqRating={['AAA', 'AA', 'A']}
                accentColor={bank.color}
              />
            )}
            {availableFacilities.includes('tla') && (
              <FacilityCard 
                title="Senior Term Loan A (TLA)"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.04)*100).toFixed(1) : '?'}%`}
                desc="Fixed monthly amortizing loan over 3-5 years. Covenants include dividend block."
                amount={250000}
                type="tla"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => onTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqRating={['AAA', 'AA', 'A', 'BBB', 'BB', 'B']}
                reqCapacity={0}
                accentColor={bank.color}
              />
            )}
            {availableFacilities.includes('growth') && (
              <FacilityCard 
                title="Growth Capital Loan"
                rate={`${activeDossier ? ((activeDossier.baseRate + 0.07)*100).toFixed(1) : '?'}%`}
                desc="For scaling proven brands. Requires minimum 50 Reputation score. Amortizing high yield debt."
                amount={100000}
                type="growth"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => onTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                reqCharacter={50}
                accentColor={bank.color}
              />
            )}
            {availableFacilities.includes('distressed') && (
              <FacilityCard 
                title="Distressed Bailout Facility"
                rate="22.0% Fixed"
                desc="Extreme risk mezzanine debt for severely distressed companies. High interest, strict covenants."
                amount={50000}
                type="distressed"
                dossier={activeDossier}
                onApply={(facType: string, a: number) => onTakeLoan(type, facType, a)}
                isSubmitting={isSubmitting}
                isDistressedOnly={true}
                accentColor={bank.color}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-slide-in p-6 md:p-8 max-w-7xl mx-auto w-full">
      
      {/* Top Navigation Bar for Specific Bank */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-zinc-800 pb-6 mb-6">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="mr-4 p-2 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-zinc-100 flex items-center justify-center border border-zinc-700"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-10 h-10 rounded border border-zinc-800 flex items-center justify-center mr-4 bg-[#090A0F]" style={{ color: bank.color }}>
            <Landmark size={20} />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold text-zinc-100 m-0 leading-tight">
              {bank.name}
            </h2>
            <div className="text-[11px] font-mono uppercase tracking-[0.1em] text-zinc-500 mt-1">
              Base Lending Rate: {((personalDossier?.baseRate || 0.05)*100).toFixed(1)}%
            </div>
          </div>
        </div>
        
        {/* Horizontal Sub-tabs inside the bank portal */}
        <div className="flex bg-[#11131A] p-1 rounded-md border border-zinc-800 mt-4 lg:mt-0">
          <button 
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${activeTab === 'accounts' ? 'bg-[#2A2630] text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Accounts
          </button>
          <button 
            onClick={() => setActiveTab('credit')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${activeTab === 'credit' ? 'bg-[#2A2630] text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Credit & Loans
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${activeTab === 'products' ? 'bg-[#2A2630] text-zinc-100 shadow' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Products & Offers
          </button>
        </div>
      </div>

      <div className="text-sm text-zinc-400 max-w-3xl leading-relaxed">
        "{bank.description}"
      </div>

      {activeTab === 'accounts' && renderAccounts()}
      {activeTab === 'credit' && renderCredit()}
      
      {activeTab === 'products' && (
        <div className="mt-8 animate-slide-in">
          <div className="flex border-b border-zinc-800 mb-6">
            <button 
              onClick={() => setProductsSubTab('personal')}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${productsSubTab === 'personal' ? 'border-terminal-amber text-terminal-amber' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Personal Lending
            </button>
            <button 
              disabled={!company}
              onClick={() => setProductsSubTab('corporate')}
              className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${!company ? 'text-zinc-700 cursor-not-allowed border-transparent' : productsSubTab === 'corporate' ? 'border-terminal-amber text-terminal-amber' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
              Commercial Lending {!company && '🔒'}
            </button>
          </div>
          
          {productsSubTab === 'personal' && renderDossier('personal')}
          {productsSubTab === 'corporate' && company && renderDossier('corporate')}
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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
  reqRating, reqCharacter, reqCapacity, isDistressedOnly, accentColor
}: any) {
  
  let disabledReason = null;
  
  if (!dossier) disabledReason = "Loading...";
  else if (reqRating && !reqRating.includes(dossier.ratingTier)) disabledReason = "Rating Too Low";
  else if (reqCharacter !== undefined && dossier.metrics.character < reqCharacter) disabledReason = "Reputation Too Low";
  else if (reqCapacity !== undefined && dossier.metrics.capacity < reqCapacity) disabledReason = "Negative Cashflow";
  else if (isDistressedOnly && (dossier.metrics.capacity >= 0 && dossier.ratingTier !== 'D' && dossier.ratingTier !== 'CCC')) disabledReason = "Not Distressed";

  return (
    <div className={`bg-[#1E1A15] border ${isDistressedOnly ? 'border-[#8F3D3D]' : 'border-[#2A2630]'} p-5 rounded-lg flex flex-col hover:border-zinc-700 transition-colors`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`text-sm font-bold ${isDistressedOnly ? 'text-[#ff8888]' : 'text-[#F4EBD6]'}`}>{title}</div>
        <div className={`text-xs font-mono font-bold ${isDistressedOnly ? 'text-[#ff8888]' : ''}`} style={{ color: !isDistressedOnly ? accentColor : undefined }}>{rate}</div>
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
          className={`w-full py-2.5 text-[10px] font-mono uppercase tracking-widest rounded transition-all shadow-sm
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
