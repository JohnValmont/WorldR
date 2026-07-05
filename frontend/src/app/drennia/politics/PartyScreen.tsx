'use client';
import React from 'react';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import JurisdictionEmptyState from './_components/JurisdictionEmptyState';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import PartyTab from './PartyTab';

interface PartyScreenProps {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  onRefresh: () => void;
}

export default function PartyScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  character,
  parties,
  onRefresh,
}: PartyScreenProps) {
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
        <JurisdictionEmptyState jurisdictionId={selectedJurisdictionId} context="party" />
      ) : (
        <PartyTab
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
