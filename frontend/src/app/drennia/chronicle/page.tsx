'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import {
  ScrollText, Briefcase, TrendingUp, BarChart2, User, Star,
  Mail, Landmark, ChevronRight, RefreshCw, AlertTriangle, Lock,
  Activity, Globe, Newspaper, Book,
} from 'lucide-react';
import { getContracts, formatGameDate } from '../../../lib/businessCore';
import { addNotification } from '../../../lib/notifications';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import NotificationBell from '../../../components/gameplay/NotificationBell';
import FirstDayModal, { FIRST_DAY_MODAL_KEY } from '../../../components/gameplay/FirstDayModal';
import ThreeMillionBonusModal, { THREE_MILLION_BONUS_MODAL_KEY } from '../../../components/gameplay/ThreeMillionBonusModal';
import GuideModal from '../../../components/gameplay/GuideModal';
import {
  Card, Button, StatChip, DataRow, EmptyState, Badge, StatusDot,
  SectionHeading, PageShell,
} from '../../../components/ui';
import { useAuthStore } from '../../../store/auth.store';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlayerStats {
  credibility: number;
  charisma: number;
  influence: number;
  reputation?: number;
  reliability?: number;
  motherland: string;
  homeState?: string;
  gameDateStr?: string;
}

interface CompanySnapshot {
  id: string;
  name: string;
  sector?: string;
  industry_id?: string;
  headquarters_state_id?: string;
  legal_structure_id?: string;
  finances?: { available_cash?: number };
}

// ── Static data (will be replaced by live API data in future months) ────────────

const SECTOR_DEMAND = [
  { sector: 'Shipping & Logistics', demand: 'High',    pct: 82, dir: 'up'   as const },
  { sector: 'Manufacturing',        demand: 'Rising',  pct: 67, dir: 'up'   as const },
  { sector: 'Retail & Consumer',    demand: 'Medium',  pct: 48, dir: 'flat' as const },
  { sector: 'Agriculture & Food',   demand: 'Stable',  pct: 41, dir: 'flat' as const },
];

const LEDGER_HEADLINES = [
  { id: 1, text: 'Drennport Commercial Bank reports stable liquidity for Q2.' },
  { id: 2, text: 'Ironvale suppliers warn of material cost increases.' },
  { id: 3, text: 'Westport Bourse volume up — Trade activity strengthens.' },
  { id: 4, text: 'Greenmere harvest season expected ahead of schedule.' },
  { id: 5, text: 'New registry filings up 12% — Business formation accelerating.' },
];

/** Mock net-worth series — last 12 months. Replace with real ledger data when available. */
const MOCK_NET_WORTH_SERIES = [
  { month: '11m ago', value: 50000 },
  { month: '10m ago', value: 48200 },
  { month: '9m ago', value: 52100 },
  { month: '8m ago', value: 57300 },
  { month: '7m ago', value: 61800 },
  { month: '6m ago', value: 59200 },
  { month: '5m ago', value: 65000 },
  { month: '4m ago', value: 72400 },
  { month: '3m ago', value: 81200 },
  { month: '2m ago', value: 88700 },
  { month: '1m ago', value: 95100 },
  { month: 'Last mo', value: 103800 },
];

const demandColor = {
  up:   '#30d158',
  flat: '#ff9f0a',
  down: '#ff453a',
} as const;

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0d13] border border-[#23232b] px-3 py-2 rounded-lg text-[10px] font-mono shadow-card">
      <p className="text-zinc-500 mb-0.5 uppercase tracking-wider">{label}</p>
      <p className="text-terminal-amber font-bold">${Number(payload[0].value).toLocaleString('en-US')}</p>
    </div>
  );
}

// ── Sector Demand Bar ──────────────────────────────────────────────────────────

