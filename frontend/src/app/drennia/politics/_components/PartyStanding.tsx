'use client';
import React from 'react';
import PartyCrest from './PartyCrest';
import { partyIdentity } from '../_lib/identity';

interface PartyStandingProps {
  name: string;
  seats: number;
  totalSeats: number;
  /** Highlight the player's own party. */
  isMine?: boolean;
  /** Show the leader name under the party name. */
  showLeader?: boolean;
  color?: string;
  parties?: any[];
}

/**
 * PartyStanding — one row in a standings list: crest, name (+leader), a filled
 * share bar, and the seat count. Replaces the flat HTML table with something
 * that reads like a results board.
 */
export default function PartyStanding({
  name,
  seats,
  totalSeats,
  isMine,
  showLeader,
  color,
  parties,
}: PartyStandingProps) {
  const id = partyIdentity(name, parties);
  const accent = color || id.color;
  const pct = totalSeats > 0 ? (seats / totalSeats) * 100 : 0;
  return (
    <div
      className={
        'flex items-center gap-3 py-2.5 px-2 rounded-sm ' +
        (isMine ? 'bg-[#e8752a]/10 ring-1 ring-[#e8752a]/30' : '')
      }
    >
      <PartyCrest name={name} size={30} color={accent} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white text-sm truncate">
            {name}
            {isMine && (
              <span className="ml-2 text-[8px] font-mono uppercase tracking-widest text-[#e8752a]">
                You
              </span>
            )}
          </span>
          <span className="text-[#c4c6d8] text-sm font-mono shrink-0">
            {seats}
            <span className="text-[#6b6d8a] text-xs"> · {pct.toFixed(0)}%</span>
          </span>
        </div>
        {showLeader && (
          <div className="text-[10px] text-[#8b8da8] truncate">{id.leader}</div>
        )}
        <div className="mt-1.5 h-1.5 w-full bg-[#13141f] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
      </div>
    </div>
  );
}
