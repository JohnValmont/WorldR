interface NationFlagProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { xs: 28, sm: 40, md: 60, lg: 90 };

export default function NationFlag({ size = 'sm', className = '' }: NationFlagProps) {
  const w = SIZES[size];
  const h = Math.round(w * 0.6);
  const cx = w / 2;
  const cy = h / 2;
  const r1 = h * 0.24; // outer ray tip
  const r2 = h * 0.11; // inner ray base
  const barH = h * 0.22;

  // 8-ray sunburst path
  const sunburstPath = () => {
    const points: string[] = [];
    for (let i = 0; i < 8; i++) {
      const outerAngle = (i * 45 - 90) * (Math.PI / 180);
      const innerAngle1 = (i * 45 - 90 - 22.5) * (Math.PI / 180);
      const innerAngle2 = (i * 45 - 90 + 22.5) * (Math.PI / 180);
      if (i === 0) {
        points.push(`M ${cx + r2 * Math.cos(innerAngle1)} ${cy + r2 * Math.sin(innerAngle1)}`);
      } else {
        points.push(`L ${cx + r2 * Math.cos(innerAngle1)} ${cy + r2 * Math.sin(innerAngle1)}`);
      }
      points.push(`L ${cx + r1 * Math.cos(outerAngle)} ${cy + r1 * Math.sin(outerAngle)}`);
      points.push(`L ${cx + r2 * Math.cos(innerAngle2)} ${cy + r2 * Math.sin(innerAngle2)}`);
    }
    points.push('Z');
    return points.join(' ');
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`border border-zinc-700 shrink-0 ${className}`}
      aria-label="Kingdom of Keldoria flag"
    >
      {/* Navy blue background */}
      <rect width={w} height={h} fill="#1a2f5a" />
      {/* Silver horizontal bar */}
      <rect x={0} y={cy - barH / 2} width={w} height={barH} fill="#c0c8d8" />
      {/* Amber sunburst */}
      <path d={sunburstPath()} fill="#e8a020" />
      {/* Center circle */}
      <circle cx={cx} cy={cy} r={r2 * 0.6} fill="#1a2f5a" />
      {/* Border */}
      <rect width={w} height={h} fill="none" stroke="#c0c8d8" strokeWidth={0.5} />
    </svg>
  );
}
