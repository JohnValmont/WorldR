'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import { exchangeApi, characterApi, companyApi } from '../../../lib/api';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line, LineChart, Area, PieChart, Pie, Cell } from 'recharts';

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

const mono: React.CSSProperties = { fontFamily: 'monospace' };
const label: React.CSSProperties = { ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, fontWeight: 700 };

function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-US');
}
function fmtBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}

// ── DRX market index header ─────────────────────────────────────────────────
function DrxIndexBar() {
  const { data } = useSWR('drx-index', () => exchangeApi.getDrxIndex(), { refreshInterval: 20000 });
  const value = data?.value != null ? Number(data.value) : null;
  const change = data?.change_pct != null ? Number(data.change_pct) : null;
  const history: any[] = data?.history ?? [];
  const up = (change ?? 0) >= 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
      <div>
        <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.18em' }}>DRX Composite</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <span style={{ ...mono, fontSize: '20px', fontWeight: 700, color: T.gold }}>{value != null ? fmt(value) : '—'}</span>
          {change != null && (
            <span style={{ ...mono, fontSize: '12px', color: up ? T.mint : T.red }}>{up ? '▲' : '▼'} {fmt(Math.abs(change), 2)}%</span>
          )}
        </div>
      </div>
      {history.length > 1 && (
        <div style={{ width: 160, height: 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
              <Line type="monotone" dataKey="value" stroke={up ? T.mint : T.red} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div style={{ display: 'flex', gap: '18px' }}>
        <div>
          <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Listed</div>
          <div style={{ ...mono, fontSize: '13px', fontWeight: 700, color: T.ivory }}>{fmtInt(data?.total_listed ?? 0)}</div>
        </div>
        <div>
          <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Mo. Volume</div>
          <div style={{ ...mono, fontSize: '13px', fontWeight: 700, color: T.ivory }}>{fmtBig(data?.total_volume ?? 0)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Listings table ──────────────────────────────────────────────────────────
function Listings({ listings, selectedId, onSelect }: { listings: any[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>Listed Companies</div>
      {listings.length === 0 && (
        <div style={{ fontSize: '11px', color: T.faint, lineHeight: 1.7 }}>
          No public corporations listed yet. Convert a company to a Public Corporation ($250,000 min value) and complete an IPO to trade here.
        </div>
      )}
      {listings.map((l) => {
        const change = l.last_price != null && l.prev_price != null && l.prev_price > 0 ? ((l.last_price - l.prev_price) / l.prev_price) * 100 : null;
        const active = l.id === selectedId;
        return (
          <button
            key={l.id}
            onClick={() => onSelect(l.id)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
              background: active ? T.panelSoft : 'transparent',
              border: `1px solid ${active ? T.borderGold : 'transparent'}`,
              padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: T.ivory, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase' }}>{l.industry_id}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.ivory }}>{l.last_price != null ? `$${fmt(l.last_price)}` : 'unpriced'}</div>
              {change != null && (
                <div style={{ ...mono, fontSize: '10px', color: change >= 0 ? T.mint : T.red }}>
                  {change >= 0 ? '▲' : '▼'} {fmt(Math.abs(change), 1)}%
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Candlestick shape ───────────────────────────────────────────────────────
// ── Line + volume chart ──────────────────────────────────────────────
function PriceChart({ companyId }: { companyId: string }) {
  const { data } = useSWR(['ohlc', companyId], () => exchangeApi.getOhlc(companyId, 24), { refreshInterval: 30000 });
  const rawRows: any[] = data ?? [];

  let rows: any[] = rawRows.map((r: any) => ({
    label: `Y${r.game_year} M${r.game_month}`,
    open_price: Number(r.open_price),
    high_price: Number(r.high_price),
    low_price: Number(r.low_price),
    close_price: Number(r.close_price),
    volume: Number(r.volume_shares),
    range: [Number(r.low_price), Number(r.high_price)],
  }));

  // If only 1 data point exists (e.g. initial month of listing), synthesize a baseline start point
  // so Recharts renders a horizontal trend line instead of a single isolated dot with a solid block.
  if (rows.length === 1) {
    const single = rows[0];
    rows = [
      {
        label: 'Start',
        open_price: single.open_price,
        high_price: single.open_price,
        low_price: single.open_price,
        close_price: single.open_price,
        volume: 0,
        range: [single.open_price, single.open_price],
      },
      single,
    ];
  }

  const lows = rows.map((r) => r.low_price);
  const highs = rows.map((r) => r.high_price);
  const min = lows.length ? Math.min(...lows) : 0;
  const max = highs.length ? Math.max(...highs) : 1;
  const pad = Math.max((max - min) * 0.15, max * 0.15, 2);

  const firstClose = rows[0]?.close_price ?? 0;
  const lastClose = rows[rows.length - 1]?.close_price ?? 0;
  const up = lastClose >= firstClose;
  const lineColor = up ? T.mint : T.red;

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <div style={label}>Price · Monthly History</div>
        <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>CLOSE PRICE</div>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: '11px', color: T.faint }}>No price history yet. A data point is drawn every game month once the company is listed.</div>
      ) : (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`colorPrice_${companyId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: T.faint, fontSize: 9, fontFamily: 'monospace' }} axisLine={{ stroke: T.border }} tickLine={false} />
              <YAxis
                yAxisId="price"
                tick={{ fill: T.faint, fontSize: 9, fontFamily: 'monospace' }}
                axisLine={{ stroke: T.border }}
                tickLine={false}
                width={52}
                domain={[Math.max(0, min - pad), max + pad]}
                tickFormatter={(v: number) => `$${fmt(v, 2)}`}
              />
              <YAxis yAxisId="vol" orientation="right" hide domain={[0, (dataMax: number) => dataMax * 4 || 10]} />
              <Tooltip
                cursor={{ stroke: T.faint, strokeWidth: 1, strokeDasharray: '4 4', fill: 'transparent' }}
                contentStyle={{ background: T.panelSoft, border: `1px solid ${T.borderGold}`, fontSize: '11px', fontFamily: 'monospace' }}
                labelStyle={{ color: T.ivory }}
                formatter={(value: any, name: any, item: any) => {
                  if (name === 'volume') return [fmtInt(Number(value)), 'Volume'];
                  const p = item?.payload;
                  return [`$${fmt(p.close_price)}`, 'Close'];
                }}
              />
              <Bar yAxisId="vol" dataKey="volume" fill="rgba(75,99,130,0.15)" isAnimationActive={false} />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close_price"
                stroke={lineColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#colorPrice_${companyId})`}
                activeDot={{ r: 6, fill: lineColor, stroke: T.bg, strokeWidth: 2 }}
                dot={{ r: 4, fill: lineColor, stroke: T.bg, strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Earnings panel ──────────────────────────────────────────────────────────
function EarningsPanel({ companyId }: { companyId: string }) {
  const { data } = useSWR(['earnings', companyId], () => exchangeApi.getEarnings(companyId, 12), { refreshInterval: 30000 });
  const rows: any[] = (data ?? []).slice().reverse(); // newest first
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>Earnings & Estimates</div>
      {rows.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No earnings reported yet.</div>}
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '220px', overflowY: 'auto' }}>
          <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', padding: '0 0 4px' }}>
            <span>Month</span><span style={{ textAlign: 'right' }}>EPS</span><span style={{ textAlign: 'right' }}>Est.</span><span style={{ textAlign: 'right' }}>Surprise</span>
          </div>
          {rows.map((r: any, i: number) => {
            const surprise = r.profit_surprise_pct != null ? Number(r.profit_surprise_pct) : null;
            return (
              <div key={i} style={{ ...mono, fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '6px', padding: '4px 0', borderBottom: `1px solid ${T.border}` }}>
                <span style={{ color: T.faint }}>Y{r.game_year} M{r.game_month}</span>
                <span style={{ textAlign: 'right', color: T.ivory }}>${fmt(Number(r.eps), 3)}</span>
                <span style={{ textAlign: 'right', color: T.muted }}>{r.analyst_estimate != null ? `$${fmt(Number(r.analyst_estimate) / 1000000, 3)}` : '—'}</span>
                <span style={{ textAlign: 'right', color: surprise == null ? T.faint : surprise >= 0 ? T.mint : T.red }}>
                  {surprise != null ? `${surprise >= 0 ? '+' : ''}${fmt(surprise, 1)}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Order book ──────────────────────────────────────────────────────────────
function OrderBook({ companyId }: { companyId: string }) {
  const { data: book } = useSWR(['book', companyId], () => exchangeApi.getOrderBook(companyId), { refreshInterval: 5000 });
  const bids: any[] = book?.bids ?? [];
  const asks: any[] = book?.asks ?? [];
  const maxQty = Math.max(1, ...bids.map((b: any) => Number(b.quantity)), ...asks.map((a: any) => Number(a.quantity)));

  const Row = ({ price, quantity, side }: { price: number; quantity: number; side: 'bid' | 'ask' }) => (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '3px 8px', fontSize: '11px', ...mono }}>
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: side === 'bid' ? 0 : 'auto', left: side === 'ask' ? 0 : 'auto',
        width: `${Math.min(100, (Number(quantity) / maxQty) * 100)}%`,
        background: side === 'bid' ? 'rgba(54,211,153,0.08)' : 'rgba(184,85,85,0.08)',
      }} />
      <span style={{ color: side === 'bid' ? T.mint : T.red, zIndex: 1 }}>${fmt(Number(price))}</span>
      <span style={{ color: T.muted, zIndex: 1 }}>{fmtInt(Number(quantity))}</span>
    </div>
  );

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <div style={label}>Order Book</div>
        <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>DRX specialist quotes both sides</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.mint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', padding: '0 8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Bid</span><span>Qty</span>
          </div>
          {bids.length === 0 && <div style={{ fontSize: '10px', color: T.faint, padding: '4px 8px' }}>No bids</div>}
          {bids.map((b: any, i: number) => <Row key={i} price={b.price} quantity={b.quantity} side="bid" />)}
        </div>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.red, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px', padding: '0 8px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Ask</span><span>Qty</span>
          </div>
          {asks.length === 0 && <div style={{ fontSize: '10px', color: T.faint, padding: '4px 8px' }}>No asks</div>}
          {asks.map((a: any, i: number) => <Row key={i} price={a.price} quantity={a.quantity} side="ask" />)}
        </div>
      </div>
    </div>
  );
}

// ── Quick IPO Launch panel (simple sell-block alternative to formal IPO filing) ───
function QuickIpoPanel({ companyId, totalShares, onLaunched }: { companyId: string; totalShares: number; onLaunched: () => void }) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    const p = Number(String(price).replace(/,/g, ''));
    const q = Number(String(quantity).replace(/,/g, ''));
    if (!Number.isFinite(p) || p <= 0) {
      setMsg({ text: 'Enter a valid IPO price per share.', ok: false });
      return;
    }
    if (!Number.isInteger(q) || q <= 0 || q > totalShares) {
      setMsg({ text: `Quantity must be a whole number between 1 and ${totalShares.toLocaleString('en-US')}.`, ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await exchangeApi.ipoLaunch(companyId, { price_per_share: p, quantity: q });
      setMsg({ text: `IPO sell order posted: ${q.toLocaleString('en-US')} shares @ $${p.toFixed(2)}. Buyers can now fill this order.`, ok: true });
      onLaunched();
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || e?.response?.data?.message || 'IPO launch failed.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    ...mono, width: '100%', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory,
    padding: '8px 10px', fontSize: '12px', outline: 'none',
  };

  const impliedCap = Number(price) > 0 ? Number(price) * totalShares : null;

  return (
    <div style={{ background: T.paper, border: `1px solid ${T.gold}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '4px', color: T.gold }}>Quick IPO — Direct Listing</div>
      <p style={{ fontSize: '11px', color: T.muted, margin: '0 0 12px', lineHeight: 1.7 }}>
        Post your first sell order at a chosen price. Buyers can fill it immediately.
        For formal IPO with price discovery, use the Pipeline tab.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Price ($ per share)</div>
          <input
            aria-label="IPO price per share"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 1.00"
            inputMode="decimal"
            style={inputStyle}
          />
        </div>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Shares (max {totalShares.toLocaleString('en-US')})</div>
          <input
            aria-label="Shares to offer"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 100000"
            inputMode="numeric"
            style={inputStyle}
          />
        </div>
        {price && Number(price) > 0 && quantity && Number(quantity) > 0 && (
          <div style={{ ...mono, fontSize: '10px', color: T.muted, lineHeight: 1.6 }}>
            Offer: <span style={{ color: T.gold }}>${(Number(price) * Number(quantity)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            {impliedCap != null && (
              <span style={{ color: T.faint }}> · Cap ${impliedCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            )}
          </div>
        )}
        <button
          onClick={submit}
          disabled={busy}
          style={{
            marginTop: '4px', padding: '10px 0', cursor: busy ? 'wait' : 'pointer',
            ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em',
            background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Listing…' : 'Post Order'}
        </button>
        {msg && <div style={{ fontSize: '11px', color: msg.ok ? T.mint : T.red, lineHeight: 1.6 }}>{msg.text}</div>}
      </div>
    </div>
  );
}

// ── Trade ticket ─────────────────────────────────────────────────────────────
function OrderTicket({ companyId, lastClose, onPlaced, myFinanceFirms = [] }: { companyId: string; lastClose: number | null; onPlaced: () => void; myFinanceFirms?: any[] }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(lastClose != null ? String(lastClose) : '');
  const [quantity, setQuantity] = useState('');
  const [purchaserCompanyId, setPurchaserCompanyId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Reset price when the selected company changes
  useEffect(() => {
    setPrice(lastClose != null ? String(lastClose) : '');
    setQuantity('');
    setMsg(null);
  }, [companyId]);

  const submit = async () => {
    const p = Number(String(price).replace(/,/g, ''));
    const q = Number(String(quantity).replace(/,/g, ''));
    if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(q) || q <= 0) {
      setMsg({ text: 'Enter a valid price and whole-share quantity.', ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const result = await exchangeApi.placeOrder(companyId, { side, price: p, quantity: q, purchaserCompanyId: purchaserCompanyId || undefined });
      const filled = Number(result?.order?.filled_quantity ?? 0);
      setMsg({ text: filled >= q ? `Filled ${fmtInt(q)} shares.` : filled > 0 ? `Partially filled ${fmtInt(filled)}/${fmtInt(q)}; rest resting on book.` : 'Order resting on the book.', ok: true });
      setPrice('');
      setQuantity('');
      onPlaced();
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || e?.response?.data?.message || 'Order failed.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    ...mono, width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory,
    padding: '8px 10px', fontSize: '12px', outline: 'none',
  };
  const placeholderStyle = `
    input::placeholder { color: ${T.faint}; opacity: 0.5; }
  `;

  const band = lastClose != null ? { lo: lastClose * 0.8, hi: lastClose * 1.2 } : null;

  return (
    <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '16px' }}>
      <style>{placeholderStyle}</style>
      <div style={{ ...label, marginBottom: '12px' }}>Place Order</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        {(['buy', 'sell'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            style={{
              flex: 1, padding: '8px 0', cursor: 'pointer', ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
              background: side === s ? (s === 'buy' ? 'rgba(54,211,153,0.15)' : 'rgba(184,85,85,0.15)') : 'transparent',
              border: `1px solid ${side === s ? (s === 'buy' ? T.mint : T.red) : T.border}`,
              color: side === s ? (s === 'buy' ? T.mint : T.red) : T.faint,
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Limit price ($ per share)</div>
          <input aria-label="Limit price per share" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={lastClose != null ? fmt(lastClose) : '0.00'} inputMode="decimal" style={inputStyle} />
        </div>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Quantity (shares)</div>
          <input aria-label="Quantity of shares" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" inputMode="numeric" style={inputStyle} />
        </div>
        {myFinanceFirms.length > 0 && (
          <div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Trade As</div>
            <select
              value={purchaserCompanyId}
              onChange={(e) => setPurchaserCompanyId(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="">Personal Portfolio</option>
              {myFinanceFirms.map((f: any) => (
                <option key={f.id} value={f.id}>{f.name} (Firm)</option>
              ))}
            </select>
          </div>
        )}
        {band && (
          <div style={{ ...mono, fontSize: '9px', color: T.faint }}>
            Circuit breaker: ${fmt(band.lo)} – ${fmt(band.hi)} (±20% of last close)
          </div>
        )}
        {price && quantity && Number(price) > 0 && Number(quantity) > 0 && (
          <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
            Notional: <span style={{ color: T.gold }}>${fmt(Number(price) * Number(quantity))}</span>
            {side === 'buy' && <span style={{ color: T.faint }}> (escrowed until filled or cancelled)</span>}
          </div>
        )}
        <button
          onClick={submit}
          disabled={busy}
          style={{
            marginTop: '4px', padding: '10px 0', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '11px', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.15em',
            background: side === 'buy' ? T.mint : T.red, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Working…' : `${side === 'buy' ? 'Buy' : 'Sell'} shares`}
        </button>
        {msg && <div style={{ fontSize: '11px', color: msg.ok ? T.mint : T.red }}>{msg.text}</div>}
      </div>
    </div>
  );
}

// ── Cap Table / Shareholders ──────────────────────────────────────────────────
function ShareholdersChart({ companyId }: { companyId: string }) {
  const { data } = useSWR(['cap-table', companyId], () => companyApi.getCapTable(companyId), { refreshInterval: 30000 });
  const holders = data?.holders ?? [];

  let publicShares = 0;
  const namedHolders: any[] = [];
  let totalShares = 0;
  
  const isNpcCorp = data?.company?.is_npc === true;
  
  for (const h of holders) {
    const s = Number(h.shares);
    if (s <= 0) continue;
    totalShares += s;
    if (h.name === 'System NPC') {
      if (isNpcCorp) {
        // For NPC Corps listed on exchange, 20% of System NPC holdings represent the Public Float (General Population)
        const publicFloat = Math.round(s * 0.20);
        const treasury = s - publicFloat;
        publicShares += publicFloat;
        if (treasury > 0) {
          namedHolders.push({ name: 'Company Treasury', value: treasury });
        }
      } else {
        publicShares += s;
      }
    } else {
      namedHolders.push({
        name: h.name || 'Unknown',
        value: s
      });
    }
  }
  
  const chartData = [...namedHolders];
  if (publicShares > 0) {
    chartData.push({ name: 'Public (General Population)', value: publicShares });
  }

  // Sort descending by value
  chartData.sort((a, b) => b.value - a.value);

  const PALETTE = [
    '#f59e0b', // Amber Gold
    '#38bdf8', // Sky Blue (Public)
    '#10b981', // Emerald Green
    '#a855f7', // Purple
    '#f43f5e', // Bright Coral
    '#fb923c', // Orange
    '#6366f1', // Indigo
    '#84cc16'  // Lime
  ];

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '12px', color: T.gold }}>Shareholders</div>
      {chartData.length === 0 ? (
        <div style={{ fontSize: '11px', color: T.faint }}>No shareholder data available.</div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 140, height: 140, flexShrink: 0, position: 'relative' }}>
            <PieChart width={140} height={140}>
              <Pie
                data={chartData}
                cx={70}
                cy={70}
                outerRadius={60}
                innerRadius={30}
                dataKey="value"
                stroke="#111827"
                strokeWidth={1.5}
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => {
                  const color = entry.name.startsWith('Public') ? '#38bdf8' : PALETTE[index % PALETTE.length];
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Pie>
              <Tooltip 
                contentStyle={{ background: T.panelSoft, border: `1px solid ${T.borderGold}`, fontSize: '11px', fontFamily: 'monospace', borderRadius: '4px' }}
                itemStyle={{ color: T.ivory }}
                formatter={(value: any, name: any, item: any) => {
                  const val = Number(value);
                  const pct = totalShares > 0 ? ((val / totalShares) * 100).toFixed(1) : '0';
                  return [`${fmtInt(val)} shares (${pct}%)`, item?.payload?.name ?? 'Shareholder'];
                }}
              />
            </PieChart>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '140px', paddingRight: '4px' }}>
            {chartData.map((entry, index) => {
              const pct = totalShares > 0 ? (entry.value / totalShares) * 100 : 0;
              const color = entry.name.startsWith('Public') ? '#38bdf8' : PALETTE[index % PALETTE.length];
              return (
                <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: '3px', flexShrink: 0 }} />
                  <div style={{ ...mono, fontSize: '10px', color: '#f3f4f6', lineHeight: '1.3', wordBreak: 'break-word' }}>
                    <span style={{ fontWeight: 600 }}>{entry.name}</span>{' '}
                    <span style={{ color: color, fontWeight: 700 }}>({pct.toFixed(1)}%)</span>
                    <div style={{ fontSize: '9px', color: T.faint }}>{fmtInt(entry.value)} shares</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Recent trades ─────────────────────────────────────────────────────────────
function RecentTrades({ companyId }: { companyId: string }) {
  const { data: trades } = useSWR(['trades', companyId], () => exchangeApi.getTrades(companyId), { refreshInterval: 8000 });
  const rows: any[] = trades ?? [];
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>Recent Trades</div>
      {rows.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No trades yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '200px', overflowY: 'auto' }}>
        {rows.map((t: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px', ...mono, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.ivory }}>${fmt(Number(t.price))}</span>
            <span style={{ color: T.muted }}>{fmtInt(Number(t.quantity))} sh</span>
            <span style={{ color: T.faint }}>Y{t.game_year} M{t.game_month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── My open orders + portfolio ─────────────────────────────────────────────
function MyDesk({ refreshKey }: { refreshKey: number }) {
  const { data: orders, mutate: mutateOrders } = useSWR(['my-orders', refreshKey], () => exchangeApi.getMyOrders(), { refreshInterval: 10000 });
  const { data: portfolio } = useSWR(['portfolio', refreshKey], () => exchangeApi.getMyPortfolio(), { refreshInterval: 10000 });
  const openOrders: any[] = (orders ?? []).filter((o: any) => o.status === 'open');
  const holdings: any[] = portfolio ?? [];

  // Bug F fix: cancelMsg was swallowed — now surfaced to the user
  const [cancelMsg, setCancelMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const cancel = async (id: string) => {
    setCancelMsg(null);
    try {
      await exchangeApi.cancelOrder(id);
      setCancelMsg({ text: 'Order cancelled — escrowed funds returned.', ok: true });
      mutateOrders();
    } catch (e: any) {
      setCancelMsg({ text: e?.response?.data?.error || e?.response?.data?.message || 'Cancel failed. Please try again.', ok: false });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>My Holdings</div>
        {holdings.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>You hold no shares.</div>}
        {holdings.map((h: any) => (
          <div key={`${h.company_id}_${h.holder_company_id || 'personal'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>
                {h.name}
                {h.holder_name ? (
                  <span style={{ color: T.gold, fontSize: '10px', marginLeft: '6px', fontWeight: 400 }}>[{h.holder_name}]</span>
                ) : (
                  <span style={{ color: T.faint, fontSize: '10px', marginLeft: '6px', fontWeight: 400 }}>[Personal]</span>
                )}
              </div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint }}>{fmt(h.ownership_percent, 2)}% ownership · basis ${fmt(Number(h.avg_cost_basis))}</div>
            </div>
            <div style={{ textAlign: 'right', ...mono }}>
              <div style={{ fontSize: '12px', color: T.ivory }}>{fmtInt(Number(h.shares))} sh</div>
              <div style={{ fontSize: '10px', color: h.last_price != null && Number(h.avg_cost_basis) > 0 ? (Number(h.last_price) >= Number(h.avg_cost_basis) ? T.mint : T.red) : T.faint }}>
                {h.last_price != null ? `mkt $${fmt(Number(h.last_price))}` : 'unpriced'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>My Open Orders</div>
        {openOrders.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No open orders.</div>}
        {openOrders.map((o: any) => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: '11px', color: T.ivory }}>
                <span style={{ ...mono, fontWeight: 700, color: o.side === 'buy' ? T.mint : T.red, textTransform: 'uppercase' }}>{o.side}</span>
                {' '}{o.company_name}
                {o.purchaser_company_name ? (
                  <span style={{ color: T.gold, fontSize: '9px', marginLeft: '6px', fontFamily: 'sans-serif' }}>[{o.purchaser_company_name}]</span>
                ) : (
                  <span style={{ color: T.faint, fontSize: '9px', marginLeft: '6px', fontFamily: 'sans-serif' }}>[Personal]</span>
                )}
              </div>
              <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                {fmtInt(Number(o.quantity) - Number(o.filled_quantity))} sh @ ${fmt(Number(o.price))}
              </div>
            </div>
            <button
              onClick={() => cancel(o.id)}
              style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, padding: '4px 10px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        ))}
        {cancelMsg && (
          <div style={{ fontSize: '11px', color: cancelMsg.ok ? T.mint : T.red, marginTop: '10px' }}>
            {cancelMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}

// ── IPO pipeline card (with IOI form) ───────────────────────────────────────
function IoiForm({ ipo, myFinanceFirms = [], onDone }: { ipo: any; myFinanceFirms?: any[]; onDone: () => void }) {
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('');
  const [biddingCompanyId, setBiddingCompanyId] = useState(ipo.is_founder && myFinanceFirms && myFinanceFirms.length > 0 ? myFinanceFirms[0].id : '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    const p = Number(String(price).replace(/,/g, '')), q = Number(String(qty).replace(/,/g, ''));
    if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(q) || q <= 0) {
      setMsg({ text: 'Enter a valid price and whole-share quantity.', ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      let finalBiddingId = biddingCompanyId;
      if (ipo.is_founder && !finalBiddingId && myFinanceFirms && myFinanceFirms.length > 0) {
        finalBiddingId = myFinanceFirms[0].id;
      }
      
      await exchangeApi.submitIoi(ipo.id, { 
        pricePerShare: p, 
        quantity: q,
        ...(finalBiddingId ? { biddingCompanyId: finalBiddingId } : {})
      });
      setMsg({ text: 'Indication submitted. You will be allocated when the book closes.', ok: true });
      setPrice('');
      setQty('');
      setBiddingCompanyId(ipo.is_founder && myFinanceFirms && myFinanceFirms.length > 0 ? myFinanceFirms[0].id : '');
      onDone();
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || e?.response?.data?.message || 'Submission failed.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const cancelMine = async () => {
    setBusy(true);
    try {
      await exchangeApi.cancelIoi(ipo.my_ioi.id);
      onDone();
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const inputStyle: React.CSSProperties = {
    ...mono, width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory,
    padding: '7px 9px', fontSize: '12px', outline: 'none',
  };

  if (ipo.my_ioi) {
    return (
      <div style={{ marginTop: '10px', background: T.bg, border: `1px solid ${T.borderGold}`, padding: '10px 12px' }}>
        <div style={{ ...mono, fontSize: '10px', color: T.mint }}>
          Your indication: {fmtInt(Number(ipo.my_ioi.quantity_requested))} sh @ ${fmt(Number(ipo.my_ioi.price_per_share))}
          {ipo.my_ioi.bidding_company_id && (
            <span style={{ color: T.gold, marginLeft: '6px' }}>[Corporate]</span>
          )}
        </div>
        <button
          onClick={cancelMine}
          disabled={busy}
          style={{ marginTop: '8px', ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', border: `1px solid ${T.red}`, color: T.red, padding: '5px 12px', cursor: busy ? 'wait' : 'pointer' }}
        >
          Cancel Indication
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', marginBottom: '3px' }}>Bid price ($)</div>
          <input aria-label="IOI price" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={fmt(Number(ipo.ipo_price_max))} inputMode="decimal" style={inputStyle} />
        </div>
        <div>
          <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', marginBottom: '3px' }}>Shares</div>
          <input aria-label="IOI quantity" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" inputMode="numeric" style={inputStyle} />
        </div>
      </div>
      {myFinanceFirms && myFinanceFirms.length > 0 && (
        <div>
          <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', marginBottom: '3px' }}>Bidding Entity</div>
          <select value={biddingCompanyId || (ipo.is_founder && myFinanceFirms.length > 0 ? myFinanceFirms[0].id : '')} onChange={(e) => setBiddingCompanyId(e.target.value)} style={inputStyle}>
            {!ipo.is_founder && <option value="">Personal Account</option>}
            {myFinanceFirms.map(f => (
              <option key={f.id} value={f.id}>{f.name} (Firm)</option>
            ))}
          </select>
        </div>
      )}
      <button
        onClick={submit}
        disabled={busy}
        style={{ padding: '8px 0', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
      >
        Submit Indication of Interest
      </button>
      {msg && <div style={{ fontSize: '10px', color: msg.ok ? T.mint : T.red }}>{msg.text}</div>}
    </div>
  );
}

function Pipeline({ myFinanceFirms = [] }: { myFinanceFirms?: any[] }) {
  const { data, mutate } = useSWR('ipo-pipeline', () => exchangeApi.getPipeline(), { refreshInterval: 15000 });
  const rows: any[] = data ?? [];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
      {rows.length === 0 && (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '32px', textAlign: 'center', fontSize: '12px', color: T.faint, gridColumn: '1 / -1' }}>
          No IPOs in the pipeline. When a founder files a prospectus, it appears here for the roadshow.
        </div>
      )}
      {rows.map((ipo: any) => {
        const sub = Number(ipo.subscription_ratio ?? 0);
        const subColor = sub >= 1 ? T.mint : sub >= 0.5 ? T.gold : T.red;
        const isReview = ipo.status === 'pending_review';
        return (
          <div key={ipo.id} style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: T.ivory }}>{ipo.company_name}</div>
              <div style={{ ...mono, fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: isReview ? T.steel : T.gold }}>
                {isReview ? 'In Review' : 'Book Open'}
              </div>
            </div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '12px' }}>{ipo.industry_id}</div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '10px' }}>
              <div>
                <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Range</div>
                <div style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.ivory }}>${fmt(Number(ipo.ipo_price_min))}–${fmt(Number(ipo.ipo_price_max))}</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Float</div>
                <div style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.ivory }}>{fmt(Number(ipo.float_percent) * 100, 0)}%</div>
              </div>
              <div>
                <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Book Value</div>
                <div style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.ivory }}>${fmtBig(Number(ipo.company_value))}</div>
              </div>
            </div>

            {!isReview && (
              <div style={{ marginBottom: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', ...mono, fontSize: '9px', color: T.faint, marginBottom: '4px' }}>
                  <span>Subscription</span>
                  <span style={{ color: subColor }}>{fmt(sub * 100, 0)}%</span>
                </div>
                <div style={{ height: 6, background: T.bg, border: `1px solid ${T.border}`, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, sub * 100)}%`, background: subColor }} />
                </div>
                <div style={{ ...mono, fontSize: '8px', color: T.faint, marginTop: '4px' }}>
                  Closes Y{ipo.bookbuild_ends_year} M{ipo.bookbuild_ends_month} · under 50% and the offering fails
                </div>
              </div>
            )}

            {ipo.use_of_proceeds && (
              <p style={{ fontSize: '10px', color: T.muted, lineHeight: 1.6, margin: '8px 0 0' }}>“{ipo.use_of_proceeds}”</p>
            )}

            {ipo.is_founder && myFinanceFirms.length === 0 ? (
              <div style={{ ...mono, fontSize: '10px', color: T.gold, marginTop: '12px' }}>You are the founder — manage this IPO from the Equity Desk.</div>
            ) : isReview ? (
              <div style={{ ...mono, fontSize: '10px', color: T.faint, marginTop: '12px' }}>Book-building opens after regulatory review.</div>
            ) : (
              <IoiForm ipo={ipo} myFinanceFirms={myFinanceFirms} onDone={() => mutate()} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Acquisition Auctions Tab ─────────────────────────────────────────────────
function AuctionTab({ onBidPlaced }: { onBidPlaced: () => void }) {
  const { data: auctionsData, mutate: mutateAuctions } = useSWR('acquisitions', () => exchangeApi.getAuctions(), { refreshInterval: 30000 });
  const { data: myBidsData, mutate: mutateMyBids } = useSWR('my-bids', () => exchangeApi.getMyBids(), { refreshInterval: 30000 });
  const [bidInputs, setBidInputs] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; msg: string; type: 'ok' | 'err' }[]>([]);

  const auctions: any[] = auctionsData ?? [];
  const myBids: any[] = myBidsData ?? [];
  const registrationAuctions = auctions.filter((a) => a.status === 'registration');
  const biddingAuctions      = auctions.filter((a) => a.status === 'bidding');

  function toast(msg: string, type: 'ok' | 'err') {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
  }

  async function handleBid(auctionId: string) {
    const raw = bidInputs[auctionId];
    const amount = Number(raw?.replace(/,/g, ''));
    if (!amount || amount <= 0) return toast('Enter a valid bid amount.', 'err');
    setPlacing(auctionId);
    try {
      const result = await exchangeApi.placeBid(auctionId, amount);
      toast(`Bid placed: $${amount.toLocaleString()}. ${result.is_top_bidder ? 'You are the top bidder! 🏆' : 'Bid registered.'}`, 'ok');
      setBidInputs((b) => ({ ...b, [auctionId]: '' }));
      mutateAuctions();
      mutateMyBids();
      onBidPlaced();
    } catch (e: any) {
      toast(e?.response?.data?.message || e.message || 'Bid failed.', 'err');
    } finally {
      setPlacing(null);
    }
  }

  const myBidMap = Object.fromEntries(myBids.map((b: any) => [b.auction_id, b]));

  return (
    <div style={{ maxWidth: '960px' }}>
      {/* Toast notifications */}
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ background: t.type === 'ok' ? 'rgba(54,211,153,0.15)' : 'rgba(184,85,85,0.15)', border: `1px solid ${t.type === 'ok' ? 'rgba(54,211,153,0.4)' : 'rgba(184,85,85,0.4)'}`, padding: '10px 16px', fontSize: '12px', color: t.type === 'ok' ? T.mint : T.red, maxWidth: '340px', backdropFilter: 'blur(8px)' }}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ ...label, letterSpacing: '0.2em', marginBottom: '4px' }}>Drennport Exchange · Acquisition Desk</div>
        <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: T.ivory }}>Corporate Acquisitions</h2>
        <p style={{ margin: 0, fontSize: '12px', color: T.muted, lineHeight: 1.7 }}>
          Distressed companies are put up for competitive auction. Register your interest during the registration window,
          then place bids when the auction opens. Highest bid at close wins — debt is cleared on transfer.
        </p>
      </div>

      {/* Timeline explainer */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '32px', overflow: 'hidden', border: `1px solid ${T.border}` }}>
        {[
          { phase: '1', label: 'Company Distressed', sub: 'Debt > 5× book value', color: '#B85555' },
          { phase: '2', label: 'Registration', sub: '6 game months', color: '#8F6A2A' },
          { phase: '3', label: 'Bidding', sub: '3 game months', color: T.gold },
          { phase: '4', label: 'Settlement', sub: 'Company transfers', color: T.mint },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '10px 12px', background: T.panel, borderRight: i < 3 ? `1px solid ${T.border}` : undefined, textAlign: 'center' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: s.color, color: T.bg, fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', ...mono }}>{s.phase}</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: T.ivory }}>{s.label}</div>
            <div style={{ fontSize: '9px', color: T.faint, marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {auctions.length === 0 && (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.3 }}>🏛️</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: T.muted, marginBottom: '6px' }}>No Active Auctions</div>
          <div style={{ fontSize: '11px', color: T.faint }}>
            Auctions open when NPC companies reach financial distress (debt exceeding 5× their book value).
          </div>
        </div>
      )}

      {/* REGISTRATION PHASE auctions */}
      {registrationAuctions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ ...label, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8F6A2A', display: 'inline-block' }} />
            Registration Phase — {registrationAuctions.length} upcoming
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {registrationAuctions.map((a) => (
              <div key={a.id} style={{ background: T.panel, border: `1px solid rgba(143,106,42,0.3)`, padding: '18px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #8F6A2A, #C9A24A)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ ...mono, fontSize: '8px', color: '#C9A24A', textTransform: 'uppercase', letterSpacing: '0.15em', background: 'rgba(201,162,74,0.1)', padding: '2px 7px', border: '1px solid rgba(201,162,74,0.2)' }}>Registration Open</span>
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 700, color: T.ivory, marginBottom: '3px' }}>{a.name}</div>
                    <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '12px' }}>{a.industry_id} · {a.country_id}</div>
                    {a.active_models?.length > 0 && (
                      <div style={{ marginBottom: '10px' }}>
                        {a.active_models.map((m: any, i: number) => (
                          <div key={i} style={{ fontSize: '11px', color: T.muted }}>{m.name} <span style={{ color: T.faint }}>· {m.target_segment} · ${Number(m.sale_price).toLocaleString()}</span></div>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: T.faint }}>
                      Debt / Book: <span style={{ color: a.debt_ratio >= 5 ? '#B85555' : '#E8A234', fontWeight: 700 }}>{a.debt_ratio?.toFixed(1)}×</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', minWidth: '160px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reserve Price</div>
                      <div style={{ ...mono, fontSize: '18px', fontWeight: 700, color: T.gold }}>${fmtBig(a.reserve_price)}</div>
                    </div>
                    <div style={{ background: 'rgba(143,106,42,0.1)', border: '1px solid rgba(201,162,74,0.2)', padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ ...mono, fontSize: '8px', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Bidding Opens In</div>
                      <div style={{ ...mono, fontSize: '20px', fontWeight: 700, color: T.ivory }}>{a.months_to_bidding_start}</div>
                      <div style={{ fontSize: '9px', color: T.faint }}>game months</div>
                    </div>
                    <div style={{ ...mono, fontSize: '9px', color: T.faint, textAlign: 'right' }}>
                      Bids open: Y{a.bidding_start_year}M{a.bidding_start_month}<br />
                      Closes: Y{a.bidding_end_year}M{a.bidding_end_month}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BIDDING PHASE auctions */}
      {biddingAuctions.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ ...label, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.gold, animation: 'pulse 1.5s infinite' }} />
            Bidding Live — {biddingAuctions.length} active
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {biddingAuctions.map((a) => {
              const myBid = myBidMap[a.id];
              const isTopBidder = myBid && a.current_top_bid && Number(myBid.bid_amount) >= Number(a.current_top_bid);
              const isPlacing = placing === a.id;

              return (
                <div key={a.id} style={{ background: T.panel, border: `1px solid rgba(201,162,74,0.35)`, padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, #C9A24A, #36D399)' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', flexWrap: 'wrap' }}>
                    {/* Left */}
                    <div style={{ flex: '1 1 280px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ ...mono, fontSize: '8px', color: T.mint, textTransform: 'uppercase', letterSpacing: '0.15em', background: 'rgba(54,211,153,0.1)', padding: '2px 7px', border: '1px solid rgba(54,211,153,0.25)' }}>⚡ Bidding Open</span>
                        {isTopBidder && <span style={{ ...mono, fontSize: '8px', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'rgba(201,162,74,0.12)', padding: '2px 7px', border: '1px solid rgba(201,162,74,0.25)' }}>🏆 Your Lead</span>}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: T.ivory, marginBottom: '3px' }}>{a.name}</div>
                      <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '12px' }}>{a.industry_id} · {a.country_id}</div>

                      {a.active_models?.length > 0 && (
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ ...label, marginBottom: '4px' }}>Included Assets</div>
                          {a.active_models.map((m: any, i: number) => (
                            <div key={i} style={{ fontSize: '11px', color: T.muted, marginBottom: '2px' }}>
                              {m.name} <span style={{ color: T.faint }}>· {m.target_segment} · ${Number(m.sale_price).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick stats */}
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {[
                          ['Book Value', `$${fmtBig(a.company_value)}`],
                          ['Total Debt', `$${fmtBig(a.debt)}`],
                          ['Debt Ratio', `${a.debt_ratio?.toFixed(1)}×`],
                        ].map(([k, v]) => (
                          <div key={k as string}>
                            <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                            <div style={{ ...mono, fontSize: '12px', color: T.ivory, fontWeight: 600 }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right */}
                    <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '200px' }}>
                      {/* Current top bid */}
                      <div style={{ background: 'rgba(201,162,74,0.08)', border: '1px solid rgba(201,162,74,0.2)', padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ ...mono, fontSize: '8px', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '2px' }}>
                          {a.current_top_bid ? 'Current Top Bid' : 'Reserve Price'}
                        </div>
                        <div style={{ ...mono, fontSize: '22px', fontWeight: 700, color: T.gold }}>
                          ${fmtBig(a.current_top_bid ?? a.reserve_price)}
                        </div>
                        <div style={{ fontSize: '9px', color: T.faint, marginTop: '2px' }}>
                          {a.bid_count} bid{a.bid_count !== 1 ? 's' : ''} · min next: ${fmtBig(a.min_next_bid)}
                        </div>
                      </div>

                      {/* Countdown */}
                      <div style={{ textAlign: 'center', padding: '6px' }}>
                        <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Closes In</div>
                        <div style={{ ...mono, fontSize: '24px', fontWeight: 700, color: a.months_to_bidding_end <= 1 ? '#B85555' : T.ivory }}>
                          {a.months_to_bidding_end}
                        </div>
                        <div style={{ fontSize: '9px', color: T.faint }}>game month{a.months_to_bidding_end !== 1 ? 's' : ''}</div>
                      </div>

                      {/* My current bid */}
                      {myBid && (
                        <div style={{ background: isTopBidder ? 'rgba(54,211,153,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isTopBidder ? 'rgba(54,211,153,0.25)' : T.border}`, padding: '7px 12px', textAlign: 'center', fontSize: '11px' }}>
                          <span style={{ color: T.faint }}>Your bid: </span>
                          <span style={{ color: isTopBidder ? T.mint : T.ivory, fontWeight: 700, ...mono }}>${Number(myBid.bid_amount).toLocaleString()}</span>
                          {isTopBidder && <span style={{ color: T.mint }}> · Leading</span>}
                        </div>
                      )}

                      {/* Bid input */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                          type="number"
                          placeholder={`Min $${fmtBig(a.min_next_bid)}`}
                          value={bidInputs[a.id] ?? ''}
                          onChange={(e) => setBidInputs((b) => ({ ...b, [a.id]: e.target.value }))}
                          style={{
                            flex: 1, padding: '9px 10px', background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${T.border}`, color: T.ivory, fontSize: '12px',
                            fontFamily: 'monospace', outline: 'none', minWidth: 0,
                          }}
                        />
                        <button
                          id={`bid-btn-${a.id}`}
                          disabled={isPlacing}
                          onClick={() => handleBid(a.id)}
                          style={{
                            padding: '9px 14px', background: isPlacing ? 'rgba(201,162,74,0.15)' : 'linear-gradient(135deg, #C9A24A, #8F6A2A)',
                            border: '1px solid rgba(201,162,74,0.4)', color: T.ivory, cursor: isPlacing ? 'wait' : 'pointer',
                            fontSize: '11px', fontWeight: 700, ...mono, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap',
                          }}
                        >
                          {isPlacing ? '...' : (myBid ? 'Raise' : 'Bid')}
                        </button>
                      </div>
                      <div style={{ fontSize: '9px', color: T.faint, textAlign: 'center' }}>
                        Paid at settlement only · Debt cleared on transfer
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MY BIDS summary */}
      {myBids.length > 0 && (
        <div style={{ marginTop: '8px', padding: '16px 20px', background: 'rgba(43,38,48,0.6)', border: `1px solid ${T.border}` }}>
          <div style={{ ...label, marginBottom: '10px' }}>Your Active Bids</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {myBids.map((b: any) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ color: T.ivory, fontWeight: 600 }}>{b.company_name}</div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <span style={{ ...mono, color: T.gold }}>${Number(b.bid_amount).toLocaleString()}</span>
                  <span style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', color: b.auction_status === 'bidding' ? T.mint : T.faint }}>{b.auction_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
type Tab = 'bourse' | 'pipeline' | 'acquisitions' | 'desk';

export default function ExchangePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('bourse');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showGuide, setShowGuide] = useState(false);

  const { data: listings, mutate: mutateListings } = useSWR('exchange-listings', () => exchangeApi.getListings(), { refreshInterval: 15000 });
  const { data: charData } = useSWR('my-character', () => characterApi.getMe().then(r => r.data), { revalidateOnFocus: false });
  const { data: pipeline } = useSWR('ipo-pipeline-count', () => exchangeApi.getPipeline(), { refreshInterval: 20000 });
  const { data: auctionsCountData } = useSWR('acquisitions-count', () => exchangeApi.getAuctions(), { refreshInterval: 30000 });
  const { data: myCompaniesData } = useSWR('my-companies-bourse', () => companyApi.getMy().then(r => r.data), { revalidateOnFocus: false });
  const myFinanceFirms = (Array.isArray(myCompaniesData) ? myCompaniesData : (myCompaniesData?.companies || [])).filter((c: any) => c.industry_id === 'finance');
  const myCharacterId: string | null = charData?.character?.id ?? null;
  const list: any[] = listings ?? [];
  const activeId = selectedId ?? list[0]?.id ?? null;
  const active = list.find((l) => l.id === activeId) ?? null;
  const pipelineCount = (pipeline ?? []).length;
  const auctionCount = (auctionsCountData ?? []).length;

  // Show quick IPO panel when: company selected, no trades yet, viewer is the owner
  const showQuickIpo = active != null && active.last_price == null && myCharacterId != null && active.owner_character_id === myCharacterId;

  const onPlaced = () => {
    setRefreshKey((k) => k + 1);
    mutateListings();
  };

  const handleRetroactiveFix = async () => {
    if (!activeId) return;
    try {
      const token = localStorage.getItem('worldr_access_token') || localStorage.getItem('token');
      const res = await fetch(`/api/v1/exchange/admin/retroactive-ipo-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyId: activeId })
      });
      let data;
      try {
        data = await res.json();
      } catch (err) {
        alert('Could not parse response. Try again in a minute.');
        return;
      }
      if (!res.ok) alert('Error: ' + (typeof data.error === 'string' ? data.error : data.message || JSON.stringify(data)));
      else { alert('✅ IPO successfully converted to a Primary Offering!\n\nYour shares have been restored and the proceeds moved to the company treasury.'); setRefreshKey(k => k + 1); mutateListings(); }
    } catch(e) { alert('Network Error: ' + e); }
  };

  const tabs: { id: Tab; name: string; badge?: number; warn?: boolean }[] = [
    { id: 'bourse', name: 'Bourse' },
    { id: 'pipeline', name: 'IPO Pipeline', badge: pipelineCount },
    { id: 'acquisitions', name: 'Acquisitions', badge: auctionCount || undefined, warn: auctionCount > 0 },
    { id: 'desk', name: 'My Desk' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          onClick={() => router.push('/drennia/business')}
        >
          ← Back to Business
        </span>
        <WorldTimeControl />
      </div>

      <div style={{ padding: '8px 24px 12px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
          <div>
            <div style={{ ...label, marginBottom: '4px', letterSpacing: '0.2em' }}>Drennport Exchange</div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>DRX Bourse</h1>
            <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>
              Take companies public, build the book, and trade shares with price-time priority.
            </p>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            style={{
              ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              padding: '6px 14px', cursor: 'pointer', marginBottom: '4px',
              background: 'transparent', border: `1px solid ${T.borderGold}`,
              color: T.gold, display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            📖 DRX Guide
          </button>
        </div>
        <DrxIndexBar />
      </div>

      {/* Guide Drawer Overlay */}
      {showGuide && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowGuide(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.55)' }}
        >
          <div style={{
            width: 'min(580px, 95vw)', height: '100%',
            background: '#0E0C14', borderLeft: `1px solid ${T.borderGold}`,
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
            boxShadow: '-8px 0 40px rgba(0,0,0,0.7)',
          }}>
            <div style={{ padding: '24px 28px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ ...label, marginBottom: '4px', letterSpacing: '0.2em' }}>DRX Reference Manual</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: T.ivory }}>Exchange Guide</div>
              </div>
              <button onClick={() => setShowGuide(false)} style={{ background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, cursor: 'pointer', padding: '6px 12px', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ padding: '24px 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>

              {/* Overview */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '16px' }}>📈</span>
                  <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color: T.mint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>What is the DRX Bourse?</span>
                </div>
                <p style={{ fontSize: '12px', color: T.muted, margin: '0 0 8px', lineHeight: 1.7 }}>The Drennport Exchange (DRX) is the only regulated marketplace in the world for publicly-listed company shares. Every trade is matched using <strong style={{ color: T.ivory }}>price-time priority</strong> — the best price wins, and ties go to whoever placed the order first.</p>
                <p style={{ fontSize: '12px', color: T.muted, margin: 0, lineHeight: 1.7 }}>The <strong style={{ color: T.ivory }}>DRX Composite Index</strong> tracks the combined market cap of all listed companies. Watch it to gauge the health of the whole economy.</p>
              </div>

              {/* IPO */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '16px' }}>🏛️</span>
                  <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Taking Your Company Public (IPO)</span>
                </div>
                {[
                  ['1. Eligibility', 'Company must be a Public Corporation with positive book value and at least $50,000 in company assets.'],
                  ['2. File Prospectus', 'Set a price range (min/max per share), choose your public float (10–49% of post-IPO shares), and a lockup period (3–12 months). Pay the filing fee from your company treasury.'],
                  ['3. Regulatory Review', 'The DRX takes 2 arcs to review. You can withdraw for free during this period.'],
                  ['4. Book-Building', 'Investors submit Indications of Interest (IOIs) over 4 arcs, pledging a price and quantity. Their cash is escrowed immediately.'],
                  ['5. Clearing', 'Every valid bid at or above the clearing price receives shares. Oversubscribed IPOs are pro-rated. Proceeds flow to your company treasury (Primary Offering model — you keep your founder shares).'],
                  ['6. Lockup', 'Your founder shares are locked for the chosen period. You cannot sell until expiry.'],
                ].map(([step, desc]) => (
                  <div key={step} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: T.gold, fontWeight: 700, flexShrink: 0, paddingTop: '2px' }}>{step}</span>
                    <p style={{ fontSize: '12px', color: T.muted, margin: 0, lineHeight: 1.65 }}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Secondary market */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '16px' }}>📊</span>
                  <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color: '#7EB9E0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Trading Shares (Secondary Market)</span>
                </div>
                {[
                  ['Limit Orders', 'You set a price. Buy orders wait in the book until a seller matches. Sell orders wait until a buyer matches. Orders may partially fill.'],
                  ['Price-Time Priority', 'Among orders at the same price, the one placed earliest fills first. Being early matters.'],
                  ['Market Maker', 'The DRX Specialist always posts a two-sided quote at ±3% of last close to provide baseline liquidity. You will always see at least two quotes in the book.'],
                  ['Circuit Breaker', 'Orders priced more than ±50% from last close are blocked. This prevents crashes and manipulation.'],
                  ['Trade As', 'Place orders from your Personal Portfolio or from any Capital Partners company you own. Institutions can build positions at scale.'],
                ].map(([term, desc]) => (
                  <div key={term} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: '#7EB9E0', fontWeight: 700, flexShrink: 0, paddingTop: '2px', minWidth: '110px' }}>{term}</span>
                    <p style={{ fontSize: '12px', color: T.muted, margin: 0, lineHeight: 1.65 }}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Shareholders */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '16px' }}>👥</span>
                  <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color: '#B094D4', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Shareholders & Ownership</span>
                </div>
                {[
                  ['General Population', 'Retail NPC investors. They trade the public float among themselves. You only compete against real players and institutions in the live order book.'],
                  ['Institutional Holders', 'Capital Partners firms owned by players. They can hold large positions and place orders from the company treasury.'],
                  ['Lockup Shares', 'Founder shares under lockup cannot be sold. The lockup period you set at IPO determines how long.'],
                  ['EPS & P/E Ratio', 'Earnings Per Share is driven by company profit each arc. Higher profit → higher EPS → better valuation → attracts buyers.'],
                ].map(([term, desc]) => (
                  <div key={term} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: '#B094D4', fontWeight: 700, flexShrink: 0, paddingTop: '2px', minWidth: '130px' }}>{term}</span>
                    <p style={{ fontSize: '12px', color: T.muted, margin: 0, lineHeight: 1.65 }}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Acquisitions */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '16px' }}>🏢</span>
                  <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color: T.red, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Acquisitions</span>
                </div>
                {[
                  ['Distressed Market', 'Companies that run out of cash enter distress. Acquire them outright at a discounted fee from your personal finances.'],
                  ['Auction System', 'Larger distressed companies go to sealed-bid auction. Register, bid, and the highest bidder wins. Losing bids are fully refunded.'],
                  ['Post-Acquisition', 'You inherit all assets, debts, factories, and employees. Turnaround potential varies.'],
                ].map(([term, desc]) => (
                  <div key={term} style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                    <span style={{ ...mono, fontSize: '10px', color: T.red, fontWeight: 700, flexShrink: 0, paddingTop: '2px', minWidth: '130px' }}>{term}</span>
                    <p style={{ fontSize: '12px', color: T.muted, margin: 0, lineHeight: 1.65 }}>{desc}</p>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', paddingBottom: '8px', borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <span style={{ ...mono, fontSize: '11px', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Strategy Tips</span>
                </div>
                {[
                  'Set your IPO price range conservatively. An underpriced IPO raises less money but creates a healthy opening pop and goodwill.',
                  'Watch order book depth before placing large orders. A thin book means your order can move the price significantly.',
                  'Lockup expiry is public. Expect sell pressure when founder lockups expire — plan your trades around that.',
                  'Use a Capital Partners company to build institutional positions at scale without exposing your character account directly.',
                  'A rising DRX Composite Index means high market sentiment — a great time to file an IPO.',
                ].map((tip, i) => (
                  <p key={i} style={{ fontSize: '12px', color: T.muted, margin: '0 0 8px', lineHeight: 1.65, paddingLeft: '4px' }}>• {tip}</p>
                ))}
              </div>

              {/* Disclaimer */}
              <div style={{ padding: '14px 16px', background: 'rgba(201,162,74,0.05)', border: `1px solid ${T.borderGold}`, fontSize: '11px', color: T.faint, lineHeight: 1.6 }}>
                <span style={{ color: T.gold, fontWeight: 700 }}>DRX OFFICIAL NOTICE: </span>
                All trades are final. The Drennport Exchange is not liable for losses due to market conditions, lockup restrictions, or circuit breaker interventions. Trade responsibly.
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: '10px 24px 0', flexShrink: 0, display: 'flex', gap: '4px' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              padding: '8px 16px', cursor: 'pointer',
              background: tab === t.id ? T.panelSoft : 'transparent',
              border: `1px solid ${tab === t.id ? T.borderGold : T.border}`,
              borderBottom: tab === t.id ? `1px solid ${T.panelSoft}` : `1px solid ${T.border}`,
              color: tab === t.id ? T.gold : (t.warn ? '#E8A234' : T.faint),
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {t.name}
            {t.badge != null && t.badge > 0 ? (
              <span style={{ background: t.warn ? '#E8A234' : T.gold, color: T.bg, borderRadius: '8px', padding: '1px 6px', fontSize: '9px' }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {tab === 'bourse' && (
          <>
            {active && (
              <div style={{ marginBottom: '16px', padding: '12px 16px', background: T.panelSoft, border: `1px solid ${T.borderGold}`, display: 'flex', gap: '28px', flexWrap: 'wrap', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: T.ivory, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {active.name}
                    {active.market_cap != null && (
                      <button 
                        onClick={handleRetroactiveFix} 
                        style={{ background: '#442222', border: '1px solid #ff4444', color: '#ffaaaa', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                        title="Secret Admin Fix: Converts Secondary IPO to Primary IPO"
                      >
                        FIX IPO
                      </button>
                    )}
                  </div>
                  <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase' }}>{active.industry_id} · {active.country_id}</div>
                </div>
                {[
                  ['Last', active.last_price != null ? `$${fmt(active.last_price)}` : '—'],
                  ['Bid', active.best_bid != null ? `$${fmt(active.best_bid)}` : '—'],
                  ['Ask', active.best_ask != null ? `$${fmt(active.best_ask)}` : '—'],
                  ['Mkt Cap', active.market_cap != null ? `$${fmtBig(active.market_cap)}` : '—'],
                  ['P/E', active.pe_ratio != null ? fmt(active.pe_ratio, 1) : '—'],
                  ['EPS', active.eps != null ? `$${fmt(active.eps, 3)}` : '—'],
                  ['Book Value', `$${fmtBig(Number(active.company_value))}`],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                    <div style={{ ...mono, fontSize: '13px', fontWeight: 700, color: T.ivory }}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(0, 1.4fr) minmax(240px, 1fr)', gap: '20px', alignItems: 'start' }}>
              <Listings listings={list} selectedId={activeId} onSelect={setSelectedId} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeId ? (
                  <>
                    <PriceChart key={`chart-${activeId}-${refreshKey}`} companyId={activeId} />
                    <OrderBook key={`book-${activeId}-${refreshKey}`} companyId={activeId} />
                    <EarningsPanel key={`earn-${activeId}-${refreshKey}`} companyId={activeId} />
                  </>
                ) : (
                  <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '32px', textAlign: 'center', fontSize: '12px', color: T.faint }}>
                    Select a listed company to view its chart and order book.
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activeId && showQuickIpo && (
                  <QuickIpoPanel
                    companyId={activeId}
                    totalShares={active?.total_shares ?? 1_000_000}
                    onLaunched={onPlaced}
                  />
                )}
                {activeId && !showQuickIpo && <OrderTicket companyId={activeId} lastClose={active?.last_price ?? null} onPlaced={onPlaced} myFinanceFirms={myFinanceFirms} />}
                {activeId && showQuickIpo && (
                  <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '12px 16px', fontSize: '11px', color: T.faint }}>
                    Place buy/sell limit orders here once your IPO is live.
                  </div>
                )}
                {activeId && <ShareholdersChart key={`cap-${activeId}-${refreshKey}`} companyId={activeId} />}
                {activeId && <RecentTrades key={`trades-${activeId}-${refreshKey}`} companyId={activeId} />}
              </div>
            </div>
          </>
        )}

        {tab === 'pipeline' && <Pipeline myFinanceFirms={myFinanceFirms} />}

        {tab === 'acquisitions' && (
          <AuctionTab onBidPlaced={() => mutateListings()} />
        )}

        {tab === 'desk' && (
          <div style={{ maxWidth: '640px' }}>
            <MyDesk refreshKey={refreshKey} />
          </div>
        )}
      </div>
    </div>
  );
}
