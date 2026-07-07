'use client';
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { CAMPAIGN_ACTIONS, SEGMENTS, POL_ENDORSEMENT_INFLUENCE_COST } from '@/lib/politicsConstants';
import { SEGMENT_PERSONAS } from './_lib/identity';
import Masthead from './_components/Masthead';

const ACTION_META: Record<string, { name: string; desc: string }> = {
  canvass: { name: 'Local Canvassing', desc: 'Send volunteers door-to-door in a specific bloc.' },
  rally: { name: 'Public Rally', desc: 'Host a major rally to energize a target bloc.' },
  media_ad: { name: 'Media Ad Campaign', desc: 'Run broad advertisements across all blocs.' },
  debate: { name: 'Televised Debate', desc: 'Take the state-wide stage to prove capability.' },
  endorsement: { name: 'Endorsement Drive', desc: 'Leverage personal influence for a key endorsement.' },
  fundraiser: { name: 'Fundraising Gala', desc: 'Host a gala to raise party funds.' },
};

export default function CampaignTab({ overview, character, parties, onRefresh, stateId }: any) {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const cycle = overview?.cycle;
  const isCampaignPhase = cycle?.phase === 'campaign';

  const myPartyMember = character?.partyMemberships?.find((pm: any) => pm.party?.state_id === overview?.state?.id);
  const myParty = myPartyMember ? parties.find((p: any) => p.id === myPartyMember.party_id) : null;
  const myCandidacy = myParty?.candidates?.find((c: any) => c.character_id === character?.id);

  if (!myCandidacy) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#2A2630] bg-[#11131A]">
        <h2 className="text-[#F4EBD6] font-serif text-xl mb-4">Not a Candidate</h2>
        <p className="text-[#A79D8C] max-w-md">Declare candidacy in Your Party during the Filing phase to open the War Room.</p>
      </div>
    );
  }

  const handleQueueAction = async () => {
    if (!selectedAction) return;
    const def = CAMPAIGN_ACTIONS.find((a) => a.type === selectedAction);
    if (!def) return;
    if (def.targeting === 'segment' && !selectedSegment) {
      setError('Please select a target bloc.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await politicsApi.queueCampaignAction({
        action_type: selectedAction,
        target_segment: def.targeting === 'segment' ? selectedSegment : null,
      }, stateId);
      setSuccessMsg(`“${ACTION_META[def.type]?.name || def.type}” queued for next month.`);
      setSelectedAction('');
      setSelectedSegment('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Failed to queue action');
    } finally {
      setLoading(false);
    }
  };

  const needsSegment = selectedAction && CAMPAIGN_ACTIONS.find((a) => a.type === selectedAction)?.targeting === 'segment';

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      <Masthead
        overline="Campaign Headquarters"
        title="War Room"
        subtitle={`Phase: ${cycle?.phase ?? '—'} · queue actions that resolve when the month advances.`}
        right={
          <div className="text-right">
            <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#6B6358]">Treasury</div>
            <div className="text-lg font-mono text-terminal-amber">₮{Number(myParty?.treasury || 0).toLocaleString('en-US')}</div>
            <div className="text-[10px] text-[#4D8C6A] font-mono mt-0.5">Influence {Number(character?.influence || 0).toLocaleString('en-US')}</div>
          </div>
        }
      />

      {!isCampaignPhase && (
        <div className="bg-[#1A1A10] border border-[#B0863E]/30 p-4 text-[#B0863E] text-sm">
          Campaign actions are disabled outside the Campaign phase.
        </div>
      )}
      {error && <div className="bg-[#B85555]/10 border border-[#B85555]/30 p-4 text-[#B85555]">{error}</div>}
      {successMsg && <div className="bg-[#4D8C6A]/10 border border-[#4D8C6A]/30 p-4 text-[#4D8C6A]">{successMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber font-bold border-b border-[#2A2630] pb-2">
            Choose an Operation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAMPAIGN_ACTIONS.map((action) => {
              let canAfford = true;
              if (action.gates?.uses_influence) canAfford = (character?.influence || 0) >= POL_ENDORSEMENT_INFLUENCE_COST;
              else if (action.cost_cash > 0) canAfford = (myParty?.treasury || 0) >= action.cost_cash;
              const gatedByCredibility = action.gates?.min_credibility ? (character?.credibility || 0) < action.gates.min_credibility : false;
              const disabled = !isCampaignPhase || !canAfford || gatedByCredibility;
              const meta = ACTION_META[action.type] || { name: action.type, desc: '' };

              return (
                <button
                  key={action.type}
                  onClick={() => setSelectedAction(action.type)}
                  disabled={disabled}
                  className={`p-4 text-left border transition-colors ${
                    selectedAction === action.type
                      ? 'border-terminal-amber bg-terminal-amber/10'
                      : disabled
                      ? 'border-[#2A2630] opacity-50 cursor-not-allowed bg-[#090A0F]'
                      : 'border-[#2A2630] hover:border-[#4A4550] bg-[#11131A]'
                  }`}
                >
                  <div className="font-bold text-[#F4EBD6] text-sm">{meta.name}</div>
                  <div className="text-xs text-[#A79D8C] mt-1">{meta.desc}</div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#2A2630]">
                    <span className="text-xs font-mono text-terminal-amber">
                      {action.gates?.uses_influence ? `${POL_ENDORSEMENT_INFLUENCE_COST} Influence` : action.cost_cash > 0 ? `₮${action.cost_cash.toLocaleString('en-US')}` : 'Free'}
                    </span>
                    <span className="text-xs text-[#8F9BA8]">Effort {action.effort}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {needsSegment && (
            <div className="p-4 border border-[#2A2630] bg-[#11131A]">
              <label className="block text-[11px] text-[#A79D8C] uppercase tracking-wider mb-2">Target Bloc</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEGMENTS.map((seg) => {
                  const persona = SEGMENT_PERSONAS[seg.key];
                  const active = selectedSegment === seg.key;
                  return (
                    <button
                      key={seg.key}
                      onClick={() => setSelectedSegment(seg.key)}
                      className={`p-2.5 text-left border rounded-sm transition-colors ${active ? 'border-terminal-amber bg-terminal-amber/10' : 'border-[#2A2630] hover:border-[#4A4550]'}`}
                    >
                      <div className="text-[#F4EBD6] text-xs">{persona?.nickname || seg.label}</div>
                      <div className="text-[10px] text-[#8F857A] truncate">{seg.label} · {(seg.size * 100).toFixed(0)}%</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={handleQueueAction}
            disabled={!selectedAction || loading || !isCampaignPhase}
            className="mt-2 w-full bg-terminal-amber text-black font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors uppercase text-xs tracking-widest"
          >
            {loading ? 'Queueing…' : 'Queue Campaign Action'}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber font-bold border-b border-[#2A2630] pb-2">
            Operations Room
          </h3>
          <div className="p-6 text-center border border-[#2A2630] bg-[#11131A]">
            <p className="text-[#A79D8C] text-sm">
              Queued actions resolve when the world month advances. Track your projected result on Election Night.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
