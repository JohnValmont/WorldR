'use client';
/**
 * DrenniaMap.tsx — v2
 *
 * Rebuilt as a proper hex grid (pointy-top).
 * 151 districts × 4 states in a tapered-pear outline.
 *
 * Grid: 14 rows, variable columns per row → exactly 151 hexes.
 * District numbers 1–151 assigned left-to-right, top-to-bottom.
 *
 * Fill color comes entirely from the `districtData` prop:
 *   Record<number, { fill: string; stateName: string; districtName: string; leadingParty: string | null }>
 */

import React, { useState, useCallback, useMemo } from 'react';
import { T, MONO } from '../_lib/theme';

// ── Hex geometry (pointy-top) ──────────────────────────────────────────────
const R       = 24;                        // circumradius
const W       = Math.sqrt(3) * R;          // ≈ 41.6 flat-to-flat width
const H_STEP  = R * 1.5;                   // ≈ 36   row step
const OX      = 24;                        // left padding
const OY      = 26;                        // top padding

function hCenter(row: number, col: number): [number, number] {
  const x = col * W + (row % 2 === 1 ? W / 2 : 0) + OX;
  const y = row * H_STEP + OY;
  return [x, y];
}

function hPath(cx: number, cy: number, r = R): string {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts[0]} L${pts[1]} L${pts[2]} L${pts[3]} L${pts[4]} L${pts[5]}Z`;
}

// ── Grid definition: [row, minCol, maxCol]
// Oval shape: 5+9+12+13+14+15+15+14+13+12+11+9+6+3 = 151
const GRID: [number, number, number][] = [
  [0,  5,  9],  //  5  — narrow top
  [1,  3, 11],  //  9
  [2,  2, 13],  // 12
  [3,  1, 13],  // 13
  [4,  0, 13],  // 14
  [5,  0, 14],  // 15  — widest
  [6,  0, 14],  // 15  — widest
  [7,  0, 13],  // 14
  [8,  1, 13],  // 13
  [9,  1, 12],  // 12
  [10, 2, 12],  // 11
  [11, 3, 11],  //  9
  [12, 5, 10],  //  6
  [13, 6,  8],  //  3  — narrow base
];

// Pre-compute all hex positions at module level (static, never changes)
interface Hex {
  dn: number;       // district_number 1–151
  row: number;
  col: number;
  cx: number;
  cy: number;
  path: string;
}

const HEXES: Hex[] = (() => {
  const out: Hex[] = [];
  let dn = 1;
  for (const [row, minCol, maxCol] of GRID) {
    for (let col = minCol; col <= maxCol; col++) {
      const [cx, cy] = hCenter(row, col);
      out.push({ dn: dn++, row, col, cx, cy, path: hPath(cx, cy) });
    }
  }
  return out;
})();

// State region approximate centroids (computed for the oval grid layout)
// Districts 1–37=DRENNPORT (rows 0–3), 38–75=IRONVALE (rows 3–6),
// 76–113=GREENMERE (rows 6–9), 114–151=WESTMARK (rows 9–13)
const STATE_LABELS = [
  { code: 'DRENNPORT', name: 'DRENNPORT', cx: 316, cy:  98 },
  { code: 'IRONVALE',  name: 'IRONVALE',  cx: 502, cy: 206 },
  { code: 'GREENMERE', name: 'GREENMERE', cx: 175, cy: 314 },
  { code: 'WESTMARK',  name: 'WESTMARK',  cx: 338, cy: 422 },
];

const VIEWBOX = '0 0 670 545';

// ── Types ──────────────────────────────────────────────────────────────────

export interface HexDistrictData {
  fill: string;          // hex color string
  stateName: string;
  stateCode: string;
  districtName: string;
  leadingParty: string | null;
  leadingPct: number;    // 0–100
}

export interface DrenniaMapProps {
  districtData?: Record<number, HexDistrictData>;
  onDistrictClick?: (districtNumber: number) => void;
  selectedDistrict?: number | null;
  showLabels?: boolean;
  width?: number;        // rendered width (SVG scales via viewBox)
}

// ── Component ──────────────────────────────────────────────────────────────

const FALLBACK_COLORS: Record<string, string> = {
  DRENNPORT: '#3A4E6B',
  IRONVALE:  '#5C4A80',
  GREENMERE: '#3A5E47',
  WESTMARK:  '#6B4A32',
};

export default function DrenniaMap({
  districtData = {},
  onDistrictClick,
  selectedDistrict = null,
  showLabels = false,
  width = 660,
}: DrenniaMapProps) {
  const [hoveredDn, setHoveredDn] = useState<number | null>(null);
  const height = Math.round(width * (540 / 660));

  const onEnter = useCallback((dn: number) => setHoveredDn(dn), []);
  const onLeave = useCallback(() => setHoveredDn(null), []);
  const onClick = useCallback((dn: number) => onDistrictClick?.(dn), [onDistrictClick]);

  const hoveredData = hoveredDn !== null ? districtData[hoveredDn] : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
      <svg
        viewBox={VIEWBOX}
        width={width}
        height={height}
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="Map of Drennia — 151 districts"
      >
        <defs>
          {/* Glow filter for selected district */}
          <filter id="d-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Subtle inner shadow for hex depth */}
          <filter id="d-inner" x="-5%" y="-5%" width="110%" height="110%">
            <feFlood floodColor="rgba(0,0,0,0.35)" result="flood" />
            <feComposite in="flood" in2="SourceGraphic" operator="atop" result="shadow" />
            <feGaussianBlur in="shadow" stdDeviation="1.5" result="blurred" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="blurred" />
            </feMerge>
          </filter>

          {/* Map background gradient */}
          <radialGradient id="map-bg" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#141826" />
            <stop offset="100%" stopColor="#090B10" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="660" height="540" fill="url(#map-bg)" rx="12" />

        {/* ── Hex districts ── */}
        {HEXES.map(({ dn, cx, cy, path }) => {
          const data   = districtData[dn];
          const isHov  = hoveredDn === dn;
          const isSel  = selectedDistrict === dn;
          const stCode = data?.stateCode ?? 'VALE';

          const baseFill   = data?.fill ?? FALLBACK_COLORS[stCode] ?? '#3A4E6B';
          const fillColor  = isHov ? adjustBrightness(baseFill, 1.3) : baseFill;
          const strokeColor = isSel
            ? '#FFD700'
            : isHov
            ? 'rgba(255,255,255,0.75)'
            : 'rgba(255,255,255,0.10)';
          const strokeW = isSel ? 2.5 : isHov ? 1.5 : 0.75;

          return (
            <g key={dn}>
              {/* Hex shadow layer */}
              <path
                d={path}
                fill="rgba(0,0,0,0.4)"
                stroke="none"
                transform="translate(1.5, 2)"
              />
              {/* Main hex */}
              <path
                d={path}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeW}
                strokeLinejoin="round"
                style={{
                  cursor: 'pointer',
                  transition: 'fill 0.22s ease, stroke 0.12s ease',
                  filter: isSel ? 'url(#d-glow)' : undefined,
                }}
                onMouseEnter={() => onEnter(dn)}
                onMouseLeave={onLeave}
                onClick={() => onClick(dn)}
                role="button"
                aria-label={`District ${dn}`}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') onClick(dn); }}
              />
              {/* Highlight lip at top of hex (depth effect) */}
              <path
                d={topEdgePath(cx, cy, R * 0.92)}
                fill="rgba(255,255,255,0.06)"
                stroke="none"
                style={{ pointerEvents: 'none' }}
              />
              {/* District label */}
              {showLabels && (
                <text
                  x={cx} y={cy + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: 7, fontFamily: 'monospace', fill: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }}
                >
                  {dn}
                </text>
              )}
            </g>
          );
        })}

        {/* ── State name labels ── */}
        {STATE_LABELS.map(({ code, name, cx, cy }) => (
          <g key={code}>
            <rect
              x={cx - 22} y={cy - 9}
              width={44} height={18}
              rx={4}
              fill="rgba(0,0,0,0.45)"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.75}
            />
            <text
              x={cx} y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 8.5,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fill: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.1em',
                pointerEvents: 'none',
              }}
            >
              {name}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover tooltip */}
      {hoveredDn !== null && (
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(9,10,15,0.92)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          padding: '5px 14px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint }}>DISTRICT</span>
          <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: T.text }}>{hoveredDn}</span>
          {hoveredData && (
            <>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>·</span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>{hoveredData.districtName}</span>
              {hoveredData.leadingParty && (
                <>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint }}>·</span>
                  <span style={{
                    display: 'inline-block',
                    width: 8, height: 8, borderRadius: '50%',
                    background: hoveredData.fill, flexShrink: 0,
                  }} />
                  <span style={{ fontFamily: MONO, fontSize: 10, color: T.text }}>
                    {hoveredData.leadingParty} {hoveredData.leadingPct.toFixed(1)}%
                  </span>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns a path for the top 3 edges of a pointy-top hex (highlight lip) */
function topEdgePath(cx: number, cy: number, r: number): string {
  const angles = [-90, -30, 30, 90]; // top 3 vertices + closing
  const pts = angles.map(deg => {
    const a = (deg * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M${pts[0]} L${pts[1]} L${pts[2]} L${pts[3]}`;
}

/** Brightens or darkens a hex color by a multiplier */
function adjustBrightness(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((num >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((num >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((num & 0xff) * factor));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
