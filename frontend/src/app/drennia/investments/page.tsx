'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import { investmentsApi, companyApi } from '../../../lib/api';

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
const label: React.CSSProperties = { ...mono, fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: T.gold, fontWeight: 700 };

function fmt(n: number | null | undefined, dec = 2): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-US');
}

const inputStyle: React.CSSProperties = {
  ...mono, width: '100%', background: T.bg, border: `1px solid ${T.border}`, color: T.ivory,
  padding: '8px 10px', fontSize: '12px', outline: 'none',
};

// ─── Private Placements tab ────────────────────────────────────────────────

function PlacementsTab() {
  const { data: open, mutate: mutateOpen } = useSWR('open-placements', () => investmentsApi.getPlacements(), { refreshInterval: 15000 });
  const { data: mine, mutate: mutateMine } = useSWR('my-placements', () => investmentsApi.getMyPlacements(), { refreshInterval: 15000 });
  const { data: companiesRaw } = useSWR('my-companies', () => companyApi.getMy().then((r: any) => r.data), { revalidateOnFocus: false });

  const openPlacements: any[] = open ?? [];
  const myPlacements: any[] = mine ?? [];
  // Only private companies (or public) that the character holds equity in can post placements
  const myCompanies: any[] = (companiesRaw ?? []).filter((c: any) => !c.is_npc && c.legal_structure_id !== 'sole-trader');

  const [showForm, setShowForm] = useState(false);
  const [formCompany, setFormCompany] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formMinPurchase, setFormMinPurchase] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [purchaseAmounts, setPurchaseAmounts] = useState<Record<string, string>>({});

  const postPlacement = async () => {
    const shares = Number(formShares);
    const minPurchase = formMinPurchase ? Number(formMinPurchase) : 1;
    const price = Number(formPrice);
    if (!formCompany) { setMsg({ text: 'Select a company.', ok: false }); return; }
    if (!Number.isInteger(shares) || shares <= 0) { setMsg({ text: 'Enter a valid whole-number share count.', ok: false }); return; }
    if (!Number.isInteger(minPurchase) || minPurchase <= 0 || minPurchase > shares) { setMsg({ text: 'Enter a valid minimum purchase amount (must be <= total shares).', ok: false }); return; }
    if (!Number.isFinite(price) || price <= 0) { setMsg({ text: 'Enter a valid price per share.', ok: false }); return; }

    setBusy(true);
    setMsg(null);
    try {
      await investmentsApi.createPlacement({
        company_id: formCompany,
        shares,
        min_purchase_shares: minPurchase,
        price_per_share: price,
        target_character_id: formTarget.trim() || undefined,
      });
      setMsg({ text: 'Placement posted. Shares are escrowed until the placement is accepted or cancelled.', ok: true });
      setShowForm(false);
      setFormCompany(''); setFormShares(''); setFormMinPurchase(''); setFormPrice(''); setFormTarget('');
      mutateMine();
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || e?.response?.data?.message || 'Failed to post placement.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const cancelPlacement = async (id: string) => {
    try {
      await investmentsApi.cancelPlacement(id);
      mutateMine();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || 'Cancel failed.');
    }
  };

  const acceptPlacement = async (id: string, qty?: number) => {
    try {
      await investmentsApi.acceptPlacement(id, qty);
      mutateOpen();
      mutateMine();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || 'Accept failed.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Post a placement */}
      <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? '16px' : '0' }}>
          <div>
            <div style={{ ...label, marginBottom: '4px' }}>Post a Private Placement</div>
            <div style={{ fontSize: '11px', color: T.muted }}>Offer a block of shares in one of your companies at a fixed price.</div>
          </div>
          <button
            onClick={() => { setShowForm(f => !f); setMsg(null); }}
            style={{ ...mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 14px', background: showForm ? T.bg : T.gold, color: showForm ? T.muted : T.bg, border: `1px solid ${showForm ? T.border : T.gold}`, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ New Offering'}
          </button>
        </div>

        {showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Company</div>
              <select
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                aria-label="Select company for placement"
              >
                <option value="">— select company —</option>
                {myCompanies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.legal_structure_id})</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Shares to offer</div>
                <input aria-label="Shares to offer" value={formShares} onChange={(e) => setFormShares(e.target.value)} placeholder="e.g. 50000" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Min Purchase</div>
                <input aria-label="Min Purchase" value={formMinPurchase} onChange={(e) => setFormMinPurchase(e.target.value)} placeholder="Default: 1" inputMode="numeric" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Price per share ($)</div>
                <input aria-label="Price per share" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="e.g. 2.50" inputMode="decimal" style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Target character ID (optional — leave blank for open)</div>
              <input aria-label="Target character ID" value={formTarget} onChange={(e) => setFormTarget(e.target.value)} placeholder="Character UUID for private offer" style={inputStyle} />
            </div>
            {formShares && formPrice && Number(formShares) > 0 && Number(formPrice) > 0 && (
              <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                Total: <span style={{ color: T.gold }}>${fmt(Number(formShares) * Number(formPrice))}</span>
                {' · '}Shares escrowed immediately on posting
              </div>
            )}
            <button
              onClick={postPlacement}
              disabled={busy}
              style={{ padding: '10px 0', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Posting…' : 'Post Placement'}
            </button>
            {msg && <div style={{ fontSize: '11px', color: msg.ok ? T.mint : T.red }}>{msg.text}</div>}
          </div>
        )}
        {!showForm && msg && <div style={{ fontSize: '11px', color: msg.ok ? T.mint : T.red, marginTop: '8px' }}>{msg.text}</div>}
      </div>

      {/* My posted placements */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>My Posted Placements</div>
        {myPlacements.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>You have no placements posted.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {myPlacements.map((p: any) => (
            <div
              key={p.id}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: T.panelSoft, border: `1px solid ${T.border}` }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: T.ivory }}>{p.company_name}</div>
                <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                  {fmtInt(Number(p.shares))} sh @ ${fmt(Number(p.price_per_share))} = ${fmt(Number(p.shares) * Number(p.price_per_share))}
                </div>
                {p.target_name && <div style={{ ...mono, fontSize: '9px', color: T.steel }}>Reserved for: {p.target_name}</div>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px',
                  background: p.status === 'open' ? 'rgba(201,162,74,0.12)' : p.status === 'accepted' ? 'rgba(54,211,153,0.12)' : 'rgba(107,99,88,0.2)',
                  color: p.status === 'open' ? T.gold : p.status === 'accepted' ? T.mint : T.faint,
                  border: `1px solid ${p.status === 'open' ? T.borderGold : p.status === 'accepted' ? 'rgba(54,211,153,0.25)' : T.border}`,
                }}>
                  {p.status}
                </span>
                {p.status === 'open' && (
                  <button
                    onClick={() => cancelPlacement(p.id)}
                    style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', background: 'transparent', border: `1px solid ${T.border}`, color: T.red, padding: '4px 10px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Open placements from others */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Open Placements — Market</div>
        <p style={{ fontSize: '11px', color: T.muted, margin: '0 0 12px', lineHeight: 1.7 }}>
          Fixed-price share blocks offered by other players. Private company shares, transferred immediately on acceptance.
        </p>
        {openPlacements.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No open placements on the market right now.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {openPlacements.map((p: any) => {
            const available = Number(p.shares);
            const price = Number(p.price_per_share);
            const minPurchase = Number(p.min_purchase_shares) || 1;
            const inputVal = purchaseAmounts[p.id];
            const qty = inputVal !== undefined ? Number(inputVal) : available;
            const valid = Number.isInteger(qty) && qty > 0 && qty <= available && (qty >= Math.min(minPurchase, available) || qty === available);
            const total = qty * price;
            return (
              <div
                key={p.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: T.panelSoft, border: `1px solid ${T.border}` }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>{p.company_name}</div>
                  <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                    {fmtInt(available)} shares @ ${fmt(price)} {minPurchase > 1 ? ` · Min: ${minPurchase} sh` : ''}
                  </div>
                  <div style={{ ...mono, fontSize: '9px', color: T.faint }}>
                    Seller: {p.seller_name} · {p.legal_structure_id}
                    {p.target_character_id && <span style={{ color: T.steel }}> · Private offer</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input 
                      aria-label="Shares to buy" 
                      value={inputVal ?? available} 
                      onChange={(e) => setPurchaseAmounts({ ...purchaseAmounts, [p.id]: e.target.value })} 
                      placeholder={available.toString()} 
                      inputMode="numeric" 
                      style={{ ...inputStyle, width: '70px', padding: '4px 6px', fontSize: '10px' }} 
                    />
                    <div style={{ ...mono, fontSize: '9px', color: T.gold, width: '60px', textAlign: 'right' }}>
                      ${fmt(total)}
                    </div>
                  </div>
                  <button
                    onClick={() => acceptPlacement(p.id, qty)}
                    disabled={!valid}
                    style={{ ...mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', background: valid ? T.mint : T.border, color: T.bg, border: 'none', padding: '6px 14px', cursor: valid ? 'pointer' : 'not-allowed' }}
                  >
                    Buy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── P2P Loans tab ────────────────────────────────────────────────────────

function LoansTab() {
  const { data: offersRaw, mutate: mutateOffers } = useSWR('open-loan-offers', () => investmentsApi.getLoanOffers(), { refreshInterval: 15000 });
  const { data: myLoansRaw, mutate: mutateMyLoans } = useSWR('my-loans', () => investmentsApi.getMyLoans(), { refreshInterval: 15000 });

  const offers: any[] = offersRaw ?? [];
  const lent: any[] = myLoansRaw?.lent ?? [];
  const borrowed: any[] = myLoansRaw?.borrowed ?? [];
  const myOffers: any[] = myLoansRaw?.myOffers ?? [];

  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [term, setTerm] = useState('');
  const [purpose, setPurpose] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [acceptId, setAcceptId] = useState<string | null>(null);
  const [acceptAmount, setAcceptAmount] = useState('');
  const [acceptBusy, setAcceptBusy] = useState(false);

  const postOffer = async () => {
    const a = Number(amount);
    const r = Number(rate) / 100; // input as percent
    const t = Number(term);
    if (!Number.isFinite(a) || a <= 0) { setMsg({ text: 'Enter a valid loan amount.', ok: false }); return; }
    if (r < 0 || r > 0.25) { setMsg({ text: 'Monthly interest rate must be 0–25%.', ok: false }); return; }
    if (!Number.isInteger(t) || t < 1 || t > 60) { setMsg({ text: 'Term must be 1–60 months.', ok: false }); return; }

    setBusy(true);
    setMsg(null);
    try {
      await investmentsApi.createLoanOffer({ max_amount: a, monthly_interest_rate: r, term_months: t, purpose: purpose.trim() || undefined });
      setMsg({ text: 'Loan offer posted to the market.', ok: true });
      setShowForm(false);
      setAmount(''); setRate(''); setTerm(''); setPurpose('');
      mutateOffers(); mutateMyLoans();
    } catch (e: any) {
      setMsg({ text: e?.response?.data?.error || e?.response?.data?.message || 'Failed to post offer.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const acceptOffer = async (offerId: string, amt: number) => {
    setAcceptBusy(true);
    try {
      await investmentsApi.acceptLoanOffer(offerId, amt);
      mutateOffers(); mutateMyLoans();
      setAcceptId(null); setAcceptAmount('');
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || 'Accept failed.');
    } finally {
      setAcceptBusy(false);
    }
  };

  const cancelOffer = async (offerId: string) => {
    try {
      await investmentsApi.cancelLoanOffer(offerId);
      mutateOffers(); mutateMyLoans();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || 'Cancel failed.');
    }
  };

  const repayEarly = async (loanId: string) => {
    try {
      await investmentsApi.repayLoanEarly(loanId);
      mutateMyLoans();
    } catch (e: any) {
      alert(e?.response?.data?.error || e?.response?.data?.message || 'Repay failed.');
    }
  };

  // Compute monthly payment preview
  const previewPayment = (() => {
    const a = Number(amount);
    const r = Number(rate) / 100;
    const t = Number(term);
    if (!(a > 0 && t > 0)) return null;
    if (r <= 0) return a / t;
    const f = Math.pow(1 + r, t);
    return (a * r * f) / (f - 1);
  })();

  const statusBadge = (status: string) => {
    const color = status === 'active' ? T.mint : status === 'repaid' ? T.muted : status === 'defaulted' ? T.red : T.gold;
    return (
      <span style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '3px 8px', background: `${color}18`, color, border: `1px solid ${color}40` }}>
        {status}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Post loan offer */}
      <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showForm ? '16px' : '0' }}>
          <div>
            <div style={{ ...label, marginBottom: '4px' }}>Post a Loan Offer</div>
            <div style={{ fontSize: '11px', color: T.muted }}>Lend capital to other players at your chosen rate and term.</div>
          </div>
          <button
            onClick={() => { setShowForm(f => !f); setMsg(null); }}
            style={{ ...mono, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 14px', background: showForm ? T.bg : T.gold, color: showForm ? T.muted : T.bg, border: `1px solid ${showForm ? T.border : T.gold}`, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Offer Capital'}
          </button>
        </div>

        {showForm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Max Amount ($)</div>
                <input aria-label="Max loan amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5000" inputMode="decimal" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Monthly Interest (%)</div>
                <input aria-label="Monthly interest rate percent" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="e.g. 2" inputMode="decimal" style={inputStyle} />
              </div>
              <div>
                <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Term (months, 1–60)</div>
                <input aria-label="Loan term in months" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. 12" inputMode="numeric" style={inputStyle} />
              </div>
            </div>
            <div>
              <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Purpose / Notes (optional)</div>
              <input aria-label="Loan purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Business expansion, working capital…" style={inputStyle} />
            </div>
            {previewPayment != null && (
              <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                Borrower pays approx. <span style={{ color: T.gold }}>${fmt(previewPayment)}/month</span>
                {' · '}Total repayable: <span style={{ color: T.muted }}>${fmt(previewPayment * Number(term))}</span>
              </div>
            )}
            <button
              onClick={postOffer}
              disabled={busy}
              style={{ padding: '10px 0', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'Posting…' : 'Post Loan Offer'}
            </button>
            {msg && <div style={{ fontSize: '11px', color: msg.ok ? T.mint : T.red }}>{msg.text}</div>}
          </div>
        )}
        {!showForm && msg && <div style={{ fontSize: '11px', color: msg.ok ? T.mint : T.red, marginTop: '8px' }}>{msg.text}</div>}

        {/* My open loan offers */}
        {myOffers.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${T.border}` }}>
            <div style={{ ...label, marginBottom: '8px', color: T.faint }}>My Open Offers</div>
            {myOffers.map((o: any) => (
              <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                <div style={{ ...mono, fontSize: '11px', color: T.muted }}>
                  ${fmt(Number(o.max_amount), 0)} · {Number(o.monthly_interest_rate) * 100}%/mo · {o.term_months} months
                  {o.purpose && <span style={{ color: T.faint }}> — {o.purpose}</span>}
                </div>
                <button onClick={() => cancelOffer(o.id)} style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${T.border}`, color: T.red, padding: '4px 10px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Open offers from others */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Open Loan Offers — Market</div>
        <p style={{ fontSize: '11px', color: T.muted, margin: '0 0 12px', lineHeight: 1.7 }}>
          Capital offered by other players. Monthly payments are collected automatically each game month.
        </p>
        {offers.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>No open loan offers right now.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {offers.map((o: any) => {
            const r = Number(o.monthly_interest_rate) * 100;
            const isExpanded = acceptId === o.id;
            return (
              <div key={o.id} style={{ background: T.panelSoft, border: `1px solid ${T.border}`, padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>
                      Up to ${fmtInt(Number(o.max_amount))}
                    </div>
                    <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                      {fmt(r, 2)}% / month · {o.term_months} months · Lender: {o.lender_name}
                    </div>
                    {o.purpose && <div style={{ fontSize: '11px', color: T.faint, marginTop: '4px' }}>{o.purpose}</div>}
                  </div>
                  <button
                    onClick={() => { setAcceptId(isExpanded ? null : o.id); setAcceptAmount(''); }}
                    style={{ ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '7px 14px', background: isExpanded ? T.bg : T.steel, color: T.ivory, border: `1px solid ${isExpanded ? T.border : T.steel}`, cursor: 'pointer', flexShrink: 0 }}
                  >
                    {isExpanded ? 'Close' : 'Borrow'}
                  </button>
                </div>
                {isExpanded && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ ...mono, fontSize: '9px', color: T.faint, textTransform: 'uppercase', marginBottom: '4px' }}>Amount to borrow ($ 1 – {fmtInt(Number(o.max_amount))})</div>
                      <input aria-label="Amount to borrow" value={acceptAmount} onChange={(e) => setAcceptAmount(e.target.value)} placeholder={`max $${fmtInt(Number(o.max_amount))}`} inputMode="decimal" style={inputStyle} />
                    </div>
                    <button
                      onClick={() => acceptOffer(o.id, Number(acceptAmount))}
                      disabled={acceptBusy || !acceptAmount}
                      style={{ ...mono, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '9px 18px', background: T.mint, color: T.bg, border: 'none', cursor: 'pointer', opacity: acceptBusy ? 0.6 : 1, flexShrink: 0 }}
                    >
                      {acceptBusy ? 'Processing…' : 'Confirm'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active loans — borrowed */}
      {borrowed.length > 0 && (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
          <div style={{ ...label, marginBottom: '12px' }}>My Borrowed Loans</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {borrowed.map((l: any) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ ...mono, fontSize: '11px', color: T.ivory }}>
                    ${fmtInt(Number(l.principal))} from {l.lender_name}
                  </div>
                  <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                    ${fmt(Number(l.monthly_payment))}/mo · {l.months_remaining} months left
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {statusBadge(l.status)}
                  {l.status === 'active' && (
                    <button
                      onClick={() => repayEarly(l.id)}
                      style={{ ...mono, fontSize: '9px', textTransform: 'uppercase', background: 'transparent', border: `1px solid ${T.border}`, color: T.mint, padding: '4px 10px', cursor: 'pointer' }}
                    >
                      Repay Early (${fmt(Number(l.monthly_payment) * Number(l.months_remaining))})
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active loans — lent */}
      {lent.length > 0 && (
        <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
          <div style={{ ...label, marginBottom: '12px' }}>Capital I Have Lent</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lent.map((l: any) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ ...mono, fontSize: '11px', color: T.ivory }}>
                    ${fmtInt(Number(l.principal))} to {l.borrower_name}
                  </div>
                  <div style={{ ...mono, fontSize: '10px', color: T.muted }}>
                    ${fmt(Number(l.monthly_payment))}/mo · {l.months_remaining} months remaining · Paid: ${fmt(Number(l.total_paid))}
                  </div>
                </div>
                {statusBadge(l.status)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function InvestmentsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'placements' | 'loans'>('placements');

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
      <div style={{ padding: '8px 24px 12px', flexShrink: 0 }}>
        <div style={{ ...label, marginBottom: '4px', letterSpacing: '0.2em' }}>Drennia Commerce Division</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: T.ivory, margin: '0 0 4px' }}>Private Capital Market</h1>
        <p style={{ fontSize: '12px', color: T.muted, margin: 0 }}>
          Private equity placements for unlisted companies, and player-to-player loans.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 24px', flexShrink: 0, display: 'flex', gap: '0', borderBottom: `1px solid ${T.border}` }}>
        {([
          { key: 'placements', label: 'Private Placements' },
          { key: 'loans', label: 'P2P Loans' },
        ] as const).map(({ key, label: tabLabel }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              ...mono, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em',
              padding: '10px 20px', background: 'transparent', cursor: 'pointer',
              border: 'none',
              borderBottom: tab === key ? `2px solid ${T.gold}` : '2px solid transparent',
              color: tab === key ? T.gold : T.faint,
              fontWeight: tab === key ? 700 : 400,
              marginBottom: '-1px',
            }}
          >
            {tabLabel}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {tab === 'placements' ? <PlacementsTab /> : <LoansTab />}
      </div>
    </div>
  );
}
