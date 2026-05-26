'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatCard from '../../../components/ui/StatCard';
import LineChart from '../../../components/charts/LineChart';
import StatusBadge from '../../../components/ui/StatusBadge';

const VALDORIA_ID = KELDORIA_ID;

export default function InflationPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || VALDORIA_ID;
  const [state, setState] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    nationApi.getState(nationId).then(r => setState(r.data)).catch(() => {});
    nationApi.getHistory(nationId, 24).then(r => {
      const snaps = (r.data.snapshots || r.data || []).reverse();
      setHistory(snaps.map((s: any) => ({
        tick: s.tick,
        cpi: Number(s.inflation_cpi) * 100,
        food: Number(s.inflation_food) * 100,
        fuel: Number(s.inflation_fuel) * 100,
        housing: Number(s.inflation_housing) * 100,
      })));
    }).catch(() => {});
  }, [nationId]);

  const nation = state?.nation;
  const prices: any[] = state?.prices || [];

  const cpi = nation ? Number(nation.inflation_cpi) : 0;
  const food = nation ? Number(nation.inflation_food) : 0;
  const fuel = nation ? Number(nation.inflation_fuel) : 0;
  const housing = nation ? Number(nation.inflation_housing) : 0;

  const getCpiStatus = (v: number): { label: string; variant: 'success' | 'warning' | 'danger' } => {
    if (v > 0.08) return { label: 'HYPERINFLATION', variant: 'danger' };
    if (v > 0.05) return { label: 'HIGH', variant: 'danger' };
    if (v > 0.03) return { label: 'ELEVATED', variant: 'warning' };
    if (v < 0) return { label: 'DEFLATION', variant: 'warning' };
    return { label: 'STABLE', variant: 'success' };
  };

  const cpiStatus = getCpiStatus(cpi);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Inflation</h1>
        <div className="text-zinc-600 text-[10px]">Price levels, CPI, and sector inflation rates</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="CPI" value={`${(cpi * 100).toFixed(2)}%`}
          color={cpi > 0.05 ? 'red' : cpi > 0.03 ? 'amber' : 'green'} />
        <StatCard label="Food Inflation" value={`${(food * 100).toFixed(2)}%`} color={food > 0.05 ? 'red' : 'amber'} />
        <StatCard label="Fuel Inflation" value={`${(fuel * 100).toFixed(2)}%`} color={fuel > 0.05 ? 'red' : 'amber'} />
        <StatCard label="Housing Inflation" value={`${(housing * 100).toFixed(2)}%`} color={housing > 0.05 ? 'red' : 'amber'} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-zinc-500 text-[10px] uppercase tracking-widest">CPI Status:</span>
        <StatusBadge label={cpiStatus.label} variant={cpiStatus.variant} dot />
        {cpi > 0.04 && (
          <span className="text-zinc-600 text-[10px]">
            — High inflation erodes approval. Consider raising interest rates or cutting spending.
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TerminalPanel title="CPI History" subtitle="%">
          {history.length > 1 ? (
            <LineChart data={history} xKey="tick" lines={[{ key: 'cpi', color: '#f87171', label: 'CPI %' }]} height={180} formatY={v => `${v.toFixed(1)}%`} />
          ) : <div className="text-zinc-600 text-xs text-center py-14">Advance months to see data.</div>}
        </TerminalPanel>
        <TerminalPanel title="Inflation by Category" subtitle="%">
          {history.length > 1 ? (
            <LineChart data={history} xKey="tick" lines={[
              { key: 'food', color: '#65a30d', label: 'Food' },
              { key: 'fuel', color: '#f59e0b', label: 'Fuel' },
              { key: 'housing', color: '#3b82f6', label: 'Housing' },
            ]} height={180} formatY={v => `${v.toFixed(1)}%`} />
          ) : <div className="text-zinc-600 text-xs text-center py-14">Advance months to see data.</div>}
        </TerminalPanel>
      </div>

      <TerminalPanel title="Sector Price Indices">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-[9px] text-zinc-500 uppercase tracking-widest">
              <th className="text-left py-1 pr-3">Sector</th>
              <th className="text-right px-2">Base Price</th>
              <th className="text-right px-2">Price Index</th>
              <th className="text-right px-2">Monthly Rate</th>
              <th className="text-right px-2">Annualized</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p: any) => {
              const rate = Number(p.inflation_rate);
              return (
                <tr key={p.sector_name} className="border-b border-zinc-900 hover:bg-zinc-900/50">
                  <td className="py-2 pr-3 text-zinc-200">{p.sector_name}</td>
                  <td className="text-right px-2 font-mono text-zinc-400">${Number(p.base_price).toFixed(2)}</td>
                  <td className="text-right px-2 font-mono text-zinc-400">{Number(p.price_index).toFixed(4)}</td>
                  <td className={`text-right px-2 font-mono ${rate > 0.04 ? 'text-red-400' : rate > 0.02 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {(rate * 100).toFixed(2)}%
                  </td>
                  <td className={`text-right px-2 font-mono ${rate * 12 > 0.06 ? 'text-red-400' : 'text-zinc-400'}`}>
                    ~{(rate * 12 * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TerminalPanel>
    </div>
  );
}
