import React, { useEffect, useState } from 'react';
import { politicsApi } from '@/lib/api';
import { formatGameDate } from '@/lib/calendar';

/**
 * ArcDigest — the "while you were away" return trigger.
 * Pulls recent pol_ledger_events and renders them in newspaper voice so the
 * player always has something new to see when they open the desk — the core
 * pull that keeps an async political sim sticky between elections.
 */

const KIND_ACCENT: Record<string, string> = {
  election_results: '#C9A24A',
  government_formed: '#36D399',
  bill_passed: '#558CB8',
  bill_failed: '#B85555',
  tender_awarded: '#8A55B8',
  // governing phase world events
  gov_industrial_dispute: '#8F7A5A',
  gov_tax_pressure:       '#8F7A5A',
  gov_civic_approval:     '#4D8C6A',
  gov_procurement_surplus:'#4A6D8C',
  gov_corruption_whisper: '#B85555',
  gov_investment_uptick:  '#4D8C6A',
  gov_opposition_rally:   '#8F7A5A',
};

const KIND_LABEL: Record<string, string> = {
  election_results: 'ELECTION',
  government_formed: 'GOVERNMENT',
  bill_passed: 'COUNCIL',
  bill_failed: 'COUNCIL',
  tender_awarded: 'PROCUREMENT',
  // governing phase world events
  gov_industrial_dispute:  'LABOUR',
  gov_tax_pressure:        'ECONOMY',
  gov_civic_approval:      'SOCIETY',
  gov_procurement_surplus: 'TREASURY',
  gov_corruption_whisper:  'PRESS',
  gov_investment_uptick:   'ECONOMY',
  gov_opposition_rally:    'POLITICS',
};

export default function ArcDigest() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    politicsApi
      .getLedger(8)
      .then((data: any) => {
        if (alive) setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  if (loading) {
    return <div className="text-[#6B6558] text-sm px-1 py-4">Fetching the Ironvale Ledger…</div>;
  }

  if (!events.length) {
    return (
      <div className="border border-dashed border-[#2A2630] bg-[#11131A] p-6 text-center">
        <div className="text-[#A79D8C] text-sm">The Ledger is quiet. Make some history.</div>
      </div>
    );
  }

  return (
    <div className="border border-[#2A2630] bg-[#11131A]">
      <div className="px-4 py-3 border-b border-[#2A2630] flex items-center justify-between">
        <span className="font-serif text-[#F4EBD6] text-lg">The Ironvale Ledger</span>
        <span className="text-[#6B6558] text-xs uppercase tracking-wider">while you were away</span>
      </div>
      <div className="divide-y divide-[#2A2630]">
        {events.map((e) => {
          const accent = KIND_ACCENT[e.kind] || '#6B6558';
          return (
            <div key={e.id} className="px-4 py-3 flex gap-3">
              <div className="shrink-0 pt-1">
                <span
                  className="text-[10px] font-mono px-1.5 py-0.5 border"
                  style={{ color: accent, borderColor: `${accent}66` }}
                >
                  {KIND_LABEL[e.kind] || 'NEWS'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-[#E6D5B8] text-sm font-serif">{e.headline}</div>
                {e.body && <div className="text-[#A79D8C] text-xs mt-0.5 line-clamp-2">{e.body}</div>}
                <div className="text-[#6B6558] text-[10px] mt-1 uppercase tracking-wider">{formatGameDate(e.month)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
