const IDEOLOGY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  socialist:            { label: 'Socialist',         bg: '#9d020820', text: '#f87171', border: '#9d0208' },
  social_democrat:      { label: 'Social Democrat',   bg: '#e6394620', text: '#fca5a5', border: '#e63946' },
  centrist:             { label: 'Centrist',           bg: '#6b728020', text: '#d1d5db', border: '#6b7280' },
  conservative:         { label: 'Conservative',      bg: '#457b9d20', text: '#93c5fd', border: '#457b9d' },
  nationalist:          { label: 'Nationalist',        bg: '#1d355720', text: '#818cf8', border: '#1d3557' },
  libertarian:          { label: 'Libertarian',        bg: '#f4a26120', text: '#fcd34d', border: '#f4a261' },
  green:                { label: 'Green',              bg: '#2d6a4f20', text: '#6ee7b7', border: '#2d6a4f' },
  technocratic:         { label: 'Technocratic',      bg: '#6a4c9320', text: '#c4b5fd', border: '#6a4c93' },
  populist:             { label: 'Populist',           bg: '#92400e20', text: '#fbbf24', border: '#92400e' },
  religious_conservative:{ label: 'Rel. Conservative', bg: '#78350f20', text: '#fde68a', border: '#78350f' },
};

interface IdeologyBadgeProps {
  ideology: string;
  size?: 'xs' | 'sm';
}

export default function IdeologyBadge({ ideology, size = 'sm' }: IdeologyBadgeProps) {
  const cfg = IDEOLOGY_CONFIG[ideology] || {
    label: ideology.replace(/_/g, ' '),
    bg: '#27272a20', text: '#a1a1aa', border: '#3f3f46'
  };
  const text = size === 'xs' ? 'text-[8px]' : 'text-[9px]';
  return (
    <span
      className={`inline-block px-1.5 py-0.5 ${text} font-mono uppercase tracking-wider border`}
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
}
