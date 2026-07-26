'use client';
import React, { useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { JURISDICTION_MODEL } from './_lib/model';
import type { PoliticsSection } from './_components/PoliticsSidebar';
import { formatGameDateShort } from '@/lib/calendar';
import { Globe, Flag } from 'lucide-react';
import { Card } from '@/components/ui';

interface Props {
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  selectedJurisdictionId: string;
  onNavigate: (s: PoliticsSection) => void;
  onRefresh: () => void;
}

export default function OverviewScreen({ overview, character, parties, selectedJurisdictionId }: Props) {
  const jid = selectedJurisdictionId;
  
  // Fetch WORLD News (global = true)
  const { data: worldLedger = [] } = useSWR(['ov-world-ledger'], () => politicsApi.getLedger(40, undefined, true).catch(() => []), { refreshInterval: 30000 });
  
  // Fetch CURRENT COUNTRY News
  const { data: nationalLedger = [] } = useSWR(['ov-national-ledger', jid], () => politicsApi.getLedger(40, jid).catch(() => []), { refreshInterval: 30000 });

  const jMeta = JURISDICTION_MODEL[jid] || JURISDICTION_MODEL.national;
  const myParty = overview?.globalParty || (Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id || p.members?.some((m: any) => m.character_id === character?.id || m.id === character?.id)) : undefined);

  const worldEvents: any[] = Array.isArray(worldLedger) ? worldLedger : [];
  const nationalEvents: any[] = Array.isArray(nationalLedger) ? nationalLedger : [];

  return (
    <div className="flex flex-col gap-4 h-full pb-6 overflow-hidden">
      {/* ── DESK HEADER ── */}
      <div className="flex justify-between items-center bg-black/40 border border-white/5 px-5 py-3 rounded-xl shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-blue-400">
              {jMeta.name}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div>
            <h1 className="text-zinc-100 text-lg m-0 font-serif font-bold leading-none flex items-center gap-2">
              {myParty ? myParty.name : 'Political Desk'}
              {myParty?.abbreviation && <span className="text-zinc-500 text-sm font-mono uppercase font-medium">[{myParty.abbreviation}]</span>}
            </h1>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
               <span className="font-mono uppercase text-blue-400">{myParty?.doctrine_id ? myParty.doctrine_id.replace(/_/g, ' ') : 'NO ACTIVE DOCTRINE'}</span>
               {myParty?.slogan && <span className="italic">— "{myParty.slogan}"</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN NEWS LAYOUT ── */}
      <div className="flex flex-col lg:flex-row gap-4 min-h-0 flex-1">
        
        {/* ── LEFT COLUMN: WORLD NEWS ── */}
        <Card 
          title="World News"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 -m-1 pr-2">
            {worldEvents.length === 0 ? (
              <div className="text-zinc-500 italic text-[13px] text-center py-10">No global events logged.</div>
            ) : (
              worldEvents.map((e: any, i: number) => (
                <div key={e.id || i} className={`px-3 py-3 flex gap-4 hover:bg-white/5 rounded transition-colors ${i < worldEvents.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div className="font-mono text-[10px] text-zinc-500 tracking-[0.1em] uppercase shrink-0 w-16 pt-0.5 text-right">
                    {e.arc != null ? formatGameDateShort(e.arc) : e.kind || ''}
                  </div>
                  <div className="flex-1">
                    <div className="text-zinc-200 text-[13px] leading-snug">
                      {e.headline || e.title || e.message || e.description || e.kind || 'Event'}
                    </div>
                    {e.state_id && (
                      <div className="text-[9px] font-mono text-zinc-600 mt-1 uppercase">Jurisdiction: {e.state_id}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* ── RIGHT COLUMN: CURRENT COUNTRY NEWS ── */}
        <Card 
          title={`${jMeta.name} National News`}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1 -m-1 pr-2">
            {nationalEvents.length === 0 ? (
              <div className="text-zinc-500 italic text-[13px] text-center py-10">No national events logged.</div>
            ) : (
              nationalEvents.map((e: any, i: number) => (
                <div key={e.id || i} className={`px-3 py-3 flex gap-4 hover:bg-white/5 rounded transition-colors ${i < nationalEvents.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <div className="font-mono text-[10px] text-zinc-500 tracking-[0.1em] uppercase shrink-0 w-16 pt-0.5 text-right">
                    {e.arc != null ? formatGameDateShort(e.arc) : e.kind || ''}
                  </div>
                  <div className="flex-1">
                    <div className="text-zinc-200 text-[13px] leading-snug">
                      {e.headline || e.title || e.message || e.description || e.kind || 'Event'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
