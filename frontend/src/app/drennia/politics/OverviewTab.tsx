import React from 'react';
import { Card, SectionHeading, Button } from '@/components/ui';

export default function OverviewTab({ overview, character, parties, onNavigateToParty }: any) {
  // Extract phase and countdown
  const phase = overview?.cyclePhase || 'unknown';
  const countdown = overview?.countdownToNextPhase || 0;

  // Extract ironvale states
  const activeState = overview?.activeState;
  const inactiveStates = overview?.inactiveStates || [];

  // Identify player's party
  const myParty = parties.find((p: any) => p.members?.some((m: any) => m.character_id === character?.id));

  return (
    <div className="space-y-6">
      <SectionHeading>Your Political Profile</SectionHeading>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="p-4 bg-[#17151B] border-[#2A2630]">
          <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-1">Credibility</div>
          <div className="text-xl text-[#F4EBD6] font-mono">{character?.credibility || 0}</div>
        </Card>
        <Card className="p-4 bg-[#17151B] border-[#2A2630]">
          <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-1">Charisma</div>
          <div className="text-xl text-[#F4EBD6] font-mono">{character?.charisma || 0}</div>
        </Card>
        <Card className="p-4 bg-[#17151B] border-[#2A2630]">
          <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-1">Influence</div>
          <div className="text-xl text-[#F4EBD6] font-mono">{character?.influence || 0}</div>
        </Card>
        <Card className="p-4 bg-[#17151B] border-[#2A2630]">
          <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-1">Cash (₯)</div>
          <div className="text-xl text-[#C9A24A] font-mono">
            {Number(character?.finances?.cash_in_hand || 0).toLocaleString()}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <SectionHeading>Election Cycle</SectionHeading>
          <Card className="p-6 bg-[#11131A] border-[#2A2630]">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[#A79D8C] text-sm">Current Phase</span>
              <span className="text-[#36D399] uppercase tracking-wider text-sm font-bold">{phase}</span>
            </div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[#A79D8C] text-sm">Arcs Until Next Phase</span>
              <span className="text-[#F4EBD6] font-mono">{countdown}</span>
            </div>
            
            {myParty ? (
              <div className="pt-4 border-t border-[#2A2630]">
                <div className="text-[#A79D8C] text-xs uppercase tracking-wider mb-2">Your Affiliation</div>
                <div className="text-[#F4EBD6] font-semibold mb-3">{myParty.name}</div>
                <Button onClick={onNavigateToParty} className="w-full text-xs" style={{ background: '#1E1A15', border: '1px solid #2A2630', color: '#F4EBD6' }}>View Party Dashboard</Button>
              </div>
            ) : (
              <div className="pt-4 border-t border-[#2A2630]">
                <div className="text-[#A79D8C] text-xs mb-3">You are not currently affiliated with any political party.</div>
                <Button onClick={onNavigateToParty} className="w-full text-xs" style={{ background: '#1E1A15', border: '1px solid #2A2630', color: '#F4EBD6' }}>Browse Parties</Button>
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHeading>Regional Governments</SectionHeading>
          <div className="space-y-3">
            {activeState && (
              <Card className="p-4 border-[#C9A24A]/30 bg-[#17151B]">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[#F4EBD6] font-bold">{activeState.name}</div>
                    <div className="text-[#A79D8C] text-xs mt-1">Pop: {activeState.population?.toLocaleString()} | Turnout: {(activeState.base_turnout * 100).toFixed(0)}%</div>
                  </div>
                  <div className="text-xs px-2 py-1 bg-[#36D399]/10 text-[#36D399] border border-[#36D399]/20 rounded">
                    Active
                  </div>
                </div>
              </Card>
            )}

            {inactiveStates.map((s: any) => (
              <Card key={s.id} className="p-4 border-[#2A2630] bg-[#11131A] opacity-60">
                <div className="flex justify-between items-center">
                  <div className="text-[#A79D8C] font-semibold">{s.name}</div>
                  <div className="text-[10px] uppercase tracking-wider px-2 py-1 bg-[#2A2630] text-[#6B6358] rounded">
                    Coming Soon
                  </div>
                </div>
              </Card>
            ))}

            <Card className="p-4 border-[#2A2630] bg-[#11131A] opacity-60 mt-4">
               <div className="flex justify-between items-center">
                 <div className="text-[#A79D8C] font-semibold">National Parliament & Crown</div>
                 <div className="text-[10px] uppercase tracking-wider px-2 py-1 bg-[#2A2630] text-[#6B6358] rounded">
                   Coming Soon
                 </div>
               </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
