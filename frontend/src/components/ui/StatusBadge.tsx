'use client';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  dot?: boolean;
  size?: 'xs' | 'sm';
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
  warning: 'text-amber-400 border-amber-800 bg-amber-950/40',
  danger: 'text-red-400 border-red-800 bg-red-950/40',
  info: 'text-blue-400 border-blue-800 bg-blue-950/40',
  neutral: 'text-zinc-400 border-zinc-700 bg-zinc-900/40',
  purple: 'text-purple-400 border-purple-800 bg-purple-950/40',
};

const dotMap: Record<BadgeVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-zinc-400',
  purple: 'bg-purple-400',
};

export default function StatusBadge({ label, variant = 'neutral', dot = false, size = 'xs' }: StatusBadgeProps) {
  const textSize = size === 'xs' ? 'text-[9px]' : 'text-[10px]';
  return (
    <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono uppercase tracking-widest ${textSize} ${variantMap[variant]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotMap[variant]}`} />}
      {label}
    </span>
  );
}
