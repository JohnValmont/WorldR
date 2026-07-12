'use client';
import { useState, useEffect, useCallback } from 'react';
import { companyApi } from '../../../lib/api';

const fmt = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M`
  : n >= 1_000 ? `$${(n / 1_000).toFixed(1)}K`
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
}

export default function CapitalPartnersDeskTab({ firmId, firmName, playerCash, onRefresh }: Props) {
  const [tab, setTab] = useState<'portfolio' | 'dividends' | 'inject'>('portfolio');
  const [firm, setFirm] = useState<FirmSummary | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [dividends, setDividends] = useState<DividendReceipt[]>([]);
  const [injectAmount, setInjectAmount] = useState('');
  const [injectMsg, setInjectMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, dRes] = await Promise.all([
        fetch(`/api/v1/companies/${firmId}/portfolio`, { credentials: 'include' }).then(r => r.json()),
        fetch(`/api/v1/companies/${firmId}/dividends`, { credentials: 'include' }).then(r => r.json()),
      ]);
      if (pRes.firm) { setFirm(pRes.firm); setHoldings(pRes.holdings || []); }
      if (Array.isArray(dRes)) setDividends(dRes);
    } catch (e) {
      console.error('Capital Partners load error', e);
    } finally {
      setLoading(false);
    }
  }, [firmId]);

  useEffect(() => { load(); }, [load]);

  const handleInject = async () => {
    const amount = Number(injectAmount);
    if (!amount || amount <= 0) { setInjectMsg({ text: 'Enter a positive amount.', ok: false }); return; }
    if (amount > playerCash) { setInjectMsg({ text: `Insufficient personal cash. You have ${fmt(playerCash)}.`, ok: false }); return; }
    setBusy(true); setInjectMsg(null);
    try {
      await fetch(`/api/v1/companies/${firmId}/inject-capital`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      }).then(r => { if (!r.ok) return r.json().then(e => { throw new Error(e.error || e.message || 'Failed'); }); return r.json(); });
      setInjectMsg({ text: `${fmt(amount)} transferred into the firm.`, ok: true });
      setInjectAmount('');
      load();
      onRefresh();
    } catch (e: any) {
      setInjectMsg({ text: e.message || 'Transfer failed.', ok: false });
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

  if (loading) return <div style={{ ...containerStyle, alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ ...mono, color: T.faint, fontSize: '12px' }}>Loading portfolio…</div>
  </div>;

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
          { label: 'Firm Cash', value: fmt(firm?.available_cash ?? 0), color: T.mint },
          { label: 'Portfolio Value', value: fmt(firm?.portfolio_value ?? 0), color: T.gold },
          { label: 'Unrealised P&L', value: fmt(totalUnrealizedPnl), color: totalUnrealizedPnl >= 0 ? T.mint : T.red },
          { label: 'Total Dividends Rcvd', value: fmt(totalDividendsReceived), color: T.steel },
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
        {tabBtn('inject', 'Inject Capital')}
      </div>

      {/* ── Portfolio Tab ── */}
      {tab === 'portfolio' && (
        <div style={panelStyle}>
          <div style={{ ...label, marginBottom: '14px' }}>Current Holdings</div>
          {holdings.length === 0 ? (
            <div style={{ ...mono, fontSize: '11px', color: T.faint }}>
              No holdings yet. Buy shares on the DRX Bourse to build your portfolio.
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
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>{h.shares.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.muted }}>${h.avg_cost_basis.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '8px', color: T.ivory }}>${h.current_price.toFixed(2)}</td>
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
              No dividends received yet. Companies that set a payout policy distribute earnings to shareholders each arc.
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

      {/* ── Inject Capital Tab ── */}
      {tab === 'inject' && (
        <div style={{ ...panelStyle, maxWidth: '480px' }}>
          <div style={{ ...label, marginBottom: '14px' }}>Transfer Capital into Firm</div>
          <div style={{ ...mono, fontSize: '11px', color: T.muted, marginBottom: '16px', lineHeight: '1.6' }}>
            Transfer personal cash into your Capital Partners firm's treasury. The firm's cash can then be used to buy shares on the DRX Bourse.
          </div>
          <div style={{ ...mono, fontSize: '10px', color: T.faint, marginBottom: '12px' }}>
            Personal cash available: <span style={{ color: T.ivory }}>{fmt(playerCash)}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Amount ($)</div>
              <input
                type="number" min="1" value={injectAmount}
                onChange={e => setInjectAmount(e.target.value)}
                placeholder="50000"
                style={{ ...mono, width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory, padding: '8px 10px', fontSize: '12px', outline: 'none' }}
              />
            </div>
            <button
              onClick={handleInject} disabled={busy}
              style={{
                ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
                padding: '10px 0', cursor: busy ? 'wait' : 'pointer', border: 'none',
                background: T.gold, color: T.bg, opacity: busy ? 0.6 : 1,
              }}
            >{busy ? 'Processing…' : 'Transfer to Firm'}</button>
            {injectMsg && <div style={{ fontSize: '11px', color: injectMsg.ok ? T.mint : T.red }}>{injectMsg.text}</div>}
          </div>
          <div style={{ marginTop: '20px', borderTop: `1px solid ${T.border}`, paddingTop: '16px' }}>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '8px' }}>Note on dividends</div>
            <div style={{ ...mono, fontSize: '10px', color: T.muted, lineHeight: '1.6' }}>
              When companies you hold shares in pay dividends, earnings are credited to your <strong style={{ color: T.ivory }}>personal cash wallet</strong>, not the firm's treasury. Transfer them in to reinvest.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
