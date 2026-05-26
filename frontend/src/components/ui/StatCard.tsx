'use client';
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  unit?: string;
  suffix?: string;
  color?: 'amber' | 'green' | 'red' | 'blue' | 'zinc';
  size?: 'sm' | 'md' | 'lg';
}

const colorMap = {
  amber: 'text-amber-400',
  green: 'text-emerald-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  zinc: 'text-zinc-300',
};

const borderMap = {
  amber: 'border-premium-gold bg-[#0d0f0b]/90',
  green: 'border-premium-green bg-[#08100c]/90',
  red: 'border-premium-red bg-[#120808]/90',
  blue: 'border-premium-blue bg-[#080d14]/90',
  zinc: 'border-premium-muted bg-[#060606]/90',
};

export default function StatCard({
  label, value, delta, deltaLabel, unit, suffix,
  color = 'amber', size = 'md'
}: StatCardProps) {
  const valueSize = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const isPositive = delta !== null && delta !== undefined && delta > 0;
  const isNegative = delta !== null && delta !== undefined && delta < 0;

  return (
    <div className={`p-3.5 flex flex-col gap-1 rounded-sm border ${borderMap[color]} shadow-md backdrop-blur-md`}>
      <span className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-mono font-bold leading-none">{label}</span>
      <div className="flex items-baseline gap-1 mt-1">
        {unit && <span className="text-zinc-500 text-xs font-mono">{unit}</span>}
        <span className={`font-black font-mono tracking-tight leading-none ${valueSize} ${colorMap[color]}`}>{value}</span>
        {suffix && <span className="text-zinc-500 text-xs font-mono">{suffix}</span>}
      </div>
      {delta !== null && delta !== undefined && (
        <div className="flex items-center gap-1 mt-1 font-mono text-[9px]">
          <span className={`${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-zinc-500'}`}>
            {isPositive ? '▲' : isNegative ? '▼' : '—'}
            {' '}
            {Math.abs(delta).toFixed(2)}{deltaLabel || ''}
          </span>
          <span className="text-[8px] text-zinc-600 uppercase tracking-wider font-bold">vs prev</span>
        </div>
      )}
    </div>
  );
}
