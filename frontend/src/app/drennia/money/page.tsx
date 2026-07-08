'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import { characterApi, investmentsApi, exchangeApi, companyApi } from '../../../lib/api';

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
  red: '#B85555',
};

const mono: React.CSSProperties = { fontFamily: 'monospace' };
const label: React.CSSProperties = { ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, fontWeight: 700 };
const inputStyle: React.CSSProperties = { ...mono, width: '100%', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory, padding: '8px 10px', fontSize: '12px', outline: 'none' };

function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Math.round(Number(n)).toLocaleString('en-US');
}

type Notice = { text: string; ok: boolean } | null;

function useNotice(): [Notice, (text: string, ok: boolean) => void] {
  const [notice, setNotice] = useState<Notice>(null);
  return [notice, (text, ok) => setNotice({ text, ok })];
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '16px' }}>
      <div style={{ ...label, marginBottom: '12px' }}>{title}</div>
      {children}
    </div>
  );
}

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return <div style={{ fontSize: '11px', color: notice.ok ? T.mint : T.red, marginTop: '8px' }}>{notice.text}</div>;
}

// ── Lending desk: create offers + browse the loan market ──────────────────
function LendingDesk({ onChanged }: { onChanged: () => void }) {
  const { data: offers, mutate } = useSWR('loan-offers', () => investmentsApi.getLoanOffers(), { refreshInterval: 15000 });
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('12');
  const [purpose, setPurpose] = useState('');
  const [borrowAmounts, setBorrowAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [notice, notify] = useNotice();

  const createOffer = async () => {
    const a = Number(amount);
    const r = Number(rate) / 100;
    const t = Number(term);
    if (!Number.isFinite(a) || a <= 0 || !Number.isFinite(r) || r < 0 || r > 0.25 || !Number.isInteger(t) || t < 1 || t > 60) {
      notify('Enter a valid amount, rate (0–25% monthly), and term (1–60 months).', false);
      return;
    }
    setBusy(true);
    try {
      await investmentsApi.createLoanOffer({ max_amount: a, monthly_interest_rate: r, term_months: t, purpose: purpose || undefined });
      notify('Loan offer posted to the market.', true);
      setAmount(''); setRate(''); setPurpose('');
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Failed to post offer.', false);
    } finally { setBusy(false); }
  };

  const accept = async (offerId: string, maxAmount: number) => {
    const a = Number(borrowAmounts[offerId] ?? maxAmount);
    if (!Number.isFinite(a) || a <= 0 || a > maxAmount) {
      notify(`Enter a borrow amount up to §${fmtInt(maxAmount)}.`, false);
      return;
    }
    setBusy(true);
    try {
      await investmentsApi.acceptLoanOffer(offerId, a);
      notify('Loan accepted — funds transferred to your cash.', true);
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Failed to accept loan.', false);
    } finally { setBusy(false); }
  };

  const rows: any[] = offers ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '16px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Post a Loan Offer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Max amount (§)</div>
            <input aria-label="Maximum loan amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" inputMode="numeric" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Monthly rate (%)</div>
            <input aria-label="Monthly interest rate percent" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="2.5" inputMode="decimal" style={inputStyle} />
          </div>
          <div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Term (months)</div>
            <input aria-label="Loan term in months" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="12" inputMode="numeric" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Purpose (optional)</div>
          <input aria-label="Loan purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Working capital, expansion…" style={inputStyle} />
        </div>
        <button
          onClick={createOffer}
          disabled={busy}
          style={{ marginTop: '10px', padding: '9px 20px', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
        >
          Post Offer
        </button>
        <NoticeLine notice={notice} />
      </div>

      <Panel title="Open Loan Market">
        {rows.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No open loan offers. Post one above to become a lender.</div>}
        {rows.map((o: any) => (
          <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>
                  §{fmtInt(Number(o.max_amount))} <span style={{ color: T.muted, fontWeight: 400 }}>from {o.lender_name}</span>
                </div>
                <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                  {fmt(Number(o.monthly_interest_rate) * 100, 1)}%/mo · {o.term_months} months
                  {o.purpose && <span style={{ color: T.faint }}> · &ldquo;{o.purpose}&rdquo;</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  aria-label="Amount to borrow"
                  value={borrowAmounts[o.id] ?? ''}
                  onChange={(e) => setBorrowAmounts((m) => ({ ...m, [o.id]: e.target.value }))}
                  placeholder={fmtInt(Number(o.max_amount))}
                  inputMode="numeric"
                  style={{ ...inputStyle, width: '110px' }}
                />
                <button
                  onClick={() => accept(o.id, Number(o.max_amount))}
                  disabled={busy}
                  style={{ padding: '8px 14px', cursor: 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'rgba(54,211,153,0.15)', color: T.mint, border: `1px solid ${T.mint}` }}
                >
                  Borrow
                </button>
              </div>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  );
}

// ── My loans (borrowed + lent + my open offers) ────────────────────────────
function MyLoans({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { data, mutate } = useSWR(['my-loans', refreshKey], () => investmentsApi.getMyLoans(), { refreshInterval: 15000 });
  const [notice, notify] = useNotice();
  const lent: any[] = data?.lent ?? [];
  const borrowed: any[] = data?.borrowed ?? [];
  const myOffers: any[] = data?.myOffers ?? [];

  const repay = async (id: string) => {
    try {
      await investmentsApi.repayLoanEarly(id);
      notify('Loan repaid in full.', true);
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Repayment failed.', false);
    }
  };

  const cancelOffer = async (id: string) => {
    try {
      await investmentsApi.cancelLoanOffer(id);
      mutate();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Cancel failed.', false);
    }
  };

  const LoanRow = ({ l, who, action }: { l: any; who: string; action?: React.ReactNode }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}`, gap: '8px' }}>
      <div>
        <div style={{ fontSize: '11px', color: T.ivory }}>
          §{fmtInt(Number(l.principal))} {who}
          <span style={{
            ...mono, fontSize: '9px', marginLeft: '8px', padding: '1px 6px', textTransform: 'uppercase',
            color: l.status === 'active' ? T.mint : l.status === 'repaid' ? T.steel : T.red,
            border: `1px solid ${l.status === 'active' ? T.mint : l.status === 'repaid' ? T.steel : T.red}`,
          }}>{l.status}</span>
        </div>
        <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
          §{fmt(Number(l.monthly_payment))}/mo · {l.months_remaining}/{l.term_months} months left
          {Number(l.missed_payments) > 0 && <span style={{ color: T.red }}> · {l.missed_payments} missed</span>}
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Panel title="Money I Owe">
        {borrowed.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No debts. Clean ledger.</div>}
        {borrowed.map((l: any) => (
          <LoanRow
            key={l.id}
            l={l}
            who={`from ${l.lender_name}`}
            action={l.status === 'active' ? (
              <button
                onClick={() => repay(l.id)}
                style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}
              >
                Repay Early
              </button>
            ) : undefined}
          />
        ))}
      </Panel>
      <Panel title="Money Owed to Me">
        {lent.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>You have no active loans out.</div>}
        {lent.map((l: any) => <LoanRow key={l.id} l={l} who={`to ${l.borrower_name}`} />)}
      </Panel>
      {myOffers.length > 0 && (
        <Panel title="My Open Offers">
          {myOffers.map((o: any) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ ...mono, fontSize: '11px', color: T.muted }}>
                §{fmtInt(Number(o.max_amount))} · {fmt(Number(o.monthly_interest_rate) * 100, 1)}%/mo · {o.term_months}mo
              </div>
              <button
                onClick={() => cancelOffer(o.id)}
                style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, padding: '4px 10px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          ))}
        </Panel>
      )}
      <NoticeLine notice={notice} />
    </div>
  );
}

// ── Private placements market ──────────────────────────────────────────────
function PlacementsDesk({ onChanged }: { onChanged: () => void }) {
  const { data: placements, mutate } = useSWR('placements', () => investmentsApi.getPlacements(), { refreshInterval: 15000 });
  const { data: myCharacter } = useSWR('my-character', () => characterApi.getMe().then((r) => r.data));
  const { data: myCompanies } = useSWR('my-companies', () => companyApi.getMy().then((r) => r.data));
  const [companyId, setCompanyId] = useState('');
  const [shares, setShares] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [purchaseAmounts, setPurchaseAmounts] = useState<Record<string, string>>({});
  const [notice, notify] = useNotice();

  const myCharacterId: string | undefined = (myCharacter as any)?.id;

  const companies: any[] = Array.isArray(myCompanies) ? myCompanies : myCompanies?.companies ?? (myCompanies ? [myCompanies] : []);
  const eligibleCompanies = companies.filter((c: any) => c && (c.legal_structure_id === 'private-company' || c.legal_structure_id === 'public-corporation'));

  const create = async () => {
    const s = Number(shares);
    const minP = minPurchase ? Number(minPurchase) : 1;
    const p = Number(price);
    if (!companyId || !Number.isInteger(s) || s <= 0 || !Number.isInteger(minP) || minP <= 0 || minP > s || !Number.isFinite(p) || p <= 0) {
      notify('Select a company and enter valid shares, min purchase, and price.', false);
      return;
    }
    setBusy(true);
    try {
      await investmentsApi.createPlacement({ company_id: companyId, shares: s, min_purchase_shares: minP, price_per_share: p });
      notify('Placement listed.', true);
      setShares(''); setMinPurchase(''); setPrice('');
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Failed to list placement.', false);
    } finally { setBusy(false); }
  };

  const accept = async (id: string, qty?: number) => {
    setBusy(true);
    try {
      await investmentsApi.acceptPlacement(id, qty);
      notify('Shares purchased.', true);
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Purchase failed.', false);
    } finally { setBusy(false); }
  };

  const withdraw = async (id: string) => {
    setBusy(true);
    try {
      await investmentsApi.cancelPlacement(id);
      notify('Placement withdrawn.', true);
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Failed to withdraw placement.', false);
    } finally { setBusy(false); }
  };

  // Bug G fix: owners had no way to cancel their own open placements
  const cancelPlacement = async (id: string) => {
    setBusy(true);
    try {
      await investmentsApi.cancelPlacement(id);
      notify('Placement cancelled — shares returned.', true);
      mutate();
      onChanged();
    } catch (e: any) {
      notify(e?.response?.data?.error || e?.response?.data?.message || 'Cancel failed.', false);
    } finally { setBusy(false); }
  };

  const rows: any[] = placements ?? [];
  const myId = myCharacter?.id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '16px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Sell Shares Privately</div>
        {eligibleCompanies.length === 0 ? (
          <div style={{ fontSize: '11px', color: T.faint, lineHeight: 1.7 }}>
            Only Private Companies and Public Corporations can sell equity. Convert your company&apos;s legal structure from the Business desk.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Company</div>
                <select aria-label="Company to sell shares of" value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Select…</option>
                  {eligibleCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Shares</div>
                <input aria-label="Number of shares" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="100000" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Min Purchase</div>
                <input aria-label="Min Purchase" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} placeholder="1" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Price / share (§)</div>
                <input aria-label="Price per share" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1.00" inputMode="decimal" style={inputStyle} />
              </div>
            </div>
            {shares && price && Number(shares) > 0 && Number(price) > 0 && (
              <div style={{ ...mono, fontSize: '10px', color: T.muted, marginTop: '8px' }}>
                Raise: <span style={{ color: T.gold }}>§{fmt(Number(shares) * Number(price))}</span> · {fmt((Number(shares) / 1000000) * 100, 1)}% of the company (1,000,000 total shares)
              </div>
            )}
            <button
              onClick={create}
              disabled={busy}
              style={{ marginTop: '10px', padding: '9px 20px', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
            >
              List Placement
            </button>
          </>
        )}
        <NoticeLine notice={notice} />
      </div>

      <Panel title="Open Placements">
        {rows.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No private placements on the market.</div>}
        {rows.map((p: any) => {
          const isOwn = myCharacterId && p.seller_character_id === myCharacterId;
          const available = Number(p.shares);
          const priceVal = Number(p.price_per_share);
          const minP = Number(p.min_purchase_shares) || 1;
          const inputVal = purchaseAmounts[p.id];
          const qty = inputVal !== undefined ? Number(inputVal) : available;
          const valid = Number.isInteger(qty) && qty > 0 && qty <= available && (qty >= Math.min(minP, available) || qty === available);
          const total = qty * priceVal;

          return (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}`, gap: '8px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>
                  {p.company_name}
                  {isOwn && <span style={{ ...mono, fontSize: '9px', color: T.gold, marginLeft: '8px', padding: '1px 6px', border: `1px solid ${T.gold}`, textTransform: 'uppercase' }}>yours</span>}
                </div>
                <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                  {fmtInt(available)} sh ({fmt((available / 1000000) * 100, 1)}%) @ §{fmt(priceVal)} {minP > 1 ? ` · Min: ${minP} sh` : ''} · seller {p.seller_name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.gold }}>§{fmtInt(total)}</span>
                {isOwn ? (
                  <button
                    onClick={() => cancelPlacement(p.id)}
                    disabled={busy}
                    style={{ padding: '8px 14px', cursor: 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', color: T.red, border: `1px solid ${T.red}`, opacity: busy ? 0.6 : 1 }}
                  >
                    Cancel
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      aria-label="Shares to buy" 
                      value={inputVal ?? available} 
                      onChange={(e) => setPurchaseAmounts({ ...purchaseAmounts, [p.id]: e.target.value })} 
                      placeholder={available.toString()} 
                      inputMode="numeric" 
                      style={{ ...inputStyle, width: '70px', padding: '4px 6px', fontSize: '10px' }} 
                    />
                    <button
                      onClick={() => accept(p.id, qty)}
                      disabled={busy || !valid}
                      style={{ padding: '8px 14px', cursor: valid ? 'pointer' : 'not-allowed', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: valid ? 'rgba(54,211,153,0.15)' : T.border, color: valid ? T.mint : T.bg, border: valid ? `1px solid ${T.mint}` : 'none', opacity: busy || !valid ? 0.6 : 1 }}
                    >
                      Buy
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Panel>
    </div>
  );
}

// ── Portfolio summary ──────────────────────────────────────────────────────
function PortfolioSummary({ refreshKey }: { refreshKey: number }) {
  const { data: portfolio } = useSWR(['money-portfolio', refreshKey], () => exchangeApi.getMyPortfolio(), { refreshInterval: 15000 });
  const holdings: any[] = portfolio ?? [];
  return (
    <Panel title="Share Portfolio">
      {holdings.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No shareholdings. Buy in via placements or the Westport Bourse.</div>}
      {holdings.map((h: any) => (
        <div key={h.company_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>{h.name}</div>
            <div style={{ ...mono, fontSize: '9px', color: T.faint }}>{fmt(h.ownership_percent, 2)}% · {h.legal_structure_id}</div>
          </div>
          <div style={{ textAlign: 'right', ...mono }}>
            <div style={{ fontSize: '12px', color: T.ivory }}>{fmtInt(Number(h.shares))} sh</div>
            <div style={{ fontSize: '10px', color: T.faint }}>{h.last_price != null ? `mkt §${fmt(Number(h.last_price))}` : 'unlisted'}</div>
          </div>
        </div>
      ))}
    </Panel>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
type MoneyTab = 'lending' | 'placements';

export default function MoneyPage() {
  const router = useRouter();
  const [tab, setTab] = useState<MoneyTab>('lending');
  const [refreshKey, setRefreshKey] = useState(0);
  const onChanged = () => setRefreshKey((k) => k + 1);

  const { data: me } = useSWR(['character-me', refreshKey], () => characterApi.getMe().then((r) => r.data), { refreshInterval: 15000 });
  const cash = me?.finances?.cash_in_hand != null ? Number(me.finances.cash_in_hand) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      <div style={{ padding: '16px 24px 0', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{ cursor: 'pointer', color: T.muted, fontSize: '11px', ...mono, textTransform: 'uppercase', letterSpacing: '0.1em' }}
          onClick={() => router.push('/drennia/chronicle')}
        >
          ← Back to Chronicle
        </span>
        <WorldTimeControl />
      </div>

      <div style={{ padding: '8px 24px 8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ ...label, marginBottom: '4px', letterSpacing: '0.2em' }}>Personal Finance Division</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>Money &amp; Investments</h1>
          <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>Lend to other players, borrow capital, and buy into private companies.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Cash in Hand</div>
          <div style={{ ...mono, fontSize: '20px', fontWeight: 700, color: T.mint }}>{cash != null ? `§${fmtInt(cash)}` : '—'}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 24px', flexShrink: 0, display: 'flex', gap: '2px', borderBottom: `1px solid ${T.border}` }}>
        {([['lending', 'Loans'], ['placements', 'Private Equity']] as const).map(([id, name]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
              padding: '10px 18px', cursor: 'pointer', background: tab === id ? T.panel : 'transparent',
              border: 'none', borderBottom: `2px solid ${tab === id ? T.gold : 'transparent'}`,
              color: tab === id ? T.gold : T.faint,
            }}
          >
            {name}
          </button>
        ))}
        <button
          onClick={() => router.push('/drennia/exchange')}
          style={{ ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '10px 18px', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: T.steel, marginLeft: 'auto' }}
        >
          Westport Bourse →
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(260px, 1fr)', gap: '20px', alignItems: 'start' }}>
        {tab === 'lending' ? <LendingDesk onChanged={onChanged} /> : <PlacementsDesk onChanged={onChanged} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <MyLoans refreshKey={refreshKey} onChanged={onChanged} />
          <PortfolioSummary refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
