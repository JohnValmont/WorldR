'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatCard from '../../../components/ui/StatCard';
import GaugeBar from '../../../components/ui/GaugeBar';
import BarChart from '../../../components/charts/BarChart';
import ModalOverlay from '../../../components/ui/ModalOverlay';

const VALDORIA_ID = KELDORIA_ID;

const TAX_COLORS: Record<string, string> = {
  'Income Tax': '#f59e0b', 'Corporate Tax': '#3b82f6', 'Sales Tax': '#a78bfa',
  'Property Tax': '#34d399', 'Tariffs': '#f97316'
};
const BUDGET_COLORS: Record<string, string> = {
  'Education': '#60a5fa', 'Healthcare': '#34d399', 'Infrastructure': '#f59e0b',
  'Welfare': '#fb923c', 'Administration': '#94a3b8'
};

function fmt(n: number) {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

export default function BudgetPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || VALDORIA_ID;
  const [state, setState] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [taxEdits, setTaxEdits] = useState<Record<string, number>>({});
  const [budgetEdits, setBudgetEdits] = useState<Record<string, number>>({});

  // Drafting Bill State
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftTaxes, setDraftTaxes] = useState<Record<string, number>>({});
  const [draftBudgets, setDraftBudgets] = useState<Record<string, number>>({});

  useEffect(() => {
    nationApi.getState(nationId).then(r => {
      setState(r.data);
      
      const te: Record<string, number> = {};
      (r.data.taxes || []).forEach((t: any) => { te[t.name] = Number(t.rate) * 100; });
      setTaxEdits(te);
      setDraftTaxes(te); // Sync draft start point
      
      const be: Record<string, number> = {};
      (r.data.budgetItems || []).forEach((b: any) => { be[b.name] = Number(b.allocation) / 1e6; });
      setBudgetEdits(be);
      setDraftBudgets(be); // Sync draft start point
    }).catch(() => {});
  }, [nationId]);

  const handleDraftSubmit = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const taxesPayload = Object.entries(draftTaxes).map(([name, rate]) => ({ name, rate: rate / 100 }));
      const budgetsPayload = Object.entries(draftBudgets).map(([name, allocation]) => ({ name, allocation: allocation * 1e6 }));
      await nationApi.updateBudget(nationId, { taxes: taxesPayload, budgets: budgetsPayload });
      setSaveMsg('✓ PROPOSED TO PARLIAMENT');
      setShowDraftModal(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSaveMsg('✕ ' + (err?.response?.data?.error || 'Failed to submit bill'));
    } finally {
      setSaving(false);
    }
  };

  const taxes: any[] = state?.taxes || [];
  const budgetItems: any[] = state?.budgetItems || [];
  const laws: any[] = state?.laws || [];
  const nation = state?.nation;

  const activeProposal = laws.find((l: any) => l.title === 'Fiscal Policy Proposal' && l.status === 'proposed');

  // Parse proposed values from description metadata if activeProposal exists
  let proposedTaxesMap: Record<string, number> = {};
  let proposedBudgetsMap: Record<string, number> = {};
  let proposalTicksRun = 1;
  
  if (activeProposal?.description) {
    try {
      const match = activeProposal.description.match(/\[METADATA:(.*)\]/);
      if (match) {
        const parsed = JSON.parse(match[1]);
        if (parsed && parsed.type === 'budget_policy') {
          proposalTicksRun = parsed.voting_ticks_run || 1;
          (parsed.taxes || []).forEach((t: any) => {
            proposedTaxesMap[t.name] = t.rate * 100;
          });
          (parsed.budgets || []).forEach((b: any) => {
            proposedBudgetsMap[b.name] = b.allocation / 1e6;
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse metadata in frontend:', e);
    }
  }

  const totalRevenue = taxes.reduce((a: number, t: any) => a + Number(t.revenue), 0);
  const totalSpending = budgetItems.reduce((a: number, b: any) => a + Number(b.allocation), 0);
  const deficit = totalSpending - totalRevenue;

  const budgetData = budgetItems.map((b: any) => ({
    name: b.name, value: Number(b.allocation) / 1e6, color: BUDGET_COLORS[b.name] || '#6b7280'
  }));

  // live draft forecasts inside the modal
  let draftRevenue = 0;
  taxes.forEach((t: any) => {
    const currentRate = Number(t.rate) * 100;
    const proposedRate = draftTaxes[t.name] ?? currentRate;
    const currentRev = Number(t.revenue);
    const estRev = currentRate > 0 ? (proposedRate / currentRate) * currentRev : (proposedRate / 100) * (Number(state?.nation?.gdp || 0) / 5);
    draftRevenue += estRev;
  });

  let draftSpending = 0;
  budgetItems.forEach((b: any) => {
    const proposedAlloc = (draftBudgets[b.name] ?? (Number(b.allocation) / 1e6)) * 1e6;
    draftSpending += proposedAlloc;
  });
  // Add interest spending on national debt (which is totalSpending - original allocations sum)
  const originalAllocationsSum = budgetItems.reduce((a: number, b: any) => a + Number(b.allocation), 0);
  const interestSpending = Math.max(0, totalSpending - originalAllocationsSum);
  draftSpending += interestSpending;

  const draftDeficit = draftSpending - draftRevenue;
  const currentYear = nation ? 850 + Math.floor(Number(nation.currentTick || 0) / 12) : 850;

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Centered Government Title matching user target */}
      <div className="text-center space-y-1 py-4 border-b border-zinc-900/60 max-w-xl mx-auto mb-6">
        <h1 className="text-amber-400 font-black text-2xl uppercase tracking-widest glow-text-amber font-mono">
          GOVERNMENT BUDGET {currentYear} AE
        </h1>
        <p className="text-zinc-500 text-[10px] uppercase font-mono tracking-widest leading-none">
          NATIONAL BALANCE SHEET & FISCAL POLICY COCKPIT
        </p>
      </div>

      {/* Centered Propose Button */}
      <div className="flex flex-col items-center justify-center gap-2 mb-6">
        {saveMsg && <span className={`text-[10px] font-mono ${saveMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{saveMsg}</span>}
        <button
          onClick={() => {
            // Reset draft to current values on open
            const te: Record<string, number> = {};
            taxes.forEach((t: any) => { te[t.name] = Number(t.rate) * 100; });
            setDraftTaxes(te);
            
            const be: Record<string, number> = {};
            budgetItems.forEach((b: any) => { be[b.name] = Number(b.allocation) / 1e6; });
            setDraftBudgets(be);

            setShowDraftModal(true);
          }}
          className="btn-premium-primary py-2 px-6 font-mono font-bold tracking-[0.2em] text-[10px]"
          id="propose-fiscal-btn"
        >
          🏛️ PROPOSE FISCAL REFORM BILL
        </button>
      </div>

      {/* Grid of 6 Compact Stat Cards: GDP, Budget, Revenue, Expenditure, Balance, Debt */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="GDP Rating" value={fmt(Number(nation?.gdp || 0))} color="blue" />
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} color="green" />
        <StatCard label="Total Spending" value={fmt(totalSpending)} color="amber" />
        <StatCard label={deficit > 0 ? 'Budget Deficit' : 'Budget Surplus'} value={`${deficit > 0 ? '-' : '+'}${fmt(Math.abs(deficit))}`} color={deficit > 0 ? 'red' : 'green'} />
        <StatCard label="National Treasury" value={nation ? fmt(Number(nation.treasury)) : '—'} color={nation && Number(nation.treasury) < 0 ? 'red' : 'green'} />
        <StatCard label="Public Debt" value={nation ? fmt(Number(nation.debt)) : '—'} color="red" />
      </div>

      {activeProposal && (
        <div className="border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3 rounded-sm flex items-center justify-between gap-3 text-xs text-amber-500/80 font-mono tracking-wide animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-sm shrink-0">🏛️</span>
            <div>
              <div className="font-bold uppercase tracking-wider text-amber-400">Pending Parliamentary Vote (Round {proposalTicksRun}/2)</div>
              <div className="text-[10px] mt-0.5 opacity-80">
                A Fiscal Policy Proposal is currently active in the legislature. Advancing the tick will trigger a parliamentary vote. Proposing new changes will replace this active proposal.
              </div>
            </div>
          </div>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[8px] font-bold shrink-0">ACTIVE DEBATE</span>
        </div>
      )}

      {/* Income & Expenditure Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax rates */}
        <TerminalPanel title="Tax Rates" headerAction={<span className="text-zinc-600 text-[9px] uppercase font-mono tracking-wider font-bold">Income Panel</span>}>
          <div className="space-y-3">
            {taxes.map((t: any) => {
              const currentRatePct = (taxEdits[t.name] || Number(t.rate) * 100);
              const proposedRatePct = proposedTaxesMap[t.name];
              const hasProposal = proposedRatePct !== undefined && Math.abs(proposedRatePct - currentRatePct) > 0.01;
              
              return (
                <div key={t.name} className="border border-zinc-900 bg-zinc-950/20 p-3.5 rounded-sm space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm animate-pulse" style={{ background: TAX_COLORS[t.name] || '#6b7280' }} />
                      <span className="text-zinc-200 text-xs font-bold font-mono uppercase tracking-wider">{t.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-zinc-500 text-[9px]">Rev: {fmt(Number(t.revenue))}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-zinc-300 font-bold">{currentRatePct.toFixed(1)}%</span>
                        {hasProposal && (
                          <span className="text-amber-400 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.2 rounded-sm text-[9px] font-black animate-pulse flex items-center gap-0.5">
                            🏛️ → {proposedRatePct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <GaugeBar value={currentRatePct / 60} color={t.name === 'Income Tax' ? 'amber' : t.name === 'Corporate Tax' ? 'blue' : 'purple'} showValue={false} height="xs" />
                </div>
              );
            })}
          </div>
        </TerminalPanel>

        {/* Budget allocations */}
        <TerminalPanel title="Budget Allocations" subtitle="$M" headerAction={<span className="text-zinc-600 text-[9px] uppercase font-mono tracking-wider font-bold">Expenditure Panel</span>}>
          <div className="space-y-3">
            {budgetItems.map((b: any) => {
              const currentAllocM = (budgetEdits[b.name] || Number(b.allocation) / 1e6);
              const proposedAllocM = proposedBudgetsMap[b.name];
              const hasProposal = proposedAllocM !== undefined && Math.abs(proposedAllocM - currentAllocM) > 0.01;

              return (
                <div key={b.name} className="border border-zinc-900 bg-zinc-950/20 p-3.5 rounded-sm space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm animate-pulse" style={{ background: BUDGET_COLORS[b.name] || '#6b7280' }} />
                      <span className="text-zinc-200 text-xs font-bold font-mono uppercase tracking-wider">{b.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-zinc-300 font-bold">${currentAllocM.toFixed(0)}M</span>
                        {hasProposal && (
                          <span className="text-amber-400 bg-amber-950/40 border border-amber-900/30 px-1.5 py-0.2 rounded-sm text-[9px] font-black animate-pulse flex items-center gap-0.5">
                            🏛️ → ${proposedAllocM.toFixed(0)}M
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <GaugeBar value={currentAllocM / 400} color={b.name === 'Education' ? 'blue' : b.name === 'Healthcare' ? 'green' : 'amber'} showValue={false} height="xs" />
                </div>
              );
            })}
          </div>
        </TerminalPanel>
      </div>

      {/* Spending Breakdown Deep Dive panel */}
      <TerminalPanel title="Fiscal Breakdown (Deep Dive)" subtitle="$M">
        {budgetData.length > 0 ? (
          <BarChart data={budgetData} height={160} formatValue={v => `$${v.toFixed(0)}M`} />
        ) : <div className="text-zinc-600 text-xs text-center py-10">No budget data available.</div>}
      </TerminalPanel>

      {/* Redesigned Premium Propose Fiscal Reform Modal */}
      <ModalOverlay isOpen={showDraftModal} onClose={() => setShowDraftModal(false)} title="Draft Fiscal Reform Bill" width="max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[75vh]">
          {/* Sliders Area */}
          <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-2">
            <div>
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider mb-1">Proposed Tax Policies</h3>
              <p className="text-[9px] text-zinc-500 font-mono">Adjust targeted tax rate modifiers for this legislative session.</p>
            </div>
            
            <div className="space-y-3">
              {taxes.map((t: any) => {
                const currentRate = Number(t.rate) * 100;
                const draftRate = draftTaxes[t.name] ?? currentRate;
                return (
                  <div key={t.name} className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider">{t.name}</span>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold">
                        <span className="text-zinc-500 font-normal text-[10px]">Current: {currentRate.toFixed(1)}%</span>
                        <span className="text-amber-400 font-black">{draftRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <input
                      type="range" min="0" max="60" step="0.5"
                      value={draftRate}
                      onChange={e => setDraftTaxes(prev => ({ ...prev, [t.name]: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                );
              })}
            </div>
            
            <div className="pt-2">
              <h3 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider mb-1">Proposed Spendings & Allocations</h3>
              <p className="text-[9px] text-zinc-500 font-mono">Adjust targeted public spending programs to expand or downsize.</p>
            </div>
            
            <div className="space-y-3">
              {budgetItems.map((b: any) => {
                const currentAlloc = Number(b.allocation) / 1e6;
                const draftAlloc = draftBudgets[b.name] ?? currentAlloc;
                return (
                  <div key={b.name} className="bg-zinc-950/40 border border-zinc-900 p-3 rounded-sm space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-300 text-xs font-bold font-mono uppercase tracking-wider">{b.name}</span>
                      <div className="flex items-center gap-2 font-mono text-xs font-bold">
                        <span className="text-zinc-500 font-normal text-[10px]">Current: ${currentAlloc.toFixed(0)}M</span>
                        <span className="text-amber-400 font-black">${draftAlloc.toFixed(0)}M</span>
                      </div>
                    </div>
                    <input
                      type="range" min="0" max="400" step="5"
                      value={draftAlloc}
                      onChange={e => setDraftBudgets(prev => ({ ...prev, [b.name]: parseFloat(e.target.value) }))}
                      className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Estimates & Forecasts */}
          <div className="border-l border-zinc-900 pl-3 flex flex-col justify-between h-full">
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-[8px] text-zinc-500 uppercase tracking-widest block font-mono mb-1">Bill Title</label>
                <div className="terminal-input bg-zinc-950/50 text-[11px] font-mono text-amber-500 font-bold uppercase tracking-wider py-2 px-3 border border-zinc-900">
                  🏛️ Fiscal Policy Proposal
                </div>
              </div>

              {/* Estimates Panel */}
              <div className="border border-zinc-900 bg-zinc-950/40 p-3 rounded-sm space-y-3 font-mono">
                <h4 className="text-[9px] text-zinc-500 uppercase tracking-widest">IMPACT FORECAST (ANNUAL)</h4>
                
                {/* Total Revenue Estimate */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Est. Revenue</span>
                    <span className="font-bold text-zinc-200">{fmt(draftRevenue)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 flex justify-between">
                    <span>Current: {fmt(totalRevenue)}</span>
                    <span className={draftRevenue >= totalRevenue ? 'text-emerald-500' : 'text-rose-500'}>
                      {draftRevenue >= totalRevenue ? '+' : ''}{((draftRevenue - totalRevenue) / 1e6).toFixed(1)}M
                    </span>
                  </div>
                </div>

                {/* Total Spending Estimate */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Est. Spending</span>
                    <span className="font-bold text-zinc-200">{fmt(draftSpending)}</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 flex justify-between">
                    <span>Current: {fmt(totalSpending)}</span>
                    <span className={draftSpending <= totalSpending ? 'text-emerald-500' : 'text-rose-500'}>
                      {draftSpending <= totalSpending ? '' : '+'}{((draftSpending - totalSpending) / 1e6).toFixed(1)}M
                    </span>
                  </div>
                </div>

                {/* Deficit / Surplus Estimate */}
                <div className="space-y-1 border-t border-zinc-900 pt-2">
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>Forecast Balance</span>
                    <span className={`font-bold ${draftDeficit > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
                      {draftDeficit > 0 ? `${fmt(draftDeficit)} Deficit` : `${fmt(Math.abs(draftDeficit))} Surplus`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[9px] font-mono text-zinc-500 leading-relaxed bg-zinc-950/20 p-2.5 border border-zinc-900">
                🏛️ **PARLIAMENTARY RULES**:
                Submitting this reform package puts it in front of the Bundestag committee. The bill will be voted on in the next tick simulation.
              </div>
            </div>

            <div className="border-t border-zinc-900 pt-3 mt-3 space-y-2">
              <button
                onClick={handleDraftSubmit}
                disabled={saving}
                className="w-full btn-primary py-2 font-mono text-[10px] font-bold tracking-wider"
              >
                {saving ? 'PROPOSING BILL...' : 'PROPOSE BILL TO COMMITTEE'}
              </button>
              <button
                onClick={() => setShowDraftModal(false)}
                className="w-full btn-secondary py-1.5 font-mono text-[9px] border border-zinc-800 text-zinc-500 hover:text-zinc-300"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
