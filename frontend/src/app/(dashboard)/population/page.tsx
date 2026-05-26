'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, voterBlocsApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatCard from '../../../components/ui/StatCard';
import VoterBlocRow from '../../../components/ui/VoterBlocRow';
import LineChart from '../../../components/charts/LineChart';

const IDEOLOGY_COLORS: Record<string, string> = {
  social_democrat: '#e63946', socialist: '#9d0208', centrist: '#9ca3af',
  conservative: '#457b9d', nationalist: '#1d3557', libertarian: '#f4a261',
  green: '#2d6a4f', technocratic: '#6a4c93', populist: '#92400e',
};

export default function PopulationPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;

  const [voterBlocs, setVoterBlocs] = useState<any[]>([]);
  const [populationGroups, setPopulationGroups] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'blocs' | 'classes' | 'analysis'>('blocs');

  useEffect(() => {
    Promise.all([
      voterBlocsApi.getBlocs(nationId)
        .then(r => setVoterBlocs(r.data.voterBlocs || r.data.blocs || []))
        .catch(() => {}),
      nationApi.getState(nationId)
        .then(r => setPopulationGroups(r.data.populationGroups || []))
        .catch(() => {}),
      nationApi.getHistory(nationId, 24)
        .then(r => {
          const snaps = (r.data.snapshots || r.data || []).reverse();
          setHistory(snaps.map((s: any) => ({
            tick: s.tick,
            approval: Number(s.approval) * 100,
            stability: Number(s.stability) * 100,
          })));
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [nationId]);

  // Derived stats
  const totalPopulation = 82000000;
  const avgApproval = voterBlocs.length > 0
    ? voterBlocs.reduce((acc, b) => acc + Number(b.approval) * Number(b.population_share), 0)
    : 0;
  const highestApproval = voterBlocs.reduce((best, b) =>
    Number(b.approval) > Number(best?.approval || 0) ? b : best, voterBlocs[0]);
  const lowestApproval = voterBlocs.reduce((worst, b) =>
    Number(b.approval) < Number(worst?.approval || 1) ? b : worst, voterBlocs[0]);
  const avgTurnout = voterBlocs.length > 0
    ? voterBlocs.reduce((acc, b) => acc + Number(b.turnout_rate) * Number(b.population_share), 0)
    : 0;

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* Header */}
      <div className="border-b border-zinc-800 pb-3">
        <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">
          Population & Voter Blocs
        </h1>
        <div className="text-zinc-600 text-[10px] font-mono mt-0.5">
          Keldoria · 82,000,000 citizens · 12 political voter blocs
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard
          label="Total Population"
          value="82.0M"
          color="amber"
        />
        <StatCard
          label="Weighted Approval"
          value={`${(avgApproval * 100).toFixed(1)}%`}
          color={avgApproval > 0.6 ? 'green' : avgApproval < 0.4 ? 'red' : 'amber'}
        />
        <StatCard
          label="Avg Turnout"
          value={`${(avgTurnout * 100).toFixed(1)}%`}
          color="amber"
        />
        <StatCard
          label="Voter Blocs"
          value={`${voterBlocs.length}`}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {[
          { key: 'blocs', label: '12 Voter Blocs' },
          { key: 'classes', label: 'Economic Classes' },
          { key: 'analysis', label: 'Approval Analysis' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── VOTER BLOCS TAB ──────────────────────────────────────────── */}
      {activeTab === 'blocs' && (
        <div className="space-y-3">
          {/* Quick highlights */}
          {highestApproval && lowestApproval && (
            <div className="grid grid-cols-2 gap-3">
              <div className="terminal-card p-3 border-emerald-900/40">
                <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1">Highest Approval Bloc</div>
                <div className="text-emerald-400 text-xs font-bold">{highestApproval.name}</div>
                <div className="text-emerald-400 font-mono text-lg font-bold">
                  {(Number(highestApproval.approval) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="terminal-card p-3 border-red-900/40">
                <div className="text-[8px] text-zinc-600 uppercase tracking-widest mb-1">Lowest Approval Bloc</div>
                <div className="text-red-400 text-xs font-bold">{lowestApproval.name}</div>
                <div className="text-red-400 font-mono text-lg font-bold">
                  {(Number(lowestApproval.approval) * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-zinc-600 text-xs text-center py-12">Loading voter blocs...</div>
          ) : (
            <div className="space-y-2">
              {voterBlocs
                .sort((a, b) => Number(b.population_share) - Number(a.population_share))
                .map(bloc => (
                  <VoterBlocRow key={bloc.code} bloc={bloc} compact={false} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* ── ECONOMIC CLASSES TAB ─────────────────────────────────────── */}
      {activeTab === 'classes' && (
        <TerminalPanel title="Economic Population Classes" subtitle="Simulation-level economic segments">
          <div className="space-y-2">
            {populationGroups.length === 0 ? (
              <div className="text-zinc-600 text-xs text-center py-8">Loading economic classes...</div>
            ) : (
              populationGroups.map((pg: any) => {
                const popM = (Number(pg.size) / 1e6).toFixed(1);
                const income = Number(pg.income);
                const approval = Number(pg.approval);
                return (
                  <div key={pg.name} className="border border-zinc-800 p-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-zinc-200 text-xs font-bold">{pg.name} Class</span>
                          <span className="text-zinc-600 text-[8px] font-mono">{popM}M people</span>
                          <span className="text-zinc-500 text-[8px]">{pg.ideology}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] text-zinc-600 w-16">Approval</span>
                          <div className="w-32 bg-zinc-900 h-1.5 border border-zinc-800">
                            <div
                              className="h-1.5"
                              style={{
                                width: `${approval * 100}%`,
                                background: approval > 0.6 ? '#34d399' : approval < 0.4 ? '#f87171' : '#f59e0b'
                              }}
                            />
                          </div>
                          <span className="text-[9px] font-mono" style={{
                            color: approval > 0.6 ? '#34d399' : approval < 0.4 ? '#f87171' : '#f59e0b'
                          }}>
                            {(approval * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] text-zinc-600">Avg Income</div>
                        <div className="text-zinc-300 font-mono text-sm font-bold">
                          ${income >= 1000 ? `${(income / 1000).toFixed(0)}K` : income}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TerminalPanel>
      )}

      {/* ── ANALYSIS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'analysis' && (
        <div className="space-y-3">
          <TerminalPanel title="National Approval Trend">
            {history.length > 1 ? (
              <LineChart
                data={history}
                xKey="tick"
                lines={[
                  { key: 'approval', color: '#34d399', label: 'National Approval %' },
                  { key: 'stability', color: '#60a5fa', label: 'Stability %' },
                ]}
                height={180}
                yDomain={[0, 100]}
                formatY={v => `${v.toFixed(0)}%`}
              />
            ) : (
              <div className="text-zinc-600 text-xs text-center py-12">Awaiting simulation tick data.</div>
            )}
          </TerminalPanel>

          <TerminalPanel title="Approval Decomposition" subtitle="Weighted contribution by bloc">
            <div className="space-y-1.5">
              {voterBlocs
                .sort((a, b) => Number(b.population_share) - Number(a.population_share))
                .map(bloc => {
                  const contribution = Number(bloc.approval) * Number(bloc.population_share) * Number(bloc.turnout_rate);
                  const color = Number(bloc.approval) > 0.6 ? '#34d399' : Number(bloc.approval) < 0.4 ? '#f87171' : '#f59e0b';
                  return (
                    <div key={bloc.code} className="flex items-center gap-2">
                      <span className="text-zinc-400 text-[9px] font-mono w-36 truncate">{bloc.name}</span>
                      <div className="flex-1 bg-zinc-900 h-2">
                        <div className="h-2" style={{ width: `${contribution * 100 * 5}%`, background: color, maxWidth: '100%' }} />
                      </div>
                      <span className="text-[9px] font-mono w-10 text-right" style={{ color }}>
                        {(Number(bloc.approval) * 100).toFixed(0)}%
                      </span>
                      <span className="text-zinc-600 text-[8px] w-8 text-right">
                        {(Number(bloc.population_share) * 100).toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </TerminalPanel>

          <TerminalPanel title="Key Social Tensions" subtitle="Active political fault lines in Keldoria">
            <div className="space-y-2">
              {[
                { tension: 'West vs East Economic Gap', severity: 'high', parties: 'NRP exploits · KSD manages' },
                { tension: 'Immigration Culture Clash', severity: 'medium', parties: 'NRP vs ULA vs CCU' },
                { tension: 'Youth Housing Affordability', severity: 'high', parties: 'KGP + ULA vs FLD' },
                { tension: 'Pension Reform Politics', severity: 'very_high', parties: 'CCU vs ULA vs KSD' },
                { tension: 'Industrial Automation', severity: 'medium', parties: 'ULA vs TPP' },
                { tension: 'Energy Price Increases', severity: 'medium', parties: 'NRP + CCU vs KGP' },
              ].map(t => (
                <div key={t.tension} className={`p-2 border text-[10px] font-mono ${
                  t.severity === 'very_high' ? 'border-red-900/60 bg-red-950/10 text-red-400' :
                  t.severity === 'high' ? 'border-amber-900/50 bg-amber-950/10 text-amber-400' :
                  'border-zinc-800 bg-zinc-900/50 text-zinc-400'
                }`}>
                  <div className="font-bold">{t.tension}</div>
                  <div className="text-zinc-500 text-[8px] mt-0.5">{t.parties}</div>
                </div>
              ))}
            </div>
          </TerminalPanel>
        </div>
      )}
    </div>
  );
}
