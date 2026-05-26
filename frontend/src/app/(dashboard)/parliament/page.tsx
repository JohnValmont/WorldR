'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { partiesApi, electionsApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import GaugeBar from '../../../components/ui/GaugeBar';
import HemicycleChart from '../../../components/charts/HemicycleChart';
import CoalitionPanel from '../../../components/ui/CoalitionPanel';
import IdeologyBadge from '../../../components/ui/IdeologyBadge';

const TOTAL_SEATS = 450;
const MAJORITY = Math.ceil(TOTAL_SEATS / 2); // 226

const ROLE_CONFIG: Record<string, { label: string; icon: string; desc: string }> = {
  leader:           { label: 'Party Leader',       icon: '👑', desc: 'Full party decisions, coalition negotiations' },
  deputy_leader:    { label: 'Deputy Leader',       icon: '🔰', desc: 'Stands in for leader; manages parliamentary group' },
  secretary_general:{ label: 'Secretary General',  icon: '📋', desc: 'Administrative; member management' },
  treasurer:        { label: 'Treasurer',           icon: '💰', desc: 'Party funds management; approves spending' },
  campaign_manager: { label: 'Campaign Manager',   icon: '📣', desc: 'Rally organization; voter outreach' },
  policy_chief:     { label: 'Policy Chief',        icon: '📊', desc: 'Law drafting; manifesto updates' },
  media_manager:    { label: 'Media Manager',       icon: '📡', desc: 'Press statements; party image' },
  whip:             { label: 'Parliamentary Whip',  icon: '⚖️', desc: 'Ensures party discipline in votes' },
};

