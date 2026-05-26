'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { electionsApi, partiesApi, nationApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import ElectionPolling from '../../../components/ui/ElectionPolling';
import IdeologyBadge from '../../../components/ui/IdeologyBadge';

const TOTAL_SEATS = 450;

export default function ElectionsPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;

  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [nationState, setNationState] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      electionsApi.getStatus(nationId).then(r => setStatus(r.data)).catch(() => {}),
      electionsApi.getHistory(nationId, 5).then(r => setHistory(r.data.elections || [])).catch(() => {}),
      partiesApi.getParties(nationId).then(r => setParties(r.data.parties || [])).catch(() => {}),
      nationApi.getState(nationId).then(r => setNationState(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [nationId]);

  const progressPct = status
    ? ((status.electionCycle - status.ticksUntilNext) / status.electionCycle) * 100
    : 0;

  const electionApproaching = (status?.ticksUntilNext || 99) <= 4;
  const inflationRate = Number(nationState?.nation?.inflation_cpi || 0.024);
  const approvalRate = Number(nationState?.nation?.approval || 0.56);

  // Compute projected seats from support shares
  const projectedResults = [...parties]
    .sort((a, b) => Number(b.support_share) - Number(a.support_share))
    .map(p => ({
      ...p,
      projectedSeats: Math.round(Number(p.support_share) * TOTAL_SEATS),
    }));
  const topProjected = projectedResults[0];

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Elections</h1>
          <div className="text-zinc-600 text-[10px] font-mono mt-0.5">
            Keldoria parliamentary elections · D'Hondt proportional representation · {TOTAL_SEATS} seats
          </div>
        </div>
        {electionApproaching && (
          <StatusBadge label="⚠ ELECTION APPROACHING" variant="warning" />
        )}
      </div>

      {/* Election cycle + polling grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Election cycle */}
        {status && (
          <TerminalPanel title="Election Cycle">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Current Month</div>
                <div className="text-amber-400 font-mono text-xl font-bold">{status.currentTick}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Next Election</div>
                <div className="text-zinc-300 font-mono text-xl font-bold">Month {status.nextElectionTick}</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Months Until</div>
                <div className={`font-mono text-xl font-bold ${electionApproaching ? 'text-amber-400' : 'text-zinc-300'}`}>
                  {status.ticksUntilNext}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Cycle Length</div>
                <div className="text-zinc-300 font-mono text-xl font-bold">{status.electionCycle}mo</div>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-[8px] text-zinc-600 mb-1">
                <span>TERM PROGRESS</span>
                <span>{progressPct.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-2 border border-zinc-800">
                <div className="h-2 bg-amber-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            {electionApproaching && (
              <div className="mt-3 p-2 border border-amber-800 bg-amber-950/20 text-amber-400 text-[10px] font-mono">
                ⚠ Campaign now! Organize rallies, release policies, target voter blocs.
              </div>
            )}
          </TerminalPanel>
        )}

        {/* Current polling */}
        <div className="lg:col-span-2">
          <TerminalPanel title="Current Polling" subtitle="Live support share — projected seats">
            {parties.length > 0 ? (
              <ElectionPolling parties={parties} totalSeats={TOTAL_SEATS} showSeats={true} />
            ) : (
              <div className="text-zinc-600 text-xs text-center py-8">No parties registered.</div>
            )}
          </TerminalPanel>
        </div>
      </div>

      {/* Economic factors + Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

        <TerminalPanel title="Economic Approval Factors" subtitle="Current economic conditions affect vote share">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">National Approval</div>
                <div className={`font-mono text-lg font-bold ${approvalRate > 0.6 ? 'text-emerald-400' : approvalRate < 0.4 ? 'text-red-400' : 'text-amber-400'}`}>
                  {(approvalRate * 100).toFixed(0)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Effect on Incumbents</div>
                <div className={`text-xs font-mono ${approvalRate > 0.5 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {approvalRate > 0.5 ? '▲ POSITIVE' : '▼ NEGATIVE'}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
              <div>
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">CPI Inflation</div>
                <div className={`font-mono text-lg font-bold ${inflationRate > 0.05 ? 'text-red-400' : inflationRate > 0.03 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {(inflationRate * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-zinc-600 uppercase tracking-widest">Voter Sensitivity</div>
                <div className={`text-xs font-mono ${inflationRate > 0.05 ? 'text-red-400' : 'text-zinc-400'}`}>
                  {inflationRate > 0.05 ? '⚠ HIGH IMPACT' : '— NORMAL'}
                </div>
              </div>
            </div>
            <div className="text-[9px] text-zinc-500 space-y-1">
              <div>• Pensioners (16% of pop) highly sensitive to inflation — CCU benefits</div>
              <div>• Unemployed precariat (12%) votes heavily NRP/ULA in downturns</div>
              <div>• Urban knowledge workers (9%) reward climate action — KGP benefits</div>
            </div>
          </div>
        </TerminalPanel>

        <TerminalPanel title="Election Forecast" subtitle="Projected outcome based on current polling">
          {projectedResults.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3 p-2 border border-zinc-700 bg-zinc-900">
                <div className="w-3 h-3 rounded-full" style={{ background: topProjected?.color }} />
                <div className="flex-1">
                  <div className="text-zinc-200 text-xs font-bold">Projected largest party: {topProjected?.abbreviation}</div>
                  <div className="text-zinc-500 text-[9px]">~{topProjected?.projectedSeats} seats — {
                    topProjected?.projectedSeats >= Math.ceil(TOTAL_SEATS / 2)
                      ? 'Outright majority'
                      : 'Coalition required'
                  }</div>
                </div>
                <IdeologyBadge ideology={topProjected?.ideology || 'centrist'} size="xs" />
              </div>

              {projectedResults.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                  <span className="text-zinc-400 text-[9px] font-mono w-8">{p.abbreviation}</span>
                  <div className="flex-1 bg-zinc-900 h-2">
                    <div className="h-2" style={{ width: `${(p.projectedSeats / TOTAL_SEATS) * 100}%`, background: p.color }} />
                  </div>
                  <span className="text-zinc-400 text-[9px] font-mono w-8 text-right">~{p.projectedSeats}</span>
                  {p.is_governing && <span className="text-emerald-500 text-[8px]">★</span>}
                </div>
              ))}
              <div className="text-[8px] text-zinc-700 text-right mt-1">Majority threshold: {Math.ceil(TOTAL_SEATS / 2)} seats</div>
            </div>
          ) : (
            <div className="text-zinc-600 text-xs text-center py-8">No polling data available.</div>
          )}
        </TerminalPanel>
      </div>

      {/* Latest election results */}
      {status?.lastElection && (
        <TerminalPanel title="Latest Election Results" subtitle={`Month ${status.lastElection?.election?.tick}`}>
          <div className="mb-3 flex items-center gap-3 flex-wrap">
            {status.lastElection?.election?.coalition_formed && (
              <StatusBadge label="COALITION GOVERNMENT" variant="info" />
            )}
            <span className="text-zinc-500 text-[10px]">
              Turnout: {(status.lastElection?.election?.turnout_rate * 100).toFixed(1)}% ·{' '}
              Total Votes: {(status.lastElection?.election?.total_votes || 0).toLocaleString()}
            </span>
          </div>
          <div className="space-y-2">
            {(status.lastElection?.results || []).map((r: any) => (
              <div key={r.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.party_color }} />
                <span className="text-zinc-300 text-xs w-36 truncate">{r.party_name}</span>
                <span className="text-zinc-500 text-[9px] w-8">[{r.party_abbreviation}]</span>
                <div className="flex-1 bg-zinc-900 h-2 border border-zinc-800">
                  <div className="h-2 transition-all duration-700" style={{ width: `${(r.seats / TOTAL_SEATS) * 100}%`, background: r.party_color }} />
                </div>
                <span className="text-zinc-300 text-xs font-mono w-14 text-right">{r.seats} seats</span>
                <span className="text-zinc-600 text-[9px] font-mono w-10 text-right">{(r.vote_share * 100).toFixed(1)}%</span>
                {r.is_governing && <StatusBadge label="GOV" variant="success" />}
              </div>
            ))}
          </div>
        </TerminalPanel>
      )}

      {/* Election history */}
      {history.length > 0 && (
        <TerminalPanel title="Election History">
          <div className="space-y-3">
            {history.map((el: any) => (
              <div key={el.id} className="border border-zinc-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-zinc-300 text-xs font-bold">Election — Month {el.tick}</div>
                  <div className="text-zinc-500 text-[9px]">Turnout: {(el.turnout_rate * 100).toFixed(1)}%</div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {(el.results || []).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-1 border border-zinc-800 px-1.5 py-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: r.party_color }} />
                      <span className="text-[9px] text-zinc-400 font-mono">{r.party_abbreviation}: {r.seats}</span>
                      {r.is_governing && <span className="text-emerald-500 text-[8px]">★</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TerminalPanel>
      )}

      {!loading && history.length === 0 && !status?.lastElection && (
        <TerminalPanel title="No Elections Yet">
          <div className="text-zinc-600 text-xs text-center py-8">
            First election will occur at Month {status?.nextElectionTick || 48}.<br />
            Advance months to reach the first election cycle.<br />
            <span className="text-zinc-700 text-[9px]">Campaign now to build support before the vote.</span>
          </div>
        </TerminalPanel>
      )}
    </div>
  );
}
