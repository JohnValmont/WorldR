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
import ActionCard from './_components/ActionCard';

interface Action {
  id: string;
  type: string;
  title: string;
  description: string;
  subtitle: string;
  apCost: number;
  cashCost?: number;
  leaderOnly?: boolean;
}

const GENERAL_ACTIONS: Action[] = [
  {
    id: 'action-statement',
    type: 'statement',
    title: 'Statement',
    subtitle: 'CHARISMA · THE PUBLIC',
    description: 'Release a public statement to nudge your party\'s popularity.',
    apCost: AP_COST_STATEMENT,
  },
  {
    id: 'action-fundraise',
    type: 'fundraise',
    title: 'Fundraise',
    subtitle: 'CHARISMA · THE DONORS',
    description: 'Fills your party funds. Revenue scales with your Charisma.',
    apCost: AP_COST_FUNDRAISE,
  },
  {
    id: 'action-recruit',
    type: 'recruit',
    title: 'Recruit',
    subtitle: 'CHARISMA · NEW BLOOD',
    description: 'Adds a politician to your bench. Costs from party treasury.',
    apCost: AP_COST_RECRUIT,
    cashCost: RECRUIT_COST_CASH,
    leaderOnly: true,
  },
  {
    id: 'action-endorsement',
    type: 'endorsement',
    title: 'Endorsement',
    subtitle: 'INFLUENCE · A VOTER BLOC',
    description: 'Back a candidate with a key voter bloc.',
    apCost: AP_COST_ENDORSEMENT_AP,
  },
  {
    id: 'action-scout',
    type: 'scout',
    title: 'Scout',
    subtitle: 'INFLUENCE · A RIVAL',
    description: 'Cuts a rival\'s standing or reveals their internal polling.',
    apCost: AP_COST_SCOUT,
  },
  {
    id: 'action-negotiate',
    type: 'negotiate',
    title: 'Negotiate',
    subtitle: 'BUILD · THE BACKROOM',
    description: 'Builds a coalition deal. Opens coalition negotiations.',
    apCost: AP_COST_NEGOTIATE,
  },
];

interface GeneralActionsPanelProps {
  character: any;
  parties: any[];
  myAp: { current_ap: number; ap_cap: number };
  onRefresh: () => void;
  stateId?: string;
  /** Section context label — e.g. "Party Leader" */
  contextLabel?: string;
}

export default function GeneralActionsPanel({
  character,
  parties,
  myAp,
  onRefresh,
  stateId,
  contextLabel = 'Your Actions',
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
  const inParty = !!myParty;

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

  return (
    <div className="bg-[#1c1d2e] border border-[#252637] rounded-xl p-6">
      {/* Section header — matches "PARTY LEADER · THIS WEEK'S ACTION" */}
      <div className="text-[10px] uppercase tracking-[0.2em] text-[#e8752a] font-semibold mb-1">
        {contextLabel} · This Arc&apos;s Actions
      </div>
      <p className="text-sm text-[#8b8da8] mb-6">
        {inParty
          ? `You have ${myAp.current_ap} AP remaining. Choose where to spend it.`
          : 'Join or found a party to unlock political actions.'}
      </p>

      {/* Result toast */}
      {result && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium ${
          result.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {result.msg}
        </div>
      )}

      {/* 4-column action grid — matches Nationhood */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {GENERAL_ACTIONS.map((action) => {
          const isRecruit = action.type === 'recruit';
          let available = inParty;
          let unavailableReason = '';

          if (!inParty) unavailableReason = 'Requires party membership';
          if (action.leaderOnly && !isLeader) {
            available = false;
            unavailableReason = 'Leader only';
          }
          if (isRecruit && rosterFull) {
            available = false;
            unavailableReason = `Roster full (${rosterSize}/${rosterCap})`;
          }

          return (
            <ActionCard
              key={action.id}
              id={action.id}
              title={action.title}
              subtitle={action.subtitle}
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
                isRecruit
                  ? <span>Roster {rosterSize}/{rosterCap} · Pop {popularity}</span>
                  : undefined
              }
              ctaBadge={action.type === 'negotiate' ? 'Open Negotiations' : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
