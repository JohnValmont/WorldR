'use client';
import React, { useMemo } from 'react';

export interface HemicycleParty {
  name: string;
  seats: number;
  color: string;
}

interface HemicycleProps {
  parties: HemicycleParty[];
  totalSeats?: number;
  /** Seats needed for a majority — draws a dividing marker. */
  majority?: number;
  /** Big number rendered in the well of the chamber. */
  centerValue?: React.ReactNode;
  centerLabel?: string;
  className?: string;
}

interface Seat {
  x: number;
  y: number;
  angle: number;
}

/**
 * Hemicycle — a semicircular parliamentary seat map (the chamber, not a pie).
 * Deterministically arranges `totalSeats` dots across concentric arcs and fills
 * them party-by-party into contiguous wedges from left to right. Empty seats
 * render muted. Pure SVG, scales fluidly to its container.
 */
export default function Hemicycle({
  parties,
  totalSeats = 61,
  majority,
  centerValue,
  centerLabel,
  className,
}: HemicycleProps) {
  const W = 420;
  const H = 232;
  const cx = W / 2;
  const cy = 212;
  const innerR = 78;
  const outerR = 196;
  const ROWS = 5;

  const seats = useMemo<Seat[]>(() => {
    const radii: number[] = [];
    for (let i = 0; i < ROWS; i++) {
      radii.push(innerR + ((outerR - innerR) * i) / (ROWS - 1));
    }
    const weightTotal = radii.reduce((a, b) => a + b, 0);
    const perRow = radii.map((r) => Math.max(1, Math.round((totalSeats * r) / weightTotal)));
    let diff = totalSeats - perRow.reduce((a, b) => a + b, 0);
    let idx = ROWS - 1;
    while (diff !== 0) {
      perRow[idx] += diff > 0 ? 1 : -1;
      diff += diff > 0 ? -1 : 1;
      idx = (idx - 1 + ROWS) % ROWS;
    }

    const out: Seat[] = [];
    radii.forEach((r, ri) => {
      const m = perRow[ri];
      for (let k = 0; k < m; k++) {
        const theta = m === 1 ? Math.PI / 2 : Math.PI - (Math.PI * (k + 0.5)) / m;
        out.push({
          x: cx + r * Math.cos(theta),
          y: cy - r * Math.sin(theta),
          angle: theta,
        });
      }
    });
    out.sort((a, b) => b.angle - a.angle);
    return out;
  }, [totalSeats]);

  const fills = useMemo<string[]>(() => {
    const arr: string[] = [];
    parties.forEach((p) => {
      for (let i = 0; i < p.seats; i++) arr.push(p.color);
    });
    while (arr.length < seats.length) arr.push('#2A2630');
    return arr.slice(0, seats.length);
  }, [parties, seats.length]);

  const majAngle = majority != null ? Math.PI - (Math.PI * majority) / totalSeats : null;
  const majInner = innerR - 8;
  const majOuter = outerR + 10;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      role="img"
      aria-label="Council seat composition"
    >
      {seats.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={6.6}
          fill={fills[i]}
          stroke="rgba(0,0,0,0.45)"
          strokeWidth={0.8}
        />
      ))}

      {majAngle != null && (
        <line
          x1={cx + majInner * Math.cos(majAngle)}
          y1={cy - majInner * Math.sin(majAngle)}
          x2={cx + majOuter * Math.cos(majAngle)}
          y2={cy - majOuter * Math.sin(majAngle)}
          stroke="#F4EBD6"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />
      )}

      {(centerValue != null || centerLabel) && (
        <>
          <text
            x={cx}
            y={cy - 34}
            textAnchor="middle"
            fill="#F4EBD6"
            style={{ fontFamily: 'serif', fontSize: 34 }}
          >
            {centerValue}
          </text>
          {centerLabel && (
            <text
              x={cx}
              y={cy - 14}
              textAnchor="middle"
              fill="#A79D8C"
              style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' }}
            >
              {centerLabel}
            </text>
          )}
        </>
      )}
    </svg>
  );
}
