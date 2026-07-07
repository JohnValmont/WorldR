'use client';
import React from 'react';
import { Flag, Users } from 'lucide-react';
import type { JurisdictionId } from '../_lib/session';
import { JURISDICTIONS } from '../_lib/session';

interface JurisdictionEmptyStateProps {
  jurisdictionId: JurisdictionId;
  /** Context: what the player would do if they had presence here */
  context?: 'party' | 'campaign' | 'assembly' | 'lobby' | 'elections' | 'legislature';
  onFoundParty?: () => void;
}

export default function JurisdictionEmptyState({
  jurisdictionId,
  context = 'party',
  onFoundParty,
}: JurisdictionEmptyStateProps) {
  const jur = JURISDICTIONS.find(j => j.id === jurisdictionId);
  const name = jur?.name ?? jurisdictionId;
  const isLocked = jur?.isLocked ?? true;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-[#2A2630] bg-[#11131A]">
        <div className="text-[#6B6358] text-3xl mb-4">🔒</div>
        <h3 className="font-serif text-[#F4EBD6] text-xl mb-2">{name} — Coming Soon</h3>
        <p className="text-[#A79D8C] text-sm max-w-sm">
          This jurisdiction is not yet open for political activity. Ironvale is the only active
          state in the current game build. More states will unlock as the world develops.
        </p>
      </div>
    );
  }

  const contextCopy: Record<string, { heading: string; body: string }> = {
    party: {
      heading: `No Political Presence in ${name}`,
      body: `You are not affiliated with any party in ${name}. Found a new party or join an existing one to begin your political career here.`,
    },
    campaign: {
      heading: `No Campaign Base in ${name}`,
      body: `You need to be a declared candidate in ${name} to run campaign actions here. Join or found a party, then declare candidacy.`,
    },
    assembly: {
      heading: `No Seat in the ${name} Council`,
      body: `You do not currently hold a seat in the ${name} Council. Win an election to participate in legislative sessions.`,
    },
    lobby: {
      heading: `No Party Presence in ${name}`,
      body: `You must be affiliated with a party in ${name} to access lobbying and tender operations here.`,
    },
    elections: {
      heading: `No Candidacy in ${name}`,
      body: `You have not declared candidacy in ${name}. Found or join a party and file for candidacy to track your poll standing here.`,
    },
    legislature: {
      heading: `No Seat in ${name}`,
      body: `You do not hold a council seat in ${name}. Win an election to propose and vote on legislation.`,
    },
  };

  const copy = contextCopy[context] ?? contextCopy.party;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#2A2630] bg-[#11131A]">
      <Users size={32} className="text-[#2A2630] mb-4" />
      <h3 className="font-serif text-[#F4EBD6] text-xl mb-2">{copy.heading}</h3>
      <p className="text-[#A79D8C] text-sm max-w-sm mb-6">{copy.body}</p>

      {onFoundParty && (
        <button
          onClick={onFoundParty}
          className="flex items-center gap-2 px-6 py-2 border border-[#2A2630] text-[#E4DBCA] text-xs uppercase tracking-wider hover:bg-[#2A2630] transition-colors"
        >
          <Flag size={12} />
          Found a Party in {name}
        </button>
      )}
    </div>
  );
}
