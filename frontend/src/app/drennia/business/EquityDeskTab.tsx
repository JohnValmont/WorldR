'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { companyApi } from '../../../lib/api';

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
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

const STRUCTURE_ORDER = ['sole-trader', 'private-company', 'public-corporation'];

export default function EquityDeskTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { data: structures } = useSWR('legal-structures', () => companyApi.getStructures());
  const { data: capTable, mutate: mutateCap } = useSWR(['cap-table', companyId], () => companyApi.getCapTable(companyId), { refreshInterval: 15000 });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);
  const [payoutInput, setPayoutInput] = useState('');

  const structList: any[] = (structures ?? []).slice().sort(
    (a: any, b: any) => STRUCTURE_ORDER.indexOf(a.id) - STRUCTURE_ORDER.indexOf(b.id)
  );
  const holders: any[] = capTable?.holders ?? [];
  const currentStructureId: string | null = capTable?.company?.legal_structure_id ?? null;
  const currentStructure = structList.find((s) => s.id === currentStructureId) ?? null;
  const payoutPercent = capTable?.dividend_policy?.payout_percent != null ? Number(capTable.dividend_policy.payout_percent) : 0;

  const convert = async (structureId: string) => {
    setBusy(true);
    setNotice(null);
    try {
      await companyApi.convertStructure(companyId, structureId);
      setNotice({ text: 'Structure converted. Filing fee deducted from company cash.', ok: true });
      mutateCap();
    } catch (e: any) {
      setNotice({ text: e?.response?.data?.error || e?.response?.data?.message || 'Conversion failed.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  const savePolicy = async () => {
    const p = Number(payoutInput);
    if (!Number.isFinite(p) || p < 0 || p > 50) {
      setNotice({ text: 'Payout must be between 0 and 50 percent.', ok: false });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await companyApi.setDividendPolicy(companyId, p);
      setNotice({ text: `Dividend policy set to ${p}% of monthly profit.`, ok: true });
      setPayoutInput('');
      mutateCap();
    } catch (e: any) {
      setNotice({ text: e?.response?.data?.error || e?.response?.data?.message || 'Failed to set policy.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', maxWidth: '1000px' }}>
      {/* Legal structure */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px', gridColumn: '1 / -1' }}>
        <div style={{ ...label, marginBottom: '4px' }}>Legal Structure</div>
        <div style={{ fontSize: '12px', color: T.muted, marginBottom: '16px' }}>
          {companyName} is registered as{' '}
          <span style={{ color: T.ivory, fontWeight: 700 }}>{currentStructure?.name ?? currentStructureId ?? '…'}</span>.
          Upgrading pays a one-time filing fee from company cash and raises monthly compliance costs.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {structList.map((s: any) => {
            const isCurrent = s.id === currentStructureId;
            const currentIdx = STRUCTURE_ORDER.indexOf(currentStructureId ?? '');
            const targetIdx = STRUCTURE_ORDER.indexOf(s.id);
            const isUpgrade = targetIdx > currentIdx;
            return (
              <div key={s.id} style={{ background: isCurrent ? T.paper : T.bg, border: `1px solid ${isCurrent ? T.borderGold : T.border}`, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: isCurrent ? T.gold : T.ivory }}>{s.name}</div>
                  {isCurrent && <div style={{ ...mono, fontSize: '8px', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Current</div>}
                </div>
                <p style={{ fontSize: '11px', color: T.muted, lineHeight: 1.6, margin: '0 0 10px', minHeight: '44px' }}>{s.description}</p>
                <div style={{ ...mono, fontSize: '10px', color: T.faint, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>Filing fee: <span style={{ color: T.ivory }}>§{fmt(Number(s.filing_fee))}</span></span>
                  <span>Monthly compliance: <span style={{ color: T.ivory }}>§{fmt(Number(s.monthly_compliance_cost))}</span></span>
                  <span>Shareholders: <span style={{ color: T.ivory }}>{s.max_shareholders ?? 'Unlimited'}</span></span>
                  {Number(s.min_company_value) > 0 && (
                    <span>Min company value: <span style={{ color: T.ivory }}>§{fmt(Number(s.min_company_value))}</span></span>
                  )}
                </div>
                {!isCurrent && isUpgrade && (
                  <button
                    onClick={() => convert(s.id)}
                    disabled={busy}
                    style={{ marginTop: '12px', width: '100%', padding: '8px 0', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
                  >
                    Convert — §{fmt(Number(s.filing_fee))}
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {notice && <div style={{ fontSize: '11px', color: notice.ok ? T.mint : T.red, marginTop: '12px' }}>{notice.text}</div>}
      </div>

      {/* Cap table */}
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '20px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Shareholder Register</div>
        {holders.length === 0 && <div style={{ fontSize: '11px', color: T.faint }}>Loading register…</div>}
        {holders.map((h: any) => (
          <div key={h.holder_character_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ fontSize: '12px', color: T.ivory }}>{h.holder_name}</div>
            <div style={{ textAlign: 'right', ...mono }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: T.gold }}>{fmt((Number(h.shares) / 1000000) * 100, 2)}%</div>
              <div style={{ fontSize: '9px', color: T.faint }}>{fmt(Number(h.shares))} shares</div>
            </div>
          </div>
        ))}
        <div style={{ ...mono, fontSize: '9px', color: T.faint, marginTop: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          1,000,000 total shares issued
        </div>
      </div>

      {/* Dividend policy */}
      <div style={{ background: T.paper, border: `1px solid ${T.borderGold}`, padding: '20px' }}>
        <div style={{ ...label, marginBottom: '12px' }}>Dividend Policy</div>
        <div style={{ fontSize: '12px', color: T.muted, lineHeight: 1.7, marginBottom: '12px' }}>
          Each month the company earns a profit, this percentage is paid out of company cash to all shareholders pro-rata.
          Current policy: <span style={{ ...mono, color: T.mint, fontWeight: 700 }}>{fmt(payoutPercent, 0)}%</span> of monthly profit.
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            aria-label="Dividend payout percent"
            value={payoutInput}
            onChange={(e) => setPayoutInput(e.target.value)}
            placeholder={String(payoutPercent)}
            inputMode="numeric"
            style={{ ...mono, flex: 1, background: T.bg, border: `1px solid ${T.border}`, color: T.ivory, padding: '8px 10px', fontSize: '12px', outline: 'none' }}
          />
          <button
            onClick={savePolicy}
            disabled={busy}
            style={{ padding: '8px 18px', cursor: busy ? 'wait' : 'pointer', ...mono, fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: T.gold, color: T.bg, border: 'none', opacity: busy ? 0.6 : 1 }}
          >
            Set %
          </button>
        </div>
        <div style={{ ...mono, fontSize: '9px', color: T.faint, marginTop: '8px' }}>0–50% allowed. Applies only to the owner&apos;s companies.</div>
      </div>
    </div>
  );
}
