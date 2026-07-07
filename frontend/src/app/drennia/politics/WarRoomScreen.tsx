'use client';
import React from 'react';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import JurisdictionEmptyState from './_components/JurisdictionEmptyState';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import CampaignTab from './CampaignTab';
import GeneralActionsPanel from './GeneralActionsPanel';

interface WarRoomScreenProps {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp: { current_ap: number; ap_cap: number };
  onRefresh: () => void;
}

export default function WarRoomScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  character,
  parties,
  myAp,
  onRefresh,
}: WarRoomScreenProps) {
  const jurisdiction = JURISDICTIONS.find(j => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const phase = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const stateName = overview?.activeState?.name || 'Ironvale';

  const myParty = parties.find((p: any) =>
    p.leader_character_id === character?.id ||
    p.members?.some((m: any) => m.character_id === character?.id)
  );
  const isLeader = myParty?.leader_character_id === character?.id;
  const contextLabel = isLeader ? 'Party Leader' : myParty ? 'Party Member' : 'Independent';

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page hero ────────────────────────────── */}
      <div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#e8752a] font-semibold mb-2">
          {stateName} · Operations
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">War Room</h1>
        <p className="text-[#8b8da8] text-sm">
          Spend your Action Points to build influence, recruit politicians, and shape the political landscape.
        </p>
      </div>

      <JurisdictionSwitcher
        selected={selectedJurisdictionId}
        onChange={onJurisdictionChange}
        meta={jurisdictionMeta}
      />

      {/* ── General Actions ───────────────────────── */}
      <GeneralActionsPanel
        character={character}
        parties={parties}
        myAp={myAp}
        onRefresh={onRefresh}
        stateId={selectedJurisdictionId}
        contextLabel={contextLabel}
      />

      {/* ── Campaign HQ ───────────────────────────── */}
      <div className="bg-[#1c1d2e] border border-[#252637] rounded-xl p-6">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#e8752a] font-semibold mb-1">
          Campaign Headquarters
        </div>
        <p className="text-sm text-[#8b8da8] mb-6">
          Phase-specific campaign actions. Only available during the campaign window.
        </p>

        {isLocked ? (
          <JurisdictionEmptyState jurisdictionId={selectedJurisdictionId} context="campaign" />
        ) : (
          <CampaignTab
            overview={overview}
            character={character}
            parties={parties}
            onRefresh={onRefresh}
            stateId={selectedJurisdictionId}
          />
        )}
      </div>

    </div>
  );
}
