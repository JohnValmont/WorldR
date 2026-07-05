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
  myAp?: { current_ap: number; ap_cap: number };
  onRefresh: () => void;
}

export default function PartyScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  character,
  parties,
  myAp,
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
          myAp={myAp}
          onRefresh={onRefresh}
          stateId={selectedJurisdictionId}
        />
      )}
    </div>
  );
}
