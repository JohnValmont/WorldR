'use client';
import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { politicsApi } from '@/lib/api';
import { PARTY_FOUNDING_COST, getRosterCap, RECRUIT_COST_CASH, AP_COST_RECRUIT } from '@/lib/politicsConstants';
import { partyIdentity } from './_lib/identity';
import Masthead from './_components/Masthead';
import PartyCrest from './_components/PartyCrest';
import PlatformPicker from './_components/PlatformPicker';
import ApBadge from './_components/ApBadge';

const PHASE_COPY: Record<string, string> = {
  governing: 'A council is governing. Build your party and recruit candidates — the next election is coming.',
  filing: 'Filing is open. Lock in your candidacy and platform for the upcoming vote.',
  campaign: 'Campaign season is live. Candidacies are open and every action builds reach.',
  polling: 'Ballots are being counted right now. Candidacy reopens once results are in.',
  formation: 'A new government is forming. Candidacy reopens when the next term begins.',
};

export default function PartyTab({ overview, character, parties, myAp, onRefresh, stateId }: any) {
  const phase = overview?.cyclePhase || overview?.cycle?.phase || 'governing';
  const canRunForOffice = phase !== 'polling' && phase !== 'formation';

  // Find the player's own party — leader_character_id match takes priority, then membership
  const myParty = parties.find((p: any) =>
    p.leader_character_id === character?.id ||
    p.members?.some((m: any) => m.character_id === character?.id && !m.is_recruited_npc)
  );
  const isLeader = myParty?.leader_character_id === character?.id;
  const isCandidate = myParty?.candidates?.some((c: any) => c.character_id === character?.id);

  const popularity = Number(myParty?.popularity || 0);
  const rosterCap = getRosterCap(popularity);
  const rosterSize = Number(myParty?.member_count || 0);
  const rosterFull = rosterSize >= rosterCap;

  const [foundName, setFoundName] = useState('');
  const [foundPlatform, setFoundPlatform] = useState<Record<string, number>>({
    taxation: 50, labour: 50, investment: 50, trade: 50, stability: 50,
  });
  const [editPlatform, setEditPlatform] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [recruitLoading, setRecruitLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const run = async (fn: () => Promise<any>, fallback: string) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await fn();
      await onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleFoundParty = () => run(() => politicsApi.foundParty({ name: foundName, platform: foundPlatform }, stateId), 'Failed to found party');
  const handleDeclareCandidacy = () => run(() => politicsApi.declareCandidacy(stateId), 'Failed to declare candidacy');
  const handleUpdatePlatform = () => {
    if (!editPlatform) return;
    return run(async () => { await politicsApi.updatePlatform(myParty.id, editPlatform); setEditPlatform(null); }, 'Failed to update platform');
  };

  const handleRecruit = async () => {
    try {
      setRecruitLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await politicsApi.recruitNpc(stateId);
      setSuccessMsg(res.message || 'NPC recruited.');
      await onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Recruit failed.');
    } finally {
      setRecruitLoading(false);
    }
  };

  const cash = Number(character?.finances?.cash_in_hand || 0);
  const stateName = overview?.activeState?.name || 'the Council';
  const currentAp = myAp?.current_ap ?? 4;
  const apCap = myAp?.ap_cap ?? 4;

  return (
    <div className="flex flex-col gap-6">
      <Masthead
        overline="Party Registry"
        title="Your Party"
        subtitle={`Found a movement, set its platform, and stand for ${stateName}.`}
        right={
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 bg-[#2A2630] text-terminal-amber rounded">
              {phase}
            </span>
            <ApBadge current={currentAp} cap={apCap} />
          </div>
        }
      />

      <div className="p-3 bg-[#11131A] border border-[#2A2630] text-sm text-[#A79D8C]">
        {PHASE_COPY[phase] || `Build your party and shape ${stateName}.`}
      </div>

      {error && (
        <div className="p-3 bg-[#8F3D3D]/10 border border-[#B85555]/30 text-[#B85555] text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-[#4D8C6A]/5 border border-[#4D8C6A]/30 text-[#4D8C6A] text-sm">{successMsg}</div>
      )}

      {myParty ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ── Party card ─────────────────────────────── */}
          <Card className="p-6 bg-[#17151B] border-[#2A2630]">
            <div className="flex items-center gap-3 mb-4">
              <PartyCrest name={myParty.name} size={48} parties={parties} />
              <div className="min-w-0">
                <div className="text-xl text-[#F4EBD6] font-serif truncate">{myParty.name}</div>
                <div className="text-[11px] text-[#A79D8C] truncate">{partyIdentity(myParty.name, parties).leader}</div>
              </div>
            </div>

            <div className="text-[#A79D8C] text-sm mb-4 space-y-1">
              <div>Treasury: <span className="text-terminal-amber font-mono">${Number(myParty.treasury).toLocaleString()}</span></div>
              <div>
                Roster:{' '}
                <span className={`font-mono ${rosterFull ? 'text-[#B85555]' : 'text-[#F4EBD6]'}`}>
                  {rosterSize} / {rosterCap}
                </span>
                {rosterFull && <span className="text-[10px] text-[#6B6358] ml-2">(raise popularity to expand)</span>}
              </div>
              <div>Popularity: <span className="text-[#F4EBD6] font-mono">{popularity}</span></div>
              <div>Role: <span className="text-[#F4EBD6]">{isLeader ? 'Leader' : 'Member'}</span></div>
            </div>

            {/* ── Candidacy ── */}
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

              {/* ── Recruit (Leader only) ── */}
              {isLeader && (
                <div>
                  <button
                    onClick={handleRecruit}
                    disabled={
                      recruitLoading ||
                      rosterFull ||
                      currentAp < AP_COST_RECRUIT ||
                      Number(myParty.treasury) < RECRUIT_COST_CASH
                    }
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 border border-[#2A2630] bg-[#11131A]
                      text-sm text-[#A79D8C] hover:border-terminal-amber/40 hover:text-[#F4EBD6] transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{recruitLoading ? 'Recruiting…' : 'Recruit NPC Candidate'}</span>
                    <div className="flex items-center gap-2 text-[11px] font-mono">
                      <span className="text-[#6B6358]">${RECRUIT_COST_CASH.toLocaleString()}</span>
                      <ApBadge current={currentAp} cap={apCap} />
                    </div>
                  </button>
                  {rosterFull && (
                    <div className="text-[10px] text-[#6B6358] mt-1 pl-1">
                      Roster cap reached. Issue a Statement or Fundraise to grow popularity.
                    </div>
                  )}
                </div>
              )}

              {/* Leaders cannot leave — dissolution is a future feature */}
              {!isLeader && (
                <div className="text-[11px] text-[#4A4550] text-center pt-2">
                  Members can only leave via the Leader's party management (coming soon).
                </div>
              )}
            </div>
          </Card>

          {/* ── Platform card ─────────────────────────── */}
          <Card className="p-6 bg-[#11131A] border-[#2A2630]">
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Party Platform</div>
            {editPlatform ? (
              <>
                <PlatformPicker
                  platform={editPlatform}
                  onChange={(axis, val) => setEditPlatform((prev) => ({ ...prev!, [axis]: val }))}
                />
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
                <PlatformPicker platform={myParty.platform} disabled />
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
          {/* ── Found a party ─────────────────────────── */}
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
              <PlatformPicker
                platform={foundPlatform}
                onChange={(axis, val) => setFoundPlatform((prev) => ({ ...prev, [axis]: val }))}
              />
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-[#2A2630] mb-4">
              <div className="text-sm text-[#A79D8C]">Founding Cost</div>
              <div className="text-sm font-mono text-[#B85555]">-${PARTY_FOUNDING_COST.toLocaleString()}</div>
            </div>
            <Button onClick={handleFoundParty} disabled={!foundName || loading || cash < PARTY_FOUNDING_COST} variant="primary" fullWidth>
              {cash < PARTY_FOUNDING_COST ? `Need $${PARTY_FOUNDING_COST.toLocaleString()} to Found` : `Pay $${PARTY_FOUNDING_COST.toLocaleString()} · Found Party`}
            </Button>
            <div className="mt-3 text-[11px] text-[#6B6358] text-center">
              You will be the permanent Leader. Players cannot join your party — only NPC recruits can.
            </div>
          </Card>

          {/* ── Active parties list (NPC and Independent only joinable) ── */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Active Parties</div>
            <div className="space-y-3">
              {parties.map((p: any) => {
                const id = partyIdentity(p.name, parties);
                // OWNERSHIP RULE: Only NPC parties (including Independent) can be joined.
                const isJoinable = !!p.is_npc;
                return (
                  <Card key={p.id} className="p-4 bg-[#11131A] border-[#2A2630]">
                    <div className="flex items-center gap-3 mb-2">
                      <PartyCrest name={p.name} size={36} parties={parties} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[#F4EBD6] text-sm truncate">{p.name}</div>
                        <div className="text-[11px] text-[#A79D8C] truncate">
                          {id.leader} · {p.is_npc ? 'NPC' : 'Player-Founded'} · {Number(p.member_count || 0)} members
                        </div>
                      </div>
                      {isJoinable ? (
                        <Button onClick={() => run(() => politicsApi.joinParty(p.id), 'Failed to join party')} disabled={loading} variant="secondary" size="sm">Join</Button>
                      ) : (
                        <span className="text-[10px] font-mono text-[#4A4550] px-2 py-1 border border-[#2A2630]">Player Party</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8F857A] italic">"{id.motto}"</div>
                  </Card>
                );
              })}
              {parties.length === 0 && (
                <div className="text-sm text-[#A79D8C] p-4 text-center border border-dashed border-[#2A2630]">
                  No active parties yet. Found the first one.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
