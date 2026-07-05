'use client';
import React from 'react';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import JurisdictionEmptyState from './_components/JurisdictionEmptyState';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import CampaignTab from './CampaignTab';

interface WarRoomScreenProps {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  onRefresh: () => void;
}

export default function WarRoomScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  character,
  parties,
  onRefresh,
}: WarRoomScreenProps) {
  const jurisdiction = JURISDICTIONS.find(j => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;

  return (
    <div>
      <JurisdictionSwitcher
        selected={selectedJurisdictionId}
        onChange={onJurisdictionChange}
        meta={jurisdictionMeta}
      />
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
  );
}
