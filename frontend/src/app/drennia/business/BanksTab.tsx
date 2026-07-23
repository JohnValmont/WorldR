'use client';
import React, { useState, useEffect } from 'react';
import { Card, Button, PageShell, Badge, SectionHeading } from '@/components/ui';
import { Building2, User, Landmark, ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';
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

type BankingMode = 'personal' | 'corporate';

export default function BanksTab({ company, onRefresh }: { company: any, onRefresh?: () => void }) {
  const [mode, setMode] = useState<BankingMode>(company ? 'corporate' : 'personal');
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  
  const [personalDossier, setPersonalDossier] = useState<any>(null);
  const [corporateDossier, setCorporateDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // If company drops out, force back to personal
  useEffect(() => {
    if (!company && mode === 'corporate') {
      setMode('personal');
    }
  }, [company, mode]);

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

  const activeDossier = mode === 'personal' ? personalDossier : corporateDossier;

  const handleTakeLoan = async (facilityType: string, amount: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { api } = await import('@/lib/api');
      let res;
      if (mode === 'personal') {
        res = await api.post(`/banks/loan/personal/take`, { facilityType, principalAmount: amount });
      } else {
        res = await api.post(`/banks/loan/${company.id}/take`, { facilityType, principalAmount: amount });
      }
      alert(`Loan Secured! Monthly Payment: $${res.data.monthlyPayment}`);
      if (onRefresh) onRefresh();
      
      // Re-fetch dossier
      if (mode === 'personal') {
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

  // Generate some fake historical data based on current score for the chart, 
  // since we don't have historical API yet, we'll make it look cool and dynamic.
  const chartData = activeDossier ? [
    { month: 'M-5', score: Math.max(0, activeDossier.riskScore - 15) },
    { month: 'M-4', score: Math.max(0, activeDossier.riskScore - 12) },
    { month: 'M-3', score: Math.max(0, activeDossier.riskScore - 5) },
    { month: 'M-2', score: Math.min(100, activeDossier.riskScore + 8) },
    { month: 'M-1', score: Math.min(100, activeDossier.riskScore + 2) },
    { month: 'Now', score: activeDossier.riskScore },
  ] : [];

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

  return (
    <div className="flex flex-col h-full bg-[#090A0F]">
      {/* Top Navigation Bar for Banks */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#11131A] shrink-0">
        <div className="flex items-center gap-3">
          <Landmark size={18} className="text-terminal-amber" />
          <h2 className="font-serif text-xl font-bold text-zinc-100 m-0">Banking & Finance</h2>
        </div>
        <div className="flex gap-2 p-1 bg-black/40 rounded border border-zinc-800">
          <button
            onClick={() => setMode('personal')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition-colors ${
              mode === 'personal' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User size={12} />
            Personal
          </button>
          {company && (
            <button
              onClick={() => setMode('corporate')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition-colors ${
                mode === 'corporate' ? 'bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/30' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Building2 size={12} />
              Corporate
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {/* Dossier Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Score Card */}
            <div className="lg:col-span-1 bg-[#11131A] border border-zinc-800 rounded-lg p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none">
                <ShieldCheck size={200} />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-6">
                  {mode === 'personal' ? 'Personal Credit Rating' : 'Corporate Credit Rating'}
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
                {mode === 'personal' 
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
            <Landmark size={14} className="text-zinc-500" />
            <h3 className="font-mono text-xs uppercase tracking-widest text-zinc-400">Available Credit Facilities</h3>
          </div>

          {/* Facilities List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {mode === 'personal' ? (
              <>
                <FacilityCard 
                  title="Personal Term Loan"
                  rate={`${activeDossier ? ((activeDossier.baseRate + 0.06)*100).toFixed(1) : '?'}%`}
                  desc="Unsecured standard term loan for personal use. 5-year amortization."
                  amount={50000}
                  type="personal"
                  dossier={activeDossier}
                  onApply={(t: string, a: number) => handleTakeLoan(t, a)}
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
                  onApply={(t: string, a: number) => handleTakeLoan(t, a)}
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
                  onApply={(t: string, a: number) => handleTakeLoan(t, a)}
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
                  onApply={(t: string, a: number) => handleTakeLoan(t, a)}
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
                  onApply={(t: string, a: number) => handleTakeLoan(t, a)}
                  isSubmitting={isSubmitting}
                  isDistressedOnly={true}
                />
              </>
            )}

          </div>

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
      <div className="text-[11px] text-[#A79D8C] mb-6 flex-1">{desc}</div>
      
      {disabledReason ? (
        <button disabled className="w-full bg-transparent border border-zinc-800 text-zinc-600 py-2 text-[10px] font-mono uppercase tracking-widest rounded cursor-not-allowed">
          {disabledReason}
        </button>
      ) : (
        <button 
          onClick={() => onApply(type, amount)}
          disabled={isSubmitting}
          className={`w-full py-2 text-[10px] font-mono uppercase tracking-widest rounded transition-colors ${
            isDistressedOnly 
              ? 'bg-transparent border border-[#8F3D3D] text-[#ff8888] hover:bg-[#8F3D3D]/20'
              : 'bg-[#11131A] border border-[#C9A24A] text-[#C9A24A] hover:bg-[#C9A24A]/10'
          } ${isSubmitting ? 'opacity-50 cursor-wait' : ''}`}
        >
          {isSubmitting ? 'Processing...' : `Apply for $${(amount/1000).toFixed(0)}k`}
        </button>
      )}
    </div>
  );
}
