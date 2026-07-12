'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../lib/api';
import EquityDeskTab from './EquityDeskTab';
import { Card, Button, StatCard, EmptyState, Badge, ProgressBar } from '@/components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Building2, Landmark, Briefcase, TrendingUp, Target, ArrowRightLeft, LayoutDashboard } from 'lucide-react';

const fm = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(2)}`;

const pct = (n: number) => `${n.toFixed(2)}%`;

const COLORS = ['#d4af37', '#36d399', '#6ea8fe', '#a78bfa', '#fb923c', '#f472b6'];

interface FirmSummary {
  id: string;
  name: string;
  available_cash: number;
  company_value: number;
  portfolio_value: number;
}

interface Holding {
  company_id: string;
  company_name: string;
  is_npc: boolean;
  shares: number;
  avg_cost_basis: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  ownership_pct: number;
}

interface DividendReceipt {
  company_name: string;
  game_year: number;
  game_month: number;
  amount: string;
  shares_held: string;
}

interface TreasuryLedgerEntry {
  id: string;
  game_year: number;
  game_month: number;
  game_day: number;
  description: string;
  amount: string;
  balance_after: string;
}

interface PerformanceMetrics {
  net_deposits: number;
  current_value: number;
  total_return_pct: number;
  total_dividends: number;
}

interface Props {
  firmId: string;
  firmName: string;
  playerCash: number;
  onRefresh: () => void;
  onGoToExchange?: () => void;
}

type CPTab = 'overview' | 'portfolio' | 'treasury' | 'performance' | 'dividends' | 'strategy' | 'structure';

const CP_TABS: { id: CPTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'portfolio', label: 'Holdings', icon: Briefcase },
  { id: 'treasury', label: 'Treasury', icon: Landmark },
  { id: 'performance', label: 'Performance', icon: TrendingUp },
  { id: 'dividends', label: 'Dividends', icon: ArrowRightLeft },
  { id: 'strategy', label: 'Strategy', icon: Target },
  { id: 'structure', label: 'Structure', icon: Building2 },
];

export default function CapitalPartnersDeskTab({ firmId, firmName, playerCash, onRefresh, onGoToExchange }: Props) {
  const [tab, setTab] = useState<CPTab>('overview');
  const [firm, setFirm] = useState<FirmSummary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [dividends, setDividends] = useState<DividendReceipt[]>([]);
  const [ledger, setLedger] = useState<TreasuryLedgerEntry[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [injectAmount, setInjectAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [injectMsg, setInjectMsg] = useState<{ text: string, ok: boolean } | null>(null);
  const [withdrawMsg, setWithdrawMsg] = useState<{ text: string, ok: boolean } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [fRes, hRes, dRes, pRes, lRes] = await Promise.all([
        api.get(`/companies/${firmId}`),
        api.get(`/companies/${firmId}/portfolio`),
        api.get(`/companies/${firmId}/dividends`),
        api.get(`/companies/${firmId}/performance`),
        api.get(`/companies/${firmId}/ledger`)
      ]);
      setFirm({
        id: fRes.data.company.id,
        name: fRes.data.company.name,
        available_cash: Number(fRes.data.company.available_cash),
        company_value: Number(fRes.data.company.company_value),
        portfolio_value: Number(hRes.data.totalMarketValue)
      });
      setHoldings(hRes.data.holdings);
      setDividends(dRes.data);
      setPerformance(pRes.data);
      setLedger(lRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleInject = async () => {
    const val = Number(injectAmount);
    if (!val || val <= 0) return;
    setBusy(true); setInjectMsg(null);
    try {
      await api.post(`/companies/${firmId}/fund-firm`, { amount: val });
      setInjectMsg({ text: `Transferred ${fm(val)} to firm.`, ok: true });
      setInjectAmount('');
      loadData(); onRefresh();
    } catch (e: any) {
      setInjectMsg({ text: e.response?.data?.error || 'Transfer failed.', ok: false });
    } finally { setBusy(false); }
  };

  const handleWithdraw = async () => {
    const val = Number(withdrawAmount);
    if (!val || val <= 0) return;
    setBusy(true); setWithdrawMsg(null);
    try {
      await api.post(`/companies/${firmId}/withdraw-capital`, { amount: val });
      setWithdrawMsg({ text: `Withdrew ${fm(val)} from firm.`, ok: true });
      setWithdrawAmount('');
      loadData(); onRefresh();
    } catch (e: any) {
      setWithdrawMsg({ text: e.response?.data?.error || 'Withdrawal failed.', ok: false });
    } finally { setBusy(false); }
  };

  const totalUnrealizedPnl = holdings.reduce((sum, h) => sum + h.unrealized_pnl, 0);
  const totalDividendsReceived = dividends.reduce((sum, d) => sum + Number(d.amount), 0);

  const dividendTrajectory = useMemo(() => {
    const map = new Map<string, number>();
    dividends.forEach(d => {
      const key = `Y${d.game_year} M${d.game_month}`;
      map.set(key, (map.get(key) || 0) + Number(d.amount));
    });
    return Array.from(map.entries())
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => {
        const [ya, ma] = a.label.replace('Y','').replace('M','').split(' ').map(Number);
        const [yb, mb] = b.label.replace('Y','').replace('M','').split(' ').map(Number);
        return ya === yb ? ma - mb : ya - yb;
      })
      .slice(-12);
  }, [dividends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500 text-sm font-mono tracking-widest uppercase">LOADING DESK...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-120px)] animate-fade-in max-w-[1600px] mx-auto pb-24">
      {/* LEFT SIDEBAR (MAIN TABS) */}
      <nav aria-label="Capital Partners desk sections" className="lg:w-[210px] shrink-0 lg:border-r border-zinc-800 lg:pr-3">
        <div className="flex lg:flex-col gap-1 lg:sticky lg:top-4 lg:pt-4 pb-2 lg:pb-0 overflow-x-auto lg:overflow-visible">
          {CP_TABS.map(t => {
            const active = tab === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 text-[11px] font-mono font-semibold uppercase tracking-[0.1em] whitespace-nowrap rounded-r-md border-l-2 transition-colors cursor-pointer text-left
                  ${active
                    ? 'text-terminal-amber bg-terminal-amber/10 border-terminal-amber'
                    : 'text-zinc-500 bg-transparent border-transparent hover:text-zinc-300 hover:bg-zinc-800/40'}`}
              >
                {Icon && <Icon size={14} className={active ? 'opacity-100' : 'opacity-60'} />}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* RIGHT CONTENT PANE */}
      <main className="flex-1 lg:pl-6 pt-4 lg:pt-0 min-w-0">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800 pb-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Capital Partners Firm</span>
              <Badge variant="amber">Active</Badge>
            </div>
            <h1 className="text-3xl font-bold text-zinc-100 tracking-tight">{firmName}</h1>
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Firm Cash" value={fm(firm?.available_cash ?? 0)} valueColor="green" />
              <StatCard label="Portfolio Value" value={fm(firm?.portfolio_value ?? 0)} valueColor="amber" />
              <StatCard label="Unrealized P&L" value={fm(totalUnrealizedPnl)} valueColor={totalUnrealizedPnl >= 0 ? "green" : "red"} />
              <StatCard label="Total Dividends Rcvd" value={fm(totalDividendsReceived)} valueColor="white" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card kicker="Dividend Trajectory" className="h-[400px] flex flex-col">
                  {dividendTrajectory.length > 0 ? (
                    <>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-4">MONTHLY DIVIDEND INCOME (LAST 12 MONTHS)</div>
                      <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dividendTrajectory} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="label" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} dx={-10} tickFormatter={(v) => `$${v >= 1000 ? v/1000 + 'k' : v}`} />
                            <RechartsTooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#090A0F', borderColor: '#27272a', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} formatter={(v: any) => fm(v as number)} />
                            <Bar dataKey="total" fill="#30d158" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  ) : (
                    <EmptyState heading="No Dividend Data" message="Your portfolio has not generated any dividends yet." />
                  )}
                </Card>
              </div>
              <div className="lg:col-span-1">
                <Card kicker="Asset Allocation" className="h-[400px] flex flex-col">
                  {holdings.length > 0 ? (
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={holdings} dataKey="market_value" nameKey="company_name" cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                            {holdings.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => fm(value as number)} contentStyle={{ backgroundColor: '#090A0F', borderColor: '#27272a', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} itemStyle={{ color: '#d4af37' }} />
                          <Legend verticalAlign="bottom" height={60} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', color: '#a1a1aa' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">No data available</div>
                  )}
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* PORTFOLIO TAB */}
        {tab === 'portfolio' && (
          <div className="space-y-6">
            <Card kicker="Current Holdings">
              {holdings.length === 0 ? (
                <EmptyState 
                  heading="No Holdings Yet" 
                  message="Buy shares on the DRX Bourse to build your portfolio. Dividends will flow here each arc."
                  action={onGoToExchange ? { label: "Go to DRX Bourse", onClick: onGoToExchange, variant: "secondary" } : undefined}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono text-left">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                        <th className="pb-2 font-medium">Company</th>
                        <th className="pb-2 text-right font-medium">Shares</th>
                        <th className="pb-2 text-right font-medium">Avg Cost</th>
                        <th className="pb-2 text-right font-medium">Price</th>
                        <th className="pb-2 text-right font-medium">Market Value</th>
                        <th className="pb-2 text-right font-medium">P&L</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {holdings.map(h => (
                        <tr key={h.company_id} className="group hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 text-zinc-200">
                            <div className="flex items-center gap-2">
                              {h.company_name}
                              {h.is_npc && <Badge variant="zinc">NPC</Badge>}
                            </div>
                          </td>
                          <td className="py-3 text-right text-zinc-400">{Number(h.shares).toLocaleString()}</td>
                          <td className="py-3 text-right text-zinc-400">${Number(h.avg_cost_basis).toFixed(2)}</td>
                          <td className="py-3 text-right text-zinc-200">${Number(h.current_price).toFixed(2)}</td>
                          <td className="py-3 text-right text-gold font-bold">{fm(h.market_value)}</td>
                          <td className={`py-3 text-right font-medium ${h.unrealized_pnl >= 0 ? 'text-mint' : 'text-red'}`}>
                            {h.unrealized_pnl >= 0 ? '+' : ''}{fm(h.unrealized_pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TREASURY TAB */}
        {tab === 'treasury' && (
          <div className="space-y-6">
            <Card kicker="Liquidity Status">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-2">Firm Cash</div>
                  <div className="text-2xl font-bold font-mono text-mint">{fm(firm?.available_cash ?? 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-2">Portfolio Value</div>
                  <div className="text-2xl font-bold font-mono text-gold">{fm(firm?.portfolio_value ?? 0)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-2">Total Assets</div>
                  <div className="text-2xl font-bold font-mono text-zinc-100">{fm(firm?.company_value ?? 0)}</div>
                </div>
              </div>
              <div className="mt-8 border-t border-zinc-800/50 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">Cash Deployed</div>
                  <div className="text-xs font-mono font-medium text-zinc-300">
                    {firm && firm.company_value > 0 ? pct((firm.portfolio_value / firm.company_value) * 100) : '0%'}
                  </div>
                </div>
                <ProgressBar value={firm && firm.company_value > 0 ? (firm.portfolio_value / firm.company_value) * 100 : 0} />
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card kicker="Transfer In">
                <div className="text-xs text-zinc-400 font-mono mb-4">Transfer personal cash to the firm's treasury.</div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-4">Personal Cash: <span className="text-zinc-200">{fm(playerCash)}</span></div>
                <div className="flex gap-2 mb-2">
                  <input type="number" min="1" value={injectAmount} onChange={e => setInjectAmount(e.target.value)} placeholder="Amount" className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-gold/50" />
                  <Button variant="primary" onClick={handleInject} disabled={busy}>Transfer In</Button>
                </div>
                {injectMsg && <div className={`text-xs font-mono mt-2 ${injectMsg.ok ? 'text-mint' : 'text-red'}`}>{injectMsg.text}</div>}
              </Card>

              <Card kicker="Withdraw Capital">
                <div className="text-xs text-zinc-400 font-mono mb-4">Withdraw idle firm cash back to your personal wallet.</div>
                <div className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase mb-4">Firm Cash: <span className="text-zinc-200">{fm(firm?.available_cash ?? 0)}</span></div>
                <div className="flex gap-2 mb-2">
                  <input type="number" min="1" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} placeholder="Amount" className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-sm px-3 py-2 rounded focus:outline-none focus:border-gold/50" />
                  <Button variant="secondary" onClick={handleWithdraw} disabled={busy}>Withdraw</Button>
                </div>
                {withdrawMsg && <div className={`text-xs font-mono mt-2 ${withdrawMsg.ok ? 'text-mint' : 'text-red'}`}>{withdrawMsg.text}</div>}
              </Card>
            </div>

            <Card kicker="Treasury Ledger">
              {ledger.length === 0 ? (
                <EmptyState heading="No Transactions" message="Capital transfers and dividend receipts will appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono text-left">
                    <thead>
                      <tr className="text-zinc-500 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                        <th className="pb-2 font-medium">Date</th>
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 text-right font-medium">Amount</th>
                        <th className="pb-2 text-right font-medium">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {ledger.map((entry, i) => (
                        <tr key={entry.id || i} className="group hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 text-zinc-400">Y{entry.game_year} M{entry.game_month} D{entry.game_day}</td>
                          <td className="py-3 text-zinc-200">{entry.description}</td>
                          <td className={`py-3 text-right font-medium ${Number(entry.amount) > 0 ? 'text-mint' : 'text-red'}`}>
                            {Number(entry.amount) > 0 ? '+' : ''}{fm(Number(entry.amount))}
                          </td>
                          <td className="py-3 text-right text-zinc-200">{fm(Number(entry.balance_after))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {tab === 'performance' && performance && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard label="Total Return (ROI)" value={`${performance.total_return_pct > 0 ? '+' : ''}${Number(performance.total_return_pct).toFixed(2)}%`} valueColor={performance.total_return_pct >= 0 ? 'green' : 'red'} />
              <StatCard label="Net Deposits" value={fm(performance.net_deposits)} />
              <StatCard label="Current Value" value={fm(performance.current_value)} valueColor="amber" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatCard label="Dividend Yield (All-time)" value={performance.current_value > 0 ? pct((performance.total_dividends / performance.current_value) * 100) : '0%'} valueColor="green" />
              <StatCard label="Total Dividends Claimed" value={fm(performance.total_dividends)} />
            </div>
          </div>
        )}

        {/* DIVIDENDS TAB */}
        {tab === 'dividends' && (
          <Card kicker="Dividend Receipts">
            {dividends.length === 0 ? (
              <EmptyState heading="No Dividends Yet" message="Companies with payout policies will deposit dividends here every arc." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono text-left">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 text-right font-medium">Year</th>
                      <th className="pb-2 text-right font-medium">Month</th>
                      <th className="pb-2 text-right font-medium">Shares Held</th>
                      <th className="pb-2 text-right font-medium">Dividend Rcvd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {dividends.map((d, i) => (
                      <tr key={i} className="group hover:bg-zinc-800/20 transition-colors">
                        <td className="py-3 text-zinc-200">{d.company_name}</td>
                        <td className="py-3 text-right text-zinc-400">Y{d.game_year}</td>
                        <td className="py-3 text-right text-zinc-400">M{d.game_month}</td>
                        <td className="py-3 text-right text-zinc-400">{Number(d.shares_held).toLocaleString()}</td>
                        <td className="py-3 text-right text-mint font-bold">{fm(Number(d.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* STRATEGY TAB */}
        {tab === 'strategy' && (
          <Card kicker="Investment Strategy & Policies">
            <div className="text-xs font-mono text-zinc-400 mb-6">
              Define your firm's asset allocation targets and portfolio management rules. This helps you track deviations from your target strategy.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-zinc-800 rounded p-6 bg-zinc-950/30">
                <div className="text-[10px] font-mono tracking-widest text-zinc-300 uppercase mb-3">Sector Allocation Targets</div>
                <div className="text-xs font-mono text-zinc-500 leading-relaxed">
                  Target allocation modeling is coming in the next terminal update. You will be able to set target percentages for Automotive, Heavy Industry, Energy, etc.
                </div>
              </div>
              <div className="border border-zinc-800 rounded p-6 bg-zinc-950/30">
                <div className="text-[10px] font-mono tracking-widest text-zinc-300 uppercase mb-3">Dividend Reinvestment (DRIP)</div>
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 text-center py-2 border border-gold/50 bg-gold/10 text-gold font-mono text-[10px] uppercase font-bold rounded">Manual</div>
                  <div className="flex-1 text-center py-2 border border-zinc-800 text-zinc-600 font-mono text-[10px] uppercase cursor-not-allowed rounded">Auto-DRIP</div>
                </div>
                <div className="text-xs font-mono text-zinc-500 leading-relaxed">
                  Currently set to manual. Dividends accumulate in the firm's treasury. Auto-DRIP requires a Level 2 Finance License.
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* STRUCTURE TAB */}
        {tab === 'structure' && (
          <EquityDeskTab companyId={firmId} companyName={firmName} />
        )}
      </main>
    </div>
  );
}
