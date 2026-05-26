'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatCard from '../../../components/ui/StatCard';
import LineChart from '../../../components/charts/LineChart';
import GaugeBar from '../../../components/ui/GaugeBar';

const VALDORIA_ID = KELDORIA_ID;

const SECTOR_COLORS: Record<string, string> = {
  Agriculture: '#65a30d', Industry: '#3b82f6', Services: '#a78bfa',
  Energy: '#f59e0b', Construction: '#f97316'
};

function fmt(n: number) {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

export default function EconomyPage() {
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
        gdp: Number(s.gdp) / 1e6,
        unemployment: Number(s.unemployment_rate) * 100,
        treasury: Number(s.treasury) / 1e6,
      })));
    }).catch(() => {});
  }, [nationId]);

  const sectors: any[] = state?.sectors || [];
  const nation = state?.nation;
  const totalWorkers = sectors.reduce((a: number, s: any) => a + Number(s.workers), 0);
  const unemploymentRate = state ? Number(state.nation?.unemployment_rate || 0.06) : 0;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Economy</h1>
        <div className="text-zinc-600 text-[10px]">Sector output, labour, and growth indicators</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Total GDP" value={nation ? fmt(Number(nation.gdp)) : '—'} color="amber" />
        <StatCard label="Total Workers" value={totalWorkers ? `${(totalWorkers / 1e6).toFixed(1)}M` : '—'} color="blue" />
        <StatCard label="Unemployment" value={`${(unemploymentRate * 100).toFixed(1)}%`}
          color={unemploymentRate > 0.1 ? 'red' : unemploymentRate > 0.06 ? 'amber' : 'green'} />
        <StatCard label="Treasury" value={nation ? fmt(Number(nation.treasury)) : '—'}
          color={nation && Number(nation.treasury) < 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TerminalPanel title="GDP History" subtitle="$M">
          {history.length > 1 ? (
            <LineChart data={history} xKey="tick" lines={[{ key: 'gdp', color: '#f59e0b', label: 'GDP ($M)' }]} height={180} formatY={v => `$${v.toFixed(0)}M`} />
          ) : <div className="text-zinc-600 text-xs text-center py-14">Awaiting simulation tick data.</div>}
        </TerminalPanel>
        <TerminalPanel title="Unemployment History" subtitle="%">
          {history.length > 1 ? (
            <LineChart data={history} xKey="tick" lines={[{ key: 'unemployment', color: '#f87171', label: 'Unemployment %' }]} height={180} yDomain={[0, 30]} formatY={v => `${v.toFixed(0)}%`} />
          ) : <div className="text-zinc-600 text-xs text-center py-14">Awaiting simulation tick data.</div>}
        </TerminalPanel>
      </div>

      <TerminalPanel title="Economic Sectors">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[9px] text-zinc-500 uppercase tracking-widest">
                <th className="text-left py-1 pr-3">Sector</th>
                <th className="text-right py-1 px-2">Output</th>
                <th className="text-right py-1 px-2">Workers</th>
                <th className="text-right py-1 px-2">Productivity</th>
                <th className="text-right py-1 px-2">Avg Wage</th>
                <th className="text-right py-1 px-2">Growth</th>
                <th className="text-left py-1 pl-4 w-40">Health</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s: any) => {
                const growth = Number(s.growth);
                return (
                  <tr key={s.name} className="border-b border-zinc-900 hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ background: SECTOR_COLORS[s.name] || '#6b7280' }} />
                        <span className="text-zinc-200 font-medium">{s.name}</span>
                      </div>
                    </td>
                    <td className="text-right px-2 font-mono text-zinc-300">{fmt(Number(s.output))}</td>
                    <td className="text-right px-2 font-mono text-zinc-400">{(Number(s.workers) / 1e6).toFixed(1)}M</td>
                    <td className="text-right px-2 font-mono text-zinc-400">{Number(s.productivity).toFixed(2)}x</td>
                    <td className="text-right px-2 font-mono text-zinc-400">${(Number(s.wages) / 1000).toFixed(0)}K</td>
                    <td className={`text-right px-2 font-mono ${growth > 0.02 ? 'text-emerald-400' : growth < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {growth > 0 ? '+' : ''}{(growth * 100).toFixed(2)}%
                    </td>
                    <td className="pl-4 py-2">
                      <GaugeBar value={Math.min(1, Number(s.productivity) / 2)} height="xs" showValue={false} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TerminalPanel>
    </div>
  );
}
