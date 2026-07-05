'use client';
import React from 'react';
import { ChevronRight } from 'lucide-react';
import PhaseTimeline from './_components/PhaseTimeline';
import ArcDigest from './ArcDigest';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { JURISDICTIONS } from './_lib/session';

const PHASE_LABEL: Record<string, { label: string; color: string }> = {
  filing:    { label: 'Filing',    color: 'bg-amber-500/20 text-amber-400' },
  campaign:  { label: 'Campaign',  color: 'bg-blue-500/20 text-blue-400' },
  polling:   { label: 'Polling',   color: 'bg-purple-500/20 text-purple-400' },
  formation: { label: 'Formation', color: 'bg-emerald-500/20 text-emerald-400' },
  governing: { label: 'Governing', color: 'bg-green-500/20 text-green-400' },
};

interface OverviewScreenProps {
  overview: any;
  character: any;
  parties: any[];
  latestGoverningEvent: any;
  myAp?: { current_ap: number; ap_cap: number };
  onNavigate: (section: PoliticsSection) => void;
}

export default function OverviewScreen({
  overview,
  character,
  parties,
  latestGoverningEvent,
  myAp,
  onNavigate,
}: OverviewScreenProps) {
  const phase = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const countdown = overview?.countdownToNextPhase ?? 0;
  const activeState = overview?.activeState;

  const credibility = character?.credibility ?? 0;
  const charisma    = character?.charisma    ?? 0;
  const influence   = character?.influence   ?? 0;
  const cash        = character?.finances?.cash_in_hand ?? character?.cash_in_hand ?? null;

  const phaseInfo = PHASE_LABEL[phase] || PHASE_LABEL.governing;

  const myParty = parties.find((p: any) =>
    p.leader_character_id === character?.id ||
    p.members?.some((m: any) => m.character_id === character?.id)
  );
  const stateName = activeState?.name || 'Ironvale';

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page hero ─────────────────────────────── */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#e8752a] font-semibold mb-2">
          {stateName} · Your Political Profile
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {character?.name ? `Welcome back, ${character.name.split(' ')[0]}.` : 'Political Desk'}
        </h1>
        <p className="text-[#8b8da8] text-sm leading-relaxed max-w-xl">
          {myParty
            ? `You lead ${myParty.name}. The council is currently in the ${phase} phase.`
            : `You have no active party. Found a movement and stand for ${stateName}.`}
        </p>
      </div>

      {/* ── Stat cards row ────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Credibility', value: credibility,  sub: 'out of 100' },
          { label: 'Charisma',    value: charisma,     sub: 'out of 100' },
          { label: 'Influence',   value: influence,    sub: 'points' },
          { label: 'Cash',        value: cash != null ? `$${Number(cash).toLocaleString()}` : '—', sub: 'personal' },
          ...(myAp ? [{ label: 'Action Points', value: `${myAp.current_ap} / ${myAp.ap_cap}`, sub: `+1 per arc` }] : []),
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-[#1c1d2e] border border-[#252637] rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] mb-1">{label}</div>
            <div className="text-2xl font-bold text-white leading-none">{value}</div>
            <div className="text-[10px] text-[#6b6d8a] mt-1">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Current State Card (like Nationhood's "Nation at a Glance") ── */}
      {activeState && (
        <div className="bg-[#1c1d2e] border border-[#252637] rounded-xl p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] mb-1">The Council · {stateName}</div>
              <h2 className="text-xl font-bold text-white">Current Phase</h2>
            </div>
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${phaseInfo.color}`}>
              {phaseInfo.label}
            </span>
          </div>

          <PhaseTimeline phase={phase} countdown={countdown} className="mb-4" />

          {countdown > 0 && (
            <p className="text-sm text-[#8b8da8]">
              Next phase in <span className="text-white font-semibold">{countdown} arc{countdown !== 1 ? 's' : ''}</span>.
              {phase === 'governing' && ' Use this time to build your party, recruit candidates, and fundraise.'}
              {phase === 'filing'    && ' File your candidacy before the campaign window opens.'}
              {phase === 'campaign'  && ' Run campaign actions to build reach across voter blocs.'}
            </p>
          )}

          {latestGoverningEvent && (
            <div className="mt-4 pt-4 border-t border-[#252637]">
              <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] mb-2">Latest from Ironvale</div>
              <p className="text-sm text-white font-medium">{latestGoverningEvent.headline}</p>
              {latestGoverningEvent.body && (
                <p className="text-xs text-[#8b8da8] mt-1 line-clamp-2">{latestGoverningEvent.body}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Locked states ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {JURISDICTIONS.filter(j => j.isLocked).map((j) => (
          <div key={j.id} className="bg-[#16172a] border border-[#252637] border-dashed rounded-xl p-4 opacity-50">
            <div className="text-sm font-semibold text-[#6b6d8a]">{j.name}</div>
            <div className="text-[11px] text-[#4a4c60] mt-1">Not yet open for political activity</div>
          </div>
        ))}
      </div>

      {/* ── Quick actions row ─────────────────────── */}
      <div className="bg-[#1c1d2e] border border-[#252637] rounded-xl p-6">
        <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] mb-4">Quick Navigation</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Go to War Room', desc: 'Take actions with your AP', section: 'warroom' as PoliticsSection },
            { label: 'Party Registry', desc: 'Manage your party & roster', section: 'party' as PoliticsSection },
            { label: 'Elections',      desc: 'View polls & projections',   section: 'elections' as PoliticsSection },
          ].map(({ label, desc, section }) => (
            <button
              key={section}
              onClick={() => onNavigate(section)}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-[#13141f] border border-[#252637] hover:border-[#e8752a]/50 hover:bg-[#20213a] transition-all text-left group"
            >
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-white">{label}</div>
                <div className="text-[11px] text-[#6b6d8a]">{desc}</div>
              </div>
              <ChevronRight size={14} className="text-[#4a4c60] group-hover:text-[#e8752a] shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ── News feed ─────────────────────────────── */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[#6b6d8a] mb-3">Arc Digest · Recent Events</div>
        <ArcDigest />
      </div>

    </div>
  );
}
