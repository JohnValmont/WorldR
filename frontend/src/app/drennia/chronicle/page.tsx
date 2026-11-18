'use client';
// The Chronicle: the player's home screen.
// Order of the page is "you first, then your country, then the world, then the markets":
//   1. Who you are (rung, party, nation) and your net worth
//   2. What needs you now (decisions, votes, deals, energy) + your inbox
//   3. Your nation at a glance + its news + the Meridian Wire
//   4. Your two careers side by side (politics ladder, business)
//   Sidebar: the three nations, the World Influence Index, the rich list, the car market.
// Politics data comes from GET /politics/desk (same SWR key as the Politics screen, so the
// cache is shared) and GET /agency/front. Nothing here computes game numbers itself.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  AreaChart, Area, Tooltip, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import {
  Briefcase, TrendingUp, User, Star, Landmark, ChevronRight, RefreshCw,
  Globe, Newspaper, Book, Inbox as InboxIcon, Zap, CheckCircle2, Circle,
  Flag as FlagIcon, Award, LogOut,
} from 'lucide-react';
import { formatGameDate } from '../../../lib/businessCore';
import { formatPolArc } from '../../../lib/calendar';
import WorldThisMonth from '../../../components/gameplay/WorldThisMonth';
import { addNotification } from '../../../lib/notifications';
import WorldTimeControl from '../../../components/gameplay/WorldTimeControl';
import NotificationBell from '../../../components/gameplay/NotificationBell';
import FirstDayModal, { FIRST_DAY_MODAL_KEY } from '../../../components/gameplay/FirstDayModal';
import ThreeMillionBonusModal, { THREE_MILLION_BONUS_MODAL_KEY } from '../../../components/gameplay/ThreeMillionBonusModal';
import GuideModal from '../../../components/gameplay/GuideModal';
import { Card, Button, StatChip, EmptyState, StatusDot, PageShell } from '../../../components/ui';
import { politicsApi, agencyApi } from '../../../lib/api';
import { Flag } from '../politics/_floor/NationView';
import type { Desk, NationRow, Notice, WireFront } from '../politics/_floor/types';

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

interface TodoItem { id: string; text: string; href: string; done?: boolean; urgent?: boolean }

// ── Small helpers ─────────────────────────────────────────────────────────────

const RUNG_LABEL: Record<string, string> = {
  citizen: 'Citizen', member: 'Party member', candidate: 'Candidate', mp: 'Member of Parliament',
  leader: 'Party leader', minister: 'Minister', premier: 'Head of government', statesman: 'World statesman',
};
const PHASE_LABEL: Record<string, string> = {
  governing: 'Parliament sitting', filing: 'Candidates filing', campaign: 'Election campaign',
  polling: 'Election day', formation: 'Forming a government',
};

/** Link into a Politics tab (the Politics page reads ?tab= and ?section=). */
const pol = (tab: string, section?: string) =>
  `/drennia/politics?tab=${tab}${section ? `&section=${section}` : ''}`;

function formatMoney(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return '$0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

const pct1 = (x: number) => `${(x * 100).toFixed(1)}%`;

function Trend({ value, suffix = '' }: { value: number | null | undefined; suffix?: string }) {
  if (value == null || Math.abs(value) < 0.05) return null;
  const up = value > 0;
  return (
    <span className={`ml-1.5 text-[10px] font-mono ${up ? 'text-terminal-green' : 'text-terminal-red'}`}>
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  );
}

function Tabs2<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-3 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={value === o.id ? 'text-terminal-amber border-b border-terminal-amber pb-0.5' : 'hover:text-zinc-300 pb-0.5'}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0c0d13] border border-[#23232b] px-3 py-2 rounded-lg text-[10px] font-mono shadow-card">
      <p className="text-zinc-500 mb-0.5 uppercase tracking-wider">{label}</p>
      <p className="text-terminal-amber font-bold">${Number(payload[0].value).toLocaleString('en-US')}</p>
    </div>
  );
}

