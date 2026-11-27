'use client';
// The Chronicle: the player's home screen. Built to fit about one screen, no long scroll.
//   Desktop: you (identity, career ladder, net worth) -> Today + Inbox -> News (nation / world).
//            Sidebar: one tabbed card (Nations, Influence, Rich list, Market).
//   Mobile:  you -> Today -> one tabbed card holding everything else.
// Each panel shows a few rows and links to the full screen for the rest (limits below).
// Politics data comes from GET /politics/desk (same SWR key as the Politics screen, so the
// cache is shared) and GET /agency/front. Nothing here computes game numbers itself.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Briefcase, User, ChevronRight, RefreshCw, Newspaper, Book,
  Inbox as InboxIcon, Zap, CheckCircle2, Circle, Award, LogOut,
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

type WorldTab = 'nations' | 'influence' | 'rich' | 'market';
type MobileTab = 'inbox' | 'news' | WorldTab;

// How many rows each panel shows before linking to the full screen (keeps the page short).
const TODO_LIMIT = 4;
const INBOX_LIMIT = 4;
const NEWS_LIMIT = 3;
const RANK_LIMIT = 5;

interface TodoItem { id: string; text: string; href: string; done?: boolean; urgent?: boolean; /** How many things this line stands for (3 decisions = 3). */ count?: number }

// ── Small helpers ─────────────────────────────────────────────────────────────

/** A nation is always governed by someone: with no head of government, the head of state's caretaker government. */
function governedBy(n: NationRow): string {
  if (n.administration) return n.administration.name;
  return `${n.headOfState.title} ${n.headOfState.name} (caretaker)`;
}

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

