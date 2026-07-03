'use client';
import React from 'react';
import { POL_COUNCIL_SEATS, POL_MAJORITY_SEATS } from '@/lib/politicsConstants';

interface DivisionTallyProps {
  ayes: number;
  noes: number;
  abstain?: number;
  total?: number;
  majority?: number;
}

/**
 * DivisionTally — a seat-weighted "division of the House": ayes vs noes on a
 * single bar, with the majority threshold marked and a pass/fail verdict.
 * Gives a bill vote the feel of a chamber division rather than a raw number.
 */
export default function DivisionTally({
  ayes,
  noes,
  abstain = 0,
  total = POL_COUNCIL_SEATS,
  majority = POL_MAJORITY_SEATS,
}: DivisionTallyProps) {
  const passed = ayes >= majority;
  const pct = (n: number) => `${(total > 0 ? (n / total) * 100 : 0).toFixed(1)}%`;
  return (
    <div className="border border-[#2A2630] bg-[#11131A] rounded-sm p-4">
      <div className="flex items-center justify-between mb-2 text-[11px] font-mono uppercase tracking-[0.14em]">
        <span className="text-[#4D8C6A]">Ayes {ayes}</span>
        <span className="text-[#A79D8C]">Majority {majority}</span>
        <span className="text-[#B85555]">Noes {noes}</span>
      </div>

      <div className="relative h-3 w-full bg-[#17151B] rounded-full overflow-hidden flex">
        <div className="h-full bg-[#4D8C6A]" style={{ width: pct(ayes) }} />
        {abstain > 0 && <div className="h-full bg-[#4A4550]" style={{ width: pct(abstain) }} />}
        <div className="h-full bg-[#8A5050] ml-auto" style={{ width: pct(noes) }} />
        <div
          className="absolute top-[-3px] bottom-[-3px] w-px bg-[#F4EBD6]/70"
          style={{ left: `${(majority / total) * 100}%` }}
        />
      </div>

      <div
        className={
          'mt-3 text-center text-[11px] font-mono uppercase tracking-[0.18em] ' +
          (passed ? 'text-[#4D8C6A]' : 'text-[#B85555]')
        }
      >
        {passed ? 'Motion Carried' : 'Motion Fails'}
      </div>
    </div>
  );
}
