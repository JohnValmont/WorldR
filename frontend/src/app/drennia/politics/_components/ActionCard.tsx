'use client';
import React from 'react';
import { Zap, Lock } from 'lucide-react';

interface ActionCardProps {
  id: string;
  title: string;
  description: string;
  apCost: number;
  currentAp: number;
  available: boolean;
  /** Short human-readable reason shown when unavailable */
  unavailableReason?: string;
  /** Optional treasury/fund cost in dollars */
  cashCost?: number;
  partyTreasury?: number;
  /** Called when the player confirms the action */
  onConfirm: () => void;
  loading?: boolean;
  /** Slot for extra metadata below the description (e.g. "Constitutional bills require 2/3 majority") */
  notice?: React.ReactNode;
}

export default function ActionCard({
  id,
  title,
  description,
  apCost,
  currentAp,
  available,
  unavailableReason,
  cashCost,
  partyTreasury,
  onConfirm,
  loading = false,
  notice,
}: ActionCardProps) {
  const insufficientAp = currentAp < apCost;
  const insufficientCash = cashCost !== undefined && partyTreasury !== undefined && partyTreasury < cashCost;
  const disabled = !available || insufficientAp || insufficientCash || loading;

  const apColor =
    insufficientAp
      ? 'text-[#B85555] border-[#B85555]/40 bg-[#8F3D3D]/10'
      : apCost === 0
      ? 'text-[#4D8C6A] border-[#4D8C6A]/40 bg-[#4D8C6A]/10'
      : 'text-terminal-amber border-terminal-amber/40 bg-terminal-amber/10';

  const tooltipReason =
    insufficientAp ? `Need ${apCost} AP, have ${currentAp}`
    : insufficientCash ? `Need $${cashCost?.toLocaleString()} treasury`
    : unavailableReason || '';

  return (
    <div
      id={id}
      className={`relative flex flex-col border p-4 transition-all duration-150 ${
        disabled
          ? 'border-[#2A2630] bg-[#090A0F] opacity-55 cursor-not-allowed'
          : 'border-[#2A2630] bg-[#11131A] hover:border-[#4A4058] hover:bg-[#17151F] cursor-pointer'
      }`}
      title={tooltipReason}
    >
      {/* Locked overlay */}
      {!available && (
        <div className="absolute top-2 right-2">
          <Lock size={11} className="text-[#4A4058]" />
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="font-bold text-sm text-[#F4EBD6] leading-tight">{title}</div>
        {/* AP cost badge */}
        <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border rounded-sm ${apColor}`}>
          <Zap size={9} />
          {apCost === 0 ? 'Free' : `${apCost} AP`}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-[#A79D8C] mb-3 flex-1">{description}</p>

      {/* Cost row */}
      {cashCost !== undefined && cashCost > 0 && (
        <div className={`text-[10px] font-mono mb-3 ${insufficientCash ? 'text-[#B85555]' : 'text-[#6B6358]'}`}>
          Party Treasury: ${cashCost.toLocaleString()} required
        </div>
      )}

      {/* Notice (e.g. constitutional 2/3 warning) */}
      {notice && (
        <div className="text-[10px] text-terminal-amber bg-terminal-amber/5 border border-terminal-amber/20 px-2 py-1 mb-3">
          {notice}
        </div>
      )}

      {/* Unavailable reason banner */}
      {disabled && tooltipReason && (
        <div className="text-[10px] text-[#6B6358] italic mb-3">{tooltipReason}</div>
      )}

      {/* Action button */}
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="mt-auto w-full py-2 text-xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed
          bg-[#2A2630] text-[#A79D8C] hover:bg-[#3A3040] hover:text-[#F4EBD6]
          disabled:bg-[#1A1820] disabled:text-[#4A4550]"
      >
        {loading ? 'Processing…' : apCost === 0 ? 'Confirm (Free)' : `Use ${apCost} AP`}
      </button>
    </div>
  );
}
