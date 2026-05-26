'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatCard from '../../../components/ui/StatCard';
import GaugeBar from '../../../components/ui/GaugeBar';
import BarChart from '../../../components/charts/BarChart';

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

  useEffect(() => {
    nationApi.getState(nationId).then(r => {
      setState(r.data);
      const te: Record<string, number> = {};
      (r.data.taxes || []).forEach((t: any) => { te[t.name] = Number(t.rate) * 100; });
      setTaxEdits(te);
      const be: Record<string, number> = {};
      (r.data.budgetItems || []).forEach((b: any) => { be[b.name] = Number(b.allocation) / 1e6; });
      setBudgetEdits(be);
    }).catch(() => {});
  }, [nationId]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const taxes = Object.entries(taxEdits).map(([name, rate]) => ({ name, rate: rate / 100 }));
      const budgets = Object.entries(budgetEdits).map(([name, allocation]) => ({ name, allocation: allocation * 1e6 }));
      await nationApi.updateBudget(nationId, { taxes, budgets });
      setSaveMsg('✓ PROPOSED TO PARLIAMENT');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setSaveMsg('✕ ' + (err?.response?.data?.error || 'Update failed'));
    } finally {
      setSaving(false);
    }
  };

  const taxes: any[] = state?.taxes || [];
  const budgetItems: any[] = state?.budgetItems || [];
  const laws: any[] = state?.laws || [];
  const nation = state?.nation;

  const activeProposal = laws.find((l: any) => l.title === 'Fiscal Policy Proposal' && l.status === 'proposed');

  const totalRevenue = taxes.reduce((a: number, t: any) => a + Number(t.revenue), 0);
  const totalSpending = budgetItems.reduce((a: number, b: any) => a + Number(b.allocation), 0);
  const deficit = totalSpending - totalRevenue;

  const budgetData = budgetItems.map((b: any) => ({
    name: b.name, value: Number(b.allocation) / 1e6, color: BUDGET_COLORS[b.name] || '#6b7280'
  }));

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Budget & Fiscal Policy</h1>
          <div className="text-zinc-600 text-[10px]">Manage taxation and public spending</div>
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && <span className={`text-[10px] font-mono ${saveMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>{saveMsg}</span>}
          <button onClick={handleSave} disabled={saving} className="btn-primary" id="save-fiscal-btn">
            {saving ? 'SAVING...' : 'APPLY POLICY'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total Revenue" value={fmt(totalRevenue)} color="green" />
        <StatCard label="Total Spending" value={fmt(totalSpending)} color="amber" />
        <StatCard label={deficit > 0 ? 'Deficit' : 'Surplus'} value={fmt(Math.abs(deficit))} color={deficit > 0 ? 'red' : 'green'} />
        <StatCard label="Treasury" value={nation ? fmt(Number(nation.treasury)) : '—'} color={nation && Number(nation.treasury) < 0 ? 'red' : 'green'} />
      </div>

      {activeProposal && (
        <div className="border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3 rounded-lg flex items-center gap-3 text-xs text-amber-500/80 font-mono tracking-wide animate-pulse">
          <span className="text-sm shrink-0">🏛️</span>
          <div>
            <div className="font-bold uppercase tracking-wider text-amber-400">Pending Parliamentary Vote</div>
            <div className="text-[10px] mt-0.5 opacity-80">
              A Fiscal Policy Proposal is currently active in the legislature. Advancing the month will trigger a parliamentary vote. Submitting new changes will replace this active proposal.
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Tax rates */}
        <TerminalPanel title="Tax Rates" headerAction={<span className="text-zinc-600 text-[9px]">drag sliders to adjust</span>}>
          <div className="space-y-4">
            {taxes.map((t: any) => (
              <div key={t.name}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: TAX_COLORS[t.name] || '#6b7280' }} />
                    <span className="text-zinc-300 text-xs">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 text-[10px]">Rev: {fmt(Number(t.revenue))}</span>
                    <span className="text-amber-400 font-mono text-xs font-bold">{(taxEdits[t.name] || 0).toFixed(1)}%</span>
                  </div>
                </div>
                <input
                  type="range" min="0" max="60" step="0.5"
                  value={taxEdits[t.name] || 0}
                  onChange={e => setTaxEdits(prev => ({ ...prev, [t.name]: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            ))}
          </div>
        </TerminalPanel>

        {/* Budget allocations */}
        <TerminalPanel title="Budget Allocations" subtitle="$M" headerAction={<span className="text-zinc-600 text-[9px]">drag sliders to adjust</span>}>
          <div className="space-y-4">
            {budgetItems.map((b: any) => (
              <div key={b.name}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-sm" style={{ background: BUDGET_COLORS[b.name] || '#6b7280' }} />
                    <span className="text-zinc-300 text-xs">{b.name}</span>
                  </div>
                  <span className="text-amber-400 font-mono text-xs font-bold">${(budgetEdits[b.name] || 0).toFixed(0)}M</span>
                </div>
                <input
                  type="range" min="0" max="400" step="5"
                  value={budgetEdits[b.name] || 0}
                  onChange={e => setBudgetEdits(prev => ({ ...prev, [b.name]: parseFloat(e.target.value) }))}
                  className="w-full h-1 bg-zinc-800 rounded appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>

      <TerminalPanel title="Spending Breakdown" subtitle="$M">
        {budgetData.length > 0 ? (
          <BarChart data={budgetData} height={160} formatValue={v => `$${v.toFixed(0)}M`} />
        ) : <div className="text-zinc-600 text-xs text-center py-10">No budget data available.</div>}
      </TerminalPanel>
    </div>
  );
}
