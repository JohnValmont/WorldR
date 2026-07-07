'use client';
import React from 'react';
import { Lock } from 'lucide-react';
import ApBadge from './ApBadge';

interface ActionCardProps {
  id: string;
  title: string;
  description: string;
  apCost: number;
  currentAp: number;
  available: boolean;
  unavailableReason?: string;
  /** Subtitle line — e.g. "CHARISMA · THE PUBLIC" */
  subtitle?: string;
  cashCost?: number;
  partyTreasury?: number;
  onConfirm: () => void;
  loading?: boolean;
  notice?: React.ReactNode;
  /** Highlight badge text override — e.g. "OPEN NEGOTIATIONS" */
  ctaBadge?: string;
}

export default function ActionCard({
  id,
  title,
  description,
  apCost,
  currentAp,
  available,
  unavailableReason,
  subtitle,
  cashCost,
  partyTreasury,
  onConfirm,
  loading = false,
  notice,
  ctaBadge,
}: ActionCardProps) {
  const insufficientAp = currentAp < apCost;
  const insufficientCash = cashCost !== undefined && partyTreasury !== undefined && partyTreasury < cashCost;
  const disabled = !available || insufficientAp || insufficientCash || loading;

  const tooltipReason =
    insufficientAp ? `Need ${apCost} AP, have ${currentAp}`
    : insufficientCash ? `Party needs $${cashCost?.toLocaleString()}`
    : unavailableReason || '';

  return (
    <button
      id={id}
      onClick={onConfirm}
      disabled={disabled}
      title={tooltipReason || undefined}
      className={[
        'relative flex flex-col text-left p-4 rounded-xl border transition-all duration-150 group w-full',
        disabled
          ? 'border-[#252637] bg-[#16172a] opacity-50 cursor-not-allowed'
          : 'border-[#2a2b3d] bg-[#1c1d2e] hover:border-[#e8752a]/50 hover:bg-[#20213a] cursor-pointer',
      ].join(' ')}
    >
      {/* AP / Free badge — top right */}
      <div className="absolute top-3 right-3">
        {apCost === 0 ? (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#1e4d3a] text-[#4ade80] uppercase tracking-wider">
            FREE
          </span>
        ) : (
          <ApBadge current={currentAp} cap={apCost + 4} size="sm" />
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-[9px] uppercase tracking-[0.18em] text-[#6b6d8a] mb-1.5 pr-12">
          {subtitle}
        </div>
      )}

      {/* Title */}
      <div className={`text-base font-bold leading-tight pr-12 mb-1.5 ${disabled ? 'text-[#6b6d8a]' : 'text-white'}`}>
        {title}
      </div>

      {/* Description */}
      <p className="text-[12px] text-[#8b8da8] leading-relaxed mt-auto">
        {description}
      </p>

      {/* Optional notice */}
      {notice && (
        <div className="mt-2 text-[10px] text-[#c97a3a] bg-[#e8752a]/10 px-2 py-1 rounded">
          {notice}
        </div>
      )}

      {/* Cash requirement */}
      {cashCost !== undefined && cashCost > 0 && (
        <div className={`mt-2 text-[10px] font-mono ${insufficientCash ? 'text-red-400' : 'text-[#6b6d8a]'}`}>
          ${cashCost.toLocaleString()} from treasury
        </div>
      )}

      {/* CTA badge (like "OPEN NEGOTIATIONS") */}
      {ctaBadge && !disabled && (
        <div className="mt-3">
          <span className="px-2 py-1 text-[10px] font-bold rounded bg-[#e8752a]/20 text-[#e8752a] uppercase tracking-wider">
            {ctaBadge}
          </span>
        </div>
      )}

      {/* Locked icon */}
      {!available && (
        <div className="absolute bottom-3 right-3">
          <Lock size={10} className="text-[#4a4c60]" />
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#16172a]/80">
          <div className="w-4 h-4 border-2 border-[#e8752a] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </button>
  );
}
