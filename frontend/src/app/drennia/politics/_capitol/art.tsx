'use client';
// Hand-built SVG art for the Politics screens: no image files, crisp at any size.
import React, { useId } from 'react';
import type { FlagSpec } from './types';
import { C, initials } from './theme';

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Points of an n-pointed star centred on (cx, cy). */
function starPath(cx: number, cy: number, outer: number, inner: number, points: number) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

const DEFAULT_FLAG: FlagSpec = { pattern: 'hoist-triangle-band', colors: ['#1E2A4A', '#C9A227', '#9E2B2B'], emblem: 'star8', emblemColor: '#F4EBD6' };

/** The national flag, gently waving. */
export function NationFlag({ spec = DEFAULT_FLAG, width = 120, wave = true, className }: { spec?: FlagSpec; width?: number; wave?: boolean; className?: string }) {
  const id = useId().replace(/:/g, '');
  const [field, band, hoist] = spec.colors;
  const W = 300, H = 200;
  const flat = `M0,0 L${W},0 L${W},${H} L0,${H} Z`;
  const waveA = `M0,0 C75,-8 150,8 225,0 S300,-6 300,0 L300,200 C225,206 150,192 75,200 S0,206 0,200 Z`;
  const waveB = `M0,0 C75,8 150,-8 225,0 S300,6 300,0 L300,200 C225,194 150,208 75,200 S0,194 0,200 Z`;
  return (
    <svg viewBox={`-4 -12 ${W + 8} ${H + 24}`} width={width} height={(width * (H + 24)) / (W + 8)} className={className} role="img" aria-label="National flag">
      <defs>
        <clipPath id={`clip-${id}`}>
          <path d={wave ? waveA : flat}>
            {wave && <animate attributeName="d" dur="4s" repeatCount="indefinite" values={`${waveA};${waveB};${waveA}`} />}
          </path>
        </clipPath>
        <linearGradient id={`shade-${id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.18" />
          <stop offset="0.25" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.14" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          {wave && <animateTransform attributeName="gradientTransform" type="translate" values="-0.25 0;0.25 0;-0.25 0" dur="4s" repeatCount="indefinite" />}
        </linearGradient>
      </defs>
      <g clipPath={`url(#clip-${id})`}>
        {spec.pattern === 'tricolor-vertical' ? (
          <>
            <rect x="0" y="0" width={W / 3} height={H} fill={spec.colors[0]} />
            <rect x={W / 3} y="0" width={W / 3} height={H} fill={spec.colors[1]} />
            <rect x={(2 * W) / 3} y="0" width={W / 3} height={H} fill={spec.colors[2]} />
          </>
        ) : spec.pattern === 'tricolor-horizontal' ? (
          <>
            <rect x="0" y="0" width={W} height={H / 3} fill={spec.colors[0]} />
            <rect x="0" y={H / 3} width={W} height={H / 3} fill={spec.colors[1]} />
            <rect x="0" y={(2 * H) / 3} width={W} height={H / 3} fill={spec.colors[2]} />
          </>
        ) : (
          <>
            <rect x="0" y="0" width={W} height={H} fill={field} />
            <rect x="0" y={H * 0.42} width={W} height={H * 0.16} fill={band} />
            <path d={`M0,0 L${W * 0.42},${H / 2} L0,${H} Z`} fill={hoist} />
            <path d={`M0,0 L${W * 0.42},${H / 2} L0,${H}`} fill="none" stroke={band} strokeWidth="6" />
          </>
        )}
        {spec.emblem === 'star8' && <path d={starPath(W * 0.13, H / 2, 26, 11, 8)} fill={spec.emblemColor} />}
        <rect x="0" y="0" width={W} height={H} fill={`url(#shade-${id})`} />
      </g>
    </svg>
  );
}

/** Night skyline of the Parliament building, used as the banner backdrop. */
export function CapitolSkyline({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const cols = Array.from({ length: 10 }, (_, i) => 330 + i * 34);
  return (
    <svg viewBox="0 0 1000 260" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0A0E18" />
          <stop offset="1" stopColor="#1A2236" />
        </linearGradient>
        <linearGradient id={`glow-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.brass} stopOpacity="0.55" />
          <stop offset="1" stopColor={C.brass} stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id={`halo-${id}`} cx="0.5" cy="0.35" r="0.5">
          <stop offset="0" stopColor={C.brass} stopOpacity="0.20" />
          <stop offset="1" stopColor={C.brass} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1000" height="260" fill={`url(#sky-${id})`} />
      {Array.from({ length: 40 }, (_, i) => {
        const h = hash(`star${i}`);
        return <circle key={i} cx={h % 1000} cy={(h >>> 10) % 140} r={((h >>> 20) % 3) * 0.4 + 0.4} fill={C.ivory} opacity={0.15 + ((h >>> 5) % 50) / 100} />;
      })}
      <ellipse cx="500" cy="120" rx="320" ry="140" fill={`url(#halo-${id})`} />
      <g fill="#0D1220" stroke={`url(#glow-${id})`} strokeWidth="1.2">
        {/* wings */}
        <path d="M120,260 L120,190 L300,190 L300,260 Z" />
        <path d="M700,260 L700,190 L880,190 L880,260 Z" />
        {/* main block + pediment */}
        <path d="M300,260 L300,170 L700,170 L700,260 Z" />
        <path d="M310,170 L500,128 L690,170 Z" />
        {/* drum + dome + lantern */}
        <path d="M420,128 L420,92 L580,92 L580,128 Z" />
        <path d="M410,92 C410,30 590,30 590,92 Z" />
        <path d="M488,44 L488,26 L512,26 L512,44 Z" />
        <path d="M500,26 L500,4" />
      </g>
      <g stroke={C.brass} strokeOpacity="0.35" strokeWidth="1">
        {cols.map(x => <line key={x} x1={x} y1="176" x2={x} y2="256" />)}
        {[440, 470, 500, 530, 560].map(x => <line key={x} x1={x} y1="96" x2={x} y2="126" />)}
      </g>
      {/* lit windows */}
      {Array.from({ length: 18 }, (_, i) => {
        const h = hash(`win${i}`);
        const left = i < 9;
        const x = (left ? 135 : 715) + (i % 9) * 18;
        return <rect key={i} x={x} y={205 + ((h >>> 3) % 2) * 22} width="8" height="12" fill={C.brass} opacity={(h % 3) ? 0.5 : 0.12} />;
      })}
      <path d="M500,4 L522,10 L500,16 Z" fill={C.crimson} />
      <rect x="0" y="256" width="1000" height="4" fill={C.brass} opacity="0.25" />
    </svg>
  );
}

/** Shield with the national colours, a star and a laurel. */
export function CoatOfArms({ spec = DEFAULT_FLAG, size = 64 }: { spec?: FlagSpec; size?: number }) {
  const [field, band, hoist] = spec.colors;
  const leaves = Array.from({ length: 7 }, (_, i) => i);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <g fill="none" stroke={band} strokeWidth="2" strokeLinecap="round">
        {leaves.map(i => {
          const a = Math.PI * (0.62 + i * 0.075);
          const x = 60 + 50 * Math.cos(a), y = 62 + 50 * Math.sin(a);
          const x2 = 120 - x;
          return (
            <g key={i}>
              <ellipse cx={x} cy={y} rx="7" ry="3" transform={`rotate(${(a * 180) / Math.PI + 70} ${x} ${y})`} fill={band} fillOpacity="0.6" stroke="none" />
              <ellipse cx={x2} cy={y} rx="7" ry="3" transform={`rotate(${-((a * 180) / Math.PI + 70)} ${x2} ${y})`} fill={band} fillOpacity="0.6" stroke="none" />
            </g>
          );
        })}
      </g>
      <path d="M30,22 L90,22 L90,62 C90,86 72,98 60,104 C48,98 30,86 30,62 Z" fill={field} stroke={band} strokeWidth="3" />
      <path d="M30,22 L60,22 L60,104 C48,98 30,86 30,62 Z" fill={hoist} opacity="0.9" />
      <rect x="30" y="54" width="60" height="9" fill={band} />
      <path d={starPath(60, 40, 11, 4.6, 8)} fill={spec.emblemColor} />
      <path d="M44,12 L52,18 L60,10 L68,18 L76,12 L74,22 L46,22 Z" fill={band} />
    </svg>
  );
}

const SKIN = ['#F1D3B8', '#D9A982', '#B57E5A', '#8A5A3C', '#5E3B27'];
const HAIR = ['#1B1B1F', '#3B2A20', '#6B4A2E', '#A57B4F', '#9C9C9C'];

/**
 * A generated official portrait (head and shoulders). Deterministic per name,
 * framed in the party colour. Human players get a brass star.
 */
export function Portrait({ name, color, size = 56, isPlayer = false, vacant = false }: { name: string; color: string; size?: number; isPlayer?: boolean; vacant?: boolean }) {
  const id = useId().replace(/:/g, '');
  const h = hash(name || 'x');
  const skin = SKIN[h % SKIN.length];
  const hair = HAIR[(h >>> 4) % HAIR.length];
  const style = (h >>> 8) % 4;
  const suit = ['#1F2937', '#25304A', '#2D2A2E', '#1E3A3A'][(h >>> 12) % 4];
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={vacant ? 'Vacant' : name}>
      <defs>
        <clipPath id={`pc-${id}`}><circle cx="50" cy="50" r="46" /></clipPath>
        <radialGradient id={`pb-${id}`} cx="0.5" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#2A3550" />
          <stop offset="1" stopColor="#111827" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="49" fill={color} opacity="0.9" />
      <g clipPath={`url(#pc-${id})`}>
        <rect width="100" height="100" fill={`url(#pb-${id})`} />
        {vacant ? (
          <text x="50" y="58" textAnchor="middle" fontSize="22" fill={C.muted} fontFamily="Cinzel, serif">—</text>
        ) : (
          <>
            <path d="M14,104 C16,78 32,70 50,70 C68,70 84,78 86,104 Z" fill={suit} />
            <path d="M42,70 L50,86 L58,70 Z" fill="#E9E4D8" />
            <path d="M48,74 L52,74 L53,90 L50,94 L47,90 Z" fill={color} />
            <rect x="44" y="58" width="12" height="14" rx="5" fill={skin} />
            <ellipse cx="50" cy="44" rx="15" ry="18" fill={skin} />
            {style === 0 && <path d="M35,42 C34,24 66,22 65,42 C62,32 40,32 35,42 Z" fill={hair} />}
            {style === 1 && <path d="M34,48 C30,22 70,20 66,48 C64,36 58,30 50,30 C42,30 36,36 34,48 Z" fill={hair} />}
            {style === 2 && <path d="M33,52 C28,20 72,20 67,52 L66,62 C64,40 36,40 34,62 Z" fill={hair} />}
            {style === 3 && <path d="M36,38 C38,28 62,28 64,38 C58,34 42,34 36,38 Z" fill={hair} />}
          </>
        )}
      </g>
      {!vacant && <text x="50" y="97" textAnchor="middle" fontSize="0" fill="none">{initials(name)}</text>}
      {isPlayer && <path d={starPath(84, 16, 11, 4.5, 5)} fill={C.brass} stroke={C.night} strokeWidth="1.5" />}
    </svg>
  );
}

/** Small party badge: coloured roundel with the party's letters. */
export function PartyMark({ color, abbr, size = 28 }: { color: string; abbr: string; size?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill={color} />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <text x="20" y="24.5" textAnchor="middle" fontSize={abbr.length > 2 ? 11 : 13} fontWeight="700" fill="#fff" fontFamily="Outfit, sans-serif">{abbr.slice(0, 3)}</text>
    </svg>
  );
}