function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="h-4 rounded bg-zinc-800/60 animate-pulse" />)}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChroniclePage() {
  const [authorized, setAuthorized]       = useState(false);
  const [citizenFile, setCitizenFile]     = useState<PlayerStats | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [characterAge, setCharacterAge]   = useState<number>(18);
  const [playerCash, setPlayerCash]       = useState(0);
  const [company, setCompany]             = useState<CompanySnapshot | null>(null);
  const [companyCount, setCompanyCount]   = useState(0);
  const [totalCompanyCash, setTotalCompanyCash] = useState(0);
  const [netWorthSeries, setNetWorthSeries] = useState<{ month: string; value: number }[]>([]);
  const [netWorth, setNetWorth] = useState(0);
  const [showFirstDay, setShowFirstDay] = useState(false);
  const [showThreeMillionBonus, setShowThreeMillionBonus] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [leaderboards, setLeaderboards] = useState<any>(null);
  const [leaderboardTab, setLeaderboardTab] = useState<'wealth' | 'marketCap'>('wealth');
  const [bestSellersTab, setBestSellersTab] = useState<'monthly' | 'allTime'>('monthly');
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Politics + world press. Same keys as the Politics screen so the cache is shared.
  const { data: desk, mutate: mutateDesk } = useSWR<Desk>('politics-desk', () => politicsApi.getDesk(), { refreshInterval: 60_000 });
  const { data: wire } = useSWR<WireFront>('wire-front', () => agencyApi.getFront(), { refreshInterval: 120_000 });

  const handleRestartLife = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const ok = window.confirm(
      'Restart life?\n\nThis permanently deletes your character, money, companies and political career. It cannot be undone.',
    );
    if (!ok) return;
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

  const handleRecalculateHistory = useCallback(async () => {
    if (isRecalculating) return;
    setIsRecalculating(true);
    try {
      const { characterApi } = await import('../../../lib/api');
      await characterApi.recalculateNetWorth();
      window.location.reload();
    } catch (e) {
      console.error('Failed to recalculate net worth', e);
    } finally {
      setIsRecalculating(false);
    }
  }, [isRecalculating]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(FIRST_DAY_MODAL_KEY) !== 'true') setShowFirstDay(true);
    if (localStorage.getItem(THREE_MILLION_BONUS_MODAL_KEY) !== 'true') setShowThreeMillionBonus(true);

    import('../../../lib/api').then(({ characterApi, companyApi, worldApi }) => {
      worldApi.getGlobalLeaderboards().then(res => setLeaderboards(res)).catch(e => console.error(e));
      characterApi.getMe()
        .then(res => {
          const char = res.data;
          setCharacterName(char.name);
          setCharacterAge(Number(char.age ?? 18));
          setPlayerCash(Number(char.finances?.cash_in_hand ?? 0));
          const currentNetWorth = Number(char.finances?.net_worth ?? 0);
          setNetWorth(currentNetWorth);

          if (char.netWorthHistory && char.netWorthHistory.length > 0) {
            let history = [...char.netWorthHistory];
            // Recharts needs at least two points to draw an area.
            if (history.length === 1) history = [history[0], history[0]];
            setNetWorthSeries(history.map((h: any, i: number) => ({
              month: i === history.length - 1 ? 'Now' : `${history.length - 1 - i}m ago`,
              value: Number(h.total_net_worth || 0),
            })));
          } else {
            setNetWorthSeries([
              { month: 'Start', value: currentNetWorth },
              { month: 'Now', value: currentNetWorth },
            ]);
          }

          setCitizenFile({
            motherland: char.motherland_country_id ?? 'Drennia',
            homeState: char.home_state_id,
            credibility: Number(char.credibility ?? 50),
            charisma: Number(char.charisma ?? 50),
            influence: Number(char.influence ?? 10),
            gameDateStr: `Month ${char.created_at_world_month ?? 1} · Year ${char.created_at_world_year ?? 1}`,
          });

          companyApi.getMy().then(compRes => {
            const companies = compRes.data || [];
            setCompanyCount(companies.length);
            if (companies.length > 0) {
              const newest = [...companies].sort((a: any, b: any) =>
                new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
              )[0];
              setCompany(newest);
              setTotalCompanyCash(companies.reduce((s: number, c: any) => s + Number(c.finances?.available_cash ?? 0), 0));
            }
          }).catch(() => {});
        })
        .catch(err => {
          if (err.response?.status === 404) window.location.href = '/landing/onboarding.html?action=character';
        })
        .finally(() => setAuthorized(true));
    });
  }, []);

  // Mirror national news into the header bell ("while you were away"). Stable ids keep it idempotent.
  useEffect(() => {
    (desk?.news ?? []).forEach(ev => {
      addNotification({ id: `ledger_${ev.id}`, category: 'world', title: ev.headline, body: ev.body, href: '/drennia/chronicle' });
    });
  }, [desk?.news]);

  const me = desk?.me ?? null;
  const myNation: NationRow | undefined = desk?.desk.world.find(n => n.mine);
  const nationName = desk?.nation.shortName ?? myNation?.name ?? citizenFile?.motherland ?? '';
  const notices = desk?.desk.notices;

  // Everything that is waiting on the player, most urgent first. Built only from server data.
  const todos = useMemo<TodoItem[]>(() => {
    const list: TodoItem[] = [];
    if (desk && me) {
      const cards = desk.desk.hand.filter(h => h.status === 'open').length;
      if (cards > 0) list.push({ id: 'cards', urgent: true, href: pol('desk'), text: `${cards} decision${cards > 1 ? 's' : ''} waiting on your desk` });
      const votes = me.voteMode ? desk.bills.filter(b => b.status === 'proposed' && !b.myVote).length : 0;
      if (votes > 0) list.push({ id: 'votes', urgent: true, href: pol('chamber'), text: `Cast your vote on ${votes} bill${votes > 1 ? 's' : ''}` });
      const deals = (desk.desk.deals?.incoming.length ?? 0) + (desk.desk.handshakesIncoming ?? 0);
      if (deals > 0) list.push({ id: 'deals', urgent: true, href: pol('corridors'), text: `${deals} deal offer${deals > 1 ? 's' : ''} to answer` });
      const contest = desk.desk.partyRoom?.contest;
      if (contest?.status === 'open' && !contest.myBallot) list.push({ id: 'contest', urgent: true, href: pol('party'), text: `Leadership contest in your party: ${contest.challenger.name} vs ${contest.leader.name}` });
      if (me.ap.current >= me.ap.cap) {
        list.push({ id: 'ap', urgent: true, href: pol('desk'), text: `Energy is full (${me.ap.current}/${me.ap.cap}). Spend some before the month turns or the new grant is lost` });
      } else if (me.ap.current > 0) {
        list.push({ id: 'ap', href: pol('desk'), text: `${me.ap.current} energy to spend on rallies, ads or deals` });
      }
    }
    list.push({ id: 'company', done: companyCount > 0, href: '/drennia/business', text: companyCount > 0 ? 'Run your company' : 'Register a company' });
    if (desk && me) list.push({ id: 'party', done: !!me.party, href: pol('party'), text: me.party ? `Member of ${me.party.name}` : 'Join a political party' });
    return list;
  }, [desk, me, companyCount]);

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

  // Net worth change since last month.
  const prev = netWorthSeries.length > 1 ? Number(netWorthSeries[netWorthSeries.length - 2].value) : netWorth;
  const delta = netWorth - prev;
  const deltaPct = prev ? (delta / Math.abs(prev)) * 100 : 0;
  const up = delta >= 0;
  const accent = up ? '#30d158' : '#ff453a';

  const titleLine = me
    ? [me.office ?? RUNG_LABEL[me.rung] ?? me.rung, me.isPartyLeader && !me.office ? 'party leader' : null].filter(Boolean).join(', ')
    : 'Citizen';

  const ladder = desk?.desk.ladder ?? [];
  const rungIdx = ladder.findIndex(r => r.current);
  const nextRung = rungIdx >= 0 ? ladder[rungIdx + 1] : undefined;
  const urgentCount = todos.filter(t => t.urgent).length;

  // ── Sidebar: the world, rankings, then markets ─────────────────────────────

  const sidebar = (
    <>
      {/* The three nations */}
      <Card kicker="The World" icon={Globe}>
        {!desk ? <SkeletonRows n={3} /> : (
          <div className="flex flex-col gap-2">
            {desk.desk.world.map(n => (
              <Link
                key={n.polStateCode}
                href={pol('nation')}
                className={`flex items-center gap-3 rounded-lg px-2.5 py-2 border transition-colors ${n.mine ? 'border-terminal-amber/40 bg-terminal-amber/5' : 'border-[#23232b] hover:border-zinc-700'}`}
              >
                <Flag flag={n.flag} width={28} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-semibold text-zinc-100 truncate">{n.name}</span>
                    {n.mine && <span className="text-[8px] font-mono uppercase tracking-widest text-terminal-amber">Home</span>}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {n.leaderTitle}: {n.premier ?? 'vacant'}{n.premierIsPlayer ? ' (player)' : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] font-mono text-zinc-200" title="Government approval">{Math.round(n.approval)}%</div>
                  {n.sim && <div className="text-[9px] text-zinc-500 capitalize" title="World rating tier">{n.sim.tier}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* World Influence Index (Meridian Wire) */}
      <Card
        kicker="World Influence Index"
        icon={Award}
        headerSlot={<Link href={pol('wire')} className="text-[10px] text-zinc-500 hover:text-terminal-amber">Full list →</Link>}
      >
        {!wire ? <SkeletonRows n={5} /> : wire.live.top.length === 0 ? (
          <EmptyState icon={Award} message="No one ranked yet." className="py-2" />
        ) : (
          <div className="flex flex-col">
            {wire.live.top.slice(0, 5).map(r => (
              <div key={r.key} className={`flex items-center gap-3 py-2 border-b border-zinc-900/60 last:border-0 ${r.key === wire.live.mine?.key ? 'bg-terminal-green/5' : ''}`}>
                <span className="w-5 text-right text-[11px] font-mono text-zinc-500">{r.rank}</span>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: r.partyColor ?? '#52525b' }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold text-zinc-100 truncate">{r.name}</div>
                  <div className="text-[10px] text-zinc-500 truncate">{r.officeLabel} · {r.nationName}</div>
                </div>
                <span className="text-[12px] font-mono text-terminal-amber">{(r.share * 100).toFixed(1)}%</span>
              </div>
            ))}
            <div className="pt-2 text-[11px] text-zinc-400">
              {wire.live.mine
                ? <>You are <strong className="text-zinc-100">#{wire.live.mine.rank}</strong> of {wire.live.total} ({(wire.live.mine.share * 100).toFixed(1)}%).</>
                : 'You are not ranked yet. Join a party or win a seat to get on the list.'}
            </div>
          </div>
        )}
      </Card>

      {/* Rich list */}
      <Card kicker="Rich List" icon={TrendingUp}>
        <div className="mb-3">
          <Tabs2
            value={leaderboardTab}
            onChange={setLeaderboardTab}
            options={[{ id: 'wealth', label: 'Richest people' }, { id: 'marketCap', label: 'Biggest companies' }]}
          />
        </div>
        {(() => {
          const rows: any[] | undefined = leaderboardTab === 'wealth' ? leaderboards?.richestPlayers : leaderboards?.topCompanies;
          if (!rows) return <SkeletonRows n={5} />;
          if (rows.length === 0) return <EmptyState icon={leaderboardTab === 'wealth' ? User : Briefcase} message="Nothing to rank yet." className="py-2" />;
          return rows.slice(0, 5).map((r: any, idx: number) => {
            const isMe = leaderboardTab === 'wealth' ? r.name === characterName : r.name === company?.name;
            const value = leaderboardTab === 'wealth' ? r.net_worth : r.company_value;
            const trend = Number(leaderboardTab === 'wealth' ? r.trend : r.last_arc_profit);
            return (
              <div key={idx} className={`flex items-center gap-3 py-2 border-b border-zinc-900/60 last:border-0 ${isMe ? 'bg-terminal-green/5' : ''}`}>
                <span className="w-5 text-right text-[11px] font-mono text-zinc-500">{idx + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className={`text-[12px] font-semibold truncate ${isMe ? 'text-terminal-green' : 'text-zinc-100'}`}>{r.name}</div>
                  {leaderboardTab === 'marketCap' && <div className="text-[10px] text-zinc-500 capitalize">{r.industry_id?.replace(/[_-]/g, ' ')}</div>}
                </div>
                <span className="text-[12px] font-mono text-terminal-amber">{formatMoney(value)}</span>
                <span className={`w-3 text-[9px] ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-zinc-600'}`}>
                  {trend > 0 ? '▲' : trend < 0 ? '▼' : '–'}
                </span>
              </div>
            );
          });
        })()}
      </Card>

      {/* Markets */}
      <WorldThisMonth />

      <Card kicker="Best-Selling Cars" icon={Star}>
        <div className="flex justify-between items-end mb-3">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            {bestSellersTab === 'monthly' && leaderboards?.popularCarsArc
              ? `Month ${leaderboards.popularCarsArc.month}, Year ${leaderboards.popularCarsArc.year}`
              : 'All time'}
          </span>
          <Tabs2 value={bestSellersTab} onChange={setBestSellersTab} options={[{ id: 'monthly', label: 'Month' }, { id: 'allTime', label: 'All time' }]} />
        </div>
        {(() => {
          const list: any[] | undefined = bestSellersTab === 'monthly' ? leaderboards?.popularCars : leaderboards?.popularCarsAllTime;
          if (!list) return <SkeletonRows n={5} />;
          if (list.length === 0) return <EmptyState icon={Star} message={`No cars sold ${bestSellersTab === 'monthly' ? 'this month' : 'yet'}.`} className="py-2" />;
          return list.slice(0, 5).map((car: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 py-2 border-b border-zinc-900/60 last:border-0">
              <span className="w-5 text-right text-[11px] font-mono text-zinc-500">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-zinc-100 truncate">{car.model_name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{car.company_name}</div>
              </div>
              <span className="text-[11px] font-mono text-terminal-amber">{Number(car.total_sold).toLocaleString('en-US')}</span>
            </div>
          ));
        })()}
      </Card>
    </>
  );

  return (
    <div className="flex flex-col h-full w-full bg-[#090A0F] text-zinc-100 overflow-hidden scanlines relative">
      {showFirstDay && (
        <FirstDayModal characterName={characterName} citizenFile={citizenFile} onDismiss={() => setShowFirstDay(false)} />
      )}
      {showThreeMillionBonus && <ThreeMillionBonusModal onDismiss={() => setShowThreeMillionBonus(false)} />}
      {showGuideModal && <GuideModal onDismiss={() => setShowGuideModal(false)} />}

      {/* ── Top bar: who, your numbers, the clock ─────────────────────────── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-2 border-b border-[#23232b] bg-[#0c0d13] shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono font-black tracking-[0.25em] text-terminal-amber amber-glow">WORLDr</span>
          <span className="w-px h-4 bg-[#23232b]" />
          <StatusDot variant="live" />
          <span className="text-[13px] font-semibold text-zinc-100 truncate">{characterName}</span>
        </div>

        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide max-w-full sm:flex-wrap sm:overflow-visible">
          <StatChip label="Cash $" value={playerCash} prefix="$" valueColor="green" countUp />
          <StatChip label="Credibility" value={citizenFile?.credibility ?? 50} />
          <StatChip label="Charisma" value={citizenFile?.charisma ?? 50} />
          <StatChip label="Influence" value={citizenFile?.influence ?? 10} />
          {me && <StatChip label="Energy" value={`${me.ap.current}/${me.ap.cap}`} />}
        </div>

        <div className="flex items-center gap-3">
          <WorldTimeControl />
          <NotificationBell />
          <button type="button" onClick={() => setShowGuideModal(true)} className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-500 hover:text-terminal-amber transition-colors">
            <Book size={11} /> Guide
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-6">
        <PageShell sidebar={sidebar}>

          {/* ── 1. You ─────────────────────────────────────────────────────── */}
          <div className="relative overflow-hidden rounded-xl border border-[#2a2630] bg-gradient-to-br from-[#0d0e15] via-[#111320] to-[#0c0d13] p-5 md:p-6" style={{ boxShadow: '0 0 40px rgba(201,162,74,0.04) inset, 0 1px 0 rgba(201,162,74,0.08)' }}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="min-w-0 flex items-start gap-4">
                {myNation && <div className="pt-1.5 hidden sm:block"><Flag flag={myNation.flag} width={48} /></div>}
                <div className="min-w-0">
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-600">Welcome back</p>
                  <h1 className="text-2xl md:text-3xl font-semibold text-zinc-100 truncate">{characterName || 'Citizen'}</h1>
                  <p className="text-[12px] text-zinc-300 mt-1 flex items-center flex-wrap gap-x-1.5">
                    {me?.party && <span className="inline-block w-2 h-2 rounded-full" style={{ background: me.party.color }} />}
                    <span>{titleLine}</span>
                    {me?.party && <span className="text-zinc-500">· {me.party.name}</span>}
                    {nationName && <span className="text-zinc-500">· {nationName}</span>}
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-1 font-mono">
                    Age {characterAge} · {formatGameDate()} · Citizen since {citizenFile?.gameDateStr ?? '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.15em] text-zinc-600">Net Worth</p>
                  <p className="text-2xl md:text-3xl font-mono font-bold text-terminal-amber amber-glow leading-tight">{formatMoney(netWorth)}</p>
                  <p className={`text-[11px] font-mono font-bold ${up ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {up ? '▲' : '▼'} {up ? '+' : '−'}{formatMoney(Math.abs(delta))} ({deltaPct.toFixed(1)}%) this month
                  </p>
                </div>
                <div className="hidden sm:block w-32 h-14">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={netWorthSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
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
              <Button href="/drennia/politics" variant="primary" icon={ChevronRight} size="sm">
                {urgentCount > 0 ? `Politics desk (${urgentCount} waiting)` : 'Politics desk'}
              </Button>
              <Button href="/drennia/business" variant="secondary" size="sm">
                {company ? 'Business desk →' : 'Start a company →'}
              </Button>
              <Button href={pol('wire')} variant="ghost" size="sm">World press →</Button>
            </div>
          </div>

          {/* ── 2. What needs you + inbox ──────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card kicker="Today" icon={Zap} title={urgentCount > 0 ? `${urgentCount} thing${urgentCount > 1 ? 's' : ''} need you` : 'Nothing urgent'}>
              {!desk && <SkeletonRows n={3} />}
              <div className="flex flex-col gap-1.5">
                {todos.map(t => (
                  <Link
                    key={t.id}
                    href={t.href}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-[12px] leading-snug border transition-colors ${t.urgent ? 'border-terminal-amber/30 bg-terminal-amber/5 text-zinc-100 hover:border-terminal-amber/60' : 'border-[#23232b] text-zinc-400 hover:border-zinc-700'}`}
                  >
                    {t.done
                      ? <CheckCircle2 size={13} className="text-terminal-green mt-0.5 shrink-0" />
                      : t.urgent ? <Zap size={13} className="text-terminal-amber mt-0.5 shrink-0" /> : <Circle size={13} className="text-zinc-600 mt-0.5 shrink-0" />}
                    <span className="flex-1">{t.text}</span>
                    <ChevronRight size={13} className="text-zinc-600 mt-0.5 shrink-0" />
                  </Link>
                ))}
              </div>
              {me?.nextGoal && (
                <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">
                  <span className="text-zinc-400 font-medium">Next goal:</span> {me.nextGoal}
                </p>
              )}
            </Card>

            <Card
              kicker="Inbox"
              icon={InboxIcon}
              title={notices ? (notices.unread > 0 ? `${notices.unread} unread` : 'While you were away') : 'While you were away'}
              headerSlot={notices && notices.unread > 0 ? (
                <button
                  type="button"
                  onClick={() => politicsApi.markNoticesRead().then(() => mutateDesk()).catch(() => {})}
                  className="text-[10px] text-zinc-500 hover:text-terminal-amber"
                >
                  Mark all read
                </button>
              ) : undefined}
            >
              {!notices ? <SkeletonRows n={4} /> : notices.items.length === 0 ? (
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Nothing yet. Deal offers, challenges, votes on your bills and your world rank will show up here.
                </p>
              ) : (
                <div className="flex flex-col">
                  {notices.items.slice(0, 6).map((n: Notice) => (
                    <Link
                      key={n.id}
                      href={n.tab ? pol(n.tab) : pol('desk')}
                      className={`py-2 px-2 -mx-2 rounded border-b border-[#23232b] last:border-0 hover:bg-zinc-900/40 ${n.read ? '' : 'bg-terminal-amber/5'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-terminal-amber shrink-0" />}
                        <div className="min-w-0">
                          <div className={`text-[12px] leading-snug ${n.read ? 'text-zinc-400' : 'text-zinc-100'}`}>{n.text}</div>
                          <div className="text-[10px] text-zinc-600 mt-0.5">{formatPolArc(n.arc, false)}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── 3. Your nation ─────────────────────────────────────────────── */}
          <Card
            kicker={nationName ? `Your Nation · ${nationName}` : 'Your Nation'}
            icon={FlagIcon}
            headerSlot={<Link href={pol('nation')} className="text-[10px] text-zinc-500 hover:text-terminal-amber">Open nation →</Link>}
          >
            {!desk || !myNation ? <SkeletonRows n={3} /> : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <div className="text-[12px] text-zinc-400">
                    {myNation.government} · capital {myNation.capital}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {PHASE_LABEL[desk.calendar.phase] ?? desk.calendar.phase}
                    {myNation.monthsToElection != null && desk.calendar.phase === 'governing' && ` · election in ${myNation.monthsToElection} month${myNation.monthsToElection === 1 ? '' : 's'}`}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">{myNation.leaderTitle}</p>
                    <p className="text-[13px] font-medium text-zinc-200 truncate">{myNation.premier ?? 'Vacant'}</p>
                    {myNation.leadParty && (
                      <p className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: myNation.leadParty.color }} />
                        {myNation.leadParty.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">Approval</p>
                    <p className={`text-[18px] font-mono font-bold ${myNation.approval >= 50 ? 'text-terminal-green' : 'text-terminal-red'}`}>{Math.round(myNation.approval)}%</p>
                    <p className="text-[10px] text-zinc-500">{myNation.governmentSeats}/{myNation.seats} seats in government</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">Jobless</p>
                    <p className={`text-[18px] font-mono font-bold ${myNation.sim && myNation.sim.unemployment > 0.08 ? 'text-terminal-red' : 'text-zinc-100'}`}>
                      {myNation.sim ? pct1(myNation.sim.unemployment) : '—'}
                    </p>
                    {myNation.sim?.gdpTrend != null && (
                      <p className="text-[10px] text-zinc-500">GDP <Trend value={myNation.sim.gdpTrend * 100} suffix="%" /></p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] font-mono uppercase tracking-[0.15em] text-zinc-600 mb-1">World rating</p>
                    <p className="text-[18px] font-mono font-bold text-terminal-amber">
                      {myNation.sim ? Math.round(myNation.sim.rating) : '—'}
                      {myNation.sim && <Trend value={myNation.sim.ratingTrend} />}
                    </p>
                    {myNation.sim && <p className="text-[10px] text-zinc-500"><span className="capitalize">{myNation.sim.tier}</span> · #{myNation.sim.rank} of {desk.desk.world.length}</p>}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* ── 4. News: your nation + the world ───────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card kicker={nationName ? `${nationName} Ledger` : 'National Ledger'} icon={Newspaper}>
              {!desk ? <SkeletonRows n={4} /> : desk.news.length === 0 ? (
                <p className="text-[11px] text-zinc-500 italic">No national news yet. Bills, elections and scandals will be reported here.</p>
              ) : (
                <div className="flex flex-col">
                  {desk.news.slice(0, 5).map(ev => (
                    <div key={ev.id} className="py-2.5 border-b border-[#23232b] last:border-0">
                      <div className="text-[12px] font-semibold text-zinc-200 leading-snug">{ev.headline}</div>
                      <div className="text-[11px] text-zinc-500 leading-relaxed mt-0.5 line-clamp-2">{ev.body}</div>
                      <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase tracking-wider">{formatPolArc(ev.arc, false)}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              kicker={wire?.agency.name ?? 'The Meridian Wire'}
              icon={Globe}
              headerSlot={<Link href={pol('wire')} className="text-[10px] text-zinc-500 hover:text-terminal-amber">Read →</Link>}
            >
              {!wire ? <SkeletonRows n={4} /> : !wire.edition ? (
                <p className="text-[11px] text-zinc-500 italic">The first edition prints when the politics month turns.</p>
              ) : (
                <>
                  <h3 className="text-[15px] font-serif font-bold text-zinc-100 leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
                    {wire.edition.headline}
                  </h3>
                  <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider mt-1 mb-2">Edition · {formatPolArc(wire.edition.arc, false)}</p>
                  <div className="flex flex-col">
                    {wire.edition.stories.slice(0, 3).map((s, i) => (
                      <div key={i} className="py-2 border-b border-[#23232b] last:border-0">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-terminal-amber/80">{s.nationName}</div>
                        <div className="text-[12px] text-zinc-200 leading-snug">{s.headline}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── 5. Your careers: politics and business side by side ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card kicker="Political Career" icon={Landmark}>
              {!desk || !me ? <SkeletonRows n={3} /> : (
                <>
                  <p className="text-[14px] font-semibold text-zinc-100">{RUNG_LABEL[me.rung] ?? me.rung}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {me.party ? `${me.party.name}${me.party.inGovernment ? ' (in government)' : ''}` : 'No party'}
                    {me.seatDistrict ? ` · seat: ${me.seatDistrict}` : me.candidacyDistrict ? ` · standing in ${me.candidacyDistrict}` : ''}
                  </p>
                  {ladder.length > 0 && (
                    <div className="mt-3">
                      <div className="flex gap-1" aria-label={`Rung ${rungIdx + 1} of ${ladder.length}`}>
                        {ladder.map(r => (
                          <span key={r.key} title={r.title} className={`h-1.5 flex-1 rounded-full ${r.reached ? 'bg-terminal-amber' : 'bg-zinc-800'}`} />
                        ))}
                      </div>
                      {nextRung && (
                        <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
                          <span className="text-zinc-400">Next: {nextRung.title}.</span> {ladder[rungIdx]?.next}
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-4">
                    <Button href={pol('desk')} variant="secondary" size="sm">Open politics desk →</Button>
                  </div>
                </>
              )}
            </Card>

            <Card kicker="Business" icon={Briefcase}>
              {!company ? (
                <>
                  <p className="text-[12px] text-zinc-400 leading-relaxed mb-4">
                    You do not own a company yet. Register one to build cars, sell into every nation&apos;s market and grow your net worth.
                  </p>
                  <Button href="/drennia/business" variant="primary" icon={ChevronRight} size="sm">Start a company</Button>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-zinc-100 truncate">{company.name}</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {legalStructureLabel} · {sectorLabel}{companyCount > 1 ? ` · +${companyCount - 1} more` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[9px] font-mono text-zinc-600">Company cash</p>
                      <p className="text-[14px] font-mono font-bold text-terminal-green">{formatMoney(totalCompanyCash)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <Button href="/drennia/business" variant="secondary" size="sm">Open business desk →</Button>
                    <Button href="/drennia/career" variant="ghost" size="sm">Career record</Button>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* ── 6. Wealth over time ─────────────────────────────────────────── */}
          <Card
            kicker="Net Worth · Last 12 Months"
            icon={TrendingUp}
            headerSlot={
              <button
                type="button"
                onClick={handleRecalculateHistory}
                disabled={isRecalculating}
                title="Rebuild the chart from your records if it looks wrong"
                className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-zinc-500 border border-zinc-800 hover:text-terminal-amber hover:border-terminal-amber/50 transition-colors rounded disabled:opacity-50"
              >
                <RefreshCw size={10} className={isRecalculating ? 'animate-spin' : ''} />
                <span>{isRecalculating ? 'Fixing…' : 'Fix history'}</span>
              </button>
            }
          >
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={netWorthSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff9f0a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ff9f0a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#52525b', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                <YAxis hide domain={['dataMin', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#ff9f0a" strokeWidth={2} fill="url(#nwGrad)" dot={false}
                  activeDot={{ r: 4, fill: '#ff9f0a', stroke: '#090A0F', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* ── Account (kept out of the header so it can't be hit by accident) ── */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRestartLife}
              className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] text-zinc-600 hover:text-terminal-red transition-colors"
            >
              <LogOut size={11} /> Restart life
            </button>
          </div>

        </PageShell>
      </div>
    </div>
  );
}
