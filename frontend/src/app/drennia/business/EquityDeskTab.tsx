'use client';
import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { companyApi, characterApi } from '../../../lib/api';
import IpoDeskPanel from './IpoDeskPanel';
import { Card, Button } from '@/components/ui';

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
  
  const [playerCash, setPlayerCash] = useState(0);
  const [injectInput, setInjectInput] = useState('');
  const [issueQty, setIssueQty] = useState('');
  const [issuePrice, setIssuePrice] = useState('');
  const [withdrawInput, setWithdrawInput] = useState('');

  const refreshCash = useCallback(() => {
    characterApi.getMe()
      .then(res => setPlayerCash(res.data.finances.cash_in_hand))
      .catch(err => console.error(err));
  }, []);

  useEffect(() => {
    refreshCash();
  }, [refreshCash]);

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

  const handleInject = async () => {
    const amt = Number(injectInput);
    if (amt <= 0 || !Number.isFinite(amt)) return;
    setBusy(true); setNotice(null);
    try {
      await companyApi.injectCapital(companyId, amt);
      setNotice({ text: `§${amt.toLocaleString()} injected successfully.`, ok: true });
      setInjectInput('');
      mutateCap();
      refreshCash();
    } catch (e: any) {
      setNotice({ text: e?.response?.data?.error || e?.response?.data?.message || 'Injection failed.', ok: false });
    } finally { setBusy(false); }
  };

  const handleWithdraw = async () => {
    const amt = Number(withdrawInput);
    if (amt <= 0 || !Number.isFinite(amt)) return;
    setBusy(true); setNotice(null);
    try {
      await companyApi.withdrawCapital(companyId, amt);
      setNotice({ text: `§${amt.toLocaleString()} withdrawn successfully.`, ok: true });
      setWithdrawInput('');
      mutateCap();
      refreshCash();
    } catch (e: any) {
      setNotice({ text: e?.response?.data?.error || e?.response?.data?.message || 'Withdrawal failed.', ok: false });
    } finally { setBusy(false); }
  };

  const handleIssue = async () => {
    const q = Number(issueQty);
    const p = Number(issuePrice);
    if (q <= 0 || p <= 0 || !Number.isFinite(q) || !Number.isFinite(p)) return;
    setBusy(true); setNotice(null);
    try {
      await companyApi.issueShares(companyId, q, p);
      setNotice({ text: `Issued ${q.toLocaleString()} shares for §${(q * p).toLocaleString()}.`, ok: true });
      setIssueQty(''); setIssuePrice('');
      mutateCap();
      refreshCash();
    } catch (e: any) {
      setNotice({ text: e?.response?.data?.error || e?.response?.data?.message || 'Issuance failed.', ok: false });
    } finally { setBusy(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
      {/* IPO desk */}
      <IpoDeskPanel companyId={companyId} companyName={companyName} />

      {/* Owner Capital Movement */}
      <Card kicker="Owner Capital Movement" className="lg:col-span-2">
        <div className="text-xs text-zinc-400 mb-4">
          Your personal cash: <span className="text-terminal-green font-bold font-mono">§{fmt(playerCash)}</span>
          &nbsp;·&nbsp; Company cash: <span className="text-zinc-100 font-bold font-mono">§{fmt(capTable?.company?.available_cash ?? 0)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {currentStructureId === 'public-corporation' ? (
            <div className="rounded border p-4 bg-[#090A0F] border-zinc-800">
              <div className="text-[13px] font-bold text-zinc-500 mb-1">Market Capital Raising</div>
              <div className="text-[11px] text-zinc-500 mb-3 leading-relaxed">Public corporations cannot use ad-hoc owner injections. You must raise capital through the DRX Exchange.</div>
              <Button disabled variant="secondary" className="w-full opacity-50">Managed via Exchange</Button>
            </div>
          ) : currentStructureId === 'sole-trader' ? (
            <div className="rounded border p-4 bg-[#090A0F] border-zinc-800">
              <div className="text-[13px] font-bold text-terminal-green mb-1">↓ Inject Capital</div>
              <div className="text-[11px] text-zinc-400 mb-3 leading-relaxed min-h-[34px]">Transfer your personal cash into the company ledger (owner loan).</div>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="§ Amount" min={1} value={injectInput} onChange={e => setInjectInput(e.target.value)} className="font-mono flex-1 bg-zinc-900 border border-zinc-700 text-terminal-green p-2 text-xs outline-none rounded" />
                <Button onClick={handleInject} disabled={busy} variant="primary">Inject</Button>
              </div>
            </div>
          ) : currentStructureId === 'private-company' ? (
            <div className="rounded border p-4 bg-[#090A0F] border-zinc-800">
              <div className="text-[13px] font-bold text-terminal-green mb-1">↑ Issue Shares</div>
              <div className="text-[11px] text-zinc-400 mb-3 leading-relaxed min-h-[34px]">Issue new shares to yourself to inject capital. Cash is transferred to company, and your equity increases.</div>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="Shares" min={1} value={issueQty} onChange={e => setIssueQty(e.target.value)} className="font-mono flex-1 bg-zinc-900 border border-zinc-700 text-zinc-200 p-2 text-xs outline-none rounded" />
                <span className="text-zinc-500 text-xs">@</span>
                <input type="number" placeholder="§ Price" min={1} value={issuePrice} onChange={e => setIssuePrice(e.target.value)} className="font-mono flex-1 bg-zinc-900 border border-zinc-700 text-zinc-200 p-2 text-xs outline-none rounded" />
                <Button onClick={handleIssue} disabled={busy} variant="primary">Issue</Button>
              </div>
            </div>
          ) : null}

          {currentStructureId === 'public-corporation' ? (
            <div className="rounded border p-4 bg-[#090A0F] border-zinc-800">
              <div className="text-[13px] font-bold text-zinc-500 mb-1">Dividend Distribution</div>
              <div className="text-[11px] text-zinc-500 mb-3 leading-relaxed">Public corporations cannot allow direct ad-hoc owner drawings. You must set a Dividend Policy to distribute profits.</div>
              <Button disabled variant="secondary" className="w-full opacity-50">Use Dividend Policy</Button>
            </div>
          ) : (
            <div className="rounded border p-4 bg-[#090A0F] border-zinc-800">
              <div className="text-[13px] font-bold text-terminal-amber mb-1">↑ Owner Drawings</div>
              <div className="text-[11px] text-zinc-400 mb-3 leading-relaxed min-h-[34px]">Withdraw company cash to your personal holdings.</div>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="§ Amount" min={1} value={withdrawInput} onChange={e => setWithdrawInput(e.target.value)} className="font-mono flex-1 bg-zinc-900 border border-zinc-700 text-terminal-amber p-2 text-xs outline-none rounded" />
                <Button onClick={handleWithdraw} disabled={busy} variant="secondary" className="text-terminal-amber border-terminal-amber hover:bg-terminal-amber/10">Withdraw</Button>
              </div>
            </div>
          )}

        </div>
      </Card>

      {/* Legal structure */}
      <Card kicker="Legal Structure" className="lg:col-span-2">
        <div className="text-xs text-zinc-400 mb-4">
          {companyName} is registered as{' '}
          <span className="text-zinc-100 font-bold">{currentStructure?.name ?? currentStructureId ?? '…'}</span>.
          Upgrading pays a one-time filing fee from company cash and raises monthly compliance costs.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {structList.map((s: any) => {
            const isCurrent = s.id === currentStructureId;
            const currentIdx = STRUCTURE_ORDER.indexOf(currentStructureId ?? '');
            const targetIdx = STRUCTURE_ORDER.indexOf(s.id);
            const isUpgrade = targetIdx > currentIdx;
            return (
              <div key={s.id} className={`rounded border p-4 ${isCurrent ? 'bg-[#1E1A15] border-terminal-amber/30' : 'bg-[#090A0F] border-zinc-800'}`}>
                <div className="flex justify-between items-baseline mb-2">
                  <div className={`text-sm font-bold ${isCurrent ? 'text-terminal-amber' : 'text-zinc-100'}`}>{s.name}</div>
                  {isCurrent && <div className="font-mono text-[9px] text-terminal-amber uppercase tracking-widest">Current</div>}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3 min-h-[44px]">{s.description}</p>
                <div className="font-mono text-[10px] text-zinc-500 flex flex-col gap-1">
                  <span>Filing fee: <span className="text-zinc-200">§{fmt(Number(s.filing_fee))}</span></span>
                  <span>Monthly compliance: <span className="text-zinc-200">§{fmt(Number(s.monthly_compliance_cost))}</span></span>
                  <span>Shareholders: <span className="text-zinc-200">{s.max_shareholders ?? 'Unlimited'}</span></span>
                  {Number(s.min_company_value) > 0 && (
                    <span>Min company value: <span className="text-zinc-200">§{fmt(Number(s.min_company_value))}</span></span>
                  )}
                </div>
                {!isCurrent && isUpgrade && (
                  <Button
                    onClick={() => convert(s.id)}
                    disabled={busy}
                    variant="primary"
                    className="w-full mt-4"
                  >
                    Convert — §{fmt(Number(s.filing_fee))}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        {notice && <div className={`text-[11px] mt-4 ${notice.ok ? 'text-terminal-green' : 'text-terminal-red'}`}>{notice.text}</div>}
      </Card>

      {/* Cap table */}
      <Card kicker="Shareholder Register">
        {holders.length === 0 && <div className="text-[11px] text-zinc-500">Loading register…</div>}
        {holders.map((h: any) => (
          <div key={h.holder_character_id} className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
            <div className="text-xs text-zinc-200">{h.name || h.holder_name}</div>
            <div className="text-right font-mono">
              <div className="text-xs font-bold text-terminal-amber">{fmt(Number(h.percent), 2)}%</div>
              <div className="text-[9px] text-zinc-500">{fmt(Number(h.shares))} shares</div>
            </div>
          </div>
        ))}
        <div className="font-mono text-[9px] text-zinc-600 mt-3 uppercase tracking-wider">
          {fmt(Number(capTable?.total_shares || 0))} total shares issued
        </div>
      </Card>

      {/* Dividend policy */}
      <Card kicker="Dividend Policy" accent>
        <div className="text-xs text-zinc-400 leading-relaxed mb-4">
          Each month the company earns a profit, this percentage is paid out of company cash to all shareholders pro-rata.
          Current policy: <span className="font-mono text-terminal-green font-bold">{fmt(payoutPercent, 0)}%</span> of monthly profit.
        </div>
        <div className="flex gap-2 items-center">
          <input
            aria-label="Dividend payout percent"
            value={payoutInput}
            onChange={(e) => setPayoutInput(e.target.value)}
            placeholder={String(payoutPercent)}
            inputMode="numeric"
            className="font-mono flex-1 bg-[#090A0F] border border-zinc-800 text-zinc-200 p-2 text-xs outline-none focus:border-terminal-amber/50 transition-colors rounded"
          />
          <Button
            onClick={savePolicy}
            disabled={busy}
            variant="primary"
          >
            Set %
          </Button>
        </div>
        <div className="font-mono text-[9px] text-zinc-500 mt-3">0–50% allowed. Applies only to the owner's companies.</div>
      </Card>
    </div>
  );
}
