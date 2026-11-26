'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import { PageHeader, HeaderStat, Tabs } from '../../../components/ui';
import { characterApi, investmentsApi, exchangeApi, companyApi } from '../../../lib/api';

const T = {
  bg: '#0B0D12',
  panel: '#13161E',
  panelSoft: '#1B1F29',
  paper: '#1E1B14',
  border: '#262B36',
  borderGold: 'rgba(232,184,75,0.22)',
  gold: '#E8B84B',
  ivory: '#ECEAE4',
  muted: '#A3A4AC',
  faint: '#868994',
  mint: '#4FB286',
  steel: '#4B6382',
  red: '#D9625A',
};

const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace", fontVariantNumeric: 'tabular-nums' };
const label: React.CSSProperties = { fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.14em', color: T.gold, fontWeight: 600 }; // design system: section label
const inputStyle: React.CSSProperties = { width: '100%', background: '#1B1F29', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, color: T.ivory, padding: '9px 12px', fontSize: '14px' };

function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
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
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-card">
      <h2 style={{ ...label, margin: '0 0 12px' }}>{title}</h2>
      {children}
    </section>
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
      notify(`Enter a borrow amount up to $${fmtInt(maxAmount)}.`, false);
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
            <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Max amount ($)</div>
            <input aria-label="Maximum loan amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" inputMode="numeric" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Monthly rate (%)</div>
            <input aria-label="Monthly interest rate percent" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="2.5" inputMode="decimal" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Term (months)</div>
            <input aria-label="Loan term in months" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="12" inputMode="numeric" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Purpose (optional)</div>
          <input aria-label="Loan purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Working capital, expansion…" style={inputStyle} />
        </div>
        <button
          onClick={createOffer}
          disabled={busy}
          style={{ marginTop: '10px', padding: '9px 20px', cursor: busy ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 700, background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1, borderRadius: 10 }}
        >
          Post Offer
        </button>
        <NoticeLine notice={notice} />
      </div>

      <Panel title="Open Loan Market">
        {rows.length === 0 && <div style={{ fontSize: '13px', color: T.muted }}>No open loan offers yet. Post one above to become the first lender.</div>}
        {rows.map((o: any) => (
          <div key={o.id} style={{ padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>
                  ${fmtInt(Number(o.max_amount))} <span style={{ color: T.muted, fontWeight: 400 }}>from {o.lender_name}</span>
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
                  style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'rgba(79,178,134,0.15)', color: T.mint, border: `1px solid ${T.mint}`, borderRadius: 10 }}
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
          ${fmtInt(Number(l.principal))} {who}
          <span style={{
            ...mono, fontSize: '10px', marginLeft: '8px', padding: '1px 6px', textTransform: 'uppercase',
            color: l.status === 'active' ? T.mint : l.status === 'repaid' ? T.steel : T.red,
            border: `1px solid ${l.status === 'active' ? T.mint : l.status === 'repaid' ? T.steel : T.red}`,
          }}>{l.status}</span>
        </div>
        <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
          ${fmt(Number(l.monthly_payment))}/mo · {l.months_remaining}/{l.term_months} months left
          {Number(l.missed_payments) > 0 && <span style={{ color: T.red }}> · {l.missed_payments} missed</span>}
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Panel title="Money I Owe">
        {borrowed.length === 0 && <div style={{ fontSize: '13px', color: T.muted }}>No debts. Borrow from the open loan market when you need capital.</div>}
        {borrowed.map((l: any) => (
          <LoanRow
            key={l.id}
            l={l}
            who={`from ${l.lender_name}`}
            action={l.status === 'active' ? (
              <button
                onClick={() => repay(l.id)}
                style={{ fontSize: '13px', background: 'transparent', border: `1px solid ${T.border}`, color: T.muted, padding: '4px 10px', cursor: 'pointer', flexShrink: 0, borderRadius: 10 }}
              >
                Repay Early
              </button>
            ) : undefined}
          />
        ))}
      </Panel>
      <Panel title="Money Owed to Me">
        {lent.length === 0 && <div style={{ fontSize: '13px', color: T.muted }}>You have no loans out. Borrowers repay you, with interest, every month.</div>}
        {lent.map((l: any) => <LoanRow key={l.id} l={l} who={`to ${l.borrower_name}`} />)}
      </Panel>
      {myOffers.length > 0 && (
        <Panel title="My Open Offers">
          {myOffers.map((o: any) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
              <div style={{ ...mono, fontSize: '11px', color: T.muted }}>
                ${fmtInt(Number(o.max_amount))} · {fmt(Number(o.monthly_interest_rate) * 100, 1)}%/mo · {o.term_months}mo
              </div>
              <button
                onClick={() => cancelOffer(o.id)}
                style={{ fontSize: '13px', background: 'transparent', border: `1px solid ${T.border}`, color: T.faint, padding: '4px 10px', cursor: 'pointer', borderRadius: 10 }}
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
                <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Company</div>
                <select aria-label="Company to sell shares of" value={companyId} onChange={(e) => setCompanyId(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                  <option value="">Select…</option>
                  {eligibleCompanies.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Shares</div>
                <input aria-label="Number of shares" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="100000" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Min Purchase</div>
                <input aria-label="Min Purchase" value={minPurchase} onChange={(e) => setMinPurchase(e.target.value)} placeholder="1" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Price / share ($)</div>
                <input aria-label="Price per share" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1.00" inputMode="decimal" style={inputStyle} />
              </div>
            </div>
            {shares && price && Number(shares) > 0 && Number(price) > 0 && (
              <div style={{ ...mono, fontSize: '10px', color: T.muted, marginTop: '8px' }}>
                Raise: <span style={{ color: T.gold }}>${fmt(Number(shares) * Number(price))}</span> · {fmt((Number(shares) / 1000000) * 100, 1)}% of the company (1,000,000 total shares)
              </div>
            )}
            <button
              onClick={create}
              disabled={busy}
              style={{ marginTop: '10px', padding: '9px 20px', cursor: busy ? 'wait' : 'pointer', fontSize: '13px', fontWeight: 700, background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1, borderRadius: 10 }}
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
                  {isOwn && <span style={{ ...mono, fontSize: '10px', color: T.gold, marginLeft: '8px', padding: '1px 6px', border: `1px solid ${T.gold}`, textTransform: 'uppercase' }}>yours</span>}
                </div>
                <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                  {fmtInt(available)} sh ({fmt((available / 1000000) * 100, 1)}%) @ ${fmt(priceVal)} {minP > 1 ? ` · Min: ${minP} sh` : ''} · seller {p.seller_name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ ...mono, fontSize: '12px', fontWeight: 700, color: T.gold }}>${fmtInt(total)}</span>
                {isOwn ? (
                  <button
                    onClick={() => cancelPlacement(p.id)}
                    disabled={busy}
                    style={{ padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'transparent', color: T.red, border: `1px solid ${T.red}`, opacity: busy ? 0.6 : 1, borderRadius: 10 }}
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
                      style={{ padding: '8px 14px', cursor: valid ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: 700, background: valid ? 'rgba(79,178,134,0.15)' : T.border, color: valid ? T.mint : T.bg, border: valid ? `1px solid ${T.mint}` : 'none', opacity: busy || !valid ? 0.6 : 1, borderRadius: 10 }}
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
      {holdings.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No shareholdings yet. Buy in through private placements or the Drennport Exchange.</div>}
      {holdings.map((h: any) => (
        <div key={h.company_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontSize: '12px', color: T.ivory, fontWeight: 700 }}>{h.name}</div>
            <div style={{ ...mono, fontSize: '10px', color: T.faint }}>{fmt(h.ownership_percent, 2)}% · {h.legal_structure_id}</div>
          </div>
          <div style={{ textAlign: 'right', ...mono }}>
            <div style={{ fontSize: '12px', color: T.ivory }}>{fmtInt(Number(h.shares))} sh</div>
            <div style={{ fontSize: '10px', color: T.faint }}>{h.last_price != null ? `mkt $${fmt(Number(h.last_price))}` : 'unlisted'}</div>
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
      <PageHeader
        kicker="Personal finance"
        title="Money & Investments"
        description="Lend to other players, borrow capital, and buy into private companies."
        aside={<><HeaderStat label="Cash in hand" value={cash != null ? `$${fmtInt(cash)}` : '—'} tone="good" /><WorldTimeControl /></>}
      >
        <Tabs
          inset="none"
          label="Money sections"
          tabs={[{ id: 'lending', label: 'Loans' }, { id: 'placements', label: 'Private equity' }]}
          activeId={tab}
          onChange={(id) => setTab(id as MoneyTab)}
          trailing={<button type="button" onClick={() => router.push('/drennia/exchange')} className="text-[13px] font-medium text-info hover:text-ink transition-colors">Drennport Exchange →</button>}
        />
      </PageHeader>

      {/* Content */}
      <div className="page-frame grid flex-1 grid-cols-1 items-start gap-5 overflow-y-auto py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
        {tab === 'lending' ? <LendingDesk onChanged={onChanged} /> : <PlacementsDesk onChanged={onChanged} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <MyLoans refreshKey={refreshKey} onChanged={onChanged} />
          <PortfolioSummary refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
