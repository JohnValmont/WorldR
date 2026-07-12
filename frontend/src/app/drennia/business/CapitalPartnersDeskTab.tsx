'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000   ? `$${(n / 1_000).toFixed(1)}K`
  : `$${n.toFixed(2)}`;

const pct = (n: number) => `${n.toFixed(2)}%`;

const T = {
  bg: '#090A0F', panel: '#11131A', paper: '#1E1A15',
  border: '#2A2630', borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A', ivory: '#F4EBD6', muted: '#A79D8C',
  faint: '#6B6358', mint: '#36D399', red: '#B85555', steel: '#4B6382',
};
const mono: React.CSSProperties = { fontFamily: 'monospace' };
const label: React.CSSProperties = { ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, fontWeight: 700 };

interface Holding {
  company_id: string; company_name: string; industry_id: string; is_npc: boolean;
  shares: number; avg_cost_basis: number; current_price: number; market_value: number;
  unrealized_pnl: number; ownership_pct: number; total_shares: number;
}

interface FirmSummary {
  id: string; name: string; available_cash: number; company_value: number; portfolio_value: number;
}

interface DividendReceipt {
  company_id: string; company_name: string; game_year: number; game_month: number;
  shares_held: number; amount: number;
}

interface Props {
  firmId: string;
  firmName: string;
  playerCash: number;
  onRefresh: () => void;
  onGoToExchange?: () => void;
}

