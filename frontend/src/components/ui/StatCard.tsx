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

export default function StatCard({
  label, value, delta, deltaLabel, unit, suffix,
  color = 'amber', size = 'md'
}: StatCardProps) {
  const valueSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-2xl';
  const isPositive = delta !== null && delta !== undefined && delta > 0;
  const isNegative = delta !== null && delta !== undefined && delta < 0;

  return (
    <div className="terminal-card p-3 flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</span>
      <div className="flex items-baseline gap-1">
        {unit && <span className="text-zinc-500 text-xs">{unit}</span>}
        <span className={`font-bold font-mono ${valueSize} ${colorMap[color]}`}>{value}</span>
        {suffix && <span className="text-zinc-500 text-xs">{suffix}</span>}
      </div>
      {delta !== null && delta !== undefined && (
        <div className="flex items-center gap-1">
          <span className={`text-[10px] font-mono ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-zinc-500'}`}>
            {isPositive ? '▲' : isNegative ? '▼' : '—'}
            {' '}
            {Math.abs(delta).toFixed(2)}{deltaLabel || ''}
          </span>
          <span className="text-[9px] text-zinc-600">vs prev</span>
        </div>
      )}
    </div>
  );
}
