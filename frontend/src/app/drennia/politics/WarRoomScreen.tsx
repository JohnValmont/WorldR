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

  return (
    <div className="flex flex-col gap-8">
      <JurisdictionSwitcher
        selected={selectedJurisdictionId}
        onChange={onJurisdictionChange}
        meta={jurisdictionMeta}
      />

      {/* ── General Actions — available regardless of phase or locked state ── */}
      <GeneralActionsPanel
        character={character}
        parties={parties}
        myAp={myAp}
        onRefresh={onRefresh}
        stateId={selectedJurisdictionId}
      />

      {/* ── Campaign HQ — phase-gated, jurisdiction-gated ── */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-terminal-amber mb-4 border-b border-[#2A2630] pb-2">
          Campaign Headquarters
        </div>
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
