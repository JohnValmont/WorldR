'use client';

interface GaugeBarProps {
  value: number; // 0–1
  label?: string;
  showValue?: boolean;
  color?: 'amber' | 'green' | 'red' | 'blue' | 'purple';
  height?: 'xs' | 'sm' | 'md';
}

const colorMap = {
  amber: 'bg-amber-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

function getAutoColor(value: number): string {
  if (value >= 0.65) return 'bg-emerald-500';
  if (value >= 0.40) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function GaugeBar({ value, label, showValue = true, color, height = 'sm' }: GaugeBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  const barColor = color ? colorMap[color] : getAutoColor(pct);
  const h = height === 'xs' ? 'h-1' : height === 'md' ? 'h-3' : 'h-2';

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>}
          {showValue && <span className="text-[10px] font-mono text-zinc-400">{(pct * 100).toFixed(1)}%</span>}
        </div>
      )}
      <div className={`w-full bg-zinc-900 ${h} border border-zinc-800`}>
        <div
          className={`${h} ${barColor} gauge-fill transition-all duration-700`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
