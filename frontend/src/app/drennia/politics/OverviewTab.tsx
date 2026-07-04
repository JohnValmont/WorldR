'use client';
import React from 'react';
import { Card, Button } from '@/components/ui';
import { ScrollText, Landmark, Users } from 'lucide-react';
import { SEGMENTS } from '@/lib/politicsConstants';
import { POL_ACTIVE_STATE_NAME } from './_lib/session';
import { partyIdentity } from './_lib/identity';
import Masthead from './_components/Masthead';
import PhaseTimeline from './_components/PhaseTimeline';
import PersonaCard from './_components/PersonaCard';
import PartyCrest from './_components/PartyCrest';
import ArcDigest from './ArcDigest';

const FACTORS = [
  { key: 'credibility', label: 'Credibility' },
  { key: 'charisma', label: 'Charisma' },
  { key: 'influence', label: 'Influence' },
];

export default function OverviewTab({ overview, character, parties, onNavigateToParty }: any) {
  const phase = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const countdown = overview?.countdownToNextPhase || 0;
  const activeState = overview?.activeState;
  const inactiveStates = overview?.inactiveStates || [];

  const myParty = parties.find((p: any) => p.members?.some((m: any) => m.character_id === character?.id));
  const monthWord = countdown === 1 ? 'month' : 'months';

  const action = (() => {
    switch (phase) {
      case 'filing':
        return { tone: '#B0863E', title: 'Filing is Open', detail: `Found or join a party and declare candidacy — filing closes in ${countdown} ${monthWord}.` };
      case 'campaign':
        return { tone: '#B0863E', title: 'The Campaign is Live', detail: `Every month of reach counts. Queue actions in the War Room — polling in ${countdown} ${monthWord}.` };
      case 'polling':
        return { tone: '#4D8C6A', title: 'Ballots Are Being Counted', detail: 'Results are imminent. Watch Election Night for the final split.' };
      case 'formation':
        return { tone: '#B0863E', title: 'Government Formation', detail: `Coalitions are being brokered — ${countdown} ${monthWord} to form a majority bloc.` };
      case 'governing':
        return myParty
          ? { tone: '#4A6178', title: 'The Floor is Yours', detail: `Propose bills and procurement tenders to reward your base. Next filing in ${countdown} ${monthWord}.` }
          : { tone: '#8F9BA8', title: 'Build Your Base', detail: `Lobby, donate, and grow Influence before the next race. Filing opens in ${countdown} ${monthWord}.` };
      default:
        return { tone: '#8F9BA8', title: 'The Council Awaits', detail: 'Enter Ironvale politics through Your Party.' };
    }
  })();

  const cash = Number(character?.finances?.cash_in_hand || 0);

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        overline={`${POL_ACTIVE_STATE_NAME} State Council`}
        title="The Session"
        subtitle="Drennia's industrial heart — where the factory floor and the boardroom contest the Council."
        right={
          activeState ? (
            <div className="text-right">
              <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#6B6358]">Electorate</div>
              <div className="text-sm font-mono text-[#A79D8C]">
                {activeState.population?.toLocaleString()} · {(activeState.base_turnout * 100).toFixed(0)}% turnout
              </div>
            </div>
          ) : null
        }
      />

      <Card className="p-5 bg-[#11131A] border-[#2A2630]">
        <PhaseTimeline phase={phase} countdown={countdown} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div
            className="p-4 border-l-4"
            style={{ borderLeftColor: action.tone, background: `${action.tone}14`, borderTop: '1px solid #2A2630', borderRight: '1px solid #2A2630', borderBottom: '1px solid #2A2630' }}
          >
            <div className="font-serif tracking-wide text-lg" style={{ color: action.tone }}>{action.title}</div>
            <div className="text-[#A79D8C] text-sm mt-1">{action.detail}</div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FACTORS.map((f) => (
              <Card key={f.key} className="p-4 bg-[#17151B] border-[#2A2630]">
                <div className="text-[#A79D8C] text-[10px] uppercase tracking-wider mb-1">{f.label}</div>
                <div className="text-xl text-[#F4EBD6] font-mono">{character?.[f.key] || 0}</div>
              </Card>
            ))}
            <Card className="p-4 bg-[#17151B] border-[#2A2630]">
              <div className="text-[#A79D8C] text-[10px] uppercase tracking-wider mb-1">Cash (₮)</div>
              <div className="text-xl text-terminal-amber font-mono">{cash.toLocaleString()}</div>
            </Card>
          </div>
        </div>

        <Card className="p-5 bg-[#11131A] border-[#2A2630]">
          <div className="text-[10px] uppercase tracking-widest text-[#A79D8C] mb-3">Your Affiliation</div>
          {myParty ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <PartyCrest name={myParty.name} size={40} parties={parties} />
                <div className="min-w-0">
                  <div className="text-[#F4EBD6] font-semibold truncate">{myParty.name}</div>
                  <div className="text-[11px] text-[#A79D8C] truncate">{partyIdentity(myParty.name, parties).leader}</div>
                </div>
              </div>
              <Button onClick={onNavigateToParty} fullWidth className="text-xs">Open Your Party</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-[#A79D8C] text-xs">You are not affiliated with any party in Ironvale.</div>
              <Button onClick={onNavigateToParty} fullWidth variant="primary" className="text-xs">Browse Parties</Button>
            </div>
          )}
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Landmark size={13} className="text-terminal-amber" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber font-bold">Parties in the Field</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {parties.map((p: any) => {
            const id = partyIdentity(p.name, parties);
            return (
              <Card key={p.id} className="p-4 bg-[#11131A] border-[#2A2630]">
                <div className="flex items-center gap-3">
                  <PartyCrest name={p.name} parties={parties} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[#F4EBD6] text-sm truncate">{p.name}</div>
                    <div className="text-[11px] text-[#A79D8C] truncate">{id.leader}</div>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#6B6358] shrink-0">
                    {p.is_npc ? 'NPC' : 'Player'}
                  </span>
                </div>
                <div className="text-[11px] text-[#8F857A] italic mt-2 truncate">“{id.motto}”</div>
              </Card>
            );
          })}
          {parties.length === 0 && (
            <div className="text-sm text-[#A79D8C] p-4 text-center border border-dashed border-[#2A2630]">
              No parties have formed in Ironvale yet.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={13} className="text-terminal-amber" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber font-bold">The Electorate</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SEGMENTS.map((seg) => (
            <PersonaCard key={seg.key} segmentKey={seg.key} label={seg.label} size={seg.size} />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <ScrollText size={13} className="text-terminal-amber" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber font-bold">Recent Movements</span>
        </div>
        <ArcDigest />
      </div>

      {inactiveStates.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {inactiveStates.map((s: any) => (
            <Card key={s.id} className="p-4 border-[#2A2630] bg-[#11131A] opacity-60">
              <div className="flex justify-between items-center">
                <div className="text-[#A79D8C] font-semibold text-sm">{s.name}</div>
                <div className="text-[9px] uppercase tracking-wider px-2 py-1 bg-[#2A2630] text-[#6B6358] rounded">Coming Soon</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
