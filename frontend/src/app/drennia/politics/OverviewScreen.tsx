'use client';
import React from 'react';
import { Coins, MessageSquare, Award, BookOpen, Zap } from 'lucide-react';
import PhaseTimeline from './_components/PhaseTimeline';
import ApBadge from './_components/ApBadge';
import ArcDigest from './ArcDigest';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { JURISDICTIONS } from './_lib/session';

const STAT_COLOR: Record<string, string> = {
  filing:    'bg-[#C9A24A]/20 text-[#C9A24A] border-[#C9A24A]/30',
  campaign:  'bg-[#558CB8]/20 text-[#558CB8] border-[#558CB8]/30',
  polling:   'bg-[#7A5C86]/20 text-[#7A5C86] border-[#7A5C86]/30',
  formation: 'bg-[#4D8C6A]/20 text-[#4D8C6A] border-[#4D8C6A]/30',
  governing: 'bg-[#4D705C]/20 text-[#4D705C] border-[#4D705C]/30',
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
  const inactiveStates: any[] = overview?.inactiveStates || [];

  // Personal stats from character
  const credibility = character?.credibility ?? 0;
  const charisma    = character?.charisma    ?? 0;
  const influence   = character?.influence   ?? 0;
  const cash        = character?.finances?.cash_in_hand ?? character?.cash_in_hand ?? null;

  return (
    <div className="flex flex-col gap-8 animate-slide-in">

      {/* ── Personal Stats ─────────────────────────── */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-3">
          Your Political Profile
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Credibility', value: credibility, icon: Award,        suffix: '' },
            { label: 'Charisma',    value: charisma,    icon: MessageSquare, suffix: '' },
            { label: 'Influence',   value: influence,   icon: BookOpen,      suffix: '' },
            { label: 'Personal Cash', value: cash != null ? `$${Number(cash).toLocaleString()}` : '—', icon: Coins, suffix: '' },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="border border-[#2A2630] bg-[#11131A] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={12} className="text-[#6B6358]" />
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#6B6358]">{label}</div>
              </div>
              <div className="text-xl font-serif text-[#F4EBD6]">{typeof value === 'number' ? value : value}</div>
            </div>
          ))}
          {/* AP card */}
          {myAp && (
            <div className="border border-[#2A2630] bg-[#11131A] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} className="text-[#6B6358]" />
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#6B6358]">Action Points</div>
              </div>
              <ApBadge current={myAp.current_ap} cap={myAp.ap_cap} size="lg" />
            </div>
          )}
        </div>
      </div>

      {/* ── State Snapshot Cards ───────────────────── */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-3">
          State Snapshots
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Active state */}
          {activeState && (
            <div className="border border-[#2A2630] bg-[#11131A] p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="font-serif text-[#F4EBD6]">{activeState.name}</div>
                <span className={`px-2 py-0.5 text-[9px] font-mono uppercase border ${STAT_COLOR[phase] || STAT_COLOR.governing}`}>
                  {phase}
                </span>
              </div>
              <PhaseTimeline phase={phase} countdown={countdown} className="mb-3" />
              {latestGoverningEvent && (
                <p className="text-xs text-[#A79D8C] line-clamp-2 mt-2 italic">
                  &ldquo;{latestGoverningEvent.headline}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Locked/inactive states */}
          {JURISDICTIONS.filter(j => j.isLocked).map((j) => (
            <div key={j.id} className="border border-dashed border-[#2A2630] bg-[#0D0F14] p-5 opacity-50">
              <div className="flex items-center justify-between mb-2">
                <div className="font-serif text-[#6B6358]">{j.name}</div>
                <span className="px-2 py-0.5 text-[9px] font-mono uppercase border border-[#2A2630] text-[#3A3630]">
                  Coming Soon
                </span>
              </div>
              <div className="text-xs text-[#4A4540] mt-3">
                This state has not yet opened for political activity.
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Movements Feed ──────────────────── */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-3">
          Recent Movements
        </div>
        <ArcDigest />
      </div>
    </div>
  );
}
