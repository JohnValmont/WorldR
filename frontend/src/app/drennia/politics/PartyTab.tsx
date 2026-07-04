'use client';
import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { politicsApi } from '@/lib/api';
import { AXES, type Axis } from '@/lib/politicsConstants';
import { PARTY_FOUNDING_COST } from '@/lib/politicsConstants';
import { partyIdentity, describeAxis, AXIS_LABELS } from './_lib/identity';
import Masthead from './_components/Masthead';
import PartyCrest from './_components/PartyCrest';

const PHASE_COPY: Record<string, string> = {
  governing: 'A council is governing. Build your party and declare early — the next election is coming.',
  filing: 'Filing is open. Lock in your candidacy and platform for the upcoming vote.',
  campaign: 'Campaign season is live. Candidacies are open and every action builds reach.',
  polling: 'Ballots are being counted right now. Candidacy reopens once results are in.',
  formation: 'A new government is forming. Candidacy reopens when the next term begins.',
};

export default function PartyTab({ overview, character, parties, onRefresh }: any) {
  const phase = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const canRunForOffice = phase !== 'polling' && phase !== 'formation';

  const myParty = parties.find((p: any) => p.members?.some((m: any) => m.character_id === character?.id));
  const isLeader = myParty && myParty.leader_character_id === character?.id;
  const isCandidate = myParty && myParty.candidates?.some((c: any) => c.character_id === character?.id);

  const [foundName, setFoundName] = useState('');
  const [foundPlatform, setFoundPlatform] = useState<Record<string, number>>({
    taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50,
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
    disabled = false,
  ) => (
    <div className="space-y-3">
      {AXES.map((axis) => (
        <div key={axis}>
          <div className="flex items-center gap-3">
            <div className="w-24 text-[11px] text-[#A79D8C] uppercase tracking-wider">{AXIS_LABELS[axis as Axis].label}</div>
            <input
              type="range" min="0" max="100"
              value={platform[axis] ?? 50}
              onChange={(e) => onChange?.(axis, parseInt(e.target.value))}
              disabled={disabled}
              className="flex-1 accent-terminal-amber"
            />
            <div className="w-8 text-right text-xs text-[#F4EBD6] font-mono">{platform[axis] ?? 50}</div>
          </div>
          <div className="ml-24 pl-3 text-[10px] text-[#8F857A]">{describeAxis(axis as Axis, platform[axis] ?? 50)}</div>
        </div>
      ))}
    </div>
  );

  const cash = Number(character?.finances?.cash_in_hand || 0);

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        overline="Party Registry"
        title="Your Party"
        subtitle="Found a movement, set its platform, and stand for the Ironvale Council."
        right={
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-[#2A2630] text-terminal-amber rounded">
            {phase}
          </span>
        }
      />

      <div className="p-3 bg-[#11131A] border border-[#2A2630] text-sm text-[#A79D8C]">
        {PHASE_COPY[phase] || 'Build your party and shape Ironvale.'}
      </div>

      {error && (
        <div className="p-3 bg-[#8F3D3D]/10 border border-[#B85555]/30 text-[#B85555] text-sm">{error}</div>
      )}

      {myParty ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-[#17151B] border-[#2A2630]">
            <div className="flex items-center gap-3 mb-4">
              <PartyCrest name={myParty.name} size={48} />
              <div className="min-w-0">
                <div className="text-xl text-[#F4EBD6] font-serif truncate">{myParty.name}</div>
                <div className="text-[11px] text-[#A79D8C] truncate">{partyIdentity(myParty.name).leader}</div>
              </div>
            </div>
            <div className="text-[#A79D8C] text-sm mb-6 space-y-1">
              <div>Treasury: <span className="text-terminal-amber font-mono">₮{Number(myParty.treasury).toLocaleString()}</span></div>
              <div>Members: <span className="text-[#F4EBD6]">{myParty.members?.length || 0}</span></div>
              <div>Role: <span className="text-[#F4EBD6]">{isLeader ? 'Leader' : 'Member'}</span></div>
            </div>
            <div className="space-y-3 pt-4 border-t border-[#2A2630]">
              {isCandidate ? (
                <div className="p-3 border border-[#4D8C6A]/30 bg-[#4D8C6A]/5 text-[#4D8C6A] text-sm text-center">
                  You are an official candidate for this party.
                </div>
              ) : canRunForOffice ? (
                <Button onClick={handleDeclareCandidacy} disabled={loading} variant="primary" fullWidth>
                  Declare Candidacy
                </Button>
              ) : (
                <div className="p-3 border border-[#2A2630] bg-[#11131A] text-[#A79D8C] text-xs text-center">
                  Candidacy reopens when the next term begins.
                </div>
              )}
              <Button onClick={handleLeaveParty} disabled={loading} variant="danger" fullWidth>Leave Party</Button>
            </div>
          </Card>

          <Card className="p-6 bg-[#11131A] border-[#2A2630]">
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Party Platform</div>
            {editPlatform ? (
              <>
                {renderPlatformSliders(editPlatform, (axis, val) => setEditPlatform((prev) => ({ ...prev!, [axis]: val })))}
                <div className="flex gap-3 mt-6">
                  <Button onClick={() => setEditPlatform(null)} variant="ghost" fullWidth>Cancel</Button>
                  <Button onClick={handleUpdatePlatform} disabled={loading} variant="primary" fullWidth>Save Platform</Button>
                </div>
                {phase === 'campaign' && (
                  <div className="mt-3 text-[11px] text-terminal-amber text-center">
                    Heads up: changing your platform mid-campaign shifts your standing with every bloc.
                  </div>
                )}
              </>
            ) : (
              <>
                {renderPlatformSliders(myParty.platform, undefined, true)}
                {isLeader && (
                  <div className="mt-6">
                    <Button onClick={() => setEditPlatform(myParty.platform)} variant="secondary" fullWidth>Edit Platform</Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 bg-[#17151B] border-[#2A2630]">
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Found a Party</div>
            <div className="mb-4">
              <label className="block text-xs text-[#A79D8C] uppercase tracking-wider mb-2">Party Name</label>
              <input
                type="text" value={foundName} onChange={(e) => setFoundName(e.target.value)}
                className="w-full bg-[#090A0F] border border-[#2A2630] text-[#F4EBD6] p-2 text-sm focus:outline-none focus:border-terminal-amber"
                placeholder="Enter party name…"
              />
            </div>
            <div className="mb-6">
              <label className="block text-xs text-[#A79D8C] uppercase tracking-wider mb-3">Initial Platform</label>
              {renderPlatformSliders(foundPlatform, (axis, val) => setFoundPlatform((prev) => ({ ...prev, [axis]: val })))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#2A2630] mb-4">
              <div className="text-sm text-[#A79D8C]">Founding Cost</div>
              <div className="text-sm font-mono text-[#B85555]">- ₮{PARTY_FOUNDING_COST.toLocaleString()}</div>
            </div>
            <Button onClick={handleFoundParty} disabled={!foundName || loading || cash < PARTY_FOUNDING_COST} variant="primary" fullWidth>
              {cash < PARTY_FOUNDING_COST ? `Need ₮${PARTY_FOUNDING_COST.toLocaleString()} to Found` : `Pay ₮${PARTY_FOUNDING_COST.toLocaleString()} to Found Party`}
            </Button>
          </Card>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Active Parties</div>
            <div className="space-y-3">
              {parties.map((p: any) => {
                const id = partyIdentity(p.name);
                return (
                  <Card key={p.id} className="p-4 bg-[#11131A] border-[#2A2630]">
                    <div className="flex items-center gap-3 mb-2">
                      <PartyCrest name={p.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[#F4EBD6] text-sm truncate">{p.name}</div>
                        <div className="text-[11px] text-[#A79D8C] truncate">{id.leader} · {p.is_npc ? 'NPC' : 'Player'} · {p.members?.length || 0} members</div>
                      </div>
                      <Button onClick={() => handleJoinParty(p.id)} disabled={loading} variant="secondary" size="sm">Join</Button>
                    </div>
                    <div className="text-[11px] text-[#8F857A] italic">“{id.motto}”</div>
                  </Card>
                );
              })}
              {parties.length === 0 && (
                <div className="text-sm text-[#A79D8C] p-4 text-center border border-dashed border-[#2A2630]">
                  No active parties in Ironvale. Found the first one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
