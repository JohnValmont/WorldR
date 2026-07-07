'use client';
import React from 'react';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import JurisdictionEmptyState from './_components/JurisdictionEmptyState';
import ApBadge from './_components/ApBadge';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import BillsPanel from './BillsPanel';

interface LegislatureScreenProps {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  onRefresh?: () => void;
}

export default function LegislatureScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  character,
  parties,
  myAp,
}: LegislatureScreenProps) {
  const jurisdiction = JURISDICTIONS.find(j => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const phase = overview?.cyclePhase || overview?.cycle?.phase;
  const isGoverningPhase = phase === 'governing';

  const currentAp = myAp?.current_ap ?? 4;
  const apCap = myAp?.ap_cap ?? 4;

  return (
    <div>
      <JurisdictionSwitcher
        selected={selectedJurisdictionId}
        onChange={onJurisdictionChange}
        meta={jurisdictionMeta}
      />

      {isLocked ? (
        <JurisdictionEmptyState jurisdictionId={selectedJurisdictionId} context="legislature" />
      ) : (
        <>
          {/* ── Live AP display — replaces "coming in a future build" stub ── */}
          <div className="flex items-center justify-between gap-4 mb-4 px-3 py-2.5 border border-[#2A2630] bg-[#11131A]">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#6B6358]">
              Legislative Action Points
            </div>
            <ApBadge current={currentAp} cap={apCap} size="sm" />
          </div>

          {!isGoverningPhase && (
            <div className="mb-4 p-3 border border-[#2A2630] bg-[#11131A] text-[#6B6358] text-xs uppercase tracking-wider text-center">
              Legislature is frozen outside the Governing phase
            </div>
          )}

          <BillsPanel
            overview={overview}
            character={character}
            parties={parties}
            stateId={selectedJurisdictionId}
            myAp={myAp}
          />
        </>
      )}
    </div>
  );
}
