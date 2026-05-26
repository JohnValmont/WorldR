'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, partiesApi, voterBlocsApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import GaugeBar from '../../../components/ui/GaugeBar';
import StatusBadge from '../../../components/ui/StatusBadge';
import LineChart from '../../../components/charts/LineChart';



const CLASS_COLORS: Record<string, string> = {
  Poor: '#ef4444', Working: '#f59e0b', Middle: '#3b82f6', Wealthy: '#a78bfa', Elite: '#34d399'
};

export default function PoliticsPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;
  const [state, setState] = useState<any>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    nationApi.getState(nationId).then(r => setState(r.data)).catch(() => {});
    partiesApi.getParties(nationId).then(r => setParties(r.data.parties || [])).catch(() => {});
    nationApi.getHistory(nationId, 24).then(r => {
      const snaps = (r.data.snapshots || r.data || []).reverse();
      setHistory(snaps.map((s: any) => ({
        tick: s.tick,
        approval: Number(s.approval) * 100,
        stability: Number(s.stability) * 100,
      })));
    }).catch(() => {});
  }, [nationId]);

  const nation = state?.nation;
  const population: any[] = state?.populationGroups || [];
  const totalPop = population.reduce((a: number, p: any) => a + Number(p.size), 0);
  const governingParty = parties.find(p => p.is_governing);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div>
        <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Politics & Approval</h1>
        <div className="text-zinc-600 text-[10px]">Class approval, political power, and national stability</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {nation && <>
          <div className="terminal-card p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">National Approval</div>
            <div className={`text-2xl font-bold font-mono ${Number(nation.approval) > 0.6 ? 'text-emerald-400' : Number(nation.approval) < 0.4 ? 'text-red-400' : 'text-amber-400'}`}>
              {(Number(nation.approval) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="terminal-card p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Stability</div>
            <div className={`text-2xl font-bold font-mono ${Number(nation.stability) > 0.6 ? 'text-emerald-400' : Number(nation.stability) < 0.4 ? 'text-red-400' : 'text-amber-400'}`}>
              {(Number(nation.stability) * 100).toFixed(0)}%
            </div>
          </div>
          <div className="terminal-card p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Government</div>
            {governingParty ? (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: governingParty.color }} />
                <span className="text-zinc-200 text-xs font-bold">{governingParty.abbreviation}</span>
              </div>
            ) : <div className="text-zinc-600 text-xs">No gov't formed</div>}
          </div>
          <div className="terminal-card p-3">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total Parties</div>
            <div className="text-zinc-300 text-2xl font-bold font-mono">{parties.length}</div>
          </div>
        </>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TerminalPanel title="Approval History">
          {history.length > 1 ? (
            <LineChart data={history} xKey="tick" lines={[
              { key: 'approval', color: '#34d399', label: 'Approval %' },
              { key: 'stability', color: '#60a5fa', label: 'Stability %' },
            ]} height={180} yDomain={[0, 100]} formatY={v => `${v.toFixed(0)}%`} />
          ) : <div className="text-zinc-600 text-xs text-center py-14">Awaiting simulation tick data.</div>}
        </TerminalPanel>

        <TerminalPanel title="Class Approval Breakdown">
          <div className="space-y-3">
            {population.map((p: any) => (
              <div key={p.name}>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: CLASS_COLORS[p.name] || '#6b7280' }} />
                    <span className="text-zinc-300 text-xs">{p.name}</span>
                    <span className="text-zinc-600 text-[9px]">({(Number(p.size) / 1e6).toFixed(1)}M)</span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${Number(p.approval) > 0.6 ? 'text-emerald-400' : Number(p.approval) < 0.4 ? 'text-red-400' : 'text-amber-400'}`}>
                    {(Number(p.approval) * 100).toFixed(1)}%
                  </span>
                </div>
                <GaugeBar value={Number(p.approval)} showValue={false} height="xs" />
              </div>
            ))}
          </div>
        </TerminalPanel>
      </div>

        <TerminalPanel title="Parliamentary Parties" subtitle="450 seats total">
        <div className="space-y-2">
          {parties.length === 0 ? (
            <div className="text-zinc-600 text-xs text-center py-6">No parties registered in Keldoria.</div>
          ) : (
            parties.sort((a, b) => b.seats - a.seats).map((party: any) => (
              <div key={party.id} className="flex items-center gap-3 py-2 border-b border-zinc-900">
                <div className="w-3 h-8 shrink-0" style={{ background: party.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-200 text-xs font-bold">{party.name}</span>
                    <span className="text-zinc-600 text-[9px]">[{party.abbreviation}]</span>
                    {party.is_governing && <StatusBadge label="GOVERNING" variant="success" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-zinc-900 h-1.5">
                      <div className="h-1.5" style={{ width: `${(party.seats / 450) * 100}%`, background: party.color }} />
                    </div>
                    <span className="text-zinc-400 text-[10px] font-mono">{party.seats} seats</span>
                    <span className="text-zinc-600 text-[9px] font-mono">{(Number(party.support_share) * 100).toFixed(1)}% support</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9px] text-zinc-600 uppercase tracking-widest">{party.ideology.replace(/_/g, ' ')}</div>
                  <div className="text-[9px] text-zinc-500">{party.member_count} members</div>
                </div>
              </div>
            ))
          )}
        </div>
      </TerminalPanel>
    </div>
  );
}
