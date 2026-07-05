'use client';
import React, { useState } from 'react';
import { politicsApi } from '@/lib/api';
import {
  AP_COST_STATEMENT,
  AP_COST_FUNDRAISE,
  AP_COST_RECRUIT,
  AP_COST_ENDORSEMENT_AP,
  AP_COST_SCOUT,
  AP_COST_NEGOTIATE,
  RECRUIT_COST_CASH,
  getRosterCap,
} from '@/lib/politicsConstants';
import Masthead from './_components/Masthead';
import ActionCard from './_components/ActionCard';
import ApBadge from './_components/ApBadge';

interface Action {
  id: string;
  type: string;
  title: string;
  description: string;
  apCost: number;
  cashCost?: number;
  /** If set, this action is only available to the leader */
  leaderOnly?: boolean;
  notice?: React.ReactNode;
}

const GENERAL_ACTIONS: Action[] = [
  {
    id: 'action-statement',
    type: 'statement',
    title: 'Issue a Statement',
    description: 'Release a public statement to nudge your party\'s popularity. Small effect, low cost.',
    apCost: AP_COST_STATEMENT,
  },
  {
    id: 'action-fundraise',
    type: 'fundraise',
    title: 'Fundraise',
    description: 'Host a fundraising drive. Revenue scales with your Charisma stat. Deposited to party treasury.',
    apCost: AP_COST_FUNDRAISE,
  },
  {
    id: 'action-recruit',
    type: 'recruit',
    title: 'Recruit NPC Candidate',
    description: 'Bring a new NPC candidate onto your roster. They will adopt a platform loosely aligned with your party\'s — with some natural drift.',
    apCost: AP_COST_RECRUIT,
    cashCost: RECRUIT_COST_CASH,
    leaderOnly: true,
  },
  {
    id: 'action-endorsement',
    type: 'endorsement',
    title: 'Endorsement Drive',
    description: 'Leverage your personal influence to back a candidate with a key voter bloc. Boost their fit in a chosen segment.',
    apCost: AP_COST_ENDORSEMENT_AP,
  },
  {
    id: 'action-scout',
    type: 'scout',
    title: 'Scout Rival',
    description: 'Commission intelligence on a rival party\'s platform and polling performance. Reveals more than the public ballot.',
    apCost: AP_COST_SCOUT,
  },
  {
    id: 'action-negotiate',
    type: 'negotiate',
    title: 'Negotiate',
    description: 'Open a back-channel dialogue with another party. Improves coalition formation odds. Logs data for the future Formation screen.',
    apCost: AP_COST_NEGOTIATE,
  },
];

interface GeneralActionsPanelProps {
  character: any;
  parties: any[];
  myAp: { current_ap: number; ap_cap: number };
  onRefresh: () => void;
  stateId?: string;
}

export default function GeneralActionsPanel({
  character,
  parties,
  myAp,
  onRefresh,
  stateId,
}: GeneralActionsPanelProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const myParty = parties.find((p: any) =>
    p.members?.some((m: any) => m.character_id === character?.id) ||
    p.leader_character_id === character?.id
  );
  const isLeader = myParty?.leader_character_id === character?.id;
  const popularity = Number(myParty?.popularity || 0);
  const rosterCap = getRosterCap(popularity);
  const rosterSize = Number(myParty?.member_count || myParty?.members?.length || 1);
  const rosterFull = rosterSize >= rosterCap;

  const run = async (actionType: string) => {
    try {
      setLoading(actionType);
      setResult(null);
      let res: any;
      if (actionType === 'recruit') {
        res = await politicsApi.recruitNpc(stateId);
      } else {
        res = await politicsApi.doGeneralAction(actionType, undefined, stateId);
      }
      setResult({ type: 'success', msg: res.message || 'Action completed.' });
      await onRefresh();
    } catch (err: any) {
      setResult({
        type: 'error',
        msg: err?.response?.data?.error || err?.response?.data?.message || err.message || 'Action failed.',
      });
    } finally {
      setLoading(null);
    }
  };

  const inParty = !!myParty;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <Masthead
          overline="Operations"
          title="General Actions"
          subtitle="Available every arc regardless of phase or office. Each action draws from your shared AP pool."
        />
        <ApBadge current={myAp.current_ap} cap={myAp.ap_cap} size="lg" className="shrink-0" />
      </div>

      {!inParty && (
        <div className="p-4 border border-[#2A2630] bg-[#11131A] text-[#A79D8C] text-sm text-center">
          Join or found a party to unlock political actions.
        </div>
      )}

      {result && (
        <div className={`p-3 border text-sm ${
          result.type === 'success'
            ? 'border-[#4D8C6A]/30 bg-[#4D8C6A]/5 text-[#4D8C6A]'
            : 'border-[#B85555]/30 bg-[#8F3D3D]/10 text-[#B85555]'
        }`}>
          {result.msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {GENERAL_ACTIONS.map((action) => {
          const isRecruit = action.type === 'recruit';
          let unavailableReason = '';
          let available = inParty;

          if (!inParty) unavailableReason = 'Requires party membership';
          if (action.leaderOnly && !isLeader) {
            available = false;
            unavailableReason = 'Leader only';
          }
          if (isRecruit && rosterFull) {
            available = false;
            unavailableReason = `Roster full (${rosterSize}/${rosterCap}) — raise popularity to unlock more slots`;
          }

          return (
            <ActionCard
              key={action.id}
              id={action.id}
              title={action.title}
              description={action.description}
              apCost={action.apCost}
              currentAp={myAp.current_ap}
              available={available}
              unavailableReason={unavailableReason}
              cashCost={action.cashCost}
              partyTreasury={isRecruit ? Number(myParty?.treasury || 0) : undefined}
              onConfirm={() => run(action.type)}
              loading={loading === action.type}
              notice={
                isRecruit ? (
                  <span>Roster: {rosterSize}/{rosterCap} · Popularity: {popularity}</span>
                ) : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