function DemandBar({ sector, demand, pct, dir }: typeof SECTOR_DEMAND[0]) {
  const color = demandColor[dir];
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#23232b] last:border-0">
      <span className="text-[11px] text-zinc-400 flex-1 min-w-0 truncate">{sector}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-24 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full animate-bar-fill"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold w-12 text-right" style={{ color }}>
          {demand}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChroniclePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.email?.toLowerCase() === 'kyxplayss@gmail.com' || user?.email?.toLowerCase() === 'infoforbiddengaming@gmail.com';
  const [authorized, setAuthorized]       = useState(false);
  const [citizenFile, setCitizenFile]     = useState<PlayerStats | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [playerCash, setPlayerCash]       = useState(0);
  const [company, setCompany]             = useState<CompanySnapshot | null>(null);
  const [totalCompanyCash, setTotalCompanyCash] = useState(0);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [activeContracts, setActiveContracts] = useState(0);
  const [netWorthSeries, setNetWorthSeries]   = useState(MOCK_NET_WORTH_SERIES);
  const [netWorth, setNetWorth] = useState(0);
  const [ledgerFeed, setLedgerFeed] = useState<any[]>([]);
  const [showFirstDay, setShowFirstDay] = useState(false);
  const [showThreeMillionBonus, setShowThreeMillionBonus] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [characterAge, setCharacterAge] = useState<number>(18);
  const [leaderboards, setLeaderboards] = useState<any>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'wealth' | 'marketCap'>('wealth');
  const [bestSellersTab, setBestSellersTab] = useState<'monthly' | 'allTime'>('monthly');
  const formatMoney = (value: any) => {
    if (!value && value !== 0) return "$0"; 
    const num = Number(value);
    if (Number.isNaN(num)) return "$0";
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";
    if (abs >= 1e9) return sign + "$" + (abs / 1e9).toFixed(1) + "B"; 
    if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M"; 
    return sign + "$" + Math.round(abs).toLocaleString('en-US'); 
  };
  const radarData = [
    { attr: 'Credibility', value: citizenFile?.credibility ?? 50 },
    { attr: 'Charisma',    value: citizenFile?.charisma    ?? 50 },
    { attr: 'Influence',   value: citizenFile?.influence   ?? 10 },
    { attr: 'Reputation',  value: citizenFile?.reputation  ?? 30 },
    { attr: 'Reliability', value: citizenFile?.reliability ?? 60 },
  ];

  const currentCompanyCash = Number(company?.finances?.available_cash ?? 0);

  const handleRestartLife = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const { characterApi, authApi } = await import('../../../lib/api');
      await characterApi.deleteMe();
      await authApi.logout(localStorage.getItem('worldr_refresh_token') || '');
    } catch (e) {
      console.warn('Failed to delete character', e);
    }
    localStorage.clear();
    window.location.href = '/';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Show first-day orientation modal if not yet seen
    const seenModal = localStorage.getItem(FIRST_DAY_MODAL_KEY) === 'true';
    if (!seenModal) setShowFirstDay(true);

    const seen3MBonus = localStorage.getItem(THREE_MILLION_BONUS_MODAL_KEY) === 'true';
    if (!seen3MBonus) setShowThreeMillionBonus(true);

    import('../../../lib/api').then(({ characterApi, companyApi, politicsApi, worldApi }) => {
      worldApi.getGlobalLeaderboards().then(res => setLeaderboards(res)).catch(e => console.error(e));
      characterApi.getMe()
        .then(res => {
          const char = res.data;
          setCharacterName(char.name);
          setCharacterAge(Number(char.age ?? 18));
          setPlayerCash(Number(char.finances?.cash_in_hand ?? 0));
          const currentCash = Number(char.finances?.cash_in_hand ?? 0);
          
          const currentNetWorth = Number(char.finances?.net_worth ?? 0);
          setNetWorth(currentNetWorth);
          
          if (char.netWorthHistory && char.netWorthHistory.length > 0) {
            let history = [...char.netWorthHistory];
            // Recharts requires at least two data points to draw an Area/Line.
            if (history.length === 1) {
                history = [history[0], history[0]];
            }
            // Only plot what we have, without padding with the oldest value.
            setNetWorthSeries(history.map((h: any, i: number) => ({
              month: i === history.length - 1 ? 'Now' : `${history.length - 1 - i}m ago`,
              value: Number(h.total_net_worth || 0)
            })));
          } else {
            // Recharts requires at least two data points to draw an Area/Line.
            setNetWorthSeries([
                { month: 'Start', value: currentNetWorth },
                { month: 'Now', value: currentNetWorth }
            ]);
          }

          let parsed: PlayerStats = {
            motherland: char.motherland_country_id ?? 'Drennia',
            homeState: char.home_state_id,
            credibility: Number(char.credibility ?? 50),
            charisma: Number(char.charisma ?? 50),
            influence: Number(char.influence ?? 10),
            gameDateStr: `Month ${char.created_at_world_month ?? 1} · Year ${char.created_at_world_year ?? 1}`
          };
          setCitizenFile(parsed);

          companyApi.getMy().then(compRes => {
            const companies = compRes.data || [];
            if (companies.length > 0) {
              const myCompany = [...companies].sort((a: any, b: any) =>
                new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
              )[0];
              setCompany(myCompany);
              
              let totalCash = 0;
              for (const c of companies) {
                totalCash += Number(c.finances?.available_cash ?? 0);
              }
              setTotalCompanyCash(totalCash);

              const contracts = getContracts();
              setActiveContracts(
                contracts.filter(c => c.status === 'awarded' && c.awardedToCompanyId === myCompany.id).length
              );
              // We no longer overwrite net worth series here because character API now returns true historical net worth
            }
          }).catch(() => {});
          
          politicsApi.getLedger(10).then(data => {
            const polEvents = (data || []).map((ev: any) => ({
              id: ev.id,
              month: ev.month,
              text: `[Month ${ev.month}] ${ev.headline}: ${ev.body}`
            }));
            const combined = [...polEvents, ...LEDGER_HEADLINES.map(h => ({ ...h, month: null }))];
            setLedgerFeed(combined);

            // Mirror world/ledger movements into the notification feed so the
            // header bell surfaces "while you were away" events. Stable ids
            // keep this idempotent across reloads.
            (data || []).forEach((ev: any) => {
              addNotification({
                id: `ledger_${ev.id}`,
                category: 'world',
                title: ev.headline,
                body: ev.body,
                href: '/drennia/chronicle',
              });
            });
          }).catch(() => {
            setLedgerFeed(LEDGER_HEADLINES.map(h => ({ ...h, month: null })));
          });
          
        })
        .catch(err => {
          if (err.response?.status === 404) router.replace('/start/character');
        })
        .finally(() => setAuthorized(true));
    });

    let recs: any[] = [];
    try {
      recs = JSON.parse(localStorage.getItem('worldr_records_v1') || '[]');
      if (!Array.isArray(recs)) recs = [];
    } catch (e) {
      console.warn('Failed to parse records', e);
      recs = [];
    }
    setRecentRecords(recs.slice(0, 6));
  }, [router]);

  if (!authorized) return null;

  const sectorLabel = company?.industry_id === 'manufacturing' ? 'Manufacturing'
    : company?.industry_id === 'services' || company?.industry_id === 'shipping-logistics' ? 'Shipping & Logistics'
    : company?.industry_id ?? '—';

  const legalStructureLabel = (() => {
    const id = company?.legal_structure_id;
    if (id === 'sole-trader') return 'Sole Trader';
    if (id === 'private-company') return 'Private Company';
    if (id === 'public-corporation') return 'Corporation';
    return id ?? '—';
  })();

  const stateLabel = (() => {
    const id = company?.headquarters_state_id;
    if (!id) return '—';
    if (id === 'drennia-drennport') return 'Drennport';
    if (id === 'drennia-westport')  return 'Westport';
    if (id === 'drennia-ironvale')  return 'Ironvale';
    if (id === 'drennia-greenmere') return 'Greenmere';
    return id;
  })();

  // ── Sidebar ────────────────────────────────────────────────────────────────

  const sidebar = (
    <>
      {/* Market Snapshot */}
      <Card kicker="Market Snapshot" icon={BarChart2}>
        {SECTOR_DEMAND.map(s => <DemandBar key={s.sector} {...s} />)}
        <div className="mt-3 flex justify-end">
          <Link href="/drennia/market" className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-600 hover:text-terminal-amber transition-colors">
            Full Market →
          </Link>
        </div>
      </Card>



      {/* Top 10 Most Popular Cars */}
      <Card kicker="Best Sellers (Drennia)" icon={Star} className="border border-zinc-800">
          <div className="border-b border-zinc-800 pb-2 mb-4 flex justify-between items-end">
            {leaderboards?.popularCarsArc && bestSellersTab === 'monthly' ? (
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                Month {leaderboards.popularCarsArc.month}, Year {leaderboards.popularCarsArc.year}
              </div>
            ) : (
              <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                All Time
              </div>
            )}
            <div className="flex gap-4 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              <button 
                onClick={() => setBestSellersTab('monthly')} 
                className={bestSellersTab === 'monthly' ? 'text-terminal-amber border-b border-terminal-amber pb-1 transition-colors' : 'hover:text-zinc-300 pb-1 transition-colors'}
              >
                Monthly
              </button>
              <button 
                onClick={() => setBestSellersTab('allTime')} 
                className={bestSellersTab === 'allTime' ? 'text-terminal-amber border-b border-terminal-amber pb-1 transition-colors' : 'hover:text-zinc-300 pb-1 transition-colors'}
              >
                All Time
              </button>
            </div>
          </div>
          
          {(() => {
            const list = bestSellersTab === 'monthly' ? leaderboards?.popularCars : leaderboards?.popularCarsAllTime;
            if (!list) return <div className="text-zinc-500 text-[11px] py-4">Loading...</div>;
            if (list.length === 0) return <EmptyState icon={Star} message={`No cars sold in Drennia ${bestSellersTab === 'monthly' ? 'this month' : 'yet'}.`} className="py-2" />;
            return (
              <div className="flex flex-col gap-1.5 mt-2">
                {list.map((car: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between bg-zinc-900/50 p-2 border border-zinc-800 rounded">
                    <div className="flex items-center gap-3">
                      <div className="text-[10px] text-zinc-500 font-mono w-4">#{idx + 1}</div>
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-zinc-200">{car.model_name}</span>
                        <span className="text-[10px] text-zinc-500">{car.company_name}</span>
                      </div>
                    </div>
                    <div className="text-[12px] text-terminal-amber font-mono">
                      {Number(car.total_sold).toLocaleString()} sold
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
      </Card>

      {/* Global Leaderboards */}
      <Card kicker="Magnate Global List" icon={TrendingUp} className="bg-black border border-zinc-800">
          <div className="border-b border-zinc-800 pb-2 mb-4 flex justify-between items-end">
            <div className="font-serif text-xl tracking-widest uppercase text-zinc-100" style={{ fontFamily: 'Georgia, serif' }}>MAGNATE</div>
            <div className="flex gap-4 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              <button 
                onClick={() => setLeaderboardTab('wealth')} 
                className={leaderboardTab === 'wealth' ? 'text-terminal-amber border-b border-terminal-amber pb-1 transition-colors' : 'hover:text-zinc-300 pb-1 transition-colors'}
              >
                The Billionaires
              </button>
              <button 
                onClick={() => setLeaderboardTab('marketCap')} 
                className={leaderboardTab === 'marketCap' ? 'text-terminal-amber border-b border-terminal-amber pb-1 transition-colors' : 'hover:text-zinc-300 pb-1 transition-colors'}
              >
                Global 500
              </button>
            </div>
          </div>
          
          <div className="flex flex-col">
            {leaderboardTab === 'wealth' && (
              !leaderboards?.richestPlayers ? (
                <div className="text-zinc-500 text-[11px] py-4 text-center italic">Compiling data...</div>
              ) : leaderboards.richestPlayers.length === 0 ? (
                <EmptyState icon={User} message="No players found." className="py-2" />
              ) : (
                leaderboards.richestPlayers.map((player: any, idx: number) => (
                  <div key={idx} className={`flex items-center justify-between py-3 border-b border-zinc-900/50 ${player.name === characterName ? 'bg-terminal-green/5' : 'hover:bg-zinc-900/30'} transition-colors`}>
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-serif text-zinc-500 font-light w-6 text-right" style={{ fontFamily: 'Georgia, serif' }}>{idx + 1}.</div>
                      <div className="flex flex-col">
                        <span className={`text-[14px] font-bold ${player.name === characterName ? 'text-terminal-green' : 'text-zinc-100'}`}>{player.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-mono text-terminal-amber font-semibold">{formatMoney(player.net_worth)}</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Net Worth</span>
                      </div>
                      <div className="w-12 flex justify-end">
                        {Number(player.trend) > 0 ? (
                          <span className="text-[9px] font-bold text-green-500 flex items-center gap-0.5">▲ UP</span>
                        ) : Number(player.trend) < 0 ? (
                          <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5">▼ DWN</span>
                        ) : (
                          <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-0.5">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
            
            {leaderboardTab === 'marketCap' && (
              !leaderboards?.topCompanies ? (
                <div className="text-zinc-500 text-[11px] py-4 text-center italic">Compiling data...</div>
              ) : leaderboards.topCompanies.length === 0 ? (
                <EmptyState icon={Briefcase} message="No companies found." className="py-2" />
              ) : (
                leaderboards.topCompanies.map((comp: any, idx: number) => (
                  <div key={idx} className={`flex items-center justify-between py-3 border-b border-zinc-900/50 ${comp.name === company?.name ? 'bg-terminal-green/5' : 'hover:bg-zinc-900/30'} transition-colors`}>
                    <div className="flex items-center gap-4">
                      <div className="text-xl font-serif text-zinc-500 font-light w-6 text-right" style={{ fontFamily: 'Georgia, serif' }}>{idx + 1}.</div>
                      <div className="flex flex-col">
                        <span className={`text-[14px] font-bold ${comp.name === company?.name ? 'text-terminal-green' : 'text-zinc-100'}`}>{comp.name}</span>
                        <span className="text-[10px] text-zinc-500 capitalize">{comp.industry_id?.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-mono text-terminal-amber font-semibold">{formatMoney(comp.company_value)}</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Market Cap</span>
                      </div>
                      <div className="w-12 flex justify-end">
                        {Number(comp.last_arc_profit) > 0 ? (
                          <span className="text-[9px] font-bold text-green-500 flex items-center gap-0.5">▲ UP</span>
                        ) : Number(comp.last_arc_profit) < 0 ? (
                          <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5">▼ DWN</span>
                        ) : (
                          <span className="text-[9px] font-bold text-zinc-500 flex items-center gap-0.5">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </Card>

    </>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#090A0F] text-zinc-100 overflow-hidden scanlines relative">
      {/* ── First-Day Modal (fires once) ─────────────────────────────────── */}
      {showFirstDay && (
        <FirstDayModal
          characterName={characterName}
          citizenFile={citizenFile}
          onDismiss={() => setShowFirstDay(false)}
        />
      )}

      {showThreeMillionBonus && (
        <ThreeMillionBonusModal
          onDismiss={() => setShowThreeMillionBonus(false)}
        />
      )}

      {showGuideModal && (
        <GuideModal onDismiss={() => setShowGuideModal(false)} />
      )}

      {/* ── Top Player Bar ──────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 border-b border-[#23232b] bg-[#0c0d13] shrink-0 gap-4 flex-wrap">
        {/* Left: brand + character */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-black tracking-[0.25em] text-terminal-amber amber-glow">
            WORLDr
          </span>
          <span className="w-px h-4 bg-[#23232b]" />
          <StatusDot variant="live" />
          <span className="text-[13px] font-semibold text-zinc-100">{characterName}</span>
          <span className="text-[10px] text-zinc-600 font-mono hidden md:inline">
            Age {characterAge} · {citizenFile?.homeState ?? citizenFile?.motherland ?? 'Drennia'}
          </span>
        </div>

        {/* Center: stat chips — horizontal scroll strip on mobile, wrap on sm+ */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide max-w-full sm:flex-wrap sm:overflow-visible">
          <StatChip
            label="Cash $"
            value={playerCash}
            prefix="$"
            valueColor="green"
            countUp
          />
          <StatChip label="Credibility" value={citizenFile?.credibility ?? 50} />
          <StatChip label="Charisma"    value={citizenFile?.charisma    ?? 50} />
          <StatChip label="Influence"   value={citizenFile?.influence   ?? 10} />
          {company && (
            <StatChip
              label="Company Cash"
              value={totalCompanyCash}
              prefix="$"
              valueColor="amber"
              countUp
            />
          )}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-3">
          <WorldTimeControl />
          <NotificationBell />
          <button className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors">
            Letters
          </button>
          <button
            onClick={handleRestartLife}
            className="text-[9px] font-mono uppercase tracking-[0.12em] text-terminal-red hover:opacity-80 transition-opacity"
          >
            Restart Life
          </button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-6">
        <PageShell sidebar={sidebar}>

          {/* Hero — momentum + next move (the return hook) */}
          {(() => {
            const series = netWorthSeries;
            const prev = series.length > 1 ? Number(series[series.length - 2].value) : netWorth;
            const delta = netWorth - prev;
            const pct = prev ? (delta / Math.abs(prev)) * 100 : 0;
            const up = delta >= 0;
            const accent = up ? '#30d158' : '#ff453a';
            return (
              <div className="relative overflow-hidden rounded-xl border border-[#2a2630] bg-gradient-to-br from-[#0d0e15] via-[#111320] to-[#0c0d13] p-5 md:p-6" style={{ boxShadow: '0 0 40px rgba(201,162,74,0.04) inset, 0 1px 0 rgba(201,162,74,0.08)' }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">Welcome back</p>
                    <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 truncate">{characterName || 'Citizen'}</h1>
                    <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                      {formatGameDate()} · {citizenFile?.motherland ?? 'Drennia'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-600">Net Worth</p>
                      <p className="text-2xl md:text-3xl font-mono font-bold text-terminal-amber amber-glow leading-tight">
                        {formatMoney(netWorth)}
                      </p>
                      <p className={`text-[11px] font-mono font-bold ${up ? 'text-terminal-green' : 'text-terminal-red'}`}>
                        {up ? '▲' : '▼'} {up ? '+' : '−'}${Math.abs(delta).toLocaleString('en-US')} ({pct.toFixed(1)}%) this month
                      </p>
                    </div>
                    <div className="hidden sm:block w-32 h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={accent} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#heroGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button href="/drennia/business" variant="primary" icon={ChevronRight} size="sm">
                    {company ? 'Open your desk' : 'Start your company'}
                  </Button>
                  {isSuperAdmin ? (
                    <Button href="/drennia/politics" variant="secondary" size="sm">Politics Desk →</Button>
                  ) : (
                    <Button onClick={() => alert('Political desk will be available on 21 July 2026.')} variant="secondary" size="sm">Politics Desk →</Button>
                  )}
                  {activeContracts > 0 && <Badge variant="amber">{activeContracts} active contracts</Badge>}
                </div>
              </div>
            );
          })()}

          {/* ── First Steps Rail (new players without a company) ─────────── */}
          {!company && (
            <div style={{
              background: 'rgba(201,162,74,0.05)',
              border: '1px solid rgba(201,162,74,0.18)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#C9A24A', marginRight: 4, flexShrink: 0 }}>
                First Steps
              </span>
              {[
                { label: 'Register a company', href: '/drennia/business', done: !!company },
                { label: 'Join a political party', href: '#', onClick: (e: any) => { e.preventDefault(); alert('Political desk will be available on 21 July 2026.'); }, done: false },
                { label: 'Check the World Feed', href: '/drennia/world', done: false },
              ].map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={item.onClick}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11, color: item.done ? '#4D8C6A' : '#A79D8C',
                    textDecoration: 'none',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 4, padding: '5px 10px',
                  }}
                >
                  <span style={{ fontSize: 10 }}>{item.done ? '✓' : '○'}</span>
                  {item.label}
                </a>
              ))}
            </div>
          )}

          {/* Personal Status */}
          <Card
            kicker="Personal Status"
            icon={User}
            title="Chronicle"
            headerSlot={
              <button
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-terminal-amber bg-terminal-amber/10 border border-terminal-amber/20 hover:bg-terminal-amber/20 hover:border-terminal-amber/40 transition-colors rounded"
                style={{ boxShadow: '0 0 10px rgba(201,162,74,0.1)' }}
              >
                <Book size={12} />
                <span>Guide</span>
              </button>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
              {[
                { label: 'Full Name',      value: characterName },
                { label: 'Age',            value: `${characterAge}` },
                { label: 'Motherland',     value: citizenFile?.motherland ?? 'Drennia' },
                { label: 'Citizen Since',  value: citizenFile?.gameDateStr || 'Month 1 · Year 1' },
              ].map(f => (
                <div key={f.label}>
                  <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">{f.label}</p>
                  <p className="text-[12px] font-medium text-zinc-300">{f.value}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Net Worth Chart */}
          <Card kicker="Net Worth — Last 12 Months" icon={TrendingUp}>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-600">Current Net Worth</p>
                <p className="text-xl font-mono font-bold text-terminal-amber amber-glow">
                  ${netWorth.toLocaleString('en-US')}
                </p>
              </div>
              <Badge variant="green" dot>Active</Badge>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={netWorthSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ff9f0a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ff9f0a" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis hide domain={['dataMin', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ff9f0a"
                  strokeWidth={2}
                  fill="url(#nwGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#ff9f0a', stroke: '#090A0F', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Desks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Business Desk */}
            {!company ? (
              <Card kicker="Business Desk" icon={Briefcase} accent hover>
                <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                  Open your company file, register a business, manage contracts, and build market power.
                </p>
                <Button href="/drennia/business" variant="primary" icon={ChevronRight} size="sm">
                  Open Business Desk
                </Button>
              </Card>
            ) : (
              <Card kicker="Business Desk" icon={Briefcase} accent hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[14px] font-semibold text-zinc-100">{company.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {legalStructureLabel} · {sectorLabel} · {stateLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-mono text-zinc-600">Total Cash</p>
                    <p className="text-[14px] font-mono font-bold text-terminal-green terminal-glow">
                      ${totalCompanyCash.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <StatusDot variant="live" label="Active" />
                  {activeContracts > 0 && (
                    <Badge variant="amber">{activeContracts} contracts</Badge>
                  )}
                </div>
                <Button href="/drennia/business" variant="secondary" size="sm">
                  Open Business Desk →
                </Button>
              </Card>
            )}

            {/* Politics Desk */}
            <Card kicker="Politics Desk" icon={Landmark} accent hover>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                Enter the political arena. Manage your party, run campaigns, shape public policy, and form the government.
              </p>
              {isSuperAdmin ? (
                <Button href="/drennia/politics" variant="primary" icon={ChevronRight} size="sm">
                  Open Politics Desk
                </Button>
              ) : (
                <Button onClick={() => alert('Political desk will be available on 21 July 2026.')} variant="primary" icon={ChevronRight} size="sm">
                  Open Politics Desk
                </Button>
              )}
            </Card>

            {/* World Feed */}
            <Card kicker="World Feed" icon={Globe} accent hover>
              <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                See who else is operating in Drennia. View market standings, the political scene, and active operators.
              </p>
              <Button href="/drennia/world" variant="secondary" icon={ChevronRight} size="sm">
                View World Feed
              </Button>
            </Card>
          </div>

          {/* Career Summary */}
          {company && (
            <Card kicker="Career: Business Founder" icon={Activity}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-zinc-400 leading-relaxed">
                  {characterName} started{' '}
                  <strong className="text-zinc-200">{company.name}</strong>, a{' '}
                  {sectorLabel} business in {stateLabel}.
                </p>
                <Button href="/drennia/career" variant="ghost" size="sm" className="ml-4 flex-shrink-0">
                  View Career →
                </Button>
              </div>
            </Card>
          )}

          {/* Recent Records */}
          <Card kicker="Recent Records" icon={ScrollText} headerSlot={<Link href="/drennia/records" className="text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors">View All →</Link>}>
            {recentRecords.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                message="No records yet. Your filings, contracts, and actions will appear here."
                className="py-6"
              />
            ) : (
              <div>
                {recentRecords.map((r, i) => (
                  <DataRow
                    key={r.id ?? i}
                    label={r.summary ?? r.title ?? '—'}
                    value={r.type ?? ''}
                    valueVariant="amber"
                    border={i < recentRecords.length - 1}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Drennian Ledger */}
          <Card kicker="Drennian Ledger" icon={Newspaper}>
            {ledgerFeed.map((h, i) => (
              <div
                key={h.id}
                className={`py-2.5 text-[11px] text-zinc-400 leading-relaxed ${
                  i < ledgerFeed.length - 1 ? 'border-b border-[#23232b]' : ''
                }`}
              >
                <Globe size={10} className="inline-block mr-2 text-zinc-600" />
                {h.text}
              </div>
            ))}
            {ledgerFeed.length === 0 && (
              <div className="py-2 text-[11px] text-zinc-500 italic">No ledger entries found.</div>
            )}
          </Card>

        </PageShell>
      </div>
    </div>
  );
}

