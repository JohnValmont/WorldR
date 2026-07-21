'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { politicsApi, characterApi, worldApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { DEFAULT_JURISDICTION_ID, type JurisdictionId } from './_lib/session';
import { T, MONO, HEADING, BODY } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import PoliticsSidebar, { type PoliticsSection } from './_components/PoliticsSidebar';
import { HoverData } from './_components/DeskUI';
import { formatGameDateShort } from '@/lib/calendar';

import OverviewScreen    from './OverviewScreen';
import NationScreen      from './NationScreen';
import ElectionsScreen   from './ElectionsScreen';
import LegislatureScreen from './LegislatureScreen';
import PolicyScreen      from './PolicyScreen';
import AssemblyScreen    from './AssemblyScreen';
import PartyScreen       from './PartyScreen';
import LobbyScreen       from './LobbyScreen';
import LegacyScreen      from './LegacyScreen';

function ForcePolTickBtn({ onTick }: { onTick: () => void }) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'admin' || isAdminDynamic;

  useEffect(() => {
    authApi.me().then(res => setIsAdminDynamic(res.data.isAdmin)).catch(() => {});
  }, []);

  if (!isAdmin) return null;

  const handleForcePolTick = async () => {
    if (isAdvancing) return;
    setIsAdvancing(true);
    try {
      const res = await worldApi.forcePoliticsTick();
      const result = res?.data ?? res;
      if (result?.data?.status === 'ticked' || result?.status === 'success') {
        onTick();
        return;
      }
      alert('Politics tick did not advance.');
      onTick();
    } catch (err: any) {
      alert(err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to advance politics tick');
    } finally {
      setIsAdvancing(false);
    }
  };

  return (
    <button
      onClick={handleForcePolTick}
      disabled={isAdvancing}
      style={{
        background: isAdvancing ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, #a78bfa, #7c3aed)`,
        color: isAdvancing ? T.muted : '#fff',
        border: `1px solid ${isAdvancing ? T.border : '#a78bfa'}`,
        padding: '4px 10px', borderRadius: 4,
        fontSize: 10, fontFamily: MONO, textTransform: 'uppercase', letterSpacing: '0.1em',
        fontWeight: 700, cursor: isAdvancing ? 'not-allowed' : 'pointer',
        opacity: isAdvancing ? 0.7 : 1, whiteSpace: 'nowrap',
        marginLeft: 8
      }}
    >
      {isAdvancing ? 'PROCESSING...' : 'FORCE POL TICK'}
    </button>
  );
}

// Live countdown to the next in-game month tick
function NextTick() {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(now);
  const nextHour = (Math.floor((d.getHours() - 2) / 6) + 1) * 6 + 2;
  const next = new Date(d);
  next.setHours(nextHour, 0, 0, 0);
  let ms = next.getTime() - now;
  if (ms < 0) ms += 6 * 3600 * 1000;
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  return (
    <span style={{ fontFamily: MONO, letterSpacing: '0.05em' }}>
      {pad(hh)}:{pad(mm)}:{pad(ss)}
    </span>
  );
}

// Header metric pill
function MetricPill({
  label, value, tone, tooltip,
}: {
  label: string;
  value: React.ReactNode;
  tone?: string;
  tooltip: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <HoverData tooltip={tooltip}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          padding: '5px 12px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          cursor: 'help',
          transition: 'background 0.15s',
          background: hover ? 'rgba(255,255,255,0.03)' : 'transparent',
          borderRadius: 4,
        }}
      >
        <span style={{
          fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em',
          textTransform: 'uppercase', color: T.faint,
          fontWeight: 600, marginBottom: 2,
        }}>{label}</span>
        <span style={{
          fontFamily: MONO, fontSize: 14, fontWeight: 700,
          color: tone || T.ivory, lineHeight: 1,
          letterSpacing: '-0.01em',
          textShadow: tone ? `0 0 14px ${tone}30` : 'none',
        }}>{value}</span>
      </div>
    </HoverData>
  );
}

