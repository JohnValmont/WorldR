'use client';
import { useEffect, useState } from 'react';
import { useNationStore } from '../../../store/useNationStore';
import { useAuthStore } from '../../../store/auth.store';
import { nationApi, partiesApi, reportsApi, voterBlocsApi, KELDORIA_ID } from '../../../lib/api';
import StatCard from '../../../components/ui/StatCard';
import GaugeBar from '../../../components/ui/GaugeBar';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import LineChart from '../../../components/charts/LineChart';
import HemicycleChart from '../../../components/charts/HemicycleChart';
import CoalitionPanel from '../../../components/ui/CoalitionPanel';
import ElectionPolling from '../../../components/ui/ElectionPolling';
import NationFlag from '../../../components/ui/NationFlag';
import VoterBlocRow from '../../../components/ui/VoterBlocRow';

function fmt(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

const YEAR_BASE = 850;

interface Article {
  id: number;
  category: string;
  headline: string;
  summary: string;
  author: string;
  date: string;
  body: string;
}

export default function DashboardPage() {
  const { nation, isLoading } = useNationStore();
  const { user } = useAuthStore();
  const nationId = user?.nation_id || KELDORIA_ID;

  const [activeTab, setActiveTab] = useState<'overview' | 'news'>('overview');
  const [history, setHistory] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [latestReport, setLatestReport] = useState<any>(null);
  const [voterBlocs, setVoterBlocs] = useState<any[]>([]);
  const [ticking, setTicking] = useState(false);
  const [tickMsg, setTickMsg] = useState('');

  // Newspaper local state
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [newsCategory, setNewsCategory] = useState('FRONT PAGE');
  const [articles, setArticles] = useState<Article[]>([
    {
      id: 1,
      category: 'GOVERNANCE',
      headline: 'Bundestag debates tax reform packaging',
      summary: 'Proposed updates to property and corporate tax rates spark intense arguments among coalition parties, challenging legislative stability.',
      author: 'Alistair Sterling',
      date: 'Feb 18, 2010',
      body: 'The coalition cabinet is facing a critical legislative test as debates escalate over the tax modernization package. The proposed cuts to corporate levies, balanced by a modest increase in property taxes, have drawn heavy fire from the opposition ULA party. Proponents argue that the amendments will boost sector productivity, while skeptics point out potential impacts on welfare allocations.'
    },
    {
      id: 2,
      category: 'ECONOMY',
      headline: 'Sector productivity surges amid automation drive',
      summary: 'Industrial output rises by 2.1% as manufacturing plants adopt automation protocols. Rural labor shifts continue to stress housing sectors.',
      author: 'Marcus Vance',
      date: 'Feb 15, 2010',
      body: 'A significant productivity spike has been recorded in the industrial centers of Rheinlund and Ostmark. Thanks to state-backed loans, automation systems are modernizing factories at a record pace. The shift, however, has triggered demands from labor unions to establish training subsidies for displaced workers.'
    },
    {
      id: 3,
      category: 'POLITICS',
      headline: 'Voter polls indicate swing toward green platform',
      summary: 'Rising concerns regarding energy security and climate goals push support share for the Green party upwards ahead of autumn sessions.',
      author: 'Clara Bennett',
      date: 'Feb 14, 2010',
      body: 'Recent polling suggests Keldorian voters are increasingly prioritizing ecological initiatives. The Green party has captured support share from the centrist coalition, placing pressure on the government to advance the renewable transition law timeline.'
    }
  ]);

  const [newArticle, setNewArticle] = useState({
    category: 'GOVERNANCE',
    headline: '',
    summary: '',
    author: user?.display_name || user?.username || 'Staff Writer',
    body: ''
  });

  useEffect(() => {
    nationApi.getHistory(nationId, 12)
      .then(r => {
        const snaps = (r.data.snapshots || r.data || []).reverse();
        setHistory(snaps.map((s: any) => ({
          tick: s.tick,
          gdp: Number(s.gdp) / 1e9,
          approval: (Number(s.approval) * 100),
          inflation: (Number(s.inflation_cpi) * 100),
          stability: (Number(s.stability) * 100),
        })));
      })
      .catch(() => {});

    partiesApi.getParties(nationId)
      .then(r => setParties(r.data.parties || []))
      .catch(() => {});

    reportsApi.getLatest(nationId)
      .then(r => setLatestReport(r.data.report))
      .catch(() => {});

    voterBlocsApi.getBlocs(nationId)
      .then(r => setVoterBlocs(r.data.voterBlocs || r.data.blocs || []))
      .catch(() => {});
  }, [nationId]);

  const handleTick = async () => {
    setTicking(true);
    setTickMsg('');
    try {
      await nationApi.triggerTick(nationId);
      setTickMsg('✓ Month advanced.');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setTickMsg('✕ ' + (err?.response?.data?.error || 'Tick failed.'));
    } finally {
      setTicking(false);
    }
  };

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticle.headline || !newArticle.body) return;

    const article: Article = {
      id: Date.now(),
      category: newArticle.category,
      headline: newArticle.headline,
      summary: newArticle.summary || (newArticle.body.slice(0, 120) + '...'),
      author: newArticle.author,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      body: newArticle.body
    };

    setArticles([article, ...articles]);
    setShowWriteModal(false);
    setNewArticle({
      category: 'GOVERNANCE',
      headline: '',
      summary: '',
      author: user?.display_name || user?.username || 'Staff Writer',
      body: ''
    });
  };

  if (isLoading || !nation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-zinc-500 text-xs font-mono animate-pulse">
          Loading state details...
        </div>
      </div>
    );
  }

  const currentYear = YEAR_BASE + Math.floor(nation.currentTick / 12);
  const currentMonth = (nation.currentTick % 12) + 1;
  const governingParties = parties.filter(p => p.is_governing);
  const totalSeats = 450; // Standard Bundestag seats
  const revenue = latestReport?.economy?.revenue || 0;
  const spending = latestReport?.economy?.spending || 0;
  const deficit = spending - revenue;
  const unemploymentRate = latestReport?.economy?.unemploymentRate ||
    latestReport?.unemployment_rate || 0.051;

  // Filter articles based on sub-category selected
  const filteredArticles = newsCategory === 'FRONT PAGE'
    ? articles
    : articles.filter(a => a.category.toUpperCase() === newsCategory);

  const mainStory = filteredArticles[0];
  const sideStories = filteredArticles.slice(1);

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* ── Nation Header ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-3 gap-3">
        <div className="flex items-center gap-3">
          <NationFlag size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-zinc-100 font-extrabold text-xl uppercase tracking-widest leading-none">
                {nation.name}
              </h1>
              <span className="text-[8px] bg-amber-500/[0.04] border border-amber-500/30 text-amber-500 px-1.5 py-0.5 rounded-sm font-semibold uppercase tracking-wider font-mono">
                Alpha v2.6
              </span>
            </div>
            <div className="text-zinc-500 text-[10px] font-mono mt-1">
              YEAR {currentYear} AE · MONTH {currentMonth} · BUNDESTAG SEATS — {totalSeats}
            </div>
          </div>
        </div>
        
        {/* Advanced Tick Controller */}
        <div className="flex items-center gap-3">
          {tickMsg && (
            <span className={`text-[10px] font-mono ${tickMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
              {tickMsg}
            </span>
          )}
          <button
            id="advance-month-btn"
            onClick={handleTick}
            disabled={ticking}
            className="btn-premium-primary"
          >
            {ticking ? '⟳ PROCESSING...' : '▶ ADVANCE MONTH'}
          </button>
        </div>
      </div>

      {/* ── Top Stats Row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <StatCard label="GDP" value={fmt(nation.gdp)} color="amber" />
        <StatCard label="Treasury" value={fmt(nation.treasury)} color={nation.treasury < 0 ? 'red' : 'green'} />
        <StatCard label="Debt" value={fmt(nation.debt)} color="red" />
        <StatCard
          label="CPI Inflation"
          value={`${(nation.inflationCpi * 100).toFixed(1)}%`}
          color={nation.inflationCpi > 0.06 ? 'red' : nation.inflationCpi > 0.04 ? 'amber' : 'green'}
        />
        <StatCard
          label="Approval"
          value={`${(nation.approval * 100).toFixed(0)}%`}
          color={nation.approval > 0.6 ? 'green' : nation.approval < 0.4 ? 'red' : 'amber'}
        />
        <StatCard
          label="Stability"
          value={`${(nation.stability * 100).toFixed(0)}%`}
          color={nation.stability > 0.6 ? 'green' : nation.stability < 0.4 ? 'red' : 'amber'}
        />
      </div>

      {/* ── Tab Selector ────────────────────────────────────────────── */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 text-xs font-mono uppercase tracking-wider transition-all duration-150 border-b-2 -mb-[2px] ${
            activeTab === 'overview'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          ▣ Overview
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`px-5 py-2.5 text-xs font-mono uppercase tracking-wider transition-all duration-150 border-b-2 -mb-[2px] ${
            activeTab === 'news'
              ? 'border-amber-500 text-amber-400 font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          📰 The Continental (News)
        </button>
      </div>

      {/* ── Tab Contents ────────────────────────────────────────────── */}
      {activeTab === 'overview' ? (
        <div className="space-y-4">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <TerminalPanel title="GDP Trend" subtitle="$B">
              {history.length > 1 ? (
                <LineChart
                  data={history}
                  xKey="tick"
                  lines={[{ key: 'gdp', color: '#f59e0b', label: 'GDP ($B)' }]}
                  height={140}
                  formatY={v => `$${v.toFixed(1)}B`}
                />
              ) : (
                <div className="text-zinc-600 text-xs text-center py-8">Advance a month to see trends.</div>
              )}
            </TerminalPanel>

            <TerminalPanel title="Approval & Inflation">
              {history.length > 1 ? (
                <LineChart
                  data={history}
                  xKey="tick"
                  lines={[
                    { key: 'approval', color: '#34d399', label: 'Approval %' },
                    { key: 'inflation', color: '#f87171', label: 'Inflation %' },
                  ]}
                  height={140}
                  yDomain={[0, 100]}
                  formatY={v => `${v.toFixed(0)}%`}
                />
              ) : (
                <div className="text-zinc-600 text-xs text-center py-8">Advance a month to see trends.</div>
              )}
            </TerminalPanel>

            <TerminalPanel title="Key Gauges">
              <div className="space-y-3 pt-1">
                <GaugeBar value={nation.approval} label="National Approval" />
                <GaugeBar value={nation.stability} label="Stability Index" />
                <GaugeBar
                  value={Math.max(0, 1 - unemploymentRate / 0.15)}
                  label="Employment Health"
                  color={unemploymentRate > 0.10 ? 'red' : unemploymentRate > 0.07 ? 'amber' : 'green'}
                />
                {deficit > 0 && (
                  <GaugeBar value={Math.min(1, deficit / nation.gdp)} label="Budget Deficit" color="red" />
                )}
              </div>
            </TerminalPanel>
          </div>

          {/* Parliament + Coalition Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2">
              <TerminalPanel
                title="Bundestag der Keldoria"
                subtitle={`${totalSeats} seats · D'Hondt PR`}
              >
                {parties.length > 0 ? (
                  <HemicycleChart
                    parties={parties}
                    totalSeats={totalSeats}
                    height={200}
                    showLegend={true}
                  />
                ) : (
                  <div className="text-zinc-600 text-xs text-center py-12">
                    Parliament not yet constituted.
                  </div>
                )}
              </TerminalPanel>
            </div>

            <div className="space-y-3">
              <TerminalPanel title="Governing Coalition">
                <CoalitionPanel
                  parties={governingParties}
                  totalSeats={totalSeats}
                  coalitionThreshold={0.501}
                  chancellorParty="KSD"
                />
              </TerminalPanel>
            </div>
          </div>

          {/* Voter Blocs + Polling + Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Voter Blocs */}
            <div className="lg:col-span-1">
              <TerminalPanel title="Voter Bloc Approval" subtitle="12 blocs">
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {voterBlocs.length > 0 ? (
                    voterBlocs.map((bloc: any) => (
                      <VoterBlocRow key={bloc.code} bloc={bloc} compact={true} />
                    ))
                  ) : (
                    <div className="text-zinc-600 text-xs text-center py-8">Loading voter blocs...</div>
                  )}
                </div>
              </TerminalPanel>
            </div>

            {/* Polling */}
            <div className="lg:col-span-1">
              <TerminalPanel title="Election Polling" subtitle="Current support share">
                {parties.length > 0 ? (
                  <ElectionPolling parties={parties} totalSeats={totalSeats} showSeats={true} />
                ) : (
                  <div className="text-zinc-600 text-xs text-center py-8">No parties registered.</div>
                )}
              </TerminalPanel>
            </div>

            {/* Alerts */}
            <div className="lg:col-span-1">
              <TerminalPanel title="National Alerts">
                {!latestReport || latestReport.alerts?.length === 0 ? (
                  <div className="space-y-2">
                    <div className="p-2 text-[10px] font-mono border border-white/5 bg-white/[0.01] text-zinc-500 rounded-sm">
                      ℹ Aging Population Crisis — Pension system projected solvent 18 years
                    </div>
                    <div className="p-2 text-[10px] font-mono border border-amber-950/30 bg-amber-950/5 text-amber-500 rounded-sm">
                      ⚠ Energy Transition — Coal exit by Year 862 AE on schedule
                    </div>
                    <div className="p-2 text-[10px] font-mono border border-white/5 bg-white/[0.01] text-zinc-500 rounded-sm">
                      ℹ Pension Reform Act — Proposed, awaiting parliament vote
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {latestReport.alerts.map((a: any, i: number) => (
                      <div key={i} className={`p-2 text-[10px] font-mono border rounded-sm ${
                        a.severity === 'danger' ? 'border-red-950 bg-red-950/10 text-red-400' :
                        a.severity === 'warning' ? 'border-amber-950 bg-amber-950/10 text-amber-400' :
                        'border-white/5 bg-white/[0.01] text-zinc-400'
                      }`}>
                        {a.message}
                      </div>
                    ))}
                  </div>
                )}
              </TerminalPanel>
            </div>
          </div>

          {/* Party Standings */}
          <TerminalPanel
            title="Parliamentary Party Standings"
            subtitle={`${parties.reduce((a, p) => a + p.seats, 0)} / ${totalSeats} seats allocated`}
          >
            <div className="space-y-2.5">
              {parties.length === 0 ? (
                <div className="text-zinc-600 text-xs text-center py-6">No parties formed yet.</div>
              ) : (
                parties.sort((a, b) => b.seats - a.seats).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3 py-1 border-b border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color, boxShadow: `0 0 6px ${p.color}` }} />
                    <span className="text-zinc-300 text-xs font-bold w-48 truncate">{p.name}</span>
                    <span className="text-zinc-500 text-[9px] font-mono w-8">[{p.abbreviation}]</span>
                    <div className="flex-1 bg-zinc-900/60 h-2 rounded-sm overflow-hidden border border-white/5">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${(p.seats / totalSeats) * 100}%`, background: p.color }}
                      />
                    </div>
                    <span className="text-zinc-300 text-[10px] font-mono w-16 text-right">
                      {p.seats} seats
                    </span>
                    <span className="text-zinc-500 text-[9px] font-mono w-10 text-right">
                      {(p.support_share ? Number(p.support_share) * 100 : 0).toFixed(1)}%
                    </span>
                    {p.is_governing && <span className="text-[8px] bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 px-1 py-0.5 rounded-sm uppercase tracking-widest font-mono shrink-0">GOV</span>}
                  </div>
                ))
              )}
            </div>
          </TerminalPanel>
        </div>
      ) : (
        /* ── The Continental News Layout ───────────────────────────── */
        <div className="border border-white/5 bg-zinc-950 p-6 rounded-sm space-y-5">
          {/* Newspaper Masthead */}
          <div className="text-center border-t-2 border-b-2 border-white/10 py-5 my-2">
            <h1 className="font-serif italic text-4xl md:text-5xl font-extrabold tracking-wide text-zinc-100 uppercase">
              The Continental
            </h1>
            <p className="text-[9px] uppercase font-mono tracking-[0.2em] text-zinc-500 mt-2">
              Independent Journalism for the Continent of {nation.region || 'Meridian'}
            </p>
          </div>

          {/* Newspaper Sub-nav */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-white/5 pb-2.5 gap-3">
            <div className="flex flex-wrap gap-2">
              {['FRONT PAGE', 'GOVERNANCE', 'ECONOMY', 'POLITICS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setNewsCategory(cat)}
                  className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 transition-colors rounded-sm ${
                    newsCategory === cat
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.02] border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setShowWriteModal(true)}
              className="text-[9px] bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white px-3 py-1.5 uppercase tracking-wider font-mono transition-colors rounded-sm"
            >
              ✍ Write Article
            </button>
          </div>

          {/* Breaking News Ticker */}
          <div className="bg-black/50 border border-white/5 py-2 px-3 overflow-hidden text-[10px] text-zinc-400 font-mono flex items-center gap-3.5 rounded-sm">
            <span className="bg-red-950/50 border border-red-900/50 text-red-400 font-bold px-1.5 py-0.5 text-[8px] rounded-sm shrink-0 animate-pulse">BREAKING</span>
            <div className="w-full overflow-hidden whitespace-nowrap relative flex">
              <div className="animate-marquee flex gap-8 text-zinc-400 font-mono select-none">
                <span>Trade talks enter third round ◆ Weather advisory issued for eastern coastal regions ◆ Central banking consortium releases monthly ledger report ◆ Electoral commission confirms voter list verifications complete ◆</span>
                <span>Trade talks enter third round ◆ Weather advisory issued for eastern coastal regions ◆ Central banking consortium releases monthly ledger report ◆ Electoral commission confirms voter list verifications complete ◆</span>
              </div>
            </div>
          </div>

          {/* Newspaper grid */}
          {mainStory ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 my-4">
              {/* Columns 1 & 2: A1 Lead Story */}
              <div className="lg:col-span-2 space-y-4">
                <div className="border-b border-white/5 pb-4">
                  <span className="text-[9px] bg-white/5 border border-white/5 text-amber-400 px-2 py-0.5 rounded-sm uppercase tracking-widest font-mono font-bold mb-3 inline-block">
                    [{mainStory.category}]
                  </span>
                  <h2 className="text-zinc-100 font-serif font-black italic text-2xl md:text-3xl leading-tight mb-3">
                    {mainStory.headline}
                  </h2>
                  <p className="text-zinc-300 font-serif italic text-sm md:text-base leading-relaxed border-l-2 border-amber-500/80 pl-3 mb-4">
                    {mainStory.summary}
                  </p>
                  <div className="text-[9px] text-zinc-500 font-mono uppercase">
                    By {mainStory.author} · {mainStory.date}
                  </div>
                </div>
                <div className="text-zinc-400 font-serif text-sm leading-relaxed whitespace-pre-line text-justify columns-1 md:columns-2 gap-5">
                  {mainStory.body}
                </div>
              </div>

              {/* Column 3: Sidebar */}
              <div className="border-l border-white/5 pl-0 lg:pl-6 space-y-5">
                {/* Photo Panel */}
                <div>
                  <div className="bg-white/[0.01] border border-white/5 h-44 rounded-sm flex flex-col items-center justify-center text-zinc-700 mb-2.5">
                    <span className="text-3xl">📷</span>
                    <span className="text-[9px] uppercase font-mono tracking-widest mt-1">Photo Chronicle</span>
                  </div>
                  <div className="text-[9px] text-zinc-500 italic font-serif leading-tight">
                    Bundestag members assembling during debate on tax reform packages.
                  </div>
                </div>

                {/* Second Article / Side Story */}
                {sideStories.length > 0 ? (
                  <div className="border-t border-white/5 pt-4">
                    <span className="text-[8px] text-amber-500 uppercase tracking-widest font-mono font-bold block mb-1">
                      [{sideStories[0].category}]
                    </span>
                    <h3 className="text-zinc-200 font-serif font-bold italic text-base leading-tight mb-1.5 hover:text-amber-400 transition-colors">
                      {sideStories[0].headline}
                    </h3>
                    <p className="text-zinc-400 font-serif text-xs leading-relaxed line-clamp-4 text-justify">
                      {sideStories[0].summary}
                    </p>
                    <div className="text-[8px] text-zinc-600 font-mono uppercase mt-2">
                      By {sideStories[0].author} · {sideStories[0].date}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-white/5 pt-4 text-center py-6">
                    <p className="text-zinc-600 text-xs italic font-serif">No secondary articles in this section.</p>
                  </div>
                )}
                
                {/* Third Article / Mini story */}
                {sideStories.length > 1 && (
                  <div className="border-t border-white/5 pt-4">
                    <span className="text-[8px] text-amber-500 uppercase tracking-widest font-mono font-bold block mb-1">
                      [{sideStories[1].category}]
                    </span>
                    <h4 className="text-zinc-200 font-serif font-semibold italic text-sm leading-tight mb-1">
                      {sideStories[1].headline}
                    </h4>
                    <p className="text-zinc-400 font-serif text-xs leading-relaxed line-clamp-3">
                      {sideStories[1].summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 border border-white/5 bg-white/[0.01] rounded-sm">
              <p className="text-zinc-500 italic font-serif text-sm">No articles published under this category yet.</p>
              <button
                onClick={() => setShowWriteModal(true)}
                className="mt-3 text-[10px] bg-amber-500 text-black font-bold font-mono px-3 py-1.5 uppercase rounded-sm hover:bg-amber-400 transition-colors"
              >
                Be the first to publish
              </button>
            </div>
          )}

          {/* Editorial notice */}
          <div className="text-center text-[8px] text-zinc-700 uppercase tracking-widest font-mono border-t border-white/5 pt-4 mt-6">
            The Continental Newspaper Syndicate · Published Monthly AE · Free Press Distribution
          </div>
        </div>
      )}

      {/* ── Write Article Modal ────────────────────────────────────── */}
      {showWriteModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 shadow-2xl rounded-sm animate-fade-in-up border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0 animate-pulse" />
                <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.25em] font-bold">EDITORIAL DRAFT</span>
              </div>
              <button
                type="button"
                onClick={() => setShowWriteModal(false)}
                className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="space-y-4 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Category</label>
                  <select
                    value={newArticle.category}
                    onChange={e => setNewArticle({ ...newArticle, category: e.target.value })}
                    className="input-premium bg-zinc-950"
                  >
                    <option value="GOVERNANCE">Governance</option>
                    <option value="ECONOMY">Economy</option>
                    <option value="POLITICS">Politics</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Author Pen Name</label>
                  <input
                    type="text"
                    required
                    value={newArticle.author}
                    onChange={e => setNewArticle({ ...newArticle, author: e.target.value })}
                    className="input-premium"
                    placeholder="Staff Writer"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Headline</label>
                <input
                  type="text"
                  required
                  value={newArticle.headline}
                  onChange={e => setNewArticle({ ...newArticle, headline: e.target.value })}
                  className="input-premium"
                  placeholder="e.g. Coalition collapses over budget gridlock"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Story Summary (Brief)</label>
                <input
                  type="text"
                  value={newArticle.summary}
                  onChange={e => setNewArticle({ ...newArticle, summary: e.target.value })}
                  className="input-premium"
                  placeholder="A concise summary of the story to act as subhead..."
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Article Body Text</label>
                <textarea
                  required
                  rows={6}
                  value={newArticle.body}
                  onChange={e => setNewArticle({ ...newArticle, body: e.target.value })}
                  className="input-premium resize-none leading-relaxed text-sm"
                  placeholder="Compose article body here. Keep paragraphs clean for print formatting..."
                />
              </div>

              <button
                type="submit"
                className="btn-premium-primary w-full"
              >
                PUBLISH TO CHRONICLE →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Action Chat Bubble indicator matching reference */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setActiveTab(activeTab === 'news' ? 'overview' : 'news')}
          className="w-11 h-11 bg-gradient-to-tr from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-black shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          title="Toggle News Feed"
        >
          <span className="text-lg">📰</span>
        </button>
      </div>

    </div>
  );
}
