'use client';
/**
 * Side-view illustration of a player's car, drawn from its design style
 * (body style, paint, accent, wheels). Purely visual.
 * Used large in the Car Designer and small on model cards.
 */
import { useId } from 'react';

export interface CarStyleView {
  paint?: string;     // paint id or hex
  accent?: string;    // paint id or hex
  bodyStyle?: string;
  wheels?: string;
}

export interface PaintSwatch { id: string; hex: string; finish?: 'solid' | 'metallic' | 'pearl' }

type Pt = [number, number];
interface Shape { outline: Pt[]; windows: Pt[][]; wheels: [number, number]; wheelR: number; bottom: number; front: Pt; rear: Pt }

// Car faces LEFT. Ground at y=150. Outline runs front-bumper → roof → rear-bumper.
const SHAPES: Record<string, Shape> = {
  hatchback: {
    outline: [[30, 124], [33, 104], [88, 94], [146, 62], [252, 58], [298, 70], [322, 98], [326, 124]],
    windows: [[[154, 68], [204, 66], [204, 92], [126, 94]], [[212, 66], [250, 64], [292, 74], [306, 92], [212, 92]]],
    wheels: [88, 272], wheelR: 23, bottom: 126, front: [36, 104], rear: [322, 100],
  },
  city: {
    outline: [[52, 124], [55, 102], [96, 94], [138, 58], [244, 54], [284, 62], [300, 98], [302, 124]],
    windows: [[[146, 64], [196, 62], [196, 92], [120, 94]], [[204, 62], [242, 60], [278, 68], [290, 92], [204, 92]]],
    wheels: [100, 256], wheelR: 22, bottom: 126, front: [58, 102], rear: [298, 100],
  },
  crossover: {
    outline: [[28, 118], [31, 96], [90, 86], [146, 54], [262, 50], [306, 58], [326, 92], [328, 118]],
    windows: [[[154, 60], [208, 58], [208, 86], [124, 88]], [[216, 58], [258, 56], [300, 64], [312, 86], [216, 86]]],
    wheels: [90, 272], wheelR: 26, bottom: 120, front: [34, 96], rear: [324, 94],
  },
  saloon: {
    outline: [[18, 124], [22, 106], [108, 94], [164, 62], [256, 60], [302, 88], [352, 94], [358, 124]],
    windows: [[[172, 68], [216, 66], [216, 92], [140, 94]], [[224, 66], [252, 66], [290, 90], [224, 92]]],
    wheels: [86, 296], wheelR: 23, bottom: 126, front: [24, 106], rear: [354, 100],
  },
  coupe: {
    outline: [[18, 126], [22, 110], [118, 100], [184, 70], [244, 68], [310, 96], [352, 100], [358, 126]],
    windows: [[[190, 75], [232, 73], [232, 98], [150, 100]], [[240, 73], [256, 73], [296, 96], [240, 98]]],
    wheels: [88, 296], wheelR: 23, bottom: 128, front: [24, 110], rear: [354, 104],
  },
  estate: {
    outline: [[18, 124], [22, 106], [108, 94], [164, 62], [330, 62], [350, 74], [356, 98], [358, 124]],
    windows: [[[172, 68], [216, 66], [216, 92], [140, 94]], [[224, 66], [276, 66], [276, 92], [224, 92]], [[284, 66], [326, 66], [342, 78], [342, 92], [284, 92]]],
    wheels: [86, 296], wheelR: 23, bottom: 126, front: [24, 106], rear: [354, 100],
  },
  'panel-van': {
    outline: [[20, 126], [24, 104], [58, 96], [96, 50], [350, 46], [362, 54], [364, 104], [364, 126]],
    windows: [[[104, 56], [150, 56], [150, 92], [70, 96]]],
    wheels: [80, 304], wheelR: 24, bottom: 128, front: [26, 104], rear: [362, 100],
  },
  minibus: {
    outline: [[20, 126], [24, 104], [58, 96], [96, 50], [350, 46], [362, 54], [364, 104], [364, 126]],
    windows: [[[104, 56], [150, 56], [150, 90], [70, 94]], [[160, 56], [212, 56], [212, 88], [160, 88]], [[222, 56], [276, 56], [276, 88], [222, 88]], [[286, 56], [346, 54], [352, 62], [352, 88], [286, 88]]],
    wheels: [80, 304], wheelR: 24, bottom: 128, front: [26, 104], rear: [362, 100],
  },
  pickup: {
    outline: [[18, 126], [22, 102], [80, 94], [118, 54], [204, 52], [212, 84], [358, 84], [362, 126]],
    windows: [[[126, 60], [196, 58], [202, 88], [96, 92]]],
    wheels: [84, 300], wheelR: 25, bottom: 128, front: [24, 102], rear: [358, 96],
  },
};

const DEFAULT_BODY_BY_CLASS: Record<string, string> = { 'Compact Car': 'hatchback', 'Sedan': 'saloon', 'Utility Van': 'panel-van' };

/** Closed Catmull-Rom spline → smooth SVG path through the outline points. */
function smoothPath(points: Pt[], bottom: number): string {
  const pts: Pt[] = [...points, [points[points.length - 1][0], bottom], [points[0][0], bottom]];
  const n = pts.length;
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    // Straight bottom edge and bumper verticals keep the car grounded.
    const straight = i >= n - 3;
    if (straight) { d += ` L ${p2[0]} ${p2[1]}`; continue; }
    const t = 0.18;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d + ' Z';
}

function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c: number) => Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount));
  return `#${[mix(r), mix(g), mix(b)].map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`;
}

