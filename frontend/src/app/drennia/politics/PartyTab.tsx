'use client';
import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { politicsApi } from '@/lib/api';
import { PARTY_FOUNDING_COST, getRosterCap, RECRUIT_COST_CASH, AP_COST_RECRUIT } from '@/lib/politicsConstants';
import { partyIdentity } from './_lib/identity';
import { getDoctrineById } from './_lib/doctrines';
import Masthead from './_components/Masthead';
import PartyCrest from './_components/PartyCrest';
import PlatformPicker from './_components/PlatformPicker';
import PlatformBars from './_components/PlatformBars';
import DoctrineGallery from './_components/DoctrineGallery';
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

  // Founding form state
  const [foundName, setFoundName] = useState('');
  const [foundDoctrineId, setFoundDoctrineId] = useState<string | null>(null);
  const [foundTenetId, setFoundTenetId] = useState<string | null>(null);

  // Edit platform (post-founding adjustment — kept for leader use)
  const [editPlatform, setEditPlatform] = useState<Record<string, number> | null>(null);

  // Tenet management
  const [tenetLoading, setTenetLoading] = useState(false);

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

  const handleFoundParty = () => {
    if (!foundDoctrineId) {
      setError('Please select a Doctrine before founding your party.');
      return;
    }
    return run(
      () => politicsApi.foundParty({ name: foundName, doctrine_id: foundDoctrineId, tenet_id: foundTenetId }, stateId),
      'Failed to found party'
    );
  };

  const handleDeclareCandidacy = () => run(() => politicsApi.declareCandidacy(stateId), 'Failed to declare candidacy');

  const handleUpdatePlatform = () => {
    if (!editPlatform) return;
    return run(async () => { await politicsApi.updatePlatform(myParty.id, editPlatform); setEditPlatform(null); }, 'Failed to update platform');
  };

  const handleSetTenet = async (tenetId: string | null) => {
    try {
      setTenetLoading(true);
      setError('');
      await politicsApi.setTenet(myParty.id, tenetId);
      setSuccessMsg(tenetId ? 'Tenet updated.' : 'Tenet cleared.');
      await onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to update tenet.');
    } finally {
      setTenetLoading(false);
    }
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

  // Resolve doctrine info for the party
  const partyDoctrine = myParty ? getDoctrineById(myParty.doctrine_id) : null;
  const partyTenet = partyDoctrine?.tenets.find((t) => t.id === myParty?.tenet_id) ?? null;

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
        <div className="flex flex-col gap-6">
          {/* ── Top row: Party card + Doctrine card ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Party card */}
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

              {/* Candidacy + Recruit */}
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

                {isLeader && (
                  <div>
                    <button
                      onClick={handleRecruit}
                      disabled={recruitLoading || rosterFull || currentAp < AP_COST_RECRUIT || Number(myParty.treasury) < RECRUIT_COST_CASH}
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

                {!isLeader && (
                  <div className="text-[11px] text-[#4A4550] text-center pt-2">
                    Members can only leave via the Leader's party management (coming soon).
                  </div>
                )}
              </div>
            </Card>

            {/* Doctrine card */}
            <Card className="p-6 bg-[#11131A] border-[#2A2630]">
              <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Party Doctrine</div>

              {partyDoctrine ? (
                <div className="space-y-4">
                  {/* Doctrine name + blurb */}
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none mt-0.5">{partyDoctrine.glyph}</span>
                    <div>
                      <div className="text-[#F4EBD6] font-semibold text-base">{partyDoctrine.name}</div>
                      <div className="text-[11px] text-[#A79D8C] mt-0.5">{partyDoctrine.blurb}</div>
                    </div>
                  </div>

                  {/* Active tenet */}
                  <div className="p-3 rounded border border-[#2A2630] bg-[#17151B]">
                    <div className="text-[10px] uppercase tracking-wider text-[#6B6358] mb-1">Active Tenet</div>
                    {partyTenet ? (
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={[
                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                            partyTenet.type === 'intensify'
                              ? 'bg-[#3A6A8A]/20 text-[#5a9aba]'
                              : 'bg-[#4D8C6A]/20 text-[#4D8C6A]',
                          ].join(' ')}>
                            {partyTenet.type}
                          </span>
                          <span className="text-sm font-semibold text-[#F4EBD6]">{partyTenet.name}</span>
                        </div>
                        <div className="text-[10px] text-[#A79D8C]">{partyTenet.description}</div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#6B6358] italic">No tenet selected yet.</div>
                    )}
                  </div>

                  {/* Tenet picker (Leader only) */}
                  {isLeader && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-[#6B6358]">Change Tenet</div>
                      {partyDoctrine.tenets.map((tenet) => (
                        <button
                          key={tenet.id}
                          onClick={() => handleSetTenet(myParty.tenet_id === tenet.id ? null : tenet.id)}
                          disabled={tenetLoading}
                          className={[
                            'w-full text-left p-2.5 rounded border text-[11px] transition-all',
                            myParty.tenet_id === tenet.id
                              ? 'border-terminal-amber/50 bg-[#1A1810] text-[#F4EBD6]'
                              : 'border-[#2A2630] bg-[#11131A] text-[#A79D8C] hover:border-terminal-amber/30',
                          ].join(' ')}
                        >
                          <span className="font-semibold">{tenet.name}</span>
                          <span className="text-[#6B6358] ml-2">({tenet.type})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 5-bar platform readout */}
                  <div className="pt-3 border-t border-[#2A2630]">
                    <div className="text-[10px] uppercase tracking-wider text-[#6B6358] mb-3">Platform</div>
                    <PlatformBars platform={myParty.platform} />
                  </div>
                </div>
              ) : (
                /* Fallback for legacy NPC parties without doctrine_id */
                <PlatformPicker platform={myParty.platform} disabled />
              )}

              {/* Edit platform (Leader) */}
              {isLeader && (
                <div className="mt-4">
                  {editPlatform ? (
                    <>
                      <PlatformPicker
                        platform={editPlatform}
                        onChange={(axis, val) => setEditPlatform((prev) => ({ ...prev!, [axis]: val }))}
                      />
                      <div className="flex gap-3 mt-4">
                        <Button onClick={() => setEditPlatform(null)} variant="ghost" fullWidth>Cancel</Button>
                        <Button onClick={handleUpdatePlatform} disabled={loading} variant="primary" fullWidth>Save Platform</Button>
                      </div>
                    </>
                  ) : (
                    <Button onClick={() => setEditPlatform(myParty.platform)} variant="secondary" fullWidth>
                      Edit Platform (Advanced)
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* ── Found a party ─────────────────────────── */}
          <Card className="p-6 bg-[#17151B] border-[#2A2630]">
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-1">Found a Party</div>
            <p className="text-[11px] text-[#A79D8C] mb-6">
              Choose a Doctrine to set your party's identity and platform. The 5-axis platform is automatically derived from your Doctrine — you can fine-tune it after founding.
            </p>

            {/* Party name */}
            <div className="mb-6">
              <label className="block text-xs text-[#A79D8C] uppercase tracking-wider mb-2">Party Name</label>
              <input
                type="text" value={foundName} onChange={(e) => setFoundName(e.target.value)}
                className="w-full bg-[#090A0F] border border-[#2A2630] text-[#F4EBD6] p-2 text-sm focus:outline-none focus:border-terminal-amber"
                placeholder="Enter party name…"
              />
            </div>

            {/* Doctrine gallery */}
            <div className="mb-6">
              <label className="block text-xs text-[#A79D8C] uppercase tracking-wider mb-3">Choose Your Doctrine</label>
              <DoctrineGallery
                selectedDoctrineId={foundDoctrineId}
                selectedTenetId={foundTenetId}
                onSelectDoctrine={setFoundDoctrineId}
                onSelectTenet={setFoundTenetId}
              />
            </div>

            {/* Founding cost + CTA */}
            <div className="flex items-center justify-between pt-4 border-t border-[#2A2630] mb-4">
              <div className="text-sm text-[#A79D8C]">Founding Cost</div>
              <div className="text-sm font-mono text-[#B85555]">-${PARTY_FOUNDING_COST.toLocaleString()}</div>
            </div>
            <Button
              onClick={handleFoundParty}
              disabled={!foundName || !foundDoctrineId || loading || cash < PARTY_FOUNDING_COST}
              variant="primary" fullWidth
            >
              {cash < PARTY_FOUNDING_COST
                ? `Need $${PARTY_FOUNDING_COST.toLocaleString()} to Found`
                : !foundDoctrineId
                ? 'Select a Doctrine to Continue'
                : `Pay $${PARTY_FOUNDING_COST.toLocaleString()} · Found Party`}
            </Button>
            <div className="mt-3 text-[11px] text-[#6B6358] text-center">
              You will be the permanent Leader. Players cannot join your party — only NPC recruits can.
            </div>
          </Card>

          {/* ── Active parties list ─────────────────── */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-terminal-amber font-bold mb-4">Active Parties</div>
            <div className="space-y-3">
              {parties.map((p: any) => {
                const id = partyIdentity(p.name, parties);
                const doctrine = getDoctrineById(p.doctrine_id);
                const isJoinable = !!p.is_npc;
                return (
                  <Card key={p.id} className="p-4 bg-[#11131A] border-[#2A2630]">
                    <div className="flex items-center gap-3 mb-2">
                      <PartyCrest name={p.name} size={36} parties={parties} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[#F4EBD6] text-sm truncate">{p.name}</div>
                        <div className="text-[11px] text-[#A79D8C] truncate">
                          {id.leader} · {p.is_npc ? 'NPC' : 'Player-Founded'} · {Number(p.member_count || 0)} members
                          {doctrine && <span className="ml-2 text-[#6B6358]">{doctrine.glyph} {doctrine.name}</span>}
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
