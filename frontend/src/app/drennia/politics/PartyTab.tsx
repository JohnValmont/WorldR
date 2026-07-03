import React, { useState } from 'react';
import { Card, SectionHeading, Button } from '@/components/ui';
import { politicsApi } from '@/lib/api';

const AXES = ['taxation', 'labour', 'investment', 'trade', 'stability'] as const;

const PHASE_COPY: Record<string, string> = {
  governing: 'A council is governing. Build your party and declare early — the next election is coming.',
  filing: 'Filing is open. Lock in your candidacy and platform for the upcoming vote.',
  campaign: 'Campaign season is live. Candidacies are open and every action builds reach.',
  polling: 'Ballots are being counted right now. Candidacy reopens once results are in.',
  formation: 'A new government is forming. Candidacy reopens when the next term begins.'
};

export default function PartyTab({ overview, character, parties, onRefresh }: any) {
  const phase = overview?.cyclePhase || 'governing';
  // Party organisation is ALWAYS open. Only running for office pauses while an
  // election is actively resolving (votes being counted / government forming).
  const canRunForOffice = phase !== 'polling' && phase !== 'formation';

  const myParty = parties.find((p: any) => p.members?.some((m: any) => m.character_id === character?.id));
  const isLeader = myParty && myParty.leader_character_id === character?.id;
  const isCandidate = myParty && myParty.candidates?.some((c: any) => c.character_id === character?.id);

  const [foundName, setFoundName] = useState('');
  const [foundPlatform, setFoundPlatform] = useState<Record<string, number>>({
    taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50
  });

  const [editPlatform, setEditPlatform] = useState<Record<string, number> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<any>, fallback: string) => {
    try {
      setLoading(true);
      setError('');
      await fn();
      await onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleFoundParty = () => run(() => politicsApi.foundParty({ name: foundName, platform: foundPlatform }), 'Failed to found party');
  const handleJoinParty = (id: string) => run(() => politicsApi.joinParty(id), 'Failed to join party');
  const handleLeaveParty = () => run(() => politicsApi.leaveParty(myParty.id), 'Failed to leave party');
  const handleDeclareCandidacy = () => run(() => politicsApi.declareCandidacy(), 'Failed to declare candidacy');
  const handleUpdatePlatform = () => {
    if (!editPlatform) return;
    return run(async () => { await politicsApi.updatePlatform(myParty.id, editPlatform); setEditPlatform(null); }, 'Failed to update platform');
  };

  const renderPlatformSliders = (
    platform: Record<string, number>,
    onChange?: (axis: string, val: number) => void,
    disabled = false
  ) => (
    <div className="space-y-3">
      {AXES.map(axis => (
        <div key={axis} className="flex items-center space-x-4">
          <div className="w-24 text-xs text-[#A79D8C] uppercase tracking-wider">{axis}</div>
          <input
            type="range"
            min="0" max="100"
            value={platform[axis] || 50}
            onChange={e => onChange?.(axis, parseInt(e.target.value))}
            disabled={disabled}
            className="flex-1 accent-[#C9A24A]"
          />
          <div className="w-8 text-right text-xs text-[#F4EBD6] font-mono">{platform[axis] || 50}</div>
        </div>
      ))}
    </div>
  );

  const cash = Number(character?.finances?.cash_in_hand || 0);

  return (
    <div className="space-y-6">
      {/* Election status — informative, never a blocker */}
      <div className="p-4 bg-[#11131A] border border-[#2A2630] text-sm flex items-start gap-3">
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-[#2A2630] text-[#C9A24A] rounded shrink-0">{phase}</span>
        <span className="text-[#A79D8C]">{PHASE_COPY[phase] || 'Build your party and shape Ironvale.'}</span>
      </div>

      {error && (
        <div className="p-3 bg-[#8F3D3D]/10 border border-[#B85555]/30 text-[#B85555] text-sm">
          {error}
        </div>
      )}

      {myParty ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionHeading>Your Party</SectionHeading>
            <Card className="p-6 bg-[#17151B] border-[#2A2630]">
              <div className="text-2xl text-[#F4EBD6] font-serif mb-2">{myParty.name}</div>
              <div className="text-[#A79D8C] text-sm mb-6">
                Treasury: <span className="text-[#C9A24A] font-mono">₹{Number(myParty.treasury).toLocaleString()}</span><br/>
                Members: <span className="text-[#F4EBD6]">{myParty.members?.length || 0}</span><br/>
                Role: <span className="text-[#F4EBD6]">{isLeader ? 'Leader' : 'Member'}</span>
              </div>

              <div className="space-y-3 pt-4 border-t border-[#2A2630]">
                {isCandidate ? (
                  <div className="p-3 border border-[#36D399]/30 bg-[#36D399]/5 text-[#36D399] text-sm text-center">
                    You are an official candidate for this party.
                  </div>
                ) : canRunForOffice ? (
                  <Button
                    onClick={handleDeclareCandidacy}
                    disabled={loading}
                    className="w-full bg-[#36D399] text-[#090A0F] hover:bg-[#36D399]/80 disabled:bg-[#2A2630] disabled:text-[#6B6358] border-none"
                  >
                    Declare Candidacy
                  </Button>
                ) : (
                  <div className="p-3 border border-[#2A2630] bg-[#11131A] text-[#A79D8C] text-xs text-center">
                    Candidacy reopens when the next term begins.
                  </div>
                )}

                <Button
                  onClick={handleLeaveParty}
                  disabled={loading}
                  className="w-full bg-transparent border-[#8F3D3D] text-[#8F3D3D] hover:bg-[#8F3D3D]/10 mt-2"
                >
                  Leave Party
                </Button>
              </div>
            </Card>
          </div>

          <div>
            <SectionHeading>Party Platform</SectionHeading>
            <Card className="p-6 bg-[#11131A] border-[#2A2630]">
              {editPlatform ? (
                <>
                  {renderPlatformSliders(editPlatform, (axis, val) => setEditPlatform(prev => ({ ...prev!, [axis]: val })))}
                  <div className="flex space-x-3 mt-6">
                    <Button onClick={() => setEditPlatform(null)} className="flex-1 bg-transparent border-[#2A2630] text-[#A79D8C]">Cancel</Button>
                    <Button onClick={handleUpdatePlatform} disabled={loading} className="flex-1" style={{ background: '#1E1A15', border: '1px solid #2A2630', color: '#F4EBD6' }}>Save Platform</Button>
                  </div>
                  {phase === 'campaign' && (
                    <div className="mt-3 text-[11px] text-[#C9A24A] text-center">Heads up: changing your platform mid-campaign shifts your standing with every segment.</div>
                  )}
                </>
              ) : (
                <>
                  {renderPlatformSliders(myParty.platform, undefined, true)}
                  {isLeader && (
                    <div className="mt-6">
                      <Button onClick={() => setEditPlatform(myParty.platform)} className="w-full border border-[#C9A24A] text-[#C9A24A] bg-transparent hover:bg-[#C9A24A]/10">
                        Edit Platform
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionHeading>Found a Party</SectionHeading>
            <Card className="p-6 bg-[#17151B] border-[#2A2630]">
              <div className="mb-4">
                <label className="block text-xs text-[#A79D8C] uppercase tracking-wider mb-2">Party Name</label>
                <input
                  type="text"
                  value={foundName}
                  onChange={e => setFoundName(e.target.value)}
                  className="w-full bg-[#090A0F] border border-[#2A2630] text-[#F4EBD6] p-2 text-sm focus:outline-none focus:border-[#C9A24A]"
                  placeholder="Enter party name..."
                />
              </div>
              <div className="mb-6">
                <label className="block text-xs text-[#A79D8C] uppercase tracking-wider mb-3">Initial Platform</label>
                {renderPlatformSliders(foundPlatform, (axis, val) => setFoundPlatform(prev => ({ ...prev, [axis]: val })))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#2A2630] mb-4">
                <div className="text-sm text-[#A79D8C]">Founding Cost</div>
                <div className="text-sm font-mono text-[#B85555]">- ₹25,000</div>
              </div>

              <Button
                onClick={handleFoundParty}
                disabled={!foundName || loading || cash < 25000}
                className="w-full"
                style={{ background: '#1E1A15', border: '1px solid #2A2630', color: '#F4EBD6' }}
              >
                {cash < 25000 ? 'Need ₹25,000 to Found' : 'Pay ₹25,000 to Found Party'}
              </Button>
            </Card>
          </div>

          <div>
            <SectionHeading>Active Parties</SectionHeading>
            <div className="space-y-4">
              {parties.map((p: any) => (
                <Card key={p.id} className="p-4 bg-[#11131A] border-[#2A2630]">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[#F4EBD6] font-semibold">{p.name}</div>
                      <div className="text-xs text-[#A79D8C] mt-1">
                        {p.is_npc ? 'NPC Party' : 'Player Party'} | Members: {p.members?.length || 0}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinParty(p.id)}
                      disabled={loading}
                      className="text-xs py-1 px-3 bg-transparent border-[#C9A24A] text-[#C9A24A] hover:bg-[#C9A24A]/10"
                    >
                      Join
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {AXES.map(axis => (
                      <div key={axis} className="text-[10px] px-1.5 py-0.5 bg-[#17151B] border border-[#2A2630] text-[#A79D8C] rounded">
                        {axis.substring(0,3).toUpperCase()}: {p.platform[axis]}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
              {parties.length === 0 && (
                <div className="text-sm text-[#A79D8C] p-4 text-center border border-dashed border-[#2A2630]">
                  No active parties found in Ironvale. Found the first one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
