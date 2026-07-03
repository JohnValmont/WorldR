import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import { CAMPAIGN_ACTIONS, SEGMENTS, POL_ENDORSEMENT_INFLUENCE_COST } from '@/lib/politicsConstants';

export default function CampaignTab({ overview, character, parties, onRefresh }: any) {
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
        <p className="text-[#A79D8C] max-w-md">Declare candidacy in the Party tab during the Filing phase to access the Campaign desk.</p>
      </div>
    );
  }

  const handleQueueAction = async () => {
    if (!selectedAction) return;
    const def = CAMPAIGN_ACTIONS.find(a => a.type === selectedAction);
    if (!def) return;
    if (def.targeting === 'segment' && !selectedSegment) {
      setError('Please select a target segment.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await politicsApi.queueCampaignAction({
        action_type: selectedAction,
        target_segment: def.targeting === 'segment' ? selectedSegment : null
      });
      const actionMetadata: Record<string, { name: string }> = {
        'canvass': { name: 'Local Canvassing' },
        'rally': { name: 'Public Rally' },
        'media_ad': { name: 'Media Ad Campaign' },
        'debate': { name: 'Televised Debate' },
        'endorsement': { name: 'Endorsement Drive' },
        'fundraiser': { name: 'Fundraising Gala' }
      };
      setSuccessMsg(`Action "${actionMetadata[def.type]?.name || def.type}" queued for next month.`);
      setSelectedAction('');
      setSelectedSegment('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to queue action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-slide-in">
      <div className="flex justify-between items-end border-b border-[#2A2630] pb-4">
        <div>
          <h2 className="text-xl font-serif text-[#F4EBD6]">Campaign Headquarters</h2>
          <p className="text-sm text-[#A79D8C]">Current Phase: <span className="text-[#E6D5B8] uppercase">{cycle?.phase}</span></p>
        </div>
        <div className="text-right">
          <p className="text-sm text-[#A79D8C]">Party Treasury</p>
          <p className="text-lg font-mono text-[#D4AF37]">₯ {Number(myParty?.treasury || 0).toLocaleString()}</p>
          <p className="text-sm text-[#A79D8C] mt-1">Your Influence</p>
          <p className="text-md font-mono text-[#4C8C4A]">{Number(character?.influence || 0).toLocaleString()}</p>
        </div>
      </div>

      {!isCampaignPhase && (
        <div className="bg-[#1A1A10] border border-[#3D3D29] p-4 text-[#D4AF37]">
          Campaign actions are disabled outside of the Campaign phase.
        </div>
      )}

      {error && <div className="bg-[#B85555]/10 border border-[#B85555]/30 p-4 text-[#B85555]">{error}</div>}
      {successMsg && <div className="bg-[#4C8C4A]/10 border border-[#4C8C4A]/30 p-4 text-[#4C8C4A]">{successMsg}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <h3 className="text-[#F4EBD6] font-serif border-b border-[#2A2630] pb-2">Issue Directive</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CAMPAIGN_ACTIONS.map(action => {
              let canAfford = true;
              if (action.gates?.uses_influence) {
                canAfford = (character?.influence || 0) >= POL_ENDORSEMENT_INFLUENCE_COST;
              } else if (action.cost_cash > 0) {
                canAfford = (myParty?.treasury || 0) >= action.cost_cash;
              }

              let gatedByCredibility = false;
              if (action.gates?.min_credibility) {
                gatedByCredibility = (character?.credibility || 0) < action.gates.min_credibility;
              }

              const disabled = !isCampaignPhase || !canAfford || gatedByCredibility;

              const actionMetadata: Record<string, { name: string, desc: string }> = {
                'canvass': { name: 'Local Canvassing', desc: 'Send volunteers door-to-door in a specific segment.' },
                'rally': { name: 'Public Rally', desc: 'Host a major rally to energize a target segment.' },
                'media_ad': { name: 'Media Ad Campaign', desc: 'Run broad advertisements across all segments.' },
                'debate': { name: 'Televised Debate', desc: 'Participate in a state-wide debate to prove capability.' },
                'endorsement': { name: 'Endorsement Drive', desc: 'Leverage personal influence for a key endorsement.' },
                'fundraiser': { name: 'Fundraising Gala', desc: 'Host a gala to raise party funds.' }
              };
              const meta = actionMetadata[action.type] || { name: action.type, desc: '' };

              return (
                <button
                  key={action.type}
                  onClick={() => setSelectedAction(action.type)}
                  disabled={disabled}
                  className={`p-4 text-left border transition-colors ${
                    selectedAction === action.type 
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                      : disabled 
                        ? 'border-[#2A2630] opacity-50 cursor-not-allowed bg-[#090A0F]' 
                        : 'border-[#2A2630] hover:border-[#4A4550] bg-[#11131A]'
                  }`}
                >
                  <div className="font-bold text-[#F4EBD6]">{meta.name}</div>
                  <div className="text-xs text-[#A79D8C] mt-1">{meta.desc}</div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#2A2630]">
                    <span className="text-xs font-mono text-[#D4AF37]">
                      {action.gates?.uses_influence ? `${POL_ENDORSEMENT_INFLUENCE_COST} Influence` : action.cost_cash > 0 ? `₯${action.cost_cash.toLocaleString()}` : 'Free'}
                    </span>
                    <span className="text-xs text-[#8F9BA8]">Effort: {action.effort}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedAction && CAMPAIGN_ACTIONS.find(a => a.type === selectedAction)?.targeting === 'segment' && (
            <div className="mt-4 p-4 border border-[#2A2630] bg-[#11131A]">
              <label className="block text-sm text-[#A79D8C] mb-2">Target Segment</label>
              <select
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
                className="w-full bg-[#090A0F] border border-[#2A2630] text-[#F4EBD6] p-2 focus:border-[#D4AF37] outline-none"
              >
                <option value="">-- Select Segment --</option>
                {SEGMENTS.map(seg => (
                  <option key={seg.key} value={seg.key}>{seg.label}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleQueueAction}
            disabled={!selectedAction || loading || !isCampaignPhase}
            className="mt-4 w-full bg-[#D4AF37] text-black font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E6D5B8] transition-colors"
          >
            {loading ? 'Queueing...' : 'Queue Campaign Action'}
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="text-[#F4EBD6] font-serif border-b border-[#2A2630] pb-2">Active Campaign Operations</h3>
          <div className="p-6 text-center border border-[#2A2630] bg-[#11131A]">
             <p className="text-[#A79D8C]">Pending actions will resolve when the world month advances. Check the Polls tab to see projected election results.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
