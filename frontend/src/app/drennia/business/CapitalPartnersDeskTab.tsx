"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../../lib/api';
import EquityDeskTab from './EquityDeskTab';
import { Card, Button, StatCard, EmptyState as UIEmptyState, Badge, ProgressBar, StatusDot, DataRow } from '@/components/ui';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Building2, Landmark, Briefcase, TrendingUp, Target, ArrowRightLeft, LayoutDashboard, Search, FileText } from 'lucide-react';

const fm = (n: number) => {
  if (n === undefined || n === null) return "$0.00";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const pct = (n: number) => `${n.toFixed(2)}%`;

const COLORS = ['#d4af37', '#36d399', '#6ea8fe', '#a78bfa', '#fb923c', '#f472b6'];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-bold text-zinc-100 mb-4">{children}</h2>;
}

export default function CapitalPartnersDeskTab({ firmId, firmName, playerCash, onRefresh, onGoToExchange }: any) {
  const [tab, setTab] = useState('overview');
  const [portfolioSubTab, setPortfolioSubTab] = useState('holdings'); // For the inner sidebar
  
  const [firm, setFirm] = useState<any>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [dividends, setDividends] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [injectAmount, setInjectAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [injectMsg, setInjectMsg] = useState<any>(null);
  const [withdrawMsg, setWithdrawMsg] = useState<any>(null);
  
  const [notification, setNotification] = useState<{ msg: string; success: boolean } | null>(null);

  const showNotif = (msg: string, success: boolean) => {
    setNotification({ msg, success });
    setTimeout(() => setNotification(null), 6000);
  };

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
        id: fRes.data.id,
        name: fRes.data.name,
        available_cash: Number(hRes.data.firm.available_cash ?? 0),
        company_value: Number(hRes.data.firm.company_value ?? 0),
        portfolio_value: Number(hRes.data.firm.portfolio_value ?? 0)
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
    const val = Number(String(injectAmount).replace(/,/g, ''));
    if (!val || val <= 0) return;
    setBusy(true); setInjectMsg(null);
    try {
      await api.post(`/companies/${firmId}/fund-firm`, { amount: val });
      setInjectMsg({ text: `Transferred ${fm(val)} to firm.`, ok: true });
      showNotif(`Transferred ${fm(val)} to firm.`, true);
      setInjectAmount('');
      loadData(); onRefresh();
    } catch (e: any) {
      setInjectMsg({ text: e.response?.data?.error || 'Transfer failed.', ok: false });
      showNotif(e.response?.data?.error || 'Transfer failed.', false);
    } finally { setBusy(false); }
  };

  const handleWithdraw = async () => {
    const val = Number(String(withdrawAmount).replace(/,/g, ''));
    if (!val || val <= 0) return;
    setBusy(true); setWithdrawMsg(null);
    try {
      await api.post(`/companies/${firmId}/withdraw-capital`, { amount: val });
      setWithdrawMsg({ text: `Withdrew ${fm(val)} from firm.`, ok: true });
      showNotif(`Withdrew ${fm(val)} from firm.`, true);
      setWithdrawAmount('');
      loadData(); onRefresh();
    } catch (e: any) {
      setWithdrawMsg({ text: e.response?.data?.error || 'Withdrawal failed.', ok: false });
      showNotif(e.response?.data?.error || 'Withdrawal failed.', false);
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

  const CP_TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
    { id: 'treasury', label: 'Treasury & Liquidity', icon: Landmark },
    { id: 'structure', label: 'Structure & Equity', icon: Building2 },
  ];

  return (
    <div className="flex flex-col w-full min-h-[calc(100vh-120px)] animate-fade-in bg-[#090A0F]">
      
      {/* ── TOP NAV / HERO ── */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 pt-6 px-4 md:px-8 mb-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/50 to-transparent pointer-events-none" />
        
        <div className="max-w-[1600px] mx-auto relative">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-lg shadow-inner">
                <Landmark size={28} className="text-zinc-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono tracking-widest text-zinc-500 uppercase">Capital Partners Firm</span>
                  <Badge variant="amber">Active</Badge>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight m-0 leading-none">{firmName}</h1>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Treasury Balance</div>
              <div className="text-2xl font-mono text-mint font-bold flex items-baseline gap-2">
                {fm(firm?.available_cash ?? 0)}
                {firm?.escrow_cash > 0 && (
                  <span className="text-xs text-zinc-500 font-normal ml-1">
                    (+{fm(firm.escrow_cash).replace('$', '')} in escrow)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="flex overflow-x-auto no-scrollbar gap-6 border-zinc-800">
            {CP_TABS.map(t => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`pb-3 text-xs md:text-sm font-semibold tracking-wide uppercase transition-colors relative whitespace-nowrap ${active ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {t.label}
                  {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gold" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="px-4 md:px-8 pb-16 max-w-[1600px] mx-auto w-full">
        {/* Notification */}
        {notification && (
          <div
            role="status"
            className={`fixed top-6 right-6 z-[9999] w-full max-w-md shadow-2xl mb-4 flex items-start gap-2.5 rounded-md border px-4 py-3 text-xs leading-relaxed
              ${notification.success
                ? 'border-terminal-green/50 bg-terminal-green/10 text-terminal-green backdrop-blur-md'
                : 'border-terminal-red/50 bg-terminal-red/10 text-terminal-red backdrop-blur-md'}`}
          >
            <StatusDot variant={notification.success ? 'live' : 'danger'} className="mt-1 shrink-0" />
            <span>{notification.msg}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            OVERVIEW TAB
        ═══════════════════════════════════════════════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-in p-2">
            {/* Top Stats */}
            <StatCard
              label="Company Value"
              value={firm?.company_value ? fm(firm.company_value) : 'Not Available'}
              valueColor="white"
              trend="up"
              countUp
              sparkline={[{value:1},{value:2},{value:4},{value:8},{value:15}]}
            />
            <StatCard
              label="Available Cash"
              value={fm(firm?.available_cash || 0)}
              valueColor="green"
              trend={firm?.available_cash > 0 ? 'up' : 'flat'}
              countUp
              sparkline={[{value:20},{value:18},{value:22},{value:15},{value:25}]}
            />
            {firm?.escrow_cash > 0 && (
              <StatCard
                label="Cash in Escrow (Orders)"
                value={fm(firm.escrow_cash)}
                valueColor="amber"
                trend="flat"
              />
            )}
            <StatCard
              label="Portfolio Value"
              value={fm(firm?.portfolio_value || 0)}
              valueColor="amber"
              trend="up"
              countUp
              sparkline={[{value:40},{value:42},{value:45},{value:48},{value:55}]}
            />
            <StatCard
              label="Unrealized P&L"
              value={totalUnrealizedPnl >= 0 ? `+${fm(totalUnrealizedPnl)}` : fm(totalUnrealizedPnl)}
              valueColor={totalUnrealizedPnl >= 0 ? "green" : "red"}
              trend={totalUnrealizedPnl >= 0 ? 'up' : 'down'}
              countUp
            />

            {/* Charts Row */}
            <Card className="lg:col-span-3 p-6 flex flex-col min-h-[300px]">
              <SectionHeading>Financial Trajectory</SectionHeading>
              <div className="flex-1 flex gap-4 mt-4">
                <div className="flex-1 h-[250px]">
                  <h4 className="text-[10px] uppercase text-zinc-500 mb-2 font-mono">Monthly Dividend Income (Last 12 Months)</h4>
                  {dividendTrajectory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dividendTrajectory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#23232b" vertical={false} />
                        <XAxis dataKey="label" stroke="#888888" fontSize={10} tickMargin={10} />
                        <YAxis stroke="#888888" fontSize={10} tickFormatter={(val) => fm(val)} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0c0d13', borderColor: '#23232b', fontSize: '12px', fontFamily: 'monospace' }}
                          itemStyle={{ color: '#fffff0' }}
                          formatter={(val: any) => fm(Number(val) || 0)}
                        />
                        <Bar dataKey="total" fill="#30d158" radius={[2,2,0,0]} name="Dividends" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <UIEmptyState heading="No Dividend Data" message="Your portfolio has not generated any dividends yet." />
                  )}
                </div>
              </div>
            </Card>

            <Card className="lg:col-span-1 p-6 flex flex-col min-h-[300px]">
              <SectionHeading>Firm Health</SectionHeading>
              <div className="flex-1 -mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius="70%" data={[
                    { subject: 'Liquidity', A: Math.min((firm?.available_cash || 0) / 1000000 * 100, 100), fullMark: 100 },
                    { subject: 'Growth', A: performance?.total_return_pct > 0 ? 80 : 30, fullMark: 100 },
                    { subject: 'Diversification', A: Math.min(holdings.length * 20, 100), fullMark: 100 },
                    { subject: 'Yield', A: totalDividendsReceived > 0 ? 70 : 10, fullMark: 100 },
                    { subject: 'Reputation', A: 50, fullMark: 100 },
                  ]}>
                    <PolarGrid stroke="#23232b" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#888888', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Company" dataKey="A" stroke="#d4af37" fill="#d4af37" fillOpacity={0.2} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0c0d13', borderColor: '#23232b', fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Quick Actions Guide */}
            <Card className="lg:col-span-2 p-0 overflow-hidden border-zinc-800">
              <div className="p-6 pb-2">
                <SectionHeading>Executive Guide</SectionHeading>
              </div>
              <div className="flex flex-col">
                <DataRow
                  label={<span className={firm?.available_cash > 0 ? "text-zinc-500 line-through" : "text-zinc-100"}>1. Transfer Seed Capital</span>}
                  value={
                    <Button variant={firm?.available_cash > 0 ? "ghost" : "primary"} size="sm" onClick={() => setTab('treasury')} disabled={firm?.available_cash > 0}>
                      {firm?.available_cash > 0 ? '✓ Complete' : 'Go to Treasury'}
                    </Button>
                  }
                />
                <DataRow
                  label={<span className={holdings.length > 0 ? "text-zinc-500 line-through" : (firm?.available_cash > 0 ? "text-zinc-100" : "text-zinc-600")}>2. Acquire First Holding</span>}
                  value={
                    <Button variant={holdings.length > 0 ? "ghost" : (firm?.available_cash > 0 ? "primary" : "ghost")} size="sm" onClick={onGoToExchange} disabled={holdings.length > 0 || firm?.available_cash <= 0}>
                      {holdings.length > 0 ? '✓ Complete' : 'Go to Exchange'}
                    </Button>
                  }
                />
              </div>
              <div className="p-6 bg-[#0a0a0a]/50 border-t border-[#23232b]">
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mb-2">
                  <span>Setup Progress</span>
                  <span>{holdings.length > 0 ? '100' : firm?.available_cash > 0 ? '50' : '0'}%</span>
                </div>
                <ProgressBar value={holdings.length > 0 ? 100 : firm?.available_cash > 0 ? 50 : 0} variant={holdings.length > 0 ? 'green' : 'amber'} />
              </div>
            </Card>
            
            {/* Performance Summary */}
            <Card className="lg:col-span-2 p-0 overflow-hidden border-zinc-800">
              <div className="p-6 pb-2">
                <SectionHeading>Performance Summary</SectionHeading>
              </div>
              {performance ? (
                <div className="flex flex-col">
                  <DataRow label="Total Return (ROI)" value={`${performance.total_return_pct > 0 ? '+' : ''}${Number(performance.total_return_pct).toFixed(2)}%`} valueVariant={performance.total_return_pct >= 0 ? 'green' : 'red'} />
                  <DataRow label="Net Deposits" value={fm(performance.net_deposits)} />
                  <DataRow label="Current Value" value={fm(performance.current_value)} valueVariant="amber" />
                  <DataRow label="Dividend Yield (All-time)" value={performance.current_value > 0 ? pct((performance.total_dividends / performance.current_value) * 100) : '0%'} valueVariant="green" />
                  <DataRow label="Total Dividends Claimed" value={fm(performance.total_dividends)} border={false} />
                </div>
              ) : (
                <UIEmptyState icon={TrendingUp} heading="No Data Yet" message="Execute trades to populate performance data." />
              )}
            </Card>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            PORTFOLIO TAB
        ═══════════════════════════════════════════════════════ */}
        {tab === 'portfolio' && (
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* ── INTERNAL SUB-NAV (LEFT CORNER) ── */}
            <div className="flex md:flex-col gap-1.5 md:min-w-[200px] md:border-r border-zinc-800 md:pr-5 md:pt-3 overflow-x-auto">
              {(['holdings', 'analytics', 'dividends'] as const).map((subtab) => {
                const active = portfolioSubTab === subtab;
                return (
                  <button
                    key={subtab}
                    onClick={() => setPortfolioSubTab(subtab)}
                    aria-current={active ? 'page' : undefined}
                    className={`px-4 py-2.5 text-[12px] font-semibold text-left whitespace-nowrap rounded-r-md border-l-2 transition-colors cursor-pointer
                      ${active
                        ? 'text-terminal-amber bg-terminal-amber/10 border-terminal-amber'
                        : 'text-zinc-500 bg-transparent border-transparent hover:text-zinc-300 hover:bg-zinc-800/40'}`}
                  >
                    {subtab === 'holdings' ? 'Current Holdings' : subtab === 'analytics' ? 'Asset Allocation' : 'Dividend Receipts'}
                  </button>
                );
              })}
            </div>

            {/* ── CONTENT AREA ── */}
            <div className="flex-1 min-w-0">
              {portfolioSubTab === 'holdings' && (
                <Card kicker="Current Holdings">
                  {holdings.length === 0 ? (
                    <UIEmptyState 
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
              )}

              {portfolioSubTab === 'analytics' && (
                <Card kicker="Asset Allocation" className="h-[500px] flex flex-col">
                  {holdings.length > 0 ? (
                    <div className="flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={holdings} dataKey="market_value" nameKey="company_name" cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                            {holdings.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => fm(value as number)} contentStyle={{ backgroundColor: '#090A0F', borderColor: '#27272a', color: '#fff', fontSize: '12px', fontFamily: 'monospace' }} itemStyle={{ color: '#d4af37' }} />
                          <Legend verticalAlign="bottom" height={60} wrapperStyle={{ fontSize: '12px', fontFamily: 'monospace', color: '#a1a1aa' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <UIEmptyState heading="No Data" message="You need holdings to see analytics." />
                  )}
                </Card>
              )}

              {portfolioSubTab === 'dividends' && (
                <Card kicker="Dividend Receipts">
                  {dividends.length === 0 ? (
                    <UIEmptyState heading="No Dividends Yet" message="Companies with payout policies will deposit dividends here every arc." />
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
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            TREASURY TAB
        ═══════════════════════════════════════════════════════ */}
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
                <UIEmptyState heading="No Transactions" message="Capital transfers and dividend receipts will appear here." />
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

        {/* ═══════════════════════════════════════════════════════
            STRUCTURE TAB
        ═══════════════════════════════════════════════════════ */}
        {tab === 'structure' && (
          <div className="space-y-6">
            <EquityDeskTab companyId={firmId} companyName={firmName} />
            
            <Card kicker="Corporate Structure Actions" className="border-terminal-red/20 bg-terminal-red/5">
              <div className="text-sm font-bold text-terminal-red mb-2">Convert to Solo Trader</div>
              <div className="text-xs font-mono text-zinc-400 mb-4">
                The user requested the ability to convert the Capital Partners firm into a Solo Trader entity. This feature requires regulatory framework updates and is not yet available in this jurisdiction.
              </div>
              <Button variant="secondary" className="border-terminal-red/30 text-terminal-red/50 cursor-not-allowed">
                Convert Structure (Unavailable)
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
