'use client';
import React from 'react';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import JurisdictionEmptyState from './_components/JurisdictionEmptyState';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import PollsTab from './PollsTab';

interface ElectionsScreenProps {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  parties: any[];
}

export default function ElectionsScreen({
  selectedJurisdictionId,
  onJurisdictionChange,
  jurisdictionMeta,
  overview,
  parties,
}: ElectionsScreenProps) {
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
        <JurisdictionEmptyState jurisdictionId={selectedJurisdictionId} context="elections" />
      ) : (
        <PollsTab overview={overview} parties={parties} stateId={selectedJurisdictionId} />
      )}
    </div>
  );
}