function Tabs2<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-4 text-[12px] font-medium text-ink-dim">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={value === o.id ? 'text-accent border-b-2 border-accent pb-1' : 'hover:text-ink pb-1 border-b-2 border-transparent'}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' | 'amber' }) {
  const color = tone === 'good' ? 'text-terminal-green' : tone === 'bad' ? 'text-terminal-red' : tone === 'amber' ? 'text-terminal-amber' : 'text-zinc-100';
  return (
    <div>
      <div className={`text-[14px] font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">{label}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#13161E] border border-[#262B36] px-3 py-2 rounded-lg text-[10px] font-mono shadow-card">
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
  const [newsTab, setNewsTab] = useState<'ledger' | 'wire'>('ledger');
  const [worldTab, setWorldTab] = useState<WorldTab>('nations');
  const [mobileTab, setMobileTab] = useState<MobileTab>('inbox');

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
      if (cards > 0) list.push({ id: 'cards', urgent: true, count: cards, href: pol('desk'), text: `${cards} decision${cards > 1 ? 's' : ''} waiting on your desk` });
      const votes = me.voteMode ? desk.bills.filter(b => b.status === 'proposed' && !b.myVote).length : 0;
      if (votes > 0) list.push({ id: 'votes', urgent: true, count: votes, href: pol('chamber'), text: `Cast your vote on ${votes} bill${votes > 1 ? 's' : ''}` });
      const deals = (desk.desk.deals?.incoming.length ?? 0) + (desk.desk.handshakesIncoming ?? 0);
      if (deals > 0) list.push({ id: 'deals', urgent: true, count: deals, href: pol('corridors'), text: `${deals} deal offer${deals > 1 ? 's' : ''} to answer` });
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
    : company?.industry_id ?? '';

  // Net worth change since last month.
  const prev = netWorthSeries.length > 1 ? Number(netWorthSeries[netWorthSeries.length - 2].value) : netWorth;
  const delta = netWorth - prev;
  const deltaPct = prev ? (delta / Math.abs(prev)) * 100 : 0;
  const up = delta >= 0;
  const accent = up ? '#4FB286' : '#D9625A';

  const titleLine = me
    ? [me.office ?? RUNG_LABEL[me.rung] ?? me.rung, me.isPartyLeader && !me.office ? 'party leader' : null].filter(Boolean).join(', ')
    : 'Citizen';

  const ladder = desk?.desk.ladder ?? [];
  const rungIdx = ladder.findIndex(r => r.current);
  const nextRung = rungIdx >= 0 ? ladder[rungIdx + 1] : undefined;
  // Count things, not lines: "3 decisions waiting" is 3, as on the politics Desk.
  const urgentCount = todos.filter(t => t.urgent).reduce((a, t) => a + (t.count ?? 1), 0);
  // The Politics button shows the same number as the Desk badge: decisions, votes and deals.
  const politicsWaiting = todos.filter(t => t.urgent && ['cards', 'votes', 'deals'].includes(t.id)).reduce((a, t) => a + (t.count ?? 1), 0);
  const shownTodos = todos.slice(0, TODO_LIMIT);
  const unread = notices?.unread ?? 0;

  // ── Panels (each used on desktop and inside the mobile tabs) ───────────────

  const todayPanel = (
    <>
      {!desk && <SkeletonRows n={3} />}
      <div className="flex flex-col gap-1.5">
        {shownTodos.map(t => (
          <Link
            key={t.id}
            href={t.href}
            className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-[12px] leading-snug border transition-colors ${t.urgent ? 'border-terminal-amber/30 bg-terminal-amber/5 text-zinc-100 hover:border-terminal-amber/60' : 'border-[#262B36] text-zinc-400 hover:border-zinc-700'}`}
          >
            {t.done
              ? <CheckCircle2 size={13} className="text-terminal-green mt-0.5 shrink-0" />
              : t.urgent ? <Zap size={13} className="text-terminal-amber mt-0.5 shrink-0" /> : <Circle size={13} className="text-zinc-600 mt-0.5 shrink-0" />}
            <span className="flex-1">{t.text}</span>
            <ChevronRight size={13} className="text-zinc-600 mt-0.5 shrink-0" />
          </Link>
        ))}
        {todos.length > TODO_LIMIT && (
          <Link href={pol('desk')} className="text-[11px] text-zinc-500 hover:text-terminal-amber px-1">
            +{todos.length - TODO_LIMIT} more on your desk →
          </Link>
        )}
      </div>
      {me?.nextGoal && (
        <p className="mt-2.5 text-[11px] text-zinc-500 leading-snug line-clamp-2">
          <span className="text-zinc-400 font-medium">Next goal:</span> {me.nextGoal}
        </p>
      )}
    </>
  );

  const inboxPanel = !notices ? <SkeletonRows n={4} /> : notices.items.length === 0 ? (
    <div className="flex flex-col items-start gap-2">
      <p className="text-[13px] text-ink-dim leading-relaxed">
        Nothing yet. Deal offers, challenges, votes on your bills and your world rank land here.
      </p>
      <Link href={pol('corridors')} className="text-[13px] font-medium text-accent hover:underline underline-offset-2">Meet the other players in Corridors →</Link>
    </div>
  ) : (
    <div className="flex flex-col">
      {notices.items.slice(0, INBOX_LIMIT).map((n: Notice) => (
        <Link
          key={n.id}
          href={n.tab ? pol(n.tab) : pol('desk')}
          className={`py-2 px-2 -mx-2 rounded border-b border-[#262B36] last:border-0 hover:bg-zinc-900/40 ${n.read ? '' : 'bg-terminal-amber/5'}`}
        >
          <div className="flex items-start gap-2">
            {!n.read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-terminal-amber shrink-0" />}
            <div className="min-w-0">
              <div className={`text-[12px] leading-snug line-clamp-2 ${n.read ? 'text-zinc-400' : 'text-zinc-100'}`}>{n.text}</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{formatPolArc(n.arc, false)}</div>
            </div>
          </div>
        </Link>
      ))}
      {notices.items.length > INBOX_LIMIT && (
        <Link href="/drennia/politics" className="pt-2 text-[11px] text-zinc-500 hover:text-terminal-amber">
          All {notices.items.length} notices →
        </Link>
      )}
    </div>
  );

  const markReadButton = unread > 0 ? (
    <button
      type="button"
      onClick={() => politicsApi.markNoticesRead().then(() => mutateDesk()).catch(() => {})}
      className="text-[10px] text-zinc-500 hover:text-terminal-amber"
    >
      Mark all read
    </button>
  ) : undefined;

  const ledgerPanel = !desk ? <SkeletonRows n={3} /> : desk.news.length === 0 ? (
    <div className="flex flex-col items-start gap-2">
      <p className="text-[13px] text-ink-dim leading-relaxed">No news yet. The Meridian Wire reports bills, votes and elections when the month turns.</p>
      <Link href={pol('wire')} className="text-[13px] font-medium text-accent hover:underline underline-offset-2">Write the first dispatch for the Wire →</Link>
    </div>
  ) : (
    <div className="flex flex-col">
      {desk.news.slice(0, NEWS_LIMIT).map(ev => (
        <div key={ev.id} className="py-2 border-b border-[#262B36] last:border-0">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[12px] font-semibold text-zinc-200 leading-snug">{ev.headline}</div>
            <div className="text-[10px] text-zinc-600 uppercase tracking-wider shrink-0">{formatPolArc(ev.arc)}</div>
          </div>
          <div className="text-[11px] text-zinc-500 leading-snug mt-0.5 line-clamp-1">{ev.body}</div>
        </div>
      ))}
    </div>
  );

  const wirePanel = !wire ? <SkeletonRows n={3} /> : !wire.edition ? (
    <p className="text-[11px] text-zinc-500 italic">The first edition prints when the politics month turns.</p>
  ) : (
    <>
      <h3 className="text-[14px] font-bold text-zinc-100 leading-snug" style={{ fontFamily: "'Cinzel', Georgia, serif" }}>
        {wire.edition.headline}
      </h3>
      <div className="flex flex-col mt-1">
        {wire.edition.stories.slice(0, NEWS_LIMIT).map((s, i) => (
          <div key={i} className="py-1.5 border-b border-[#262B36] last:border-0 flex items-baseline gap-2">
            <span className="text-[10px] uppercase tracking-widest text-terminal-amber/80 w-16 shrink-0 truncate">{s.nationName}</span>
            <span className="text-[12px] text-zinc-200 leading-snug">{s.headline}</span>
          </div>
        ))}
      </div>
      <Link href={pol('wire')} className="inline-block pt-2 text-[11px] text-zinc-500 hover:text-terminal-amber">Read the edition →</Link>
    </>
  );

  const newsToggle = (
    <Tabs2
      value={newsTab}
      onChange={setNewsTab}
      options={[{ id: 'ledger', label: nationName ? `${nationName}` : 'Nation' }, { id: 'wire', label: 'World' }]}
    />
  );
  const newsPanel = newsTab === 'ledger' ? ledgerPanel : wirePanel;

  const myNationStats = myNation && desk ? (
    <div className="rounded-lg border border-terminal-amber/30 bg-terminal-amber/5 p-3">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Flag flag={myNation.flag} width={26} />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold text-zinc-100 truncate">{myNation.name} <span className="text-[10px] uppercase tracking-widest text-terminal-amber ml-1">Home</span></div>
          <div className="text-[10px] text-zinc-500 truncate">
            {PHASE_LABEL[desk.calendar.phase] ?? desk.calendar.phase}
            {myNation.monthsToElection != null && desk.calendar.phase === 'governing' && ` · election in ${myNation.monthsToElection} mo`}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Approval" value={`${Math.round(myNation.approval)}%`} tone={myNation.approval >= 50 ? 'good' : 'bad'} />
        <MiniStat label="Jobless" value={myNation.sim ? pct1(myNation.sim.unemployment) : '—'} tone={myNation.sim && myNation.sim.unemployment > 0.08 ? 'bad' : undefined} />
        <MiniStat label="Rating" value={myNation.sim ? String(Math.round(myNation.sim.rating)) : '—'} tone="amber" />
        <MiniStat label="Rank" value={myNation.sim ? `#${myNation.sim.rank}` : '—'} />
      </div>
      <div className="mt-2 text-[10px] text-zinc-500 truncate">
        {myNation.premier
          ? <>{myNation.leaderTitle}: <span className="text-zinc-300">{myNation.premier}</span>{myNation.leadParty && ` · ${myNation.leadParty.name}`}</>
          : <span className="text-zinc-300">{governedBy(myNation)}</span>}
      </div>
    </div>
  ) : null;

  const nationsPanel = !desk ? <SkeletonRows n={4} /> : (
    <div className="flex flex-col gap-2">
      {myNationStats}
      {desk.desk.world.filter(n => !n.mine).map(n => (
        <Link
          key={n.polStateCode}
          href={pol('nation')}
          className="flex items-center gap-3 rounded-lg px-2.5 py-2 border border-[#262B36] hover:border-zinc-700 transition-colors"
        >
          <Flag flag={n.flag} width={26} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold text-zinc-100 truncate">{n.name}</div>
            <div className="text-[10px] text-zinc-500 truncate">{n.premier ? `${n.leaderTitle}: ${n.premier}` : governedBy(n)}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[12px] font-mono text-zinc-200" title="Government approval">{Math.round(n.approval)}%</div>
            {n.sim && <div className="text-[10px] text-zinc-500 capitalize">{n.sim.tier}</div>}
          </div>
        </Link>
      ))}
      <Link href={pol('nation')} className="text-[11px] text-zinc-500 hover:text-terminal-amber px-1">Open nation →</Link>
    </div>
  );

  const influencePanel = !wire ? <SkeletonRows n={5} /> : wire.live.top.length === 0 ? (
    <EmptyState icon={Award} message="No one ranked yet." className="py-2" />
  ) : (
    <div className="flex flex-col">
      {wire.live.top.slice(0, RANK_LIMIT).map(r => (
        <div key={r.key} className="flex items-center gap-3 py-1.5 border-b border-zinc-900/60 last:border-0">
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
          ? <>You: <strong className="text-zinc-100">#{wire.live.mine.rank}</strong> of {wire.live.total} ({(wire.live.mine.share * 100).toFixed(1)}%)</>
          : 'Not ranked yet. Join a party or win a seat to get on the list.'}
      </div>
    </div>
  );

  const richPanel = (
    <>
      <div className="mb-2">
        <Tabs2 value={leaderboardTab} onChange={setLeaderboardTab}
          options={[{ id: 'wealth', label: 'People' }, { id: 'marketCap', label: 'Companies' }]} />
      </div>
      {(() => {
        const rows: any[] | undefined = leaderboardTab === 'wealth' ? leaderboards?.richestPlayers : leaderboards?.topCompanies;
        if (!rows) return <SkeletonRows n={5} />;
        if (rows.length === 0) return <EmptyState icon={leaderboardTab === 'wealth' ? User : Briefcase} message="Nothing to rank yet." className="py-2" />;
        return rows.slice(0, RANK_LIMIT).map((r: any, idx: number) => {
          const isMe = leaderboardTab === 'wealth' ? r.name === characterName : r.name === company?.name;
          const value = leaderboardTab === 'wealth' ? r.net_worth : r.company_value;
          const trend = Number(leaderboardTab === 'wealth' ? r.trend : r.last_arc_profit);
          return (
            <div key={idx} className={`flex items-center gap-3 py-1.5 border-b border-zinc-900/60 last:border-0 ${isMe ? 'bg-terminal-green/5' : ''}`}>
              <span className="w-5 text-right text-[11px] font-mono text-zinc-500">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <div className={`text-[12px] font-semibold truncate ${isMe ? 'text-terminal-green' : 'text-zinc-100'}`}>{r.name}</div>
                {leaderboardTab === 'marketCap' && <div className="text-[10px] text-zinc-500 capitalize">{r.industry_id?.replace(/[_-]/g, ' ')}</div>}
              </div>
              <span className="text-[12px] font-mono text-terminal-amber">{formatMoney(value)}</span>
              <span className={`w-3 text-[10px] ${trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-zinc-600'}`}>
                {trend > 0 ? '▲' : trend < 0 ? '▼' : '–'}
              </span>
            </div>
          );
        });
      })()}
    </>
  );

  const marketPanel = (
    <>
      <WorldThisMonth bare />
      <div className="flex justify-between items-end mt-4 mb-1">
        <span className="text-[10px] text-terminal-amber uppercase tracking-[0.2em]">Best-selling cars</span>
        <Tabs2 value={bestSellersTab} onChange={setBestSellersTab} options={[{ id: 'monthly', label: 'Month' }, { id: 'allTime', label: 'All time' }]} />
      </div>
      {(() => {
        const list: any[] | undefined = bestSellersTab === 'monthly' ? leaderboards?.popularCars : leaderboards?.popularCarsAllTime;
        if (!list) return <SkeletonRows n={3} />;
        if (list.length === 0) return <p className="text-[11px] text-zinc-500 py-2">No cars sold {bestSellersTab === 'monthly' ? 'this month' : 'yet'}.</p>;
        return list.slice(0, 3).map((car: any, idx: number) => (
          <div key={idx} className="flex items-center gap-3 py-1.5 border-b border-zinc-900/60 last:border-0">
            <span className="w-5 text-right text-[11px] font-mono text-zinc-500">{idx + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-zinc-100 truncate">{car.model_name}</div>
              <div className="text-[10px] text-zinc-500 truncate">{car.company_name}</div>
            </div>
            <span className="text-[11px] font-mono text-terminal-amber">{Number(car.total_sold).toLocaleString('en-US')}</span>
          </div>
        ));
      })()}
    </>
  );

  const worldTabs: { id: WorldTab; label: string }[] = [
    { id: 'nations', label: 'Nations' }, { id: 'influence', label: 'Influence' },
    { id: 'rich', label: 'Rich list' }, { id: 'market', label: 'Market' },
  ];
  const worldPanel = (t: WorldTab) =>
    t === 'nations' ? nationsPanel : t === 'influence' ? influencePanel : t === 'rich' ? richPanel : marketPanel;

  const mobileTabs: { id: MobileTab; label: string }[] = [
    { id: 'inbox', label: unread > 0 ? `Inbox (${unread})` : 'Inbox' },
    { id: 'news', label: 'News' },
    ...worldTabs,
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#0B0D12] text-zinc-100 overflow-hidden scanlines relative">
      {showFirstDay && (
        <FirstDayModal characterName={characterName} citizenFile={citizenFile} onDismiss={() => setShowFirstDay(false)} />
      )}
      {showThreeMillionBonus && <ThreeMillionBonusModal onDismiss={() => setShowThreeMillionBonus(false)} />}
      {showGuideModal && <GuideModal onDismiss={() => setShowGuideModal(false)} />}

      {/* ── Top bar: who, your numbers, the clock ─────────────────────────── */}
      <header className="border-b border-line bg-surface/60 shrink-0">
        <div className="page-frame flex items-center justify-between py-2.5 gap-x-4 gap-y-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <StatusDot variant="live" />
          <span className="text-[13px] font-semibold text-zinc-100 truncate">{characterName}</span>
        </div>

        <div tabIndex={0} role="group" aria-label="Your numbers" className="order-last sm:order-none w-full sm:w-auto flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide sm:flex-wrap sm:overflow-visible rounded-lg">
          <StatChip label="Cash $" value={playerCash} prefix="$" valueColor="green" countUp />
          <StatChip label="Credibility" value={citizenFile?.credibility ?? 50} />
          <StatChip label="Charisma" value={citizenFile?.charisma ?? 50} />
          <StatChip label="Influence" value={citizenFile?.influence ?? 10} />
          {me && <StatChip label="Energy" value={`${me.ap.current}/${me.ap.cap}`} />}
        </div>

        <div className="flex items-center gap-3">
          <WorldTimeControl />
          <NotificationBell />
        </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto py-4 md:py-5">
        <PageShell sidebar={
          <div className="hidden lg:block">
            <Card pad="sm">
              <div className="mb-3 overflow-x-auto scrollbar-hide">
                <Tabs2 value={worldTab} onChange={setWorldTab} options={worldTabs} />
              </div>
              {worldPanel(worldTab)}
            </Card>
          </div>
        }>
          <div className="flex flex-col gap-4">

            {/* ── You: identity, career ladder, net worth, main buttons ────── */}
            <div className="rounded-xl border border-[#262B36] bg-gradient-to-br from-[#0d0e15] via-[#111320] to-[#13161E] p-4 md:p-5" style={{ boxShadow: '0 0 40px rgba(232,184,75,0.04) inset, 0 1px 0 rgba(232,184,75,0.08)' }}>
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                {/* Identity */}
                <div className="min-w-0 flex-1 flex items-start gap-3">
                  {myNation && <div className="pt-1 hidden sm:block"><Flag flag={myNation.flag} width={40} /></div>}
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-semibold text-zinc-100 truncate">{characterName || 'Citizen'}</h1>
                    <p className="text-[12px] text-zinc-300 mt-0.5 flex items-center flex-wrap gap-x-1.5">
                      {me?.party && <span className="inline-block w-2 h-2 rounded-full" style={{ background: me.party.color }} />}
                      <span>{titleLine}</span>
                      {me?.party && <span className="text-zinc-500">· {me.party.name}</span>}
                      {nationName && <span className="text-zinc-500">· {nationName}</span>}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 font-mono">Age {characterAge} · {formatGameDate()}</p>
                  </div>
                </div>

                {/* Career ladder + net worth: side by side on phones too */}
                <div className="grid grid-cols-2 gap-4 items-center md:flex md:gap-6 shrink-0">
                {ladder.length > 0 && (
                  <Link href={pol('desk')} className="md:w-52 min-w-0 group" title="Your political career: eight rungs from citizen to world statesman">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Career</span>
                      <span className="text-[10px] text-zinc-500">{rungIdx + 1}/{ladder.length}</span>
                    </div>
                    <div className="flex gap-1">
                      {ladder.map(r => <span key={r.key} title={r.title} className={`h-1.5 flex-1 rounded-full ${r.reached ? 'bg-terminal-amber' : 'bg-zinc-800'}`} />)}
                    </div>
                    {nextRung && <p className="text-[10px] text-zinc-500 mt-1.5 group-hover:text-zinc-300">Next: <span className="text-zinc-300">{nextRung.title}</span></p>}
                  </Link>
                )}

                {/* Net worth */}
                <div className="flex items-center gap-4 shrink-0">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-zinc-600">Net worth</span>
                      <button
                        type="button"
                        onClick={handleRecalculateHistory}
                        disabled={isRecalculating}
                        title="Rebuild your net worth history if the chart looks wrong"
                        aria-label="Fix net worth history"
                        className="text-zinc-600 hover:text-terminal-amber disabled:opacity-50"
                      >
                        <RefreshCw size={10} className={isRecalculating ? 'animate-spin' : ''} />
                      </button>
                    </div>
                    <p className="text-xl md:text-2xl font-mono font-bold text-terminal-amber amber-glow leading-tight">{formatMoney(netWorth)}</p>
                    <p className={`text-[10px] font-mono font-bold whitespace-nowrap ${up ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {up ? '▲' : '▼'} {formatMoney(Math.abs(delta))} ({deltaPct.toFixed(1)}%) this month
                    </p>
                  </div>
                  <div className="hidden sm:block w-24 h-12 md:w-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={netWorthSeries} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={accent} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={2} fill="url(#heroGrad)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button href="/drennia/politics" variant="primary" icon={ChevronRight} size="sm">
                  {politicsWaiting > 0 ? `Politics (${politicsWaiting} waiting)` : 'Politics'}
                </Button>
                <Button href="/drennia/business" variant="secondary" size="sm">
                  {company ? `${company.name} →` : 'Start a company →'}
                </Button>
                {company && (
                  <span className="text-[10px] font-mono text-zinc-500">
                    {sectorLabel}{companyCount > 1 ? ` · +${companyCount - 1} more` : ''} · cash <span className="text-terminal-green">{formatMoney(totalCompanyCash)}</span>
                  </span>
                )}
              </div>
            </div>

            {/* ── Today + Inbox side by side on desktop (Inbox is a tab below lg) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card pad="sm" kicker="Today" icon={Zap} title={urgentCount > 0 ? `${urgentCount} thing${urgentCount > 1 ? 's need' : ' needs'} you` : 'Nothing urgent'}>
                {todayPanel}
              </Card>
              <Card pad="sm" className="hidden lg:block" kicker="Inbox" icon={InboxIcon} title={unread > 0 ? `${unread} unread` : 'While you were away'} headerSlot={markReadButton}>
                {inboxPanel}
              </Card>
            </div>

            {/* ── Desktop: news. The world panels live in the sidebar. ───────── */}
            <Card pad="sm" className="hidden lg:block" kicker="News" icon={Newspaper} headerSlot={newsToggle}>
              {newsPanel}
            </Card>

            {/* ── Mobile / tablet: everything else in one tabbed card ─────── */}
            <Card pad="sm" className="lg:hidden">
              <div className="mb-3 -mx-1 px-1 overflow-x-auto scrollbar-hide">
                <div className="min-w-max">
                  <Tabs2 value={mobileTab} onChange={setMobileTab} options={mobileTabs} />
                </div>
              </div>
              {mobileTab === 'inbox' && (
                <>
                  {markReadButton && <div className="flex justify-end mb-1">{markReadButton}</div>}
                  {inboxPanel}
                </>
              )}
              {mobileTab === 'news' && (<><div className="mb-2">{newsToggle}</div>{newsPanel}</>)}
              {mobileTab !== 'inbox' && mobileTab !== 'news' && worldPanel(mobileTab)}
            </Card>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRestartLife}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-ink-faint hover:text-bad transition-colors"
              >
                <LogOut size={11} /> Restart life
              </button>
            </div>
          </div>
        </PageShell>
      </div>
    </div>
  );
}
