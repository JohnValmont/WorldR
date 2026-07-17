'use client';
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import useSWR from 'swr';
import { politicsApi, characterApi } from '@/lib/api';
import { DEFAULT_JURISDICTION_ID, type JurisdictionId } from './_lib/session';
import { T, MONO } from './_lib/theme';
import { JURISDICTION_MODEL } from './_lib/model';
import PoliticsSidebar, { type PoliticsSection } from './_components/PoliticsSidebar';
import { formatGameDateShort } from '@/lib/calendar';

import OverviewScreen    from './OverviewScreen';
import NationScreen      from './NationScreen';
import ElectionsScreen   from './ElectionsScreen';
import LegislatureScreen from './LegislatureScreen';
import PolicyScreen        from './PolicyScreen';
import AssemblyScreen    from './AssemblyScreen';
import PartyScreen       from './PartyScreen';
import LobbyScreen       from './LobbyScreen';

// Live countdown to the next in-game month (1 month = 8 real hours -> next 0/8/16h).
function NextTick() {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const d = new Date(now);
  const boundary = (Math.floor(d.getHours() / 8) + 1) * 8;
  const next = new Date(d);
  next.setHours(boundary, 0, 0, 0);
  let ms = next.getTime() - now;
  if (ms < 0) ms += 8 * 3600 * 1000;
  const pad = (n: number) => String(n).padStart(2, '0');
  const hh = Math.floor(ms / 3600000);
  const mm = Math.floor((ms % 3600000) / 60000);
  const ss = Math.floor((ms % 60000) / 1000);
  return <span style={{ fontFamily: MONO }}>{pad(hh)}:{pad(mm)}:{pad(ss)}</span>;
}

function Chip({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 4 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint }}>{label}</span>
      <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: tone || T.ivory }}>{value}</span>
    </div>
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

  const myAp = (myApData as { current_ap: number; ap_cap: number }) || { current_ap: 0, ap_cap: 12 };

  const loadData = useCallback(async () => {
    await Promise.all([mutateChar(), mutateOver(), mutateParties(), mutateLedger(), mutateAp()]);
  }, [mutateChar, mutateOver, mutateParties, mutateLedger, mutateAp]);

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
    myAp,
    onRefresh: loadData,
  };

  const cash = character?.finances?.cash_in_hand;
  const cred = character?.political?.credibility ?? character?.credibility;
  const monthYear = overview?.cycle?.currentArc != null ? formatGameDateShort(overview.cycle.currentArc) : '';
  const monthsToElection = overview?.cycle?.monthsToElection ?? overview?.monthsToElection;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', background: T.bg, color: T.text }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 20px', borderBottom: `1px solid ${T.border}`, background: T.panel, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>Drennia</span>
          <span style={{ color: T.border }}>/</span>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.ivory, fontWeight: 700 }}>Politics</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {cred != null && <Chip label="Cred" value={cred} />}
          {cash != null && <Chip label="Cash" value={`$${Number(cash).toLocaleString('en-US')}`} tone={T.mint} />}
          <Chip label="AP" value={`${myAp.current_ap}`} tone={T.gold} />
          {monthYear && <Chip label="When" value={monthYear} />}
          <Chip label="Next Month" value={<NextTick />} />
          {monthsToElection != null && <Chip label="Election" value={`${monthsToElection} mo`} tone={T.blue} />}
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <PoliticsSidebar active={activeSection} onSelect={setActiveSection} myPartyName={myParty?.name} myPartyNation={jMeta.name} />
        <main style={{ flex: 1, overflowY: 'auto', background: T.bg }}>
          <div style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px' }}>
            {loading ? (
              <div style={{ color: T.muted, fontFamily: MONO, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Convening the Political Desk—</div>
            ) : error ? (
              <div style={{ color: T.red, border: `1px solid ${T.red}55`, background: `${T.red}14`, padding: 16, borderRadius: 4 }}>
                {String((error as any)?.response?.data?.message || (error as any)?.message || error)}
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
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
