'use client';
import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from './utils';

type Trend = 'up' | 'down' | 'flat';

interface SparklinePoint { value: number }

interface StatChipProps {
  label: string;
  value: string | number;
  /** Optional unit prefix (e.g. '$') */
  prefix?: string;
  /** Optional unit suffix (e.g. '%') */
  suffix?: string;
  trend?: Trend;
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
  amber: 'text-terminal-amber',
  green: 'text-terminal-green',
  red:   'text-terminal-red',
  blue:  'text-terminal-blue',
  white: 'text-zinc-100',
};

function MiniSparkline({ data }: { data: SparklinePoint[] }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 48, h = 18;
  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="opacity-60">
      <polyline
        fill="none"
        stroke="#ff9f0a"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

export default function StatChip({
  label,
  value,
  prefix,
  suffix,
  trend,
  sparkline,
  valueColor = 'white',
  countUp = false,
  className,
}: StatChipProps) {
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
      'flex flex-col gap-0.5 px-3 py-2 rounded-lg border border-[#23232b] bg-[#0c0d13]',
      'min-w-[80px]',
      className,
    )}>
      <span className="text-[8px] font-mono uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span className={cn('text-sm font-mono font-bold leading-none', valueColorMap[valueColor])}>
          {prefix}{displayed}{suffix}
        </span>
        {trend && TIcon && (
          <TIcon size={10} className={trendColor[trend]} />
        )}
      </div>
      {sparkline && <MiniSparkline data={sparkline} />}
    </div>
  );
}