function Wheel({ cx, cy, r, style, uid }: { cx: number; cy: number; r: number; style: string; uid: string }) {
  const rim = r * 0.62;
  const spokes = (count: number, width: number) =>
    Array.from({ length: count }, (_, i) => (
      <rect key={i} x={cx - width / 2} y={cy - rim} width={width} height={rim} rx={width / 2}
        fill="#C9CDD2" transform={`rotate(${(360 / count) * i} ${cx} ${cy})`} />
    ));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 4} fill="#0B0C0F" />
      <circle cx={cx} cy={cy} r={r} fill="#18191D" stroke="#2A2C31" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={rim} fill={style === 'steel' ? '#6E7277' : '#3B3E44'} />
      {style === 'spoke' && spokes(5, rim * 0.38)}
      {style === 'turbine' && spokes(12, rim * 0.14)}
      {style === 'steel' && Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 6;
        return <circle key={i} cx={cx + Math.cos(a) * rim * 0.62} cy={cy + Math.sin(a) * rim * 0.62} r={rim * 0.13} fill="#3F4247" />;
      })}
      {style === 'mesh' && (
        <g clipPath={`url(#rim-${uid}-${cx})`}>
          <clipPath id={`rim-${uid}-${cx}`}><circle cx={cx} cy={cy} r={rim} /></clipPath>
          {Array.from({ length: 9 }, (_, i) => {
            const o = -rim + (i * rim * 2) / 8;
            return (
              <g key={i}>
                <line x1={cx + o - rim} y1={cy - rim} x2={cx + o + rim} y2={cy + rim} stroke="#C9CDD2" strokeWidth={1.4} />
                <line x1={cx + o + rim} y1={cy - rim} x2={cx + o - rim} y2={cy + rim} stroke="#C9CDD2" strokeWidth={1.4} />
              </g>
            );
          })}
        </g>
      )}
      <circle cx={cx} cy={cy} r={rim * 0.22} fill="#9DA2A8" />
    </g>
  );
}

export default function CarPreview({
  vehicleClass, style, paints, size = 'large', className,
}: {
  vehicleClass?: string;
  style?: CarStyleView | null;
  paints?: PaintSwatch[];
  size?: 'large' | 'small';
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const resolve = (v: string | undefined, fallback: string) => {
    if (!v) return { hex: fallback, finish: 'solid' as const };
    if (v.startsWith('#')) return { hex: v, finish: 'solid' as const };
    const p = paints?.find(x => x.id === v);
    return { hex: p?.hex ?? fallback, finish: p?.finish ?? 'solid' };
  };
  const paint = resolve(style?.paint, '#B9BEC4');
  const accent = resolve(style?.accent, '#141518');
  const bodyId = style?.bodyStyle && SHAPES[style.bodyStyle] ? style.bodyStyle : DEFAULT_BODY_BY_CLASS[vehicleClass ?? ''] ?? 'saloon';
  const shape = SHAPES[bodyId];
  const body = smoothPath(shape.outline, shape.bottom);
  const wheels = style?.wheels ?? 'spoke';
  const sheen = paint.finish === 'metallic' ? 0.32 : paint.finish === 'pearl' ? 0.45 : 0.16;

  return (
    <svg viewBox="0 0 380 165" className={className} role="img"
      aria-label={`${vehicleClass ?? 'Car'} illustration`}
      style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id={`paint-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(paint.hex, sheen)} />
          <stop offset="45%" stopColor={paint.hex} />
          <stop offset="100%" stopColor={shade(paint.hex, -0.35)} />
        </linearGradient>
        <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B4A5C" />
          <stop offset="60%" stopColor="#1A222C" />
          <stop offset="100%" stopColor="#10151B" />
        </linearGradient>
        <clipPath id={`body-${uid}`}><path d={body} /></clipPath>
        <radialGradient id={`shadow-${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#000" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={(shape.outline[0][0] + shape.outline[shape.outline.length - 1][0]) / 2} cy={151} rx={175} ry={9} fill={`url(#shadow-${uid})`} />

      {/* body */}
      <path d={body} fill={`url(#paint-${uid})`} stroke={shade(paint.hex, -0.5)} strokeWidth={1.2} />
      {/* accent stripe along the lower body */}
      <g clipPath={`url(#body-${uid})`}>
        <rect x={0} y={shape.bottom - 22} width={380} height={size === 'small' ? 7 : 5} fill={accent.hex} opacity={0.95} />
        <rect x={0} y={shape.bottom - 4} width={380} height={6} fill="#000" opacity={0.25} />
      </g>
      {/* windows */}
      {shape.windows.map((w, i) => (
        <polygon key={i} points={w.map(p => p.join(',')).join(' ')} fill={`url(#glass-${uid})`} stroke={shade(paint.hex, -0.55)} strokeWidth={1} />
      ))}
      {/* lights */}
      <ellipse cx={shape.front[0] + 6} cy={shape.front[1] + 2} rx={7} ry={3.5} fill="#F6EFC9" />
      <rect x={shape.rear[0] - 6} y={shape.rear[1] - 3} width={6} height={9} rx={2} fill="#C0262E" />
      {/* door line */}
      {size === 'large' && (
        <line x1={(shape.wheels[0] + shape.wheels[1]) / 2} y1={shape.bottom - 30} x2={(shape.wheels[0] + shape.wheels[1]) / 2} y2={shape.bottom - 6}
          stroke={shade(paint.hex, -0.45)} strokeWidth={1} opacity={0.7} />
      )}

      <Wheel cx={shape.wheels[0]} cy={shape.bottom + 2} r={shape.wheelR} style={wheels} uid={uid} />
      <Wheel cx={shape.wheels[1]} cy={shape.bottom + 2} r={shape.wheelR} style={wheels} uid={uid} />
    </svg>
  );
}