export default function PoliticsDesk() {
  const [activeSection, setActiveSection] = useState<PoliticsSection>('overview');
  const [selectedJurisdictionId, setSelectedJurisdictionId] = useState<JurisdictionId>(DEFAULT_JURISDICTION_ID);

  const { data: character, mutate: mutateChar, error: errChar } = useSWR('me', () => characterApi.getMe().then((res: any) => res.data || res));
  const { data: overview, mutate: mutateOver, error: errOver } = useSWR('politicsState', () => politicsApi.getState());
  const { data: parties = [], mutate: mutateParties, error: errParties } = useSWR(['parties', selectedJurisdictionId], () => politicsApi.getParties(selectedJurisdictionId));
  const { data: ledger = [], mutate: mutateLedger } = useSWR(['ledger', selectedJurisdictionId], () => politicsApi.getLedger(20, selectedJurisdictionId));
  const { data: myApData, mutate: mutateAp } = useSWR('myAp', () => politicsApi.getMyAp());
  const { data: myPcData, mutate: mutatePc } = useSWR('myPc', () => politicsApi.getMyPc());

  const myAp = (myApData as { current_ap: number; ap_cap: number }) || { current_ap: 0, ap_cap: 12 };

  const loadData = useCallback(async () => {
    await Promise.all([mutateChar(), mutateOver(), mutateParties(), mutateLedger(), mutateAp(), mutatePc()]);
  }, [mutateChar, mutateOver, mutateParties, mutateLedger, mutateAp, mutatePc]);

  const loading = !character && !errChar && !overview && !errOver;
  const error = errChar || errOver || errParties;

  const jMeta = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;

  const jurisdictionMeta = useMemo(() => {
    const meta: Record<string, any> = {};
    if (overview?.activeState) meta[overview.activeState.code] = { id: overview.activeState.code };
    return meta;
  }, [overview]);

  const myParty = Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id) : undefined;

  const commonProps = {
    selectedJurisdictionId,
    onJurisdictionChange: setSelectedJurisdictionId,
    jurisdictionMeta,
    overview,
    character,
    parties,
    myAp: myApData as any,
    myPc: myPcData as any,
    onRefresh: loadData,
  };

  const cash = character?.finances?.cash_in_hand;
  const cred = character?.political?.credibility ?? character?.credibility;
  const monthYear = overview?.cycle?.currentArc != null ? formatGameDateShort(overview.cycle.currentArc) : '';
  const monthsToElection = overview?.cycle?.monthsToElection ?? overview?.monthsToElection;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', background: T.bg, color: T.text }}>

      {/* ─── Compact Header ─── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: 46,
        borderBottom: '1px solid rgba(255,255,255,0.055)',
        background: 'linear-gradient(180deg, rgba(7,7,20,0.95) 0%, rgba(5,5,15,0.92) 100%)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Bottom edge glow */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(79,110,247,0.22), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Left: Logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, #4F6EF7, #3A5BE0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 3px 10px rgba(79,110,247,0.4)',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18"/><path d="M5 21V10M9 21V10M15 21V10M19 21V10"/>
              <path d="M3 10 12 4l9 6"/>
            </svg>
          </div>
          <div>
            <div style={{
              fontSize: 13, fontFamily: HEADING, fontWeight: 700,
              color: T.ivory, lineHeight: 1.2, letterSpacing: '-0.01em',
            }}>Political Desk</div>
          </div>
          {/* Separator */}
          <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.07)', marginLeft: 4 }} />
          {/* Active section badge */}
          <div style={{
            padding: '2px 8px', borderRadius: 99,
            background: 'rgba(79,110,247,0.10)',
            border: '1px solid rgba(79,110,247,0.22)',
            fontFamily: HEADING, fontSize: 11, fontWeight: 600,
            color: T.blueBright, textTransform: 'capitalize', letterSpacing: '-0.01em',
          }}>
            {activeSection.replace(/_/g, ' ')}
          </div>
        </div>

        {/* Right: Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          {cred != null && (
            <MetricPill
              label="Credibility"
              value={cred}
              tooltip={<div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: BODY, lineHeight: 1.6 }}>Political Credibility allows you to take controversial actions. Earned by winning elections and passing bills.</div>}
            />
          )}
          {cash != null && (
            <MetricPill
              label="Liquid Cash"
              value={`$${Number(cash).toLocaleString('en-US')}`}
              tone={T.mint}
              tooltip={<div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: BODY, lineHeight: 1.6 }}>Liquid campaign and personal funds. Used for lobbying and operations.</div>}
            />
          )}
          <MetricPill
            label={`AP · ${myAp.current_ap}/${myAp.ap_cap}`}
            value={`${myAp.current_ap}`}
            tone={T.warning}
            tooltip={<div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: BODY, lineHeight: 1.6 }}>Action Points represent your time and energy. Regenerates every 8 real-life hours.<br/><br/><span style={{color: T.warning}}>Cap: {myAp.ap_cap} AP</span></div>}
          />
          <MetricPill
            label={monthYear || 'Tick Timer'}
            value={<NextTick />}
            tooltip={<div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: BODY, lineHeight: 1.6 }}>The game world processes a new month every 8 hours.</div>}
          />
          {monthsToElection != null && (
            <MetricPill
              label="Next Election"
              value={`${monthsToElection} mo`}
              tone={T.blueBright}
              tooltip={<div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: BODY, lineHeight: 1.6 }}>Months remaining until the next general election cycle.</div>}
            />
          )}
          <ForcePolTickBtn onTick={loadData} />
        </div>
      </header>

      <style>{`
        .politics-layout { display: flex; flex: 1; min-height: 0; overflow: hidden; }
        .politics-sidebar-container { width: 176px; flex-shrink: 0; }
        .politics-main-scroll::-webkit-scrollbar { width: 6px; }
        .politics-main-scroll::-webkit-scrollbar-track { background: transparent; }
        .politics-main-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .politics-main-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }
        @media (max-width: 768px) {
          .politics-layout { flex-direction: column-reverse; }
          .politics-sidebar-container { width: 100%; height: 60px; border-right: none !important; border-top: 1px solid rgba(51,65,85,0.4); }
          .sidebar-nav-groups { flex-direction: row !important; overflow-x: auto; overflow-y: hidden; padding: 0 8px; align-items: center; }
          .sidebar-nav-group-label { display: none !important; }
          .sidebar-nav-item { flex: 0 0 auto; width: auto !important; margin: 0 2px !important; padding: 8px 10px !important; }
          .sidebar-nav-item span { display: none !important; }
          .sidebar-nav-item svg { margin: 0; }
          .sidebar-brand, .sidebar-leader { display: none !important; }
        }
      `}</style>

      {/* ─── Body ─── */}
      <div className="politics-layout">
        <PoliticsSidebar active={activeSection} onSelect={setActiveSection} myPartyName={myParty?.name} myPartyNation={jMeta.name} />

        <main className="politics-main-scroll" style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
          {/* Background ambient */}
          <div style={{
            position: 'fixed', top: 0, right: 0, width: 600, height: 600,
            background: 'radial-gradient(ellipse at top right, rgba(79,110,247,0.04) 0%, transparent 70%)',
            pointerEvents: 'none', zIndex: 0,
          }} />
          <div style={{ maxWidth: 1260, margin: '0 auto', padding: '10px 14px', position: 'relative', zIndex: 1 }}>
            {loading ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ color: T.faint, fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                  Convening the Political Desk
                  <span style={{ animation: 'none' }}>…</span>
                </div>
              </div>
            ) : error ? (
              <div style={{
                color: T.red, border: `1px solid ${T.red}40`,
                background: T.redDim, padding: '10px 14px', borderRadius: 12,
                fontFamily: BODY, fontSize: 13, lineHeight: 1.6,
              }}>
                {String((error as any)?.response?.data?.error || (error as any)?.message || error)}
              </div>
            ) : activeSection === 'overview' ? (
              <OverviewScreen overview={overview} character={character} parties={parties} myAp={myAp} selectedJurisdictionId={selectedJurisdictionId} onNavigate={setActiveSection} onRefresh={loadData} />
            ) : activeSection === 'nation' ? (
              <NationScreen selectedJurisdictionId={selectedJurisdictionId} onJurisdictionChange={setSelectedJurisdictionId} jurisdictionMeta={jurisdictionMeta} overview={overview} ledger={ledger} />
            ) : activeSection === 'elections' ? (
              <ElectionsScreen {...commonProps} />
            ) : activeSection === 'legislature' ? (
              <LegislatureScreen {...commonProps} />
            ) : activeSection === 'policy' ? (
              <PolicyScreen {...commonProps} />
            ) : activeSection === 'assembly' ? (
              <AssemblyScreen {...commonProps} />
            ) : activeSection === 'party' ? (
              <PartyScreen {...commonProps} />
            ) : activeSection === 'lobby' ? (
              <LobbyScreen {...commonProps} />
            ) : activeSection === 'legacy' ? (
              <LegacyScreen character={character} />
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
