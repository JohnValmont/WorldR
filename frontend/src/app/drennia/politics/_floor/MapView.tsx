'use client';
// The political map: the three nations on one continent, every district
// coloured by who holds it, who leads today's poll, what kind of voters live
// there, or how strong one party is. Click a district for its full story.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { politicsApi } from '@/lib/api';
import type { MapDistrict, MapNation, MapParty } from './types';
import { Card, Chip, Label, Meter, PartyDot, T, useFloor } from './kit';
import { LAKES, MAP_H, MAP_W, NATION_COLOR, buildCells, buildCoast, borders, ideologyOf, nationOutlines, nationShapes, pathOf, placeSites, viewBoxFor, type Site } from './mapGeo';
import { TAB_DATA } from './tabData';

type Layer = 'nations' | 'strong' | 'poll' | 'voters' | 'party';
const LAYERS: { id: Layer; label: string; hint: string }[] = [
  { id: 'nations', label: 'Countries', hint: 'The three nations, their regions and borders.' },
  { id: 'strong', label: 'Strongholds', hint: 'Who won the most seats in each district at the last election. Deeper colour = a tighter grip.' },
  { id: 'poll', label: 'Poll today', hint: 'Who would win each district if the election were held today. Campaigning moves this.' },
  { id: 'voters', label: 'Voters', hint: 'The largest voter group in each district: who you need to win there.' },
  { id: 'party', label: 'One party', hint: 'How strong one party is in every district (today\'s poll).' },
];
const GROUP_COLOR: Record<string, string> = {
  industrial_workers: '#B85A3C', logistics_trade_workers: '#2C8795', factory_business_owners: '#B89422',
  civic_professionals: '#6C68C0', suburban_families: '#5B9656',
};
const LAND = '#CFC2A3';
const INK = '#2C241B';

const coast = buildCoast();
const coastPath = pathOf(coast);

function top(shares: Record<string, number>, seats: Record<string, number>): { id: string | null; second: number; first: number } {
  const ids = Object.keys({ ...shares, ...seats });
  if (!ids.length) return { id: null, first: 0, second: 0 };
  ids.sort((a, b) => (seats[b] ?? 0) - (seats[a] ?? 0) || (shares[b] ?? 0) - (shares[a] ?? 0));
  const s = ids.map(i => shares[i] ?? 0).sort((a, b) => b - a);
  return { id: ids[0], first: s[0] ?? 0, second: s[1] ?? 0 };
}
const star = (x: number, y: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d + 'Z';
};

