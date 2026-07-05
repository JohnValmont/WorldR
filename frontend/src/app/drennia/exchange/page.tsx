'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import { exchangeApi } from '../../../lib/api';

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
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString();
}

// ── Listings table (left column) ──────────────────────────────────────────
function Listings({ listings, selectedId, onSelect }: { listings: any[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>Listed Companies</div>
      {listings.length === 0 && (
        <div style={{ fontSize: '11px', color: T.faint, lineHeight: 1.7 }}>
          No public corporations listed yet. Convert a company to a Public Corporation (§250,000 min value) to IPO on the Bourse.
        </div>
      )}
      {listings.map((l) => {
        const change = l.last_price != null && l.prev_price != null ? ((l.last_price - l.prev_price) / l.prev_price) * 100 : null;
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
              <div style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.ivory }}>{l.last_price != null ? `§${fmt(l.last_price)}` : 'unpriced'}</div>
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

// ── Order book (center) ───────────────────────────────────────────────────
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
      <span style={{ color: side === 'bid' ? T.mint : T.red, zIndex: 1 }}>§{fmt(Number(price))}</span>
      <span style={{ color: T.muted, zIndex: 1 }}>{fmtInt(Number(quantity))}</span>
    </div>
  );

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>Order Book</div>
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

// ── Trade ticket ───────────────────────────────────────────────────────────
function OrderTicket({ companyId, onPlaced }: { companyId: string; onPlaced: () => void }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const submit = async () => {
    const p = Number(price);
    const q = Number(quantity);
    if (!Number.isFinite(p) || p <= 0 || !Number.isInteger(q) || q <= 0) {
      setMsg({ text: 'Enter a valid price and whole-share quantity.', ok: false });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const result = await exchangeApi.placeOrder(companyId, { side, price: p, quantity: q });
      const filled = Number(result?.order?.filled_quantity ?? 0);
      setMsg({ text: filled >= q ? `Filled ${fmtInt(q)} shares.` : filled > 0 ? `Partially filled ${fmtInt(filled)}/${fmtInt(q)}; rest resting on book.` : 'Order resting on the book.', ok: true });
      setPrice('');
      setQuantity('');
      onPlaced();
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.message || 'Order failed.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    ...mono, width: '100%', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory,
    padding: '8px 10px', fontSize: '12px', outline: 'none',
  };

  return (
    <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '16px' }}>
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
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Limit price (§ per share)</div>
          <input aria-label="Limit price per share" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" inputMode="decimal" style={inputStyle} />
        </div>
        <div>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Quantity (shares)</div>
          <input aria-label="Quantity of shares" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" inputMode="numeric" style={inputStyle} />
        </div>
        {price && quantity && Number(price) > 0 && Number(quantity) > 0 && (
          <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
            Notional: <span style={{ color: T.gold }}>§{fmt(Number(price) * Number(quantity))}</span>
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

// ── Recent trades ──────────────────────────────────────────────────────────
function RecentTrades({ companyId }: { companyId: string }) {
  const { data: trades } = useSWR(['trades', companyId], () => exchangeApi.getTrades(companyId), { refreshInterval: 8000 });
  const rows: any[] = trades ?? [];
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>Recent Trades</div>
      {rows.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No trades yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '220px', overflowY: 'auto' }}>
        {rows.map((t: any, i: number) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px', ...mono, borderBottom: `1px solid ${T.border}` }}>
            <span style={{ color: T.ivory }}>§{fmt(Number(t.price))}</span>
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

  const cancel = async (id: string) => {
    try {
      await exchangeApi.cancelOrder(id);
      mutateOrders();
    } catch { /* surface silently; row remains */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>My Holdings</div>
        {holdings.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>You hold no shares.</div>}
        {holdings.map((h: any) => (
          <div key={h.company_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <div>
              <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>{h.name}</div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint }}>{fmt(h.ownership_percent, 2)}% ownership · basis §{fmt(Number(h.avg_cost_basis))}</div>
            </div>
            <div style={{ textAlign: 'right', ...mono }}>
              <div style={{ fontSize: '12px', color: T.ivory }}>{fmtInt(Number(h.shares))} sh</div>
              <div style={{ fontSize: '10px', color: h.last_price != null && Number(h.avg_cost_basis) > 0 ? (Number(h.last_price) >= Number(h.avg_cost_basis) ? T.mint : T.red) : T.faint }}>
                {h.last_price != null ? `mkt §${fmt(Number(h.last_price))}` : 'unpriced'}
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
              </div>
              <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                {fmtInt(Number(o.quantity) - Number(o.filled_quantity))} sh @ §{fmt(Number(o.price))}
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
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function ExchangePage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: listings, mutate: mutateListings } = useSWR('exchange-listings', () => exchangeApi.getListings(), { refreshInterval: 15000 });
  const list: any[] = listings ?? [];
  const activeId = selectedId ?? list[0]?.id ?? null;
  const active = list.find((l) => l.id === activeId) ?? null;

  const onPlaced = () => {
    setRefreshKey((k) => k + 1);
    mutateListings();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 24px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          onClick={() => router.push('/drennia/market')}
        >
          ← Back to Market
        </span>
        <WorldTimeControl />
      </div>
      <div style={{ padding: '8px 24px 8px', flexShrink: 0 }}>
        <div style={{ ...label, marginBottom: '4px', letterSpacing: '0.2em' }}>Westport Bourse</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>Share Exchange</h1>
        <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>
          Player-owned public corporations. Limit orders, price-time priority, trades settle instantly.
        </p>
      </div>

      {/* Active company strip */}
      {active && (
        <div style={{ margin: '8px 24px 0', padding: '12px 16px', background: T.panelSoft, border: `1px solid ${T.borderGold}`, display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'baseline', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: T.ivory }}>{active.name}</div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase' }}>{active.industry_id} · {active.country_id}</div>
          </div>
          {[
            ['Last', active.last_price != null ? `§${fmt(active.last_price)}` : '—'],
            ['Bid', active.best_bid != null ? `§${fmt(active.best_bid)}` : '—'],
            ['Ask', active.best_ask != null ? `§${fmt(active.best_ask)}` : '—'],
            ['Mkt Cap', active.market_cap != null ? `§${fmtInt(Math.round(active.market_cap))}` : '—'],
            ['Book Value', `§${fmtInt(Math.round(Number(active.company_value)))}`],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
              <div style={{ ...mono, fontSize: '13px', fontWeight: 700, color: T.ivory }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Content grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(0, 1.4fr) minmax(240px, 1fr)', gap: '20px', alignItems: 'start' }}>
        <Listings listings={list} selectedId={activeId} onSelect={setSelectedId} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeId ? (
            <>
              <OrderBook key={`book-${activeId}-${refreshKey}`} companyId={activeId} />
              <RecentTrades key={`trades-${activeId}-${refreshKey}`} companyId={activeId} />
            </>
          ) : (
            <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '32px', textAlign: 'center', fontSize: '12px', color: T.faint }}>
              Select a listed company to view its order book.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeId && <OrderTicket companyId={activeId} onPlaced={onPlaced} />}
          <MyDesk refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
