'use client';
import React from 'react';
import { Info } from 'lucide-react';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import JurisdictionEmptyState from './_components/JurisdictionEmptyState';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import BillsPanel from './BillsPanel';

interface LegislatureScreenProps {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
}

export default function LegislatureScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  character,
  parties,
}: LegislatureScreenProps) {
  const jurisdiction = JURISDICTIONS.find(j => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const phase = overview?.cyclePhase || overview?.cycle?.phase;
  const isGoverningPhase = phase === 'governing';

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
          {/* Legislative AP stub — placeholder for future gating mechanic */}
          <div className="flex items-center gap-2 mb-4 px-3 py-2 border border-[#2A2630] bg-[#11131A] text-[#6B6358] text-xs w-fit">
            <Info size={11} />
            <span>Legislative AP — <span className="italic">coming in a future build</span></span>
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
          />
        </>
      )}
    </div>
  );
}