export default function MapView() {
  const { desk } = useFloor();
  const { data, error } = useSWR(TAB_DATA.map.key, TAB_DATA.map.fetch, { refreshInterval: 60_000 });
  const [layer, setLayer] = useState<Layer>('nations');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null); // nation code, or null for the whole continent
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [svgW, setSvgW] = useState(900);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setSvgW(el.clientWidth || 900));
    ro.observe(el); setSvgW(el.clientWidth || 900);
    return () => ro.disconnect();
  });

  const nations = data?.nations ?? [];
  const myNation = nations.find(n => n.name === desk.nation.shortName) ?? nations[0];
  // Open on the player's own nation the first time the map loads.
  const opened = useRef(false);
  useEffect(() => { if (myNation && !opened.current) { opened.current = true; setFocus(myNation.code); } }, [myNation]);

  const geo = useMemo(() => {
    const all = nations.flatMap(n => n.districts.map(d => ({ id: d.id, region: d.region, voters: d.voters, name: d.name })));
    const sites = placeSites(all);
    const cells = buildCells(sites, coast);
    return { sites, cells, lines: borders(cells), outlines: nationOutlines(cells), shapes: nationShapes(cells) };
  }, [nations]);

  const districtById = useMemo(() => {
    const m = new Map<string, { d: MapDistrict; n: MapNation }>();
    for (const n of nations) for (const d of n.districts) m.set(d.id, { d, n });
    return m;
  }, [nations]);
  const partyById = useMemo(() => {
    const m = new Map<string, MapParty & { nation: string }>();
    for (const n of nations) for (const p of n.parties) m.set(p.id, { ...p, nation: n.code });
    return m;
  }, [nations]);
  const siteById = useMemo(() => new Map<string, Site>(geo.sites.map(s => [s.id, s])), [geo]);

  // Camera: glide between the continent and one nation.
  const target = useMemo(() => {
    if (!focus) return [0, 0, MAP_W, MAP_H] as [number, number, number, number];
    return viewBoxFor(geo.sites.filter(s => s.nation === focus), 70);
  }, [focus, geo]);
  const [vb, setVb] = useState<[number, number, number, number]>([0, 0, MAP_W, MAP_H]);
  const vbRef = useRef(vb);
  useEffect(() => {
    const from = vbRef.current, to = target, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 550), e = 1 - Math.pow(1 - k, 3);
      const v = from.map((f, i) => f + (to[i] - f) * e) as [number, number, number, number];
      vbRef.current = v; setVb(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const party = partyId ? partyById.get(partyId) : null;
  const maxPartyShare = useMemo(() => {
    if (!party) return 1;
    const n = nations.find(x => x.code === party.nation);
    return Math.max(0.05, ...(n?.districts.map(d => d.poll.shares[party.id] ?? 0) ?? [0]));
  }, [party, nations]);

  const regionIndex = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nations) n.regions.forEach((r, i) => m.set(r.code, i));
    return m;
  }, [nations]);

  function fill(d: MapDistrict): { color: string; opacity: number } {
    if (layer === 'nations') {
      const nation = siteById.get(d.id)?.nation ?? '';
      return { color: NATION_COLOR[nation] ?? LAND, opacity: [0.62, 0.48, 0.55, 0.42][regionIndex.get(d.region) ?? 0] };
    }
    if (layer === 'voters') {
      const entries = Object.entries(d.groups ?? {});
      const total = entries.reduce((a, [, v]) => a + Number(v), 0) || 1;
      const [k, v] = entries.sort((a, b) => Number(b[1]) - Number(a[1]))[0] ?? ['', 0];
      return { color: GROUP_COLOR[k] ?? LAND, opacity: Math.min(0.9, 0.3 + 1.6 * (Number(v) / total - 0.2)) };
    }
    if (layer === 'party') {
      if (!party) return { color: LAND, opacity: 0 };
      const s = d.poll.shares[party.id];
      if (s == null) return { color: '#8A8170', opacity: 0.35 };
      return { color: party.color, opacity: 0.1 + 0.8 * (s / maxPartyShare) };
    }
    const src = layer === 'poll' ? d.poll : d.last;
    const t = top(src.shares, src.seats);
    if (!t.id) return { color: LAND, opacity: 0 };
    const grip = d.seats > 0 ? (src.seats[t.id] ?? 0) / d.seats : t.first;
    return { color: partyById.get(t.id)?.color ?? '#7A8594', opacity: Math.min(0.92, 0.32 + 0.45 * grip + 1.2 * (t.first - t.second)) };
  }

  const sel = selected ? districtById.get(selected) : null;
  const panelNation = sel?.n ?? nations.find(n => n.code === focus) ?? myNation;
  // Map units per screen pixel: labels, pins and borders are sized in screen pixels, so they read the same at every zoom.
  const scale = vb[2] / Math.max(280, svgW);
  const groupName = (k: string) => desk.desk.segments.find(s => s.key === k)?.short ?? k;

  if (error) return <Card className="p-5 text-sm"><span style={{ color: T.bad }}>Couldn&apos;t draw the map.</span></Card>;
  if (!data) return <div className="py-16 text-center text-xs uppercase tracking-[0.3em]" style={{ color: T.faint }}>Unrolling the map…</div>;

  const hoverInfo = hover ? districtById.get(hover.id) : null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" role="tablist" aria-label="Map layer">
            {LAYERS.map(l => (
              <button key={l.id} type="button" role="tab" aria-selected={layer === l.id} id={`layer-${l.id}`} onClick={() => { setLayer(l.id); if (l.id === 'party' && !partyId) setPartyId(panelNation?.parties[0]?.id ?? null); }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold" title={l.hint}
                style={{ background: layer === l.id ? T.accentSoft : 'transparent', border: `1px solid ${layer === l.id ? T.accent : T.line}`, color: layer === l.id ? T.text : T.dim }}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" onClick={() => setFocus(null)} className="px-2.5 py-1.5 rounded-lg text-xs" id="focus-all"
              style={{ color: focus === null ? T.text : T.faint, border: `1px solid ${focus === null ? T.lineStrong : 'transparent'}` }}>Continent</button>
            {nations.map(n => (
              <button key={n.code} type="button" onClick={() => { setFocus(n.code); setSelected(null); }} className="px-2.5 py-1.5 rounded-lg text-xs" id={`focus-${n.countryId}`}
                style={{ color: focus === n.code ? T.text : T.faint, border: `1px solid ${focus === n.code ? T.lineStrong : 'transparent'}` }}>{n.name}</button>
            ))}
          </div>
        </div>

        <div ref={wrapRef} className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid ${T.lineStrong}`, background: '#0D2730' }}
          onMouseLeave={() => setHover(null)}>
          <svg viewBox={vb.map(v => v.toFixed(1)).join(' ')} className="block w-full h-auto select-none" role="img" aria-label="Political map of the three nations" id="political-map">
            <defs>
              <radialGradient id="sea" cx="50%" cy="45%" r="75%">
                <stop offset="0%" stopColor="#1F5560" /><stop offset="100%" stopColor="#0B2329" />
              </radialGradient>
              <pattern id="waves" width="46" height="22" patternUnits="userSpaceOnUse">
                <path d="M0 11 Q 11.5 5 23 11 T 46 11" fill="none" stroke="#7FB7BC" strokeOpacity="0.07" strokeWidth="1" />
              </pattern>
              <filter id="paper" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="3" result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.18  0 0 0 0.55 -0.12" />
              </filter>
              <clipPath id="land"><path d={coastPath} /></clipPath>
              {Object.entries(geo.shapes).map(([code, d]) => <clipPath key={code} id={`nat-${code}`}><path d={d} /></clipPath>)}
              <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>
            <rect x={-200} y={-200} width={MAP_W + 400} height={MAP_H + 400} fill="url(#sea)" />
            <rect x={-200} y={-200} width={MAP_W + 400} height={MAP_H + 400} fill="url(#waves)" />
            {/* Shallow water and the land itself. */}
            <path d={coastPath} fill="none" stroke="#6FB2B5" strokeOpacity="0.28" strokeWidth={16} filter="url(#soft)" />
            <path d={coastPath} fill={LAND} />
            {Object.entries(geo.shapes).map(([code, d]) => <path key={code} d={d} fill={NATION_COLOR[code] ?? LAND} fillOpacity={0.14} style={{ pointerEvents: 'none' }} />)}
            {/* Districts. */}
            <g clipPath="url(#land)">
              {geo.cells.map(c => {
                const info = districtById.get(c.site.id);
                if (!info) return null;
                const f = fill(info.d);
                const isSel = selected === c.site.id;
                return (
                  <path key={c.site.id} d={pathOf(c.pts)} fill={f.color} fillOpacity={f.opacity} id={`d-${c.site.id.slice(0, 8)}`}
                    style={{ cursor: 'pointer', mixBlendMode: 'multiply' }}
                    stroke={isSel ? INK : 'none'} strokeWidth={isSel ? 2 * scale : 0}
                    onMouseMove={e => { const r = wrapRef.current?.getBoundingClientRect(); if (r) setHover({ id: c.site.id, x: e.clientX - r.left, y: e.clientY - r.top }); }}
                    onClick={() => setSelected(isSel ? null : c.site.id)} />
                );
              })}
              <rect x={0} y={0} width={MAP_W} height={MAP_H} filter="url(#paper)" style={{ pointerEvents: 'none', mixBlendMode: 'multiply' }} opacity={0.55} />
              {LAKES.map((l, i) => <ellipse key={i} cx={l.x} cy={l.y} rx={l.rx} ry={l.ry} transform={`rotate(${l.rot} ${l.x} ${l.y})`} fill="#3E7E86" fillOpacity={0.85} stroke={INK} strokeOpacity={0.4} strokeWidth={0.6} style={{ pointerEvents: 'none' }} />)}
            </g>
            {/* Each country's edge in its own colour (inside its border only), and the others dimmed when one is in focus. */}
            <g style={{ pointerEvents: 'none' }}>
              {Object.entries(geo.outlines).map(([code, d]) => (
                <path key={code} d={d} fill="none" stroke={NATION_COLOR[code] ?? INK} strokeOpacity={0.9} strokeWidth={9 * scale} clipPath={`url(#nat-${code})`} strokeLinejoin="round" />
              ))}
              {focus && Object.entries(geo.shapes).filter(([code]) => code !== focus).map(([code, d]) => (
                <path key={code} d={d} fill="#0A1418" fillOpacity={0.38} />
              ))}
            </g>
            {/* Borders: districts faint, regions dashed, nations bold. */}
            <g style={{ pointerEvents: 'none' }} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d={geo.lines.district} stroke={INK} strokeOpacity={0.22} strokeWidth={0.6 * scale} />
              <path d={geo.lines.region} stroke={INK} strokeOpacity={0.55} strokeWidth={1.1 * scale} strokeDasharray={`${5 * scale} ${3.5 * scale}`} />
              <path d={geo.lines.nation} stroke="#F6EEDB" strokeOpacity={0.85} strokeWidth={3.5 * scale} />
              <path d={geo.lines.nation} stroke={INK} strokeWidth={1.6 * scale} strokeDasharray={`${7 * scale} ${3 * scale}`} />
              <path d={coastPath} stroke={INK} strokeOpacity={0.85} strokeWidth={1.1 * scale} />
            </g>
            {/* Labels, capitals and players. */}
            <g style={{ pointerEvents: 'none' }}>
              {nations.map(n => {
                const ss = geo.sites.filter(s => s.nation === n.code);
                if (!ss.length) return null;
                const cx = ss.reduce((a, s) => a + s.x, 0) / ss.length, cy = Math.min(...ss.map(s => s.y)) - 46;
                const capRegion = n.regions[0]?.code;
                const cap = ss.filter(s => s.region === capRegion).sort((a, b) => b.voters - a.voters)[0];
                const showRegions = focus === n.code;
                const labelY = focus === n.code ? vb[1] + (svgW < 500 ? 20 : 30) * scale : Math.max(48, cy);
                return (
                  <g key={n.code}>
                    {(focus === null || focus === n.code) && (
                      <>
                        <text x={cx} y={labelY} textAnchor="middle" fontFamily="Georgia, serif" fontWeight={700}
                          fontSize={(svgW < 500 ? 15 : 22) * scale} letterSpacing={(svgW < 500 ? 4 : 7) * scale}
                          fill={INK} fillOpacity={0.75} stroke="#EFE6D0" strokeOpacity={0.7} strokeWidth={3 * scale} paintOrder="stroke">{n.name.toUpperCase()}</text>
                        <text x={cx} y={labelY + (svgW < 500 ? 12 : 16) * scale} textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic"
                          fontSize={(svgW < 500 ? 9 : 12) * scale} fill={INK} fillOpacity={0.7} stroke="#EFE6D0" strokeOpacity={0.6} strokeWidth={2.5 * scale} paintOrder="stroke">{n.government}</text>
                      </>
                    )}
                    {showRegions && n.regions.map(r => {
                      const rs = ss.filter(s => s.region === r.code).sort((a, b) => b.voters - a.voters)[0];
                      if (!rs || r.code === capRegion) return null;
                      return (
                        <g key={r.code}>
                          <circle cx={rs.x} cy={rs.y} r={2.5 * scale} fill={INK} />
                          <text x={rs.x} y={rs.y - 8 * scale} textAnchor="middle" fontSize={11 * scale} fontFamily="Georgia, serif" fill={INK} stroke="#EFE6D0" strokeWidth={2.5 * scale} paintOrder="stroke" fontWeight={600}>{r.capital}</text>
                        </g>
                      );
                    })}
                    {cap && (
                      <g>
                        <path d={star(cap.x, cap.y, 7 * scale)} fill="#E8B84B" stroke={INK} strokeWidth={1.1 * scale} />
                        <text x={cap.x} y={cap.y + 17 * scale} textAnchor="middle" fontSize={11 * scale} fontFamily="Georgia, serif" fontWeight={700} fill={INK} stroke="#EFE6D0" strokeWidth={3 * scale} paintOrder="stroke">{n.capital.toUpperCase()}</text>
                      </g>
                    )}
                  </g>
                );
              })}
              {nations.flatMap(n => n.districts.flatMap(d => d.players.map((p, i) => {
                const s = siteById.get(d.id);
                if (!s) return null;
                const col = partyById.get(p.partyId)?.color ?? '#888';
                const x = s.x + (i - (d.players.length - 1) / 2) * 17 * scale, y = s.y - 15 * scale;
                return (
                  <g key={`${d.id}-${p.id}`}>
                    <circle cx={x} cy={y} r={8 * scale} fill={col} stroke="#FFF8E6" strokeWidth={1.5 * scale} />
                    <text x={x} y={y + 3 * scale} textAnchor="middle" fontSize={8 * scale} fontWeight={800} fill="#14110C">{p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</text>
                  </g>
                );
              })))}
            </g>
          </svg>

          {hoverInfo && hover && (
            <div className="absolute pointer-events-none rounded-lg px-3 py-2 text-xs shadow-xl" id="map-tooltip"
              style={{ left: Math.min(hover.x + 14, (wrapRef.current?.clientWidth ?? 0) - 230), top: hover.y + 14, width: 216, background: 'rgba(20,23,31,0.95)', border: `1px solid ${T.lineStrong}`, color: T.text }}>
              <div className="font-semibold">{hoverInfo.d.name}</div>
              <div style={{ color: T.faint }}>{hoverInfo.n.regions.find(r => r.code === hoverInfo.d.region)?.name} · {hoverInfo.n.name} · {hoverInfo.d.seats} seat{hoverInfo.d.seats === 1 ? '' : 's'}</div>
              <div className="mt-1.5 space-y-0.5">
                {Object.entries((layer === 'strong' ? hoverInfo.d.last : hoverInfo.d.poll).shares).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([pid, sh]) => (
                  <div key={pid} className="flex items-center gap-1.5">
                    <PartyDot color={partyById.get(pid)?.color ?? '#888'} size={7} />
                    <span className="flex-1 truncate" style={{ color: T.dim }}>{partyById.get(pid)?.name}</span>
                    <span className="font-mono">{Math.round(sh * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="absolute left-2 bottom-2 rounded-lg px-2.5 py-1.5 text-[10px] max-w-[85%] sm:max-w-[70%]" style={{ background: 'rgba(12,14,19,0.82)', color: T.dim }}>
            {layer === 'nations'
              ? <span className="flex flex-wrap gap-x-3 gap-y-0.5">{nations.map(n => <span key={n.code} className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: NATION_COLOR[n.code] }} />{n.name}</span>)}<span style={{ color: T.faint }}>★ capital · ● players</span></span>
              : layer === 'voters'
              ? <span className="flex flex-wrap gap-x-2.5 gap-y-0.5">{Object.entries(GROUP_COLOR).map(([k, c]) => <span key={k} className="inline-flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: c }} />{groupName(k)}</span>)}</span>
              : layer === 'party' && party ? <span>{party.name}: pale = weak, deep = strong</span>
              : <span><span className="hidden sm:inline">{LAYERS.find(l => l.id === layer)?.hint} </span><span style={{ color: T.faint }}>★ capital · ● players</span></span>}
          </div>
        </div>
      </div>

      <aside className="space-y-4 min-w-0">
        {sel ? <DistrictPanel info={sel} partyById={partyById} groupName={groupName} onClose={() => setSelected(null)} />
          : panelNation && <NationPanel n={panelNation} onParty={id => { setPartyId(id); setLayer('party'); }} activeParty={layer === 'party' ? partyId : null} />}
      </aside>
    </div>
  );
}

function NationPanel({ n, onParty, activeParty }: { n: MapNation; onParty: (id: string) => void; activeParty: string | null }) {
  const totalSeats = n.districts.reduce((a, d) => a + d.seats, 0);
  const parties = n.parties.slice().sort((a, b) => b.seats - a.seats || b.pollSeats - a.pollSeats);
  return (
    <Card className="p-4">
      <Label>{n.government}</Label>
      <h2 className="font-serif text-xl font-bold leading-tight mt-0.5" style={{ color: T.text }}>{n.officialName}</h2>
      <p className="text-xs mt-1" style={{ color: T.faint }}>{totalSeats} seats in {n.districts.length} districts. Click a party to see where it is strong, or a district for its story.</p>
      <div className="mt-3 space-y-2">
        {parties.map(p => (
          <button key={p.id} type="button" onClick={() => onParty(p.id)} id={`map-party-${p.abbr}`}
            className="w-full text-left rounded-xl p-2.5 hover:brightness-125"
            style={{ background: activeParty === p.id ? T.accentSoft : T.raised, border: `1px solid ${activeParty === p.id ? T.accent : T.line}` }}>
            <div className="flex items-center gap-2">
              <PartyDot color={p.color} size={10} />
              <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: T.text }}>{p.name}</span>
              <span className="font-mono text-xs" style={{ color: T.text }} title="Seats now → seats in today's poll">
                {p.seats}<span style={{ color: p.pollSeats > p.seats ? T.good : p.pollSeats < p.seats ? T.bad : T.faint }}> → {p.pollSeats}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]" style={{ color: T.faint }}>
              <span>{ideologyOf(p.platform) || 'No fixed programme'}</span>
              {p.leader && <span>· led by {p.leader}{p.leaderIsPlayer ? ' (player)' : ''}</span>}
              {p.leadsGovernment ? <Chip color={T.accent}>governs</Chip> : p.governing ? <Chip color={T.dim}>in government</Chip> : null}
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

function DistrictPanel({ info, partyById, groupName, onClose }: {
  info: { d: MapDistrict; n: MapNation }; partyById: Map<string, MapParty>; groupName: (k: string) => string; onClose: () => void;
}) {
  const { d, n } = info;
  const region = n.regions.find(r => r.code === d.region);
  const rows = Object.keys({ ...d.last.shares, ...d.poll.shares })
    .map(id => ({ id, p: partyById.get(id), last: d.last.shares[id] ?? 0, poll: d.poll.shares[id] ?? 0, seats: d.last.seats[id] ?? 0, pollSeats: d.poll.seats[id] ?? 0 }))
    .filter(r => r.p).sort((a, b) => b.poll - a.poll);
  const groups = Object.entries(d.groups ?? {});
  const gTotal = groups.reduce((a, [, v]) => a + Number(v), 0) || 1;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Label>{region?.name} · {n.name}</Label>
          <h2 className="font-serif text-xl font-bold leading-tight mt-0.5" style={{ color: T.text }}>{d.name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close district" className="text-xl leading-none px-1" style={{ color: T.dim }}>×</button>
      </div>
      <p className="text-xs mt-1" style={{ color: T.faint }}>{region?.character} {d.seats} seat{d.seats === 1 ? '' : 's'} · {(d.voters / 1000).toFixed(0)}k voters.</p>
      <div className="mt-3">
        <div className="flex text-[10px] uppercase tracking-wider" style={{ color: T.faint }}>
          <span className="flex-1">Party</span><span className="w-16 text-right">Last vote</span><span className="w-16 text-right">Poll now</span>
        </div>
        <div className="mt-1 space-y-1.5">
          {rows.map(r => (
            <div key={r.id}>
              <div className="flex items-center text-xs gap-1.5">
                <PartyDot color={r.p!.color} size={8} />
                <span className="flex-1 truncate" style={{ color: T.text }}>{r.p!.name}</span>
                <span className="w-16 text-right font-mono" style={{ color: T.dim }}>{Math.round(r.last * 100)}%{r.seats ? ` · ${r.seats}` : ''}</span>
                <span className="w-16 text-right font-mono" style={{ color: T.text }}>{Math.round(r.poll * 100)}%{r.pollSeats ? ` · ${r.pollSeats}` : ''}</span>
              </div>
              <div className="mt-0.5"><Meter value={r.poll * 100} color={r.p!.color} height={3} /></div>
            </div>
          ))}
          {rows.length === 0 && <div className="text-xs" style={{ color: T.faint }}>No results yet.</div>}
        </div>
      </div>
      <div className="mt-4">
        <Label>Who lives here</Label>
        <div className="mt-1.5 space-y-1">
          {groups.sort((a, b) => Number(b[1]) - Number(a[1])).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-24" style={{ color: T.dim }}>{groupName(k)}</span>
              <div className="flex-1"><Meter value={Number(v) / gTotal * 100} color={GROUP_COLOR[k] ?? T.dim} height={4} /></div>
              <span className="w-9 text-right font-mono" style={{ color: T.text }}>{Math.round(Number(v) / gTotal * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Label>Players who sit here</Label>
        <div className="mt-1 text-xs" style={{ color: T.dim }}>
          {d.players.length ? d.players.map(p => <div key={p.id} className="flex items-center gap-1.5"><PartyDot color={partyById.get(p.partyId)?.color ?? '#888'} size={7} />{p.name} · {partyById.get(p.partyId)?.name}</div>)
            : 'None yet. Every seat here is held by a party machine.'}
        </div>
      </div>
    </Card>
  );
}
