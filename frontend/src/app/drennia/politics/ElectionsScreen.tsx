'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import { SEGMENTS } from '@/lib/politicsConstants';
import { JURISDICTIONS, type JurisdictionId } from './_lib/session';
import { T, MONO, HEADING, SANS, stampStyle, glassPanelStyle } from './_lib/theme';
import { BLOC_NAME_BY_KEY, PILLAR_BY_AXIS, JURISDICTION_MODEL } from './_lib/model';
import JurisdictionSwitcher from './_components/JurisdictionSwitcher';
import { Shield, Activity, Users, Map, CalendarClock, TrendingUp, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

interface Props {
  selectedJurisdictionId: JurisdictionId;
  onJurisdictionChange: (id: JurisdictionId) => void;
  jurisdictionMeta: any;
  overview: any;
  character: any;
  parties: any[];
  myAp?: { current_ap: number; ap_cap: number };
  myPc?: { current_pc: number; pc_cap: number };
  onRefresh?: () => void;
}

const REAL_HOURS_PER_MONTH = 8; // GDD $3

// ── Glass Panel Component (Shared visual language with Command Center) ──
function GlassPanel({ title, children, accent, flex }: { title: React.ReactNode, children: React.ReactNode, accent?: string, flex?: number | string }) {
  return (
    <div style={{
      ...glassPanelStyle,
      flex,
      display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(145deg, rgba(18, 20, 26, 0.7) 0%, rgba(10, 12, 16, 0.9) 100%)',
      border: `1px solid rgba(255, 255, 255, 0.08)`,
      borderTop: accent ? `1px solid ${accent}` : `1px solid rgba(255, 255, 255, 0.15)`,
      boxShadow: accent ? `0 4px 24px ${accent}20, inset 0 1px 0 rgba(255,255,255,0.05)` : '0 4px 24px rgba(0,0,0,0.4)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ 
        padding: '10px 14px', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: accent || T.faint,
        background: 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 8
      }}>
        {title}
      </div>
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

// ── OLED Meter ──────────────────────────────────────────────
function OledMeter({ value, label, tone, display }: { value: number, label: string, tone: string, display?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.faint }}>{label}</span>
        <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: tone, textShadow: `0 0 8px ${tone}60` }}>{display ?? `${value.toFixed(1)}%`}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: tone, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 8px ${tone}` }} />
      </div>
    </div>
  );
}

// Indicative Fit (display only) — the engine uses the tuned POL_FIT_EXP formula.
function fitPct(platform: Record<string, number> | null, seg: any): number | null {
  if (!platform) return null;
  let wsum = 0, acc = 0;
  for (const ax of Object.keys(seg.priorities)) {
    const w = seg.priorities[ax];
    const diff = Math.abs((platform[ax] ?? 50) - seg.ideal[ax]) / 100;
    acc += w * (1 - diff); wsum += w;
  }
  return wsum ? Math.round((acc / wsum) * 100) : null;
}

/** Safe-parse a platform field that Postgres may return as a JSON string or object */
function parsePlatform(raw: any): Record<string, number> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as Record<string, number>; } catch { return null; }
  }
  return raw as Record<string, number>;
}

function leaning(seg: any): string {
  let topAx = ''; let topW = -1;
  for (const ax of Object.keys(seg.priorities)) if (seg.priorities[ax] > topW) { topW = seg.priorities[ax]; topAx = ax; }
  const p = PILLAR_BY_AXIS[topAx as keyof typeof PILLAR_BY_AXIS];
  if (!p) return '';
  const ideal = seg.ideal[topAx];
  const pole = ideal >= 60 ? p.high : ideal <= 40 ? p.low : 'Balanced';
  return `${p.name}: ${pole}`;
}

// ── Drennia Hex Constituency Map ─────────────────────────────────────────────

const PARTY_PALETTE = [
  '#4F6EF7', '#9F5BD4', '#D4A843', '#E05252',
  '#10D67A', '#F57C42', '#5CC8D8', '#C47AB0',
  '#7EC8A4', '#E8A04A', '#A0C4FF', '#CF6679',
];

// Drennia silhouette: wider in the middle-east, notch upper-left.
// Flat-top hex grid. Even rows no offset, odd rows shift right by HW/2.
// Drennia silhouette — LANDSCAPE orientation (wider than tall).
// Pointy-top offset grid: odd rows shift right by HW/2.
// 20 cols × 9 rows, capacity 158 — covers National (151) comfortably.
function buildDrenniaSlots(count: number): Array<[number, number]> {
  const shape: Array<[number, number]> = [];
  // [startCol, endCol] per row — wide mid-body, tapered top and bottom
  const rowDefs: Array<[number, number]> = [
    [ 4, 14],  // row 0 — 11  (top coast — slight taper)
    [ 2, 17],  // row 1 — 16
    [ 0, 19],  // row 2 — 20  (widest)
    [ 0, 19],  // row 3 — 20
    [ 0, 19],  // row 4 — 20  (wide mid belly)
    [ 1, 18],  // row 5 — 18
    [ 2, 17],  // row 6 — 16
    [ 4, 15],  // row 7 — 12
    [ 6, 13],  // row 8 —  8  (southern coast)
  ];
  // Capacity: 11+16+20+20+20+18+16+12+8 = 141 base
  // National (151) overflow appended as extra row below
  for (let r = 0; r < rowDefs.length; r++) {
    const [s, e] = rowDefs[r];
    for (let c = s; c <= e; c++) shape.push([c, r]);
  }
  if (count <= shape.length) return shape.slice(0, count);
  // Overflow row
  let er = rowDefs.length;
  let ec = 7;
  while (shape.length < count) {
    shape.push([ec, er]);
    ec++;
    if (ec > 12) { ec = 7; er++; }
  }
  return shape;
}

// Pointy-top hexagon polygon points
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // pointy-top: first vertex at top
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
}
interface HexMapProps {
  constituencies: any[];
  projections: any[];
  perConstituency: any[];
  myConstituencyId: string | null;
  selectedConstituencyId: string;
  onSelect: (id: string) => void;
  myParty: any;
  canFile: boolean;
  parties: any[];
}

function DrenniaHexMap({
  constituencies,
  projections,
  perConstituency,
  myConstituencyId,
  selectedConstituencyId,
  onSelect,
  myParty,
  canFile,
  parties,
}: HexMapProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const filterUid = useRef(`hm-${Math.random().toString(36).slice(2, 7)}`);
  const [svgPxW, setSvgPxW] = useState(600);

  useEffect(() => {
    setHoveredId(null);
    setTooltipPos(null);
    setClickedId(null);
  }, [constituencies]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setSvgPxW(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // partyId field on pulse.standings is "partyId" (camelCase)
  const partyColorMap = useMemo(() => {
    const rec: Record<string, string> = {};
    // Seed with all known parties
    parties?.forEach((p: any, i: number) => {
      rec[p.id] = p.colorHex || p.identity?.color || PARTY_PALETTE[i % PARTY_PALETTE.length];
    });
    projections.forEach((p: any, i: number) => {
      const id = p.partyId ?? p.id ?? p.party_id;
      if (id && !rec[id]) rec[id] = p.colorHex || p.identity?.color || PARTY_PALETTE[i % PARTY_PALETTE.length];
    });
    if (myParty?.id && !rec[myParty.id]) rec[myParty.id] = myParty.colorHex || myParty.identity?.color || '#C9A24A';
    return rec;
  }, [projections, myParty, parties]);

  const partyNameMap = useMemo(() => {
    const rec: Record<string, string> = {};
    parties?.forEach((p: any) => {
      rec[p.id] = p.name || p.abbreviation;
    });
    projections.forEach((p: any) => {
      const id = p.partyId ?? p.id ?? p.party_id;
      const name = p.name ?? p.party_name;
      if (id && name && !rec[id]) rec[id] = name;
    });
    if (myParty?.id && !rec[myParty.id]) rec[myParty.id] = myParty.name || myParty.abbreviation;
    return rec;
  }, [projections, parties, myParty]);

  // constituency winner from engine output (most accurate colour source)
  const constWinnerMap = useMemo(() => {
    const rec: Record<string, string | null> = {};
    for (const cr of perConstituency) {
      rec[cr.constituencyId] = cr.winnerPartyId ?? null;
    }
    for (const c of constituencies) {
      if (!(c.id in rec)) {
        rec[c.id] = c.candidates?.[0]?.party_id ?? null;
      }
    }
    return rec;
  }, [perConstituency, constituencies]);

  // per-constituency votes for detail panel
  const constVoteMap = useMemo(() => {
    const rec: Record<string, Record<string, number>> = {};
    for (const cr of perConstituency) {
      rec[cr.constituencyId] = cr.votes ?? {};
    }
    return rec;
  }, [perConstituency]);

  const R = 16;  // smaller radius fits 20-wide landscape shape
  const HW = R * Math.sqrt(3);
  const HH = R * 2;
  const PADDING = 6;

  const slots = useMemo(() => buildDrenniaSlots(constituencies.length), [constituencies.length]);

  const hexCentres = useMemo(() => {
    return slots.map(([col, row]) => {
      const x = col * HW + (row % 2 === 1 ? HW / 2 : 0);
      const y = row * (HH * 0.75);
      return { x, y };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, R]);

  const { viewBox } = useMemo(() => {
    if (!hexCentres.length) return { viewBox: '0 0 300 200' };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const h of hexCentres) {
      minX = Math.min(minX, h.x); maxX = Math.max(maxX, h.x);
      minY = Math.min(minY, h.y); maxY = Math.max(maxY, h.y);
    }
    return {
      viewBox: `${minX - R - PADDING} ${minY - R - PADDING} ${maxX - minX + (R + PADDING) * 2} ${maxY - minY + (R + PADDING) * 2}`,
    };
  }, [hexCentres, R, PADDING]);

  const canSelectHex = canFile && !myConstituencyId;
  const glowId = filterUid.current + '-g';
  const selGlowId = filterUid.current + '-s';

  const clickedConst = clickedId ? constituencies.find((c: any) => c.id === clickedId) : null;
  const clickedVotes = clickedId ? (constVoteMap[clickedId] ?? {}) : {};
  const clickedTotalVotes = Object.values(clickedVotes).reduce((s, v) => s + v, 0);

  if (constituencies.length === 0) return null;

  return (
    <div style={{
      background: 'linear-gradient(145deg, rgba(10,12,22,0.9) 0%, rgba(6,8,16,0.95) 100%)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.faint, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Map size={11} />
          Constituency Map
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>
          {constituencies.length} seats{canSelectHex ? ' · click to select' : ' · click for detail'}
        </div>
      </div>

      <div style={{ display: 'flex' }}>
        <div style={{ position: 'relative', padding: '12px 12px 4px', flex: 1, minWidth: 0 }}>
          <svg
            ref={svgRef}
            viewBox={viewBox}
            style={{ width: '100%', maxHeight: 260, display: 'block', overflow: 'visible' }}
            onMouseLeave={() => { setHoveredId(null); setTooltipPos(null); }}
          >
            <defs>
              <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id={selGlowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {constituencies.map((c: any, i: number) => {
              const centre = hexCentres[i];
              if (!centre) return null;
              const { x, y } = centre;
              const wp = constWinnerMap[c.id] ?? null;
              const color = wp ? (partyColorMap[wp] ?? '#3a3850') : '#1e1c2a';
              const isHovered = hoveredId === c.id;
              const isClicked = clickedId === c.id;
              const isSelected = selectedConstituencyId === c.id;
              const isMy = myConstituencyId === c.id;
              const isContested = (c.candidates?.length ?? 0) > 0;
              const base = isContested ? 0.78 : 0.14;
              const fo = isHovered || isClicked ? Math.min(1, base + 0.2) : base;
              const sc = isMy ? '#C9A24A' : isSelected ? 'rgba(201,162,74,0.7)' : isClicked ? 'rgba(255,255,255,0.5)' : isHovered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.08)';
              const sw = isMy ? 2.5 : (isSelected || isClicked) ? 1.8 : 0.7;
              return (
                <g
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  filter={isMy ? `url(#${selGlowId})` : undefined}
                  onMouseEnter={(e) => {
                    setHoveredId(c.id);
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseMove={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onClick={() => {
                    if (canSelectHex) onSelect(selectedConstituencyId === c.id ? '' : c.id);
                    setClickedId(clickedId === c.id ? null : c.id);
                    setHoveredId(null);
                    setTooltipPos(null);
                  }}
                >
                  {isMy && <polygon points={hexPoints(x, y, R - 0.5)} fill={color} opacity={0.3} stroke="none" />}
                  <polygon points={hexPoints(x, y, R - 1.2)} fill={color} fillOpacity={fo} stroke={sc} strokeWidth={sw} style={{ transition: 'fill-opacity 0.12s' }} />
                  {isMy && <circle cx={x} cy={y} r={4} fill="#C9A24A" opacity={0.95} />}
                </g>
              );
            })}
          </svg>

          {/* Hover tooltip — only when nothing is clicked */}
          {hoveredId && !clickedId && tooltipPos && (() => {
            const hc = constituencies.find((c: any) => c.id === hoveredId);
            if (!hc) return null;
            const hwp = constWinnerMap[hoveredId] ?? null;
            return (
              <div style={{
                position: 'absolute',
                left: Math.min(tooltipPos.x + 14, svgPxW - 190),
                top: Math.max(4, tooltipPos.y - 70),
                background: 'rgba(8,10,20,0.97)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 9, padding: '8px 12px',
                minWidth: 155, pointerEvents: 'none', zIndex: 10,
                boxShadow: '0 10px 28px rgba(0,0,0,0.6)',
              }}>
                <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, color: T.ivory, marginBottom: 2 }}>{hc.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginBottom: 5 }}>
                  {((hc.registeredVoters ?? 80000) / 1000).toFixed(0)}k voters · {(hc.candidates?.length ?? 0)} candidate{hc.candidates?.length !== 1 ? 's' : ''}
                </div>
                {hwp ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: partyColorMap[hwp] ?? '#888' }} />
                    <span style={{ fontFamily: MONO, fontSize: 10, color: T.muted }}>{partyNameMap[hwp] ?? 'Unknown'} projected</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint }}>No candidates filed</div>
                )}
                <div style={{ fontFamily: MONO, fontSize: 7, color: 'rgba(255,255,255,0.25)', marginTop: 4, letterSpacing: '0.08em' }}>
                  CLICK FOR VOTE BREAKDOWN
                </div>
              </div>
            );
          })()}
        </div>

        {/* Side detail panel */}
        {clickedConst && (
          <div style={{
            width: 200, flexShrink: 0,
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: T.ivory, lineHeight: 1.3 }}>{clickedConst.name}</div>
                <div style={{ fontFamily: MONO, fontSize: 8, color: T.faint, marginTop: 3 }}>
                  {((clickedConst.registeredVoters ?? 80000) / 1000).toFixed(0)}k registered voters
                </div>
              </div>
              <button
                onClick={() => setClickedId(null)}
                style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 0 0 8px', flexShrink: 0 }}
              >✕</button>
            </div>

            {clickedConst.candidates?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.faint }}>
                  Projected Vote Share
                </div>
                {[...clickedConst.candidates]
                  .map((cand: any) => ({
                    ...cand,
                    voteCount: clickedVotes[cand.id] ?? 0,
                  }))
                  .sort((a: any, b: any) => b.voteCount - a.voteCount)
                  .map((cand: any, idx: number) => {
                    const pct = clickedTotalVotes > 0 ? (cand.voteCount / clickedTotalVotes) * 100 : 0;
                    const col = partyColorMap[cand.party_id] ?? '#555';
                    const nm = partyNameMap[cand.party_id] ?? 'Unknown';
                    const isWin = idx === 0 && constWinnerMap[clickedConst.id] === cand.party_id;
                    return (
                      <div key={cand.id ?? idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                            <span style={{ fontFamily: MONO, fontSize: 9, color: isWin ? T.ivory : T.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nm}</span>
                          </div>
                          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: col, flexShrink: 0, marginLeft: 4 }}>
                            {clickedTotalVotes > 0 ? `${pct.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, opacity: 0.9 }} />
                        </div>
                        {isWin && (
                          <div style={{ fontFamily: MONO, fontSize: 7, color: T.mint, letterSpacing: '0.1em', marginTop: 2 }}>★ PROJECTED WINNER</div>
                        )}
                      </div>
                    );
                  })}
                {clickedTotalVotes === 0 && (
                  <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, fontStyle: 'italic' }}>Vote projections loading…</div>
                )}
              </div>
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>No candidates filed in this constituency.</div>
            )}

            {canSelectHex && (
              <button
                onClick={() => onSelect(selectedConstituencyId === clickedConst.id ? '' : clickedConst.id)}
                style={{
                  marginTop: 6, padding: '7px 10px',
                  background: selectedConstituencyId === clickedConst.id ? 'rgba(201,162,74,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selectedConstituencyId === clickedConst.id ? 'rgba(201,162,74,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 6, cursor: 'pointer',
                  fontFamily: MONO, fontSize: 10, fontWeight: 700,
                  color: selectedConstituencyId === clickedConst.id ? T.warning : T.faint,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}
              >
                {selectedConstituencyId === clickedConst.id ? '✓ Selected' : 'Select Constituency'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ padding: '6px 16px 10px', display: 'flex', flexWrap: 'wrap', gap: '4px 14px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        {projections.slice(0, 8).map((p: any, i: number) => {
          const pid = p.partyId ?? p.id ?? p.party_id;
          const col = partyColorMap[pid] ?? PARTY_PALETTE[i % PARTY_PALETTE.length];
          const seats = Number(p.seats ?? p.projected_seats ?? 0);
          return (
            <div key={pid ?? i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: col, opacity: 0.9 }} />
              <span style={{ fontFamily: MONO, fontSize: 9, color: T.muted }}>{p.name ?? p.party_name}{seats > 0 ? ` · ${seats}` : ''}</span>
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#1e1c2a' }} />
          <span style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>No candidates</span>
        </div>
        {myConstituencyId && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A24A' }} />
            <span style={{ fontFamily: MONO, fontSize: 9, color: T.warning }}>Your seat</span>
          </div>
        )}
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────


export default function ElectionsScreen({ selectedJurisdictionId, onJurisdictionChange, jurisdictionMeta, overview, character, parties, onRefresh }: Props) {
  const jurisdiction = JURISDICTIONS.find((j) => j.id === selectedJurisdictionId);
  const isLocked = jurisdiction?.isLocked ?? true;
  const jModel = JURISDICTION_MODEL[selectedJurisdictionId] || JURISDICTION_MODEL.national;

  const { data: polls, mutate: mutatePolls } = useSWR(
    isLocked ? null : ['polls', selectedJurisdictionId],
    () => politicsApi.getPolls(selectedJurisdictionId).catch(() => null)
  );
  const { data: constData, mutate: mutateConst } = useSWR(
    isLocked ? null : ['constituencies', selectedJurisdictionId],
    () => politicsApi.getConstituencies(selectedJurisdictionId).catch(() => null)
  );

  const [selectedConstituencyId, setSelectedConstituencyId] = useState<string>('');
  const [candidacyStatus, setCandidacyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [candidacyMsg, setCandidacyMsg] = useState('');
  const [showConstPicker, setShowConstPicker] = useState(false);

  const myParty = overview?.globalParty || (Array.isArray(parties) ? parties.find((p: any) => p.leader_character_id === character?.id || p.members?.some((m: any) => m.character_id === character?.id || m.id === character?.id)) : undefined);
  const myPlatform = parsePlatform(myParty?.platform);

  // polls shape: { ...projection, pulse }. pulse.standings uses partyId (camelCase).
  const projections: any[] = polls?.pulse?.standings ?? [];
  const perConstituency: any[] = polls?.perConstituency ?? [];

  const maxSeats = projections.reduce((m: number, p: any) => Math.max(m, Number(p.seats ?? 0)), 0);
  const totalVotes = projections.reduce((sum: number, p: any) => sum + Number(p.votes ?? 0), 0);

  // ── Election Hero Data ──
  const cycle = overview?.cycle;
  const phase: string = cycle?.phase ?? 'governing';
  const cycleNumber = cycle?.cycleNumber;
  const isFormation = phase === 'formation';

  // During formation we show the formation window countdown, not months-to-election.
  const rawMonths: number | null = cycle?.monthsToElection ?? null;
  // monthsToFormationEnd is provided directly by the API during 'formation' phase.
  const formationMonthsLeft: number | null = cycle?.monthsToFormationEnd ?? null;
  const months: number | null = isFormation ? formationMonthsLeft : rawMonths;

  const bigValue = months == null ? '—' : months <= 0 ? 'IMMINENT' : String(months).padStart(2, '0');
  const unit = months == null || months <= 0 ? '' : months === 1 ? 'MONTH' : 'MONTHS';
  const countdownLabel = isFormation ? 'Formation ends in' : 'Countdown';

  const realHours = months != null ? months * REAL_HOURS_PER_MONTH : null;
  const realNote = realHours != null && months! > 0
    ? `— ${Math.floor(realHours / 24)}d ${realHours % 24}h real time`
    : null;

  const termProgress = rawMonths != null && jModel.termMonths > 0
    ? Math.max(0, Math.min(100, ((jModel.termMonths - rawMonths) / jModel.termMonths) * 100))
    : null;

  // ── Player Candidacy State ──
  const myConstituencyId: string | null = constData?.myConstituencyId ?? null;
  const alreadyFiled = !!myConstituencyId;
  const constituencies: any[] = constData?.constituencies ?? [];
  const canFile = !!myParty && !myParty.is_npc && ['filing', 'campaign', 'governing'].includes(phase) && !alreadyFiled;
  const isElectionLive = phase === 'polling' || phase === 'formation';

  // Coalition state (formation phase)
  const { data: coalitionData, mutate: mutateCoalition } = useSWR(
    isFormation && !isLocked ? ['coalition', selectedJurisdictionId] : null,
    () => politicsApi.getFormingCoalition(selectedJurisdictionId).catch(() => null)
  );
  const [coalitionAction, setCoalitionAction] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [coalitionMsg, setCoalitionMsg] = useState('');

  async function handleCoalitionAction(action: 'invite' | 'accept' | 'decline', targetPartyId: string) {
    setCoalitionAction('loading');
    setCoalitionMsg('');
    try {
      const result = await politicsApi.manageCoalition(action, targetPartyId, selectedJurisdictionId);
      setCoalitionAction('success');
      setCoalitionMsg(result?.message || 'Coalition updated.');
      mutateCoalition();
      onRefresh?.();
    } catch (err: any) {
      setCoalitionAction('error');
      setCoalitionMsg(err?.response?.data?.message || err?.message || 'Coalition action failed.');
    }
  }

  const selectedConst = constituencies.find((c: any) => c.id === selectedConstituencyId);

  async function handleDeclareCandidacy() {
    if (!selectedConstituencyId) {
      setCandidacyMsg('Select a constituency first.');
      setCandidacyStatus('error');
      return;
    }
    setCandidacyStatus('loading');
    setCandidacyMsg('');
    try {
      await politicsApi.declareCandidacy(selectedConstituencyId, selectedJurisdictionId);
      setCandidacyStatus('success');
      setCandidacyMsg('Candidacy declared! Your party will contest this seat.');
      mutatePolls();
      mutateConst();
      onRefresh?.();
    } catch (err: any) {
      setCandidacyStatus('error');
      setCandidacyMsg(err?.response?.data?.message || err?.message || 'Failed to declare candidacy.');
    }
  }

  // Phase badge config
  const PHASE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    governing: { label: 'Governing', color: T.blueLine, bg: 'rgba(79,110,247,0.12)' },
    filing:    { label: 'Filing Open', color: T.mint, bg: 'rgba(16,214,122,0.12)' },
    campaign:  { label: 'Campaign', color: T.warning, bg: 'rgba(255,183,0,0.12)' },
    polling:   { label: 'Election Day', color: T.red, bg: 'rgba(220,38,38,0.18)' },
    formation: { label: 'Gov. Formation', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  };
  const badge = PHASE_BADGE[phase] ?? PHASE_BADGE.governing;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24, fontFamily: SANS }}>

      {isLocked ? (
        <GlassPanel title={<><Shield size={14} /> Locked</>}>
          <div style={{ color: T.faint, fontStyle: 'italic' }}>Drennia Nation is not yet open for political activity.</div>
        </GlassPanel>
      ) : (
        <>
          {/* ── OLED ELECTION HERO ── */}
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12,
            background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,15,30,0.95) 100%)',
            border: `1px solid ${months != null && months <= 6 ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 10,
            padding: '14px 18px',
            boxShadow: months != null && months <= 6 ? 'inset 0 1px 0 rgba(220,38,38,0.2), 0 12px 32px rgba(220,38,38,0.1)' : 'inset 0 1px 0 rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.5)',
            position: 'relative', overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ ...stampStyle, color: T.gold, borderColor: 'rgba(255,215,0,0.3)', textShadow: `0 0 10px ${T.goldSoft}` }}>War Room</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: badge.color, background: badge.bg, border: `1px solid ${badge.color}30`, padding: '2px 8px', borderRadius: 4 }}>
                    {badge.label}
                  </div>
                </div>
                <h1 style={{ color: T.ivory, fontSize: 20, fontWeight: 700, fontFamily: HEADING, margin: '0 0 4px', letterSpacing: '-0.02em', textShadow: '0 0 20px rgba(255,255,255,0.2)' }}>
                  Election Control
                </h1>
                <div style={{ fontFamily: MONO, fontSize: 12, color: T.blueLine, marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  National Assembly {cycleNumber != null ? `— Cycle ${cycleNumber}` : ''}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, marginTop: 8, letterSpacing: '0.05em' }}>
                  {jModel.seats} Seats Total • {jModel.majority} for Majority
                </div>
              </div>

              {/* OLED Countdown Block */}
              <div style={{ 
                background: months != null && months <= 6 ? 'rgba(220,38,38,0.1)' : 'rgba(0,0,0,0.4)', 
                border: `1px solid ${months != null && months <= 6 ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.08)'}`, 
                borderRadius: 12, padding: '20px 28px', minWidth: 180, display: 'flex', flexDirection: 'column', alignItems: 'center' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: months != null && months <= 6 ? T.red : T.faint, fontFamily: MONO, fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  <CalendarClock size={12} /> {countdownLabel}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 12 }}>
                  <span style={{ fontFamily: MONO, fontSize: 42, fontWeight: 800, color: months != null && months <= 6 ? T.red : T.warning, lineHeight: 1, textShadow: months != null && months <= 6 ? `0 0 24px ${T.red}60` : `0 0 24px ${T.warning}40` }}>
                    {bigValue}
                  </span>
                  {unit && <span style={{ fontFamily: MONO, fontSize: 14, color: months != null && months <= 6 ? T.red : T.warning, letterSpacing: '0.1em' }}>{unit}</span>}
                </div>
                {realNote && (
                  <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 8, letterSpacing: '0.05em', opacity: 0.8 }}>
                    {realNote}
                  </div>
                )}
              </div>
            </div>

            {termProgress != null && (
              <div style={{ position: 'relative', zIndex: 1, marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.faint }}>Term Progress</span>
                  <span style={{ fontFamily: MONO, fontSize: 10, color: T.gold }}>{Math.round(termProgress)}%</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${termProgress}%`, background: T.gold, boxShadow: `0 0 12px ${T.goldSoft}` }} />
                </div>
              </div>
            )}
          </div>

          {/* ── PLAYER ACTION PANEL ── */}
          {myParty && (
            <div style={{
              background: 'rgba(10,12,22,0.85)',
              border: `1px solid ${alreadyFiled ? 'rgba(16,214,122,0.2)' : isElectionLive ? 'rgba(220,38,38,0.2)' : 'rgba(255,183,0,0.2)'}`,
              borderRadius: 10, overflow: 'hidden',
            }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.faint }}>Your Candidacy</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint }}>Party: <span style={{ color: T.ivory }}>{myParty.name}</span></div>
              </div>

              <div style={{ padding: '14px 16px' }}>
                {/* Already filed */}
                {alreadyFiled && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <CheckCircle size={16} color={T.mint} />
                    <div>
                      <div style={{ color: T.mint, fontFamily: SANS, fontSize: 13, fontWeight: 600 }}>Candidacy Filed</div>
                      <div style={{ color: T.faint, fontFamily: MONO, fontSize: 10, marginTop: 2 }}>
                        Contesting: {constituencies.find((c: any) => c.id === myConstituencyId)?.name ?? 'Your constituency'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Election is live — polling day, no filing */}
                {!alreadyFiled && phase === 'polling' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={16} color={T.red} />
                    <div style={{ color: T.muted, fontFamily: SANS, fontSize: 13 }}>
                      Candidacy filing is closed during the election.
                    </div>
                  </div>
                )}

                {/* Formation phase — coalition negotiation panel */}
                {isFormation && (() => {
                  // API returns enriched shape: { formateur, accepted[], invited[] }
                  const forming = coalitionData?.coalition;
                  const formateur = forming?.formateur ?? null;
                  const acceptedList: any[] = forming?.accepted ?? [];
                  const invitedList: any[] = forming?.invited ?? [];

                  const isLeader = !!forming && !!myParty && formateur?.id === myParty.id;
                  const isInvited = !!myParty && invitedList.some((p: any) => p.id === myParty.id);
                  const isAccepted = !!myParty && acceptedList.some((p: any) => p.id === myParty.id);

                  // Total confirmed seats = formateur seats + all accepted seats
                  const confirmedSeats = (formateur?.seats ?? 0) + acceptedList.reduce((s: number, p: any) => s + (p.seats ?? 0), 0);

                  // Parties the formateur can still invite (exclude already accepted/invited and self)
                  const invitableParties = isLeader
                    ? parties.filter((p: any) =>
                        !p.is_npc &&
                        p.id !== myParty!.id &&
                        !acceptedList.some((a: any) => a.id === p.id) &&
                        !invitedList.some((i: any) => i.id === p.id)
                      )
                    : [];

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Status row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c084fc', boxShadow: '0 0 8px #c084fc80', flexShrink: 0 }} />
                        <div style={{ fontFamily: MONO, fontSize: 11, color: '#c084fc', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                          Government Formation Window
                        </div>
                      </div>

                      {!forming && (
                        <div style={{ color: T.muted, fontFamily: SANS, fontSize: 13 }}>
                          Election results are being tallied. Coalition talks will begin shortly.
                        </div>
                      )}

                      {forming && (
                        <>
                          {/* Forming coalition summary */}
                          <div style={{
                            background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)',
                            borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Formateur
                              </span>
                              <span style={{ fontFamily: SANS, fontSize: 12, color: T.ivory, fontWeight: 600 }}>
                                {formateur?.name ?? 'Unknown'}{formateur?.seats != null ? ` · ${formateur.seats} seats` : ''}
                              </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Confirmed seats
                              </span>
                              <span style={{ fontFamily: MONO, fontSize: 12, color: confirmedSeats >= jModel.majority ? T.mint : T.warning, fontWeight: 700 }}>
                                {confirmedSeats} / {jModel.majority} needed
                              </span>
                            </div>
                            {acceptedList.length > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                  Partners
                                </span>
                                <span style={{ fontFamily: SANS, fontSize: 11, color: T.text }}>
                                  {acceptedList.map((p: any) => p.name).join(', ')}
                                </span>
                              </div>
                            )}
                            {invitedList.length > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontFamily: MONO, fontSize: 10, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                  Pending
                                </span>
                                <span style={{ fontFamily: SANS, fontSize: 11, color: T.warning }}>
                                  {invitedList.map((p: any) => p.name).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Player is the formateur — can invite others */}
                          {isLeader && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontFamily: MONO, fontSize: 10, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                Invite parties to join your coalition
                              </div>
                              {invitableParties.length > 0 ? invitableParties.map((p: any) => (
                                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '7px 10px' }}>
                                  <span style={{ fontFamily: SANS, fontSize: 12, color: T.text }}>{p.name}</span>
                                  <button
                                    disabled={coalitionAction === 'loading'}
                                    onClick={() => handleCoalitionAction('invite', p.id)}
                                    style={{
                                      fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                                      background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.3)',
                                      color: '#c084fc', borderRadius: 5, padding: '4px 10px', cursor: 'pointer',
                                    }}
                                  >
                                    Invite
                                  </button>
                                </div>
                              )) : (
                                <div style={{ color: T.faint, fontFamily: SANS, fontSize: 12, fontStyle: 'italic' }}>
                                  No other player parties available to invite.
                                </div>
                              )}
                            </div>
                          )}

                          {/* Player was invited — can accept or decline */}
                          {isInvited && !isAccepted && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <div style={{ fontFamily: SANS, fontSize: 13, color: T.text }}>
                                You have been invited to join the coalition. Accept to add your seats.
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                  disabled={coalitionAction === 'loading'}
                                  onClick={() => handleCoalitionAction('accept', myParty!.id)}
                                  style={{
                                    fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                                    background: 'rgba(16,214,122,0.12)', border: '1px solid rgba(16,214,122,0.3)',
                                    color: T.mint, borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
                                  }}
                                >
                                  Accept
                                </button>
                                <button
                                  disabled={coalitionAction === 'loading'}
                                  onClick={() => handleCoalitionAction('decline', myParty!.id)}
                                  style={{
                                    fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                                    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
                                    color: T.red, borderRadius: 6, padding: '8px 16px', cursor: 'pointer',
                                  }}
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Player already accepted */}
                          {isAccepted && !isLeader && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <CheckCircle size={14} color={T.mint} />
                              <span style={{ fontFamily: SANS, fontSize: 13, color: T.mint }}>Your party has joined the coalition.</span>
                            </div>
                          )}

                          {/* Not involved */}
                          {!isLeader && !isInvited && !isAccepted && (
                            <div style={{ color: T.muted, fontFamily: SANS, fontSize: 13 }}>
                              Your party has not been invited to join the forming coalition. Monitor negotiations.
                            </div>
                          )}
                        </>
                      )}

                      {/* Feedback message */}
                      {coalitionAction !== 'idle' && coalitionMsg && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: SANS, fontSize: 12, color: coalitionAction === 'success' ? T.mint : T.red }}>
                          {coalitionAction === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                          {coalitionMsg}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* NPC party — player can't act */}
                {myParty.is_npc === true && !isFormation && (
                  <div style={{ color: T.muted, fontFamily: SANS, fontSize: 13 }}>
                    Join a player party to contest elections.
                  </div>
                )}

                {/* Can file — show constituency picker + button */}
                {canFile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ color: T.text, fontFamily: SANS, fontSize: 13 }}>
                      Select a constituency for your party to contest, then declare candidacy.
                    </div>

                    {/* Constituency selector — shown as text when map is available, dropdown as fallback */}
                    {selectedConst ? (
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'rgba(201,162,74,0.07)', border: '1px solid rgba(201,162,74,0.25)',
                        borderRadius: 7, padding: '9px 14px',
                      }}>
                        <div>
                          <div style={{ fontFamily: MONO, fontSize: 11, color: T.warning }}>{selectedConst.name}</div>
                          <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, marginTop: 2 }}>
                            {((selectedConst.registeredVoters ?? 0) / 1000).toFixed(0)}k voters
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedConstituencyId(''); setCandidacyStatus('idle'); }}
                          style={{ background: 'none', border: 'none', color: T.faint, cursor: 'pointer', fontFamily: MONO, fontSize: 10 }}
                        >
                          Change ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setShowConstPicker(!showConstPicker)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 7, padding: '9px 12px', cursor: 'pointer', color: T.faint,
                            fontFamily: MONO, fontSize: 12,
                          }}
                        >
                          <span>Click a hex on the map, or choose here…</span>
                          <ChevronDown size={13} color={T.faint} />
                        </button>

                        {showConstPicker && constituencies.length > 0 && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                            background: 'rgba(14,16,24,0.98)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 8, maxHeight: 220, overflowY: 'auto',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                          }}>
                            {constituencies.map((c: any) => {
                              const taken = c.candidates?.some((cd: any) => cd.character_id !== null && !cd.is_npc);
                              const myPartyHere = c.candidates?.some((cd: any) => cd.party_id === myParty.id);
                              return (
                                <button
                                  key={c.id}
                                  onClick={() => { setSelectedConstituencyId(c.id); setShowConstPicker(false); setCandidacyStatus('idle'); }}
                                  style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '9px 14px', background: selectedConstituencyId === c.id ? 'rgba(255,183,0,0.08)' : 'transparent',
                                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    cursor: 'pointer', color: taken && !myPartyHere ? T.faint : T.ivory,
                                    fontFamily: MONO, fontSize: 11, textAlign: 'left',
                                  }}
                                >
                                  <span>{c.name}</span>
                                  <span style={{ fontSize: 10, color: myPartyHere ? T.mint : taken ? T.red : T.faint }}>
                                    {myPartyHere ? 'Your party' : taken ? 'Contested' : `${(c.registeredVoters / 1000).toFixed(0)}k voters`}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Declare button */}
                    <button
                      onClick={handleDeclareCandidacy}
                      disabled={candidacyStatus === 'loading' || !selectedConstituencyId}
                      style={{
                        padding: '10px 20px', borderRadius: 7, fontFamily: MONO, fontSize: 12, fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase', cursor: candidacyStatus === 'loading' || !selectedConstituencyId ? 'not-allowed' : 'pointer',
                        background: !selectedConstituencyId ? 'rgba(255,255,255,0.04)' : 'rgba(255,183,0,0.15)',
                        border: `1px solid ${!selectedConstituencyId ? 'rgba(255,255,255,0.08)' : 'rgba(255,183,0,0.4)'}`,
                        color: !selectedConstituencyId ? T.faint : T.warning,
                        transition: 'all 0.2s',
                      }}
                    >
                      {candidacyStatus === 'loading' ? 'Filing...' : 'Declare Candidacy'}
                    </button>

                    {candidacyStatus !== 'idle' && candidacyMsg && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: SANS, fontSize: 12, color: candidacyStatus === 'success' ? T.mint : T.red }}>
                        {candidacyStatus === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        {candidacyMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── DRENNIA HEX MAP ── */}
          {constituencies.length > 0 && (
            <DrenniaHexMap
              constituencies={constituencies}
              projections={projections}
              perConstituency={perConstituency}
              myConstituencyId={myConstituencyId}
              selectedConstituencyId={selectedConstituencyId}
                                      onSelect={(id) => {
                setSelectedConstituencyId(id);
                setShowConstPicker(false);
                setCandidacyStatus('idle');
              }}
              myParty={myParty}
              canFile={canFile}
              parties={parties}
            />
          )}

          {/* ── PROJECTED RESULT — Nationhood style ── */}
          <div style={{
            background: 'rgba(10,12,20,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.faint }}>Projected Result & Seat Swings</div>
              <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint }}>if the vote were held today</div>
            </div>
            <div style={{ padding: '8px 16px 12px' }}>
              <div style={{ fontFamily: SANS, fontSize: 12, color: T.muted, marginBottom: 10 }}>
                A party needs <strong style={{ color: T.ivory }}>{jModel.majority}</strong> of <strong style={{ color: T.ivory }}>{jModel.seats}</strong> seats to govern alone.
              </div>
              {projections.length === 0 ? (
                <div style={{ color: T.faint, fontStyle: 'italic', padding: '16px 0', textAlign: 'center', fontSize: 12 }}>
                  Projections sharpen as parties file and campaigns build reach.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {projections.slice(0, 8).map((p: any, i: number) => {
                    const share = p.projected_share ?? p.share ?? p.vote_share ?? (totalVotes > 0 ? (Number(p.votes ?? 0) / totalVotes) : 0);
                    const seats = Number(p.projected_seats ?? p.seats ?? 0);
                    const seatChange = Number(p.seat_change ?? p.seatChange ?? 0);
                    const pct = share <= 1 ? (share * 100).toFixed(1) : Number(share).toFixed(1);
                    const barVal = maxSeats > 0 ? (seats / maxSeats) * 75 : Number(pct) * 0.75;
                    const isMine = p.isMine || (myParty && (p.id === myParty.id || p.party_id === myParty.id || p.name === myParty.name));
                    const isMajority = seats >= jModel.majority;
                    const PARTY_COLORS = ['#4F6EF7', '#7B3FD4', '#D4A843', '#E05252', '#10D67A', '#F57C42', '#5CC8D8', '#C4C4C4'];
                    const tone = isMine ? T.gold : PARTY_COLORS[i % PARTY_COLORS.length];

                    const swingText = seatChange > 0 ? `▲ +${seatChange}` : seatChange < 0 ? `▼ ${seatChange}` : `► Stable`;
                    const swingColor = seatChange > 0 ? T.mint : seatChange < 0 ? T.red : T.faint;

                    return (
                      <div key={p.id || p.party_id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tone, flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 160, flexShrink: 0 }}>
                          <span style={{ color: isMine ? T.gold : T.text, fontSize: 13, fontWeight: isMine ? 700 : 400, fontFamily: SANS }}>
                            {p.name || p.party_name || 'Party'}{isMine ? ' YOU' : ''}
                          </span>
                          <span style={{ color: T.faint, fontSize: 10, fontFamily: MONO }}>
                            {pct}% vote share
                          </span>
                        </div>
                        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${barVal}%`, background: tone, transition: 'width 1s ease', opacity: 0.85 }} />
                          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(jModel.majority / jModel.seats) * 100}%`, width: 1, background: 'rgba(255,255,255,0.2)' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120, justifyContent: 'flex-end', flexShrink: 0 }}>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: swingColor, background: `${swingColor}15`, border: `1px solid ${swingColor}30`, padding: '1px 6px', borderRadius: 4 }}>
                            {swingText}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 12, color: isMajority ? T.mint : (isMine ? T.gold : T.ivory), fontWeight: 600, textAlign: 'right', minWidth: 65 }}>
                            {seats} seats{isMajority ? ' ✓' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── THE ELECTORATE — compact grid ── */}
          <div style={{
            background: 'rgba(10,12,20,0.7)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, overflow: 'hidden',
          }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.faint }}>The Electorate</div>
              <div style={{ fontFamily: SANS, fontSize: 11, color: T.muted }}>Your platform fit per demographic bloc</div>
            </div>
            <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 6 }}>
              {SEGMENTS.map((seg: any) => {
                const fit = fitPct(myPlatform, seg);
                const sizePct = Math.round(seg.size * 100);
                const fitColor = fit == null ? T.faint : fit >= 70 ? T.mint : fit >= 40 ? T.warning : T.red;
                return (
                  <div key={seg.key} style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 7, padding: '9px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ color: T.ivory, fontWeight: 600, fontSize: 12, fontFamily: HEADING }}>{BLOC_NAME_BY_KEY[seg.key] || seg.label}</span>
                      <span style={{ color: fitColor, fontFamily: MONO, fontSize: 11, fontWeight: 700 }}>{fit == null ? '—' : `${fit}%`}</span>
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{leaning(seg)} · {sizePct}% of vote</div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${fit ?? 0}%`, background: fitColor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
