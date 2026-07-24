'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { exchangeApi } from '../../../lib/api';

const T = {
  bg: '#090A0F',
  panel: '#11131A',
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

function fmt(n: number | null | undefined, dec = 0): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const TOTAL_SHARES = 1_000_000;

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Regulatory Review',
  book_building: 'Book-Building (Roadshow)',
  listed: 'Listed on the DRX',
  withdrawn: 'Withdrawn',
  failed: 'Offering Failed',
};

export default function IpoDeskPanel({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { data: elig, mutate: mutateElig } = useSWR(['ipo-elig', companyId], () => exchangeApi.getEligibility(companyId), { refreshInterval: 20000 });
  const { data: ipo, mutate: mutateIpo } = useSWR(['ipo-record', companyId], () => exchangeApi.getCompanyIpo(companyId), { refreshInterval: 20000 });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  // Prospectus form state
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [floatPct, setFloatPct] = useState('25');
  const [lockup, setLockup] = useState('6');
  const [proceeds, setProceeds] = useState('');

  const active = ipo && (ipo.status === 'pending_review' || ipo.status === 'book_building') ? ipo : null;
  const listed = ipo && ipo.status === 'listed' ? ipo : null;
  const checks: any[] = elig?.checks ?? [];
  const eligible = !!elig?.eligible;
  const floor = elig?.min_price_floor != null ? Number(elig.min_price_floor) : null;

  const refresh = () => { mutateElig(); mutateIpo(); };

  const file = async () => {
    const pMin = Number(String(priceMin).replace(/,/g, ''));
    const pMax = Number(String(priceMax).replace(/,/g, ''));
    const fPct = Number(String(floatPct).replace(/,/g, '')) / 100;
    const lock = Number(String(lockup).replace(/,/g, ''));
    if (!Number.isFinite(pMin) || !Number.isFinite(pMax) || pMin <= 0 || pMax < pMin) {
      setNotice({ text: 'Enter a valid price range (max ≥ min).', ok: false });
      return;
    }
    if (!Number.isFinite(fPct) || fPct < 0.1 || fPct > 0.49) {
      setNotice({ text: 'Float must be between 10% and 49%.', ok: false });
      return;
    }
    if (!Number.isFinite(lock) || lock < 3 || lock > 12) {
      setNotice({ text: 'Lockup must be between 3 and 12 months.', ok: false });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await exchangeApi.fileIpo(companyId, {
        priceMin: pMin, priceMax: pMax, floatPercent: fPct, useOfProceeds: proceeds, lockupMonths: lock,
      });
      const msg = `Prospectus filed successfully. $${fmt(elig?.filing_fee)} filing fee deducted. Regulatory review begins.`;
      setNotice({ text: msg, ok: true });
      window.alert(msg);
      setProceeds('');
      refresh();
    } catch (e: any) {
      const errMsg = e?.response?.data?.error || e?.response?.data?.message || 'Filing failed.';
      setNotice({ text: errMsg, ok: false });
      window.alert(`IPO Filing Failed:\n${errMsg}`);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await exchangeApi.withdrawIpo(companyId);
      setNotice({ text: 'IPO withdrawn. The filing fee is not refunded.', ok: true });
      refresh();
    } catch (e: any) {
      setNotice({ text: e?.response?.data?.error || e?.response?.data?.message || 'Withdrawal failed.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const floatShares = Math.round(TOTAL_SHARES * (Number(floatPct) / 100 || 0));
  const estLowRaise = floatShares * (Number(priceMin) || 0);
  const estHighRaise = floatShares * (Number(priceMax) || 0);

  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px', gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <div style={label}>Initial Public Offering — DRX Bourse</div>
        {listed && <div style={{ ...mono, fontSize: '9px', color: T.mint, textTransform: 'uppercase', letterSpacing: '0.14em' }}>● Public Company</div>}
      </div>

      {/* ── LISTED ── */}
      {listed && (
        <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, marginTop: '8px' }}>
          {companyName} completed its IPO in{' '}
          <span style={{ color: T.ivory }}>Y{listed.listing_year} M{listed.listing_month}</span>{' '}
          at a clearing price of{' '}
          <span style={{ ...mono, color: T.gold, fontWeight: 700 }}>${fmt(Number(listed.clearing_price), 2)}</span>, raising{' '}
          <span style={{ ...mono, color: T.mint, fontWeight: 700 }}>${fmt(Number(listed.proceeds_raised))}</span>{' '}
          for the treasury. Shares now trade continuously on the DRX Bourse.
        </div>
      )}

      {/* ── ACTIVE PROCESS ── */}
      {active && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '12px' }}>
            <Stat k="Status" v={STATUS_LABEL[active.status]} accent={T.gold} />
            <Stat k="Price Range" v={`$${fmt(Number(active.ipo_price_min), 2)} – $${fmt(Number(active.ipo_price_max), 2)}`} />
            <Stat k="Float" v={`${fmt(Number(active.float_percent) * 100, 0)}% · ${fmt(Number(active.float_shares))} sh`} />
            <Stat k="Lockup" v={`${active.lockup_months} months`} />
            {active.status === 'book_building' && (
              <Stat
                k="Book"
                v={`${fmt((active.subscription_ratio ?? 0) * 100, 0)}% subscribed`}
                accent={(active.subscription_ratio ?? 0) >= 1 ? T.mint : (active.subscription_ratio ?? 0) >= 0.5 ? T.gold : T.red}
              />
            )}
          </div>
          <div style={{ fontSize: '11px', color: T.muted, lineHeight: 1.7 }}>
            {active.status === 'pending_review'
              ? `Regulators are reviewing the prospectus. Book-building opens once review completes (around Y${active.review_ends_year} M${active.review_ends_month}).`
              : `Institutions and players are submitting indications of interest until Y${active.bookbuild_ends_year} M${active.bookbuild_ends_month}. On close, shares clear at the market-clearing price and the treasury is funded. Under 50% subscribed and the offering fails.`}
          </div>
          <button
            onClick={withdraw}
            disabled={busy}
            style={{ marginTop: '14px', padding: '8px 18px', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'transparent', color: T.red, border: `1px solid ${T.red}`, opacity: busy ? 0.6 : 1 }}
          >
            Withdraw IPO
          </button>
        </div>
      )}

      {/* ── PREP / FILING ── */}
      {!active && !listed && (
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, marginBottom: '14px' }}>
            List {companyName} on the DRX Bourse to raise capital from the public. You sell a slice of your 1,000,000
            shares; proceeds go to the company treasury. Your retained stake is locked up for the period you choose.
          </div>

          {/* Eligibility checklist */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', marginBottom: '16px' }}>
            {checks.map((c) => (
              <div key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: T.bg, border: `1px solid ${T.border}`, padding: '8px 10px' }}>
                <span style={{ ...mono, fontSize: '12px', color: c.pass ? T.mint : T.red, fontWeight: 700 }}>{c.pass ? '✓' : '✕'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: T.ivory }}>{c.label}</div>
                  {c.detail && <div style={{ ...mono, fontSize: '9px', color: T.faint }}>{c.detail}</div>}
                </div>
              </div>
            ))}
          </div>

          {eligible ? (
            <div style={{ background: T.bg, border: `1px solid ${T.borderGold}`, padding: '16px' }}>
              <div style={{ ...label, marginBottom: '12px' }}>Draft Prospectus</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <Field label={`Price Min ($)${floor != null ? ` · floor $${floor.toFixed(2)}` : ''}`}>
                  <input aria-label="Price minimum" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} inputMode="decimal" placeholder={floor != null ? floor.toFixed(2) : '0.50'} style={inputStyle} />
                </Field>
                <Field label="Price Max ($)">
                  <input aria-label="Price maximum" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} inputMode="decimal" placeholder="1.00" style={inputStyle} />
                </Field>
                <Field label="Float % (10–49)">
                  <input aria-label="Float percent" value={floatPct} onChange={(e) => setFloatPct(e.target.value)} inputMode="numeric" style={inputStyle} />
                </Field>
                <Field label="Lockup (3–12 mo)">
                  <input aria-label="Lockup months" value={lockup} onChange={(e) => setLockup(e.target.value)} inputMode="numeric" style={inputStyle} />
                </Field>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Field label="Use of Proceeds">
                  <textarea aria-label="Use of proceeds" value={proceeds} onChange={(e) => setProceeds(e.target.value)} rows={2} placeholder="How the raised capital will be deployed…" style={{ ...inputStyle, resize: 'vertical' }} />
                </Field>
              </div>
              <div style={{ ...mono, fontSize: '10px', color: T.faint, marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
                <span>Offering: <span style={{ color: T.ivory }}>{fmt(floatShares)} shares</span></span>
                <span>Est. raise: <span style={{ color: T.mint }}>${fmt(estLowRaise)} – ${fmt(estHighRaise)}</span></span>
                <span>Filing fee: <span style={{ color: T.ivory }}>${fmt(elig?.filing_fee)}</span></span>
                <span>Company cash: <span style={{ color: T.ivory }}>${fmt(elig?.available_cash)}</span></span>
              </div>
              <button
                onClick={file}
                disabled={busy}
                style={{ marginTop: '14px', padding: '10px 22px', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
              >
                File Prospectus — ${fmt(elig?.filing_fee)}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: T.faint }}>
              Meet all requirements above to file an IPO. Convert to a Public Corporation in the panel below first if needed.
            </div>
          )}
        </div>
      )}

      {notice && <div style={{ fontSize: '11px', color: notice.ok ? T.mint : T.red, marginTop: '12px' }}>{notice.text}</div>}
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: '8px', color: T.faint, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '3px' }}>{k}</div>
      <div style={{ ...mono, fontSize: '13px', fontWeight: 700, color: accent ?? T.ivory }}>{v}</div>
    </div>
  );
}

function Field({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ ...mono, fontSize: '9px', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '5px' }}>{l}</div>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  ...mono,
  width: '100%',
  boxSizing: 'border-box',
  background: '#090A0F',
  border: '1px solid #2A2630',
  color: '#F4EBD6',
  padding: '8px 10px',
  fontSize: '12px',
  outline: 'none',
};
