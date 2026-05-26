'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { reportsApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';

const VALDORIA_ID = KELDORIA_ID;

function fmtNum(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

function Delta({ value, unit = '%', invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const zero = Math.abs(value) < 0.001;
  return (
    <span className={`text-[10px] font-mono ${zero ? 'text-zinc-600' : positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {zero ? '—' : value > 0 ? `▲ +${Math.abs(value).toFixed(2)}${unit}` : `▼ ${value.toFixed(2)}${unit}`}
    </span>
  );
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || VALDORIA_ID;
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    reportsApi.getHistory(nationId, 12)
      .then(r => setReports(r.data.reports || []))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [nationId]);

  if (loading) return <div className="text-zinc-600 text-xs font-mono text-center py-20">Loading reports...</div>;

  if (reports.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Monthly Reports</h1>
        <TerminalPanel title="No Reports Available">
          <div className="text-zinc-600 text-xs text-center py-12">
            Reports are generated automatically after each simulation tick. Check back after the next tick fires (every 8 real hours).
          </div>
        </TerminalPanel>
      </div>
    );
  }

  const report = reports[selected];

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Monthly Reports</h1>
          <div className="text-zinc-600 text-[10px]">Nation performance analysis per simulation tick</div>
        </div>
      </div>

      {/* Report selector */}
      <div className="flex gap-1 flex-wrap">
        {reports.map((r, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={`px-2 py-1 text-[10px] font-mono border transition-colors ${selected === i ? 'border-amber-500 text-amber-400 bg-amber-950/20' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'
              }`}>
            Month {r.tick}
          </button>
        ))}
      </div>

      {report && (
        <div className="space-y-3">
          {/* Alert strip */}
          {report.alerts?.length > 0 && (
            <div className="space-y-1.5">
              {report.alerts.map((a: any, i: number) => (
                <div key={i} className={`p-2 text-[10px] font-mono border flex items-center gap-2 ${a.severity === 'danger' ? 'border-red-900 bg-red-950/30 text-red-400' :
                  a.severity === 'warning' ? 'border-amber-900 bg-amber-950/20 text-amber-400' :
                    'border-zinc-800 bg-zinc-900 text-zinc-400'
                  }`}>
                  <span>{a.severity === 'danger' ? '⚠' : a.severity === 'warning' ? '▲' : 'ℹ'}</span>
                  {a.message}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Economy */}
            <TerminalPanel title="Economy Summary">
              <div className="space-y-3">
                <Row label="GDP" value={fmtNum(report.economy.gdp)} delta={<Delta value={report.economy.gdpChangePercent} unit="%" />} />
                <Row label="Treasury" value={fmtNum(report.economy.treasury)} delta={<Delta value={(report.economy.treasury - report.economy.treasuryPrev) / 1e6} unit="M" />} />
                <Row label="Debt" value={fmtNum(report.economy.debt)} delta={null} />
                <Row label="Revenue" value={fmtNum(report.economy.revenue)} delta={null} />
                <Row label="Spending" value={fmtNum(report.economy.spending)} delta={null} />
                <Row label={report.economy.deficit > 0 ? 'Deficit' : 'Surplus'}
                  value={fmtNum(Math.abs(report.economy.deficit))}
                  delta={null}
                  valueClass={report.economy.deficit > 0 ? 'text-red-400' : 'text-emerald-400'}
                />
                <Row label="Unemployment" value={`${(report.economy.unemployment * 100).toFixed(1)}%`}
                  delta={<Delta value={(report.economy.unemployment - report.economy.unemploymentPrev) * 100} unit="pp" invert />}
                />
              </div>
            </TerminalPanel>

            {/* Politics */}
            <TerminalPanel title="Political Summary">
              <div className="space-y-3">
                <Row label="National Approval" value={`${(report.politics.approval * 100).toFixed(1)}%`}
                  delta={<Delta value={report.politics.approvalChange * 100} unit="pp" />}
                />
                <Row label="Stability" value={`${(report.politics.stability * 100).toFixed(1)}%`}
                  delta={<Delta value={(report.politics.stability - report.politics.stabilityPrev) * 100} unit="pp" />}
                />
                <Row label="CPI Inflation" value={`${(report.prices.cpi * 100).toFixed(2)}%`}
                  delta={<Delta value={(report.prices.cpi - report.prices.cpiPrev) * 100} unit="pp" invert />}
                />
                <Row label="Food Inflation" value={`${(report.prices.food * 100).toFixed(2)}%`} delta={null} />
                <Row label="Fuel Inflation" value={`${(report.prices.fuel * 100).toFixed(2)}%`} delta={null} />
                {report.politics.governingParty && (
                  <Row label="Governing Party" value={report.politics.governingParty} delta={null} valueClass="text-emerald-400" />
                )}
              </div>
            </TerminalPanel>
          </div>

          {/* Sectors */}
          {report.sectors?.length > 0 && (
            <TerminalPanel title="Sector Performance">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {report.sectors.map((s: any) => (
                  <div key={s.name} className="terminal-card p-2">
                    <div className="text-[9px] text-zinc-600 uppercase">{s.name}</div>
                    <div className="text-zinc-300 font-mono text-sm font-bold">{fmtNum(s.output)}</div>
                    <div className={`text-[10px] font-mono ${s.growth > 0.02 ? 'text-emerald-400' : s.growth < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {s.growth > 0 ? '+' : ''}{(s.growth * 100).toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </TerminalPanel>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, delta, valueClass = 'text-zinc-300' }: {
  label: string; value: string; delta: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-zinc-900">
      <span className="text-zinc-500 text-xs">{label}</span>
      <div className="flex items-center gap-3">
        {delta}
        <span className={`text-xs font-mono font-bold ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}
