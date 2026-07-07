'use client';
import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from './utils';

type Trend = 'up' | 'down' | 'flat';
interface SparklinePoint { value: number }

interface StatCardProps {
  label: string;
  value: string | number;
  /** Optional unit prefix (e.g. '$') */
  prefix?: string;
  /** Optional unit suffix (e.g. '%') */
  suffix?: string;
  trend?: Trend;
  /** Optional trend label (e.g. '+5%') */
  trendLabel?: string;
  /** Tiny sparkline data (6-12 points) */
  sparkline?: SparklinePoint[];
  /** Color override for value text */
  valueColor?: 'amber' | 'green' | 'red' | 'blue' | 'white';
  /** Animate number counting up on mount */
  countUp?: boolean;
  className?: string;
}

const trendColor: Record<Trend, string> = {
  up:   'text-terminal-green',
  down: 'text-terminal-red',
  flat: 'text-zinc-500',
};
const TrendIcon: Record<Trend, React.ElementType> = {
  up: TrendingUp, down: TrendingDown, flat: Minus,
};
const valueColorMap: Record<string, string> = {
  amber: 'text-terminal-amber amber-glow',
  green: 'text-terminal-green terminal-glow',
  red:   'text-terminal-red shadow-[0_0_8px_#ff453a]',
  blue:  'text-terminal-blue shadow-[0_0_8px_#0a84ff]',
  white: 'text-zinc-100',
};

function MiniSparkline({ data, trend }: { data: SparklinePoint[], trend?: Trend }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 70, h = 24;
  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = trend === 'up' ? '#30d158' : trend === 'down' ? '#ff453a' : '#ff9f0a';

  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default function StatCard({
  label,
  value,
  prefix,
  suffix,
  trend,
  trendLabel,
  sparkline,
  valueColor = 'white',
  countUp = false,
  className,
}: StatCardProps) {
  const [displayed, setDisplayed] = useState<string | number>(countUp ? 0 : value);
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  useEffect(() => {
    if (!countUp || typeof value !== 'number') { setDisplayed(value); return; }
    const target = value;
    const duration = 800;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(eased * target).toLocaleString('en-US'));
      if (t < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [value, countUp]);

  const TIcon = trend ? TrendIcon[trend] : null;

  return (
    <div className={cn(
      'flex flex-col justify-between p-4 rounded-xl border border-[#23232b] bg-[#0c0d13] shadow-card',
      className
    )}>
      <div className="flex items-start justify-between gap-4 mb-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-zinc-500">
          {label}
        </span>
        {trend && TIcon && (
          <div className={cn('flex items-center gap-1 text-[10px] font-mono font-bold', trendColor[trend])}>
            {trendLabel && <span>{trendLabel}</span>}
            <TIcon size={12} />
          </div>
        )}
      </div>
      
      <div className="flex items-end justify-between gap-4 mt-2">
        <span className={cn('text-2xl font-mono font-bold leading-none tracking-tight', valueColorMap[valueColor])}>
          {prefix}{displayed}{suffix}
        </span>
        {sparkline && (
          <div className="shrink-0 mb-1">
            <MiniSparkline data={sparkline} trend={trend} />
          </div>
        )}
      </div>
    </div>
  );
}