export default function ParliamentPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;

  const [parties, setParties] = useState<any[]>([]);
  const [electionStatus, setElectionStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      partiesApi.getParties(nationId).then(r => setParties(r.data.parties || [])).catch(() => {}),
      electionsApi.getStatus(nationId).then(r => setElectionStatus(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [nationId]);

  const governingParties = parties.filter(p => p.is_governing);
  const coalitionSeats = governingParties.reduce((a: number, p: any) => a + p.seats, 0);
  const hasMajority = coalitionSeats >= MAJORITY;

  const termProgress = electionStatus
    ? ((electionStatus.electionCycle - electionStatus.ticksUntilNext) / electionStatus.electionCycle) * 100
    : 0;

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">
            Bundestag der Keldoria
          </h1>
          <div className="text-zinc-600 text-[10px] font-mono mt-0.5">
            Parliament of the Kingdom of Keldoria · Constitutional Monarchy · {TOTAL_SEATS} seats
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Majority Threshold</div>
          <div className="text-amber-400 font-mono font-bold text-lg">{MAJORITY} seats</div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="terminal-card p-3">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Total Seats</div>
          <div className="text-zinc-200 font-mono font-bold text-xl">{TOTAL_SEATS}</div>
        </div>
        <div className="terminal-card p-3">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Coalition Seats</div>
          <div className={`font-mono font-bold text-xl ${hasMajority ? 'text-emerald-400' : 'text-amber-400'}`}>
            {coalitionSeats}
          </div>
        </div>
        <div className="terminal-card p-3">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Active Parties</div>
          <div className="text-zinc-200 font-mono font-bold text-xl">{parties.length}</div>
        </div>
        <div className="terminal-card p-3">
          <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">Election In</div>
          <div className={`font-mono font-bold text-xl ${(electionStatus?.ticksUntilNext || 48) <= 3 ? 'text-amber-400' : 'text-zinc-200'}`}>
            {electionStatus?.ticksUntilNext ?? '—'} months
          </div>
        </div>
      </div>

      {/* Hemicycle + Coalition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2">
          <TerminalPanel title="Parliament Seating" subtitle="Hemicycle view — seat distribution by party">
            {loading ? (
              <div className="text-zinc-600 text-xs text-center py-12">Loading parliament...</div>
            ) : parties.length > 0 ? (
              <HemicycleChart parties={parties} totalSeats={TOTAL_SEATS} height={240} showLegend={true} />
            ) : (
              <div className="text-zinc-600 text-xs text-center py-12">
                No parties in parliament yet.
              </div>
            )}
          </TerminalPanel>
        </div>

        <div className="space-y-3">
          <TerminalPanel title="Governing Coalition">
            <CoalitionPanel
              parties={governingParties}
              totalSeats={TOTAL_SEATS}
              coalitionThreshold={0.501}
              chancellorParty="KSD"
            />
          </TerminalPanel>

          {/* Term progress */}
          {electionStatus && (
            <TerminalPanel title="Legislative Term">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] text-zinc-500">
                  <span>TERM PROGRESS</span>
                  <span>{termProgress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-zinc-900 h-2 border border-zinc-800">
                  <div
                    className="h-2 bg-amber-500 transition-all duration-700"
                    style={{ width: `${termProgress}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-[9px] text-zinc-500">
                  <div>Current month: <span className="text-zinc-300 font-mono">{electionStatus.currentTick}</span></div>
                  <div>Next election: <span className="text-zinc-300 font-mono">Month {electionStatus.nextElectionTick}</span></div>
                </div>
                {electionStatus.ticksUntilNext <= 3 && (
                  <div className="p-2 border border-amber-800 bg-amber-950/20 text-amber-400 text-[9px] font-mono">
                    ⚠ ELECTION APPROACHING — Campaign now!
                  </div>
                )}
              </div>
            </TerminalPanel>
          )}
        </div>
      </div>

      {/* Full party table */}
      <TerminalPanel title="Party Seat Allocation" subtitle="D'Hondt proportional representation">
        <div className="space-y-0">
          <div className="grid text-[8px] text-zinc-600 uppercase tracking-widest px-2 py-1 border-b border-zinc-800"
            style={{ gridTemplateColumns: '16px 1fr 80px 60px 1fr 60px 60px 80px' }}>
            <span />
            <span>Party</span>
            <span>Ideology</span>
            <span>Founded</span>
            <span>Seat Bar</span>
            <span>Seats</span>
            <span>Support</span>
            <span>Status</span>
          </div>
          {parties.sort((a, b) => b.seats - a.seats).map((p: any) => (
            <div
              key={p.id}
              className="grid items-center px-2 py-2 border-b border-zinc-900/60 hover:bg-zinc-900/40 transition-colors"
              style={{ gridTemplateColumns: '16px 1fr 80px 60px 1fr 60px 60px 80px' }}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <div>
                <div className="text-zinc-200 text-xs font-bold">{p.name}</div>
                <div className="text-zinc-600 text-[8px] font-mono">[{p.abbreviation}]</div>
              </div>
              <IdeologyBadge ideology={p.ideology} size="xs" />
              <div className="text-zinc-600 text-[8px] font-mono">{p.founded_year || '—'} AE</div>
              <div className="bg-zinc-900 h-2 border border-zinc-800">
                <div
                  className="h-2"
                  style={{ width: `${(p.seats / TOTAL_SEATS) * 100}%`, background: p.color }}
                />
              </div>
              <div className="text-zinc-300 text-[10px] font-mono">{p.seats}</div>
              <div className="text-zinc-500 text-[9px] font-mono">{(Number(p.support_share) * 100).toFixed(1)}%</div>
              <div>
                {p.is_governing
                  ? <StatusBadge label="GOVERNING" variant="success" />
                  : <StatusBadge label="OPPOSITION" variant="neutral" />
                }
              </div>
            </div>
          ))}
        </div>
      </TerminalPanel>

      {/* Parliament Roles Reference */}
      <TerminalPanel title="Party Leadership Roles" subtitle="8 organisational roles per party">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="border border-zinc-800 p-2 hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{cfg.icon}</span>
                <span className="text-zinc-200 text-[10px] font-bold">{cfg.label}</span>
              </div>
              <div className="text-zinc-600 text-[8px]">{cfg.desc}</div>
            </div>
          ))}
        </div>
      </TerminalPanel>

      {/* Active laws notice */}
      <TerminalPanel title="Active Parliament Sessions">
        <div className="space-y-2">
          <div className="p-2 border border-amber-900/50 bg-amber-950/10 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-amber-400">📋 Pension Reform Sustainability Act</span>
              <StatusBadge label="PROPOSED" variant="warning" />
            </div>
            <div className="text-zinc-500 mt-1">Raise retirement age 65→67, +2% contributions. Opposed by ULA & unions.</div>
          </div>
          <div className="p-2 border border-zinc-800 bg-zinc-900/50 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">📋 Digital Infrastructure Investment Program</span>
              <StatusBadge label="COMMITTEE" variant="info" />
            </div>
            <div className="text-zinc-500 mt-1">KDM 180B for rural broadband, 5G rollout, digital services.</div>
          </div>
          <div className="p-2 border border-emerald-900/50 bg-emerald-950/10 text-[10px] font-mono">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400">✓ Green Energy Transition Law</span>
              <StatusBadge label="PASSED" variant="success" />
            </div>
            <div className="text-zinc-500 mt-1">60% renewable by 860 AE. Carbon levy on fossil fuels enacted.</div>
          </div>
        </div>
      </TerminalPanel>

    </div>
  );
}