export default function CapitalPartnersDeskTab({ firmId, firmName, playerCash, onRefresh, onGoToExchange }: Props) {
  const [tab, setTab] = useState<'portfolio' | 'dividends' | 'treasury' | 'performance' | 'strategy'>('portfolio');
  const [firm, setFirm] = useState<FirmSummary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [dividends, setDividends] = useState<DividendReceipt[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [injectAmount, setInjectAmount] = useState('');
  const [injectMsg, setInjectMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMsg, setWithdrawMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Use the axios `api` client — it injects the Bearer token automatically
      const [pRes, dRes, lRes, perfRes] = await Promise.all([
        api.get(`/companies/${firmId}/portfolio`).then(r => r.data),
        api.get(`/companies/${firmId}/dividends`).then(r => r.data),
        api.get(`/companies/${firmId}/ledger`).then(r => r.data),
        api.get(`/companies/${firmId}/performance`).then(r => r.data),
      ]);
      if (pRes.firm) { setFirm(pRes.firm); setHoldings(pRes.holdings || []); }
      if (Array.isArray(dRes)) setDividends(dRes);
      if (Array.isArray(lRes)) setLedger(lRes);
      if (perfRes) setPerformance(perfRes);
    } catch (e) {
      console.error('Capital Partners load error', e);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => { load(); }, [load]);

  const handleInject = async () => {
    const amount = Number(injectAmount);
    if (!amount || amount <= 0 || isNaN(amount)) { setInjectMsg({ text: 'Enter a positive amount.', ok: false }); return; }
    if (amount > playerCash) { setInjectMsg({ text: `Insufficient personal cash. You have ${fmt(playerCash)}.`, ok: false }); return; }
    setBusy(true); setInjectMsg(null);
    try {
      // Use the dedicated finance-firm fund endpoint (bypasses sole-trader guard)
      await api.post(`/companies/${firmId}/fund-firm`, { amount });
      setInjectMsg({ text: `${fmt(amount)} transferred into the firm.`, ok: true });
      setInjectAmount('');
      load();
      onRefresh();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Transfer failed.';
      setInjectMsg({ text: msg, ok: false });
    } finally { setBusy(false); }
  };

  const handleWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0 || isNaN(amount)) { setWithdrawMsg({ text: 'Enter a positive amount.', ok: false }); return; }
    if (firm && amount > firm.available_cash) { setWithdrawMsg({ text: `Insufficient firm cash. Firm has ${fmt(firm.available_cash)}.`, ok: false }); return; }
    setBusy(true); setWithdrawMsg(null);
    try {
      await api.post(`/companies/${firmId}/withdraw-capital`, { amount });
      setWithdrawMsg({ text: `${fmt(amount)} withdrawn to personal wallet.`, ok: true });
      setWithdrawAmount('');
      load();
      onRefresh();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Withdrawal failed.';
      setWithdrawMsg({ text: msg, ok: false });
    } finally { setBusy(false); }
  };

  const totalUnrealizedPnl = holdings.reduce((s, h) => s + h.unrealized_pnl, 0);
  const totalDividendsReceived = dividends.reduce((s, d) => s + Number(d.amount), 0);

  const containerStyle: React.CSSProperties = {
    background: T.bg, color: T.ivory, minHeight: '100vh', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '20px',
  };

  const panelStyle: React.CSSProperties = {
    background: T.panel, border: `1px solid ${T.border}`, padding: '20px', borderRadius: '4px',
  };

  const tabBtn = (id: typeof tab, text: string) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      style={{
        ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
        padding: '8px 16px', cursor: 'pointer', border: 'none',
        background: tab === id ? T.paper : 'transparent',
        borderBottom: tab === id ? `2px solid ${T.gold}` : `2px solid transparent`,
        color: tab === id ? T.gold : T.faint,
      }}
    >{text}</button>
  );

  if (loading) return (
    <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ ...mono, color: T.faint, fontSize: '12px' }}>Loading portfolio…</div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Capital Partners Firm</div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, marginTop: '4px' }}>{firmName}</div>
          <div style={{ ...mono, fontSize: '10px', color: T.muted, marginTop: '2px' }}>Finance · Investment Holding Entity</div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Firm Cash',            value: fmt(firm?.available_cash ?? 0),   color: T.mint },
          { label: 'Portfolio Value',       value: fmt(firm?.portfolio_value ?? 0),  color: T.gold },
          { label: 'Unrealised P&L',        value: fmt(totalUnrealizedPnl),          color: totalUnrealizedPnl >= 0 ? T.mint : T.red },
          { label: 'Total Dividends Rcvd', value: fmt(totalDividendsReceived),       color: T.steel },
        ].map(k => (
          <div key={k.label} style={{ ...panelStyle, padding: '14px' }}>
            <div style={label}>{k.label}</div>
            <div style={{ ...mono, fontSize: '18px', fontWeight: 700, color: k.color, marginTop: '6px' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: `1px solid ${T.border}`, display: 'flex', gap: '0' }}>
        {tabBtn('portfolio', 'Holdings')}
        {tabBtn('dividends', 'Dividends')}
        {tabBtn('treasury', 'Treasury')}
        {tabBtn('performance', 'Performance')}
        {tabBtn('strategy', 'Strategy')}
      </div>

      {/* ── Portfolio Tab ── */}
      {tab === 'portfolio' && (
        <div style={panelStyle}>
          <div style={{ ...label, marginBottom: '14px' }}>Current Holdings</div>
          {holdings.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ ...mono, fontSize: '11px', color: T.faint }}>
                No holdings yet. Buy shares on the DRX Bourse to build your portfolio. Dividends will flow here each arc from companies with payout policies.
              </div>
              {onGoToExchange && (
                <button
                  onClick={onGoToExchange}
                  style={{
                    ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
                    padding: '8px 16px', cursor: 'pointer', border: `1px solid ${T.gold}`,
                    background: 'transparent', color: T.gold, borderRadius: '4px'
                  }}
                >
                  Go to DRX Bourse →
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: '11px' }}>
              <thead>
                <tr style={{ color: T.faint }}>
                  {['Company', 'Shares', 'Avg Cost', 'Price', 'Market Value', 'P&L', 'Ownership'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Company' ? 'left' : 'right', padding: '6px 8px', fontWeight: 400, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.1em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holdings.map(h => (
                  <tr key={h.company_id} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px', color: T.ivory }}>
                      <span>{h.company_name}</span>
                      {h.is_npc && <span style={{ marginLeft: '6px', fontSize: '9px', color: T.faint, border: `1px solid ${T.border}`, padding: '1px 4px' }}>NPC</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>{Number(h.shares).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>${Number(h.avg_cost_basis).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.ivory }}>${Number(h.current_price).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.gold, fontWeight: 700 }}>{fmt(h.market_value)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: h.unrealized_pnl >= 0 ? T.mint : T.red }}>
                      {h.unrealized_pnl >= 0 ? '+' : ''}{fmt(h.unrealized_pnl)}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>{pct(h.ownership_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Dividends Tab ── */}
      {tab === 'dividends' && (
        <div style={panelStyle}>
          <div style={{ ...label, marginBottom: '14px' }}>Dividend Receipts</div>
          {dividends.length === 0 ? (
            <div style={{ ...mono, fontSize: '11px', color: T.faint }}>
              No dividends received yet. NPC companies (HaulPro, Veridian, Apex, Valuecorp) pay 30% of arc profit each month. Player manufacturing companies pay if their owner sets a payout policy.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: '11px' }}>
              <thead>
                <tr style={{ color: T.faint }}>
                  {['Company', 'Year', 'Month', 'Shares Held', 'Dividend Rcvd'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Company' ? 'left' : 'right', padding: '6px 8px', fontWeight: 400, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.1em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dividends.map((d, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}` }}>
                    <td style={{ padding: '8px', color: T.ivory }}>{d.company_name}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>Y{d.game_year}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>M{d.game_month}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>{Number(d.shares_held).toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.mint, fontWeight: 700 }}>{fmt(Number(d.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Treasury Tab ── */}
      {tab === 'treasury' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Balance Sheet Panel */}
          <div style={{ ...panelStyle, display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Firm Cash</div>
              <div style={{ ...mono, fontSize: '20px', color: T.mint, fontWeight: 700 }}>{fmt(firm?.available_cash ?? 0)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Portfolio Value</div>
              <div style={{ ...mono, fontSize: '20px', color: T.gold, fontWeight: 700 }}>{fmt(firm?.portfolio_value ?? 0)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Total Assets</div>
              <div style={{ ...mono, fontSize: '20px', color: T.ivory, fontWeight: 700 }}>{fmt(firm?.company_value ?? 0)}</div>
            </div>
            <div style={{ flex: 1, borderLeft: `1px solid ${T.border}`, paddingLeft: '32px' }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Cash Deployed</div>
              <div style={{ ...mono, fontSize: '14px', color: T.muted }}>
                {firm && firm.company_value > 0 ? pct((firm.portfolio_value / firm.company_value) * 100) : '0%'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px' }}>
            {/* Fund Firm Action */}
            <div style={{ ...panelStyle, flex: 1 }}>
              <div style={{ ...label, marginBottom: '14px' }}>Transfer Capital into Firm</div>
              <div style={{ ...mono, fontSize: '10px', color: T.faint, marginBottom: '16px', lineHeight: '1.6' }}>
                Transfer personal cash to the firm's treasury. Use this to buy shares.
              </div>
              <div style={{ ...mono, fontSize: '9px', color: T.muted, marginBottom: '8px' }}>
                Personal cash: <span style={{ color: T.ivory }}>{fmt(playerCash)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number" min="1" value={injectAmount}
                  onChange={e => setInjectAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ flex: 1, ...mono, background: T.bg, border: `1px solid ${T.border}`, color: T.ivory, padding: '8px 10px', fontSize: '12px', outline: 'none' }}
                />
                <button
                  onClick={handleInject} disabled={busy}
                  style={{
                    ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    padding: '0 16px', cursor: busy ? 'wait' : 'pointer', border: 'none',
                    background: T.gold, color: T.bg, opacity: busy ? 0.6 : 1,
                  }}
                >Transfer In</button>
              </div>
              {injectMsg && <div style={{ fontSize: '11px', color: injectMsg.ok ? T.mint : T.red }}>{injectMsg.text}</div>}
            </div>

            {/* Withdraw Action */}
            <div style={{ ...panelStyle, flex: 1 }}>
              <div style={{ ...label, marginBottom: '14px' }}>Withdraw Capital</div>
              <div style={{ ...mono, fontSize: '10px', color: T.faint, marginBottom: '16px', lineHeight: '1.6' }}>
                Withdraw idle firm cash back to your personal wallet.
              </div>
              <div style={{ ...mono, fontSize: '9px', color: T.muted, marginBottom: '8px' }}>
                Firm cash: <span style={{ color: T.ivory }}>{fmt(firm?.available_cash ?? 0)}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  type="number" min="1" value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  placeholder="Amount"
                  style={{ flex: 1, ...mono, background: T.bg, border: `1px solid ${T.border}`, color: T.ivory, padding: '8px 10px', fontSize: '12px', outline: 'none' }}
                />
                <button
                  onClick={handleWithdraw} disabled={busy}
                  style={{
                    ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    padding: '0 16px', cursor: busy ? 'wait' : 'pointer', border: `1px solid ${T.gold}`,
                    background: 'transparent', color: T.gold, opacity: busy ? 0.6 : 1,
                  }}
                >Withdraw</button>
              </div>
              {withdrawMsg && <div style={{ fontSize: '11px', color: withdrawMsg.ok ? T.mint : T.red }}>{withdrawMsg.text}</div>}
            </div>
          </div>

          {/* Ledger */}
          <div style={panelStyle}>
            <div style={{ ...label, marginBottom: '14px' }}>Treasury Ledger</div>
            {ledger.length === 0 ? (
              <div style={{ ...mono, fontSize: '11px', color: T.faint }}>No ledger entries found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', ...mono, fontSize: '11px' }}>
                <thead>
                  <tr style={{ color: T.faint }}>
                    {['Date', 'Description', 'Amount', 'Balance'].map(h => (
                      <th key={h} style={{ textAlign: h === 'Description' ? 'left' : 'right', padding: '6px 8px', fontWeight: 400, textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.1em', borderBottom: `1px solid ${T.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry, i) => (
                    <tr key={entry.id || i} style={{ borderBottom: `1px solid ${T.border}` }}>
                      <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>Y{entry.game_year} M{entry.game_month} D{entry.game_day}</td>
                      <td style={{ padding: '8px', color: T.ivory }}>{entry.description}</td>
                      <td style={{ textAlign: 'right', padding: '8px', color: Number(entry.amount) > 0 ? T.mint : T.red, fontWeight: 700 }}>
                        {Number(entry.amount) > 0 ? '+' : ''}{fmt(Number(entry.amount))}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px', color: T.ivory }}>{fmt(Number(entry.balance_after))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── Performance Tab ── */}
      {tab === 'performance' && performance && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ ...panelStyle, display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Total Return (ROI)</div>
              <div style={{ ...mono, fontSize: '20px', color: performance.total_return_pct >= 0 ? T.mint : T.red, fontWeight: 700 }}>
                {performance.total_return_pct > 0 ? '+' : ''}{Number(performance.total_return_pct).toFixed(2)}%
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Net Deposits</div>
              <div style={{ ...mono, fontSize: '20px', color: T.ivory, fontWeight: 700 }}>
                {fmt(performance.net_deposits)}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Current Value</div>
              <div style={{ ...mono, fontSize: '20px', color: T.gold, fontWeight: 700 }}>
                {fmt(performance.current_value)}
              </div>
            </div>
          </div>
          
          <div style={{ ...panelStyle, display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Dividend Yield (All-time)</div>
              <div style={{ ...mono, fontSize: '20px', color: T.mint, fontWeight: 700 }}>
                {performance.current_value > 0 ? pct((performance.total_dividends / performance.current_value) * 100) : '0%'}
              </div>
            </div>
            <div style={{ flex: 2 }}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Total Dividends Claimed</div>
              <div style={{ ...mono, fontSize: '20px', color: T.ivory, fontWeight: 700 }}>
                {fmt(performance.total_dividends)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Strategy Tab ── */}
      {tab === 'strategy' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ ...panelStyle }}>
            <div style={{ ...label, marginBottom: '14px' }}>Investment Strategy & Policies</div>
            <div style={{ ...mono, fontSize: '11px', color: T.faint, marginBottom: '20px', lineHeight: '1.6' }}>
              Define your firm's asset allocation targets and portfolio management rules. This helps you track deviations from your target strategy.
            </div>
            
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ flex: 1, border: `1px solid ${T.border}`, padding: '16px', borderRadius: '4px' }}>
                <div style={{ ...mono, fontSize: '10px', color: T.ivory, textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700 }}>Sector Allocation Targets</div>
                <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                  Target allocation modeling is coming in the next terminal update. You will be able to set target percentages for Automotive, Heavy Industry, Energy, etc.
                </div>
              </div>
              
              <div style={{ flex: 1, border: `1px solid ${T.border}`, padding: '16px', borderRadius: '4px' }}>
                <div style={{ ...mono, fontSize: '10px', color: T.ivory, textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700 }}>Dividend Reinvestment (DRIP)</div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                  <button style={{ flex: 1, padding: '8px', background: T.paper, border: `1px solid ${T.gold}`, color: T.gold, ...mono, fontSize: '9px', fontWeight: 700 }}>MANUAL</button>
                  <button style={{ flex: 1, padding: '8px', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, ...mono, fontSize: '9px', opacity: 0.5, cursor: 'not-allowed' }}>AUTO-DRIP</button>
                </div>
                <div style={{ ...mono, fontSize: '10px', color: T.faint }}>
                  Currently set to manual. Dividends accumulate in the firm's treasury. Auto-DRIP requires a Level 2 Finance License.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
