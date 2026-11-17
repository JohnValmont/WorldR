// Geometry for the political map of the three starter nations.
//
// There is no real geography in the game, so the continent is generated, the
// same way every time: a hand-placed centre for each of the 12 regions, a
// coastline made natural with seeded midpoint displacement, and every
// district carved out as the part of the land closer to its own point than to
// any other (a Voronoi cell). Borders between nations and regions then fall
// out of the cells: each cell edge remembers which neighbour it faces.
// Pure functions; no React.

export const MAP_W = 1200;
/** Each nation's map colour (keyed by politics state code), matching the sign-up page. */
export const NATION_COLOR: Record<string, string> = { national: '#6153C6', westmark: '#1F8A8A', eryndor: '#3E7A52' };
export const MAP_H = 760;

export type Pt = [number, number];

/** Region centres and spread. `r` grows with the nation's size (Westmark small, Eryndor large). */
export const REGION_LAYOUT: Record<string, { nation: string; x: number; y: number; r: number }> = {
  // Westmark: the west coast.
  tidewater: { nation: 'westmark', x: 200, y: 215, r: 50 },
  saltgate:  { nation: 'westmark', x: 135, y: 390, r: 46 },
  marches:   { nation: 'westmark', x: 320, y: 340, r: 50 },
  downs:     { nation: 'westmark', x: 235, y: 560, r: 52 },
  // Drennia: the middle.
  westport:  { nation: 'national', x: 480, y: 215, r: 58 },
  ironvale:  { nation: 'national', x: 590, y: 360, r: 58 },
  drennport: { nation: 'national', x: 500, y: 575, r: 56 },
  greenmere: { nation: 'national', x: 705, y: 470, r: 60 },
  // Eryndor: the east, the largest.
  coalreach: { nation: 'eryndor', x: 885, y: 215, r: 70 },
  highmoor:  { nation: 'eryndor', x: 905, y: 415, r: 64 },
  goldmere:  { nation: 'eryndor', x: 1065, y: 330, r: 68 },
  southfold: { nation: 'eryndor', x: 960, y: 600, r: 70 },
};

/** Lakes and a marsh, purely for looks. */
export const LAKES: { x: number; y: number; rx: number; ry: number; rot: number }[] = [
  { x: 742, y: 438, rx: 15, ry: 8, rot: -20 },
  { x: 676, y: 520, rx: 10, ry: 6, rot: 15 },
  { x: 1102, y: 392, rx: 12, ry: 7, rot: 30 },
  { x: 288, y: 268, rx: 9, ry: 5, rot: -10 },
];

/** A small seeded random generator, so the map is identical for everyone. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The coastline. Two sea inlets and a bay cut in where nations meet, so each
// country has its own recognisable shape: the Gulf of Brannow between Westmark
// and Drennia, the Narrows between Drennia and Eryndor in the north, and
// Oak Bay below them in the south.
const COAST_CONTROL: Pt[] = [
  [58, 268], [92, 150], [190, 118], [300, 138], [372, 116], [420, 122], [520, 130], [640, 150], [742, 166],
  [770, 172], [784, 228], [796, 236], [806, 160], [830, 112],
  [940, 104], [1060, 150], [1150, 228], [1168, 360], [1140, 470], [1092, 548], [1060, 660], [960, 702],
  [880, 690], [846, 664], [832, 604], [818, 602], [806, 652], [770, 640], [690, 650], [600, 668], [500, 672],
  [448, 662], [420, 598], [404, 560], [390, 562], [378, 640], [330, 668], [230, 650],
  [140, 610], [92, 520], [62, 450], [40, 360],
];

/** The coastline: control points roughened by midpoint displacement. */
export function buildCoast(seed = 7, levels = 4): Pt[] {
  const r = rng(seed);
  let pts: Pt[] = COAST_CONTROL.slice();
  let amp = 0.22;
  for (let l = 0; l < levels; l++) {
    const next: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      const off = (r() - 0.5) * 2 * amp * len;
      next.push(a, [(a[0] + b[0]) / 2 - dy / len * off, (a[1] + b[1]) / 2 + dx / len * off]);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

export interface SiteInput { id: string; region: string; voters: number; name: string }
export interface Site extends SiteInput { x: number; y: number; nation: string }

/**
 * Where each district sits: the biggest district of a region at its centre,
 * the others in a ring around it (sorted by name, with a little seeded jitter).
 */
export function placeSites(districts: SiteInput[]): Site[] {
  const byRegion = new Map<string, SiteInput[]>();
  for (const d of districts) {
    if (!REGION_LAYOUT[d.region]) continue;
    (byRegion.get(d.region) ?? byRegion.set(d.region, []).get(d.region)!).push(d);
  }
  const out: Site[] = [];
  let seed = 11;
  for (const [region, list] of byRegion) {
    const L = REGION_LAYOUT[region];
    const r = rng(seed += 101);
    const sorted = list.slice().sort((a, b) => b.voters - a.voters);
    const [centre, ...ring] = [sorted[0], ...sorted.slice(1).sort((a, b) => a.name.localeCompare(b.name))];
    out.push({ ...centre, nation: L.nation, x: L.x, y: L.y });
    const start = r() * Math.PI * 2;
    ring.forEach((d, i) => {
      const ang = start + (i / ring.length) * Math.PI * 2 + (r() - 0.5) * 0.5;
      const rad = L.r * (0.9 + r() * 0.3);
      out.push({ ...d, nation: L.nation, x: L.x + Math.cos(ang) * rad, y: L.y + Math.sin(ang) * rad });
    });
  }
  return out;
}

/** A polygon whose edge k (from point k to k+1) faces `labels[k]`: -1 = the sea, else a site index. */
interface LPoly { pts: Pt[]; labels: number[] }

/** Keep the part of `poly` closer to site i than to site j (Sutherland-Hodgman against one half-plane). */
function clip(poly: LPoly, si: Pt, sj: Pt, j: number): LPoly {
  const nx = sj[0] - si[0], ny = sj[1] - si[1];
  const mx = (si[0] + sj[0]) / 2, my = (si[1] + sj[1]) / 2;
  const side = (p: Pt) => (p[0] - mx) * nx + (p[1] - my) * ny;
  const pts: Pt[] = [], labels: number[] = [];
  let wrapLabel: number | null = null; // label of the edge from the last output point back to the first
  const setLast = (label: number) => { if (labels.length) labels[labels.length - 1] = label; else wrapLabel = label; };
  const push = (p: Pt) => { pts.push(p); labels.push(-1); };
  const n = poly.pts.length;
  for (let k = 0; k < n; k++) {
    const S = poly.pts[k], E = poly.pts[(k + 1) % n], L = poly.labels[k];
    const ds = side(S), de = side(E);
    const sIn = ds <= 0, eIn = de <= 0;
    if (sIn === eIn) { if (sIn) { setLast(L); push(E); } continue; }
    const t = ds / (ds - de);
    const I: Pt = [S[0] + (E[0] - S[0]) * t, S[1] + (E[1] - S[1]) * t];
    if (sIn) { setLast(L); push(I); }            // leaving: the next edge runs along the dividing line
    else { setLast(j); push(I); setLast(L); push(E); } // entering: the edge we just closed ran along the line
  }
  if (wrapLabel !== null && labels.length) labels[labels.length - 1] = wrapLabel;
  return { pts, labels };
}

export interface Cell { site: Site; pts: Pt[]; labels: number[]; centroid: Pt }

/** Every district's shape on the land. */
export function buildCells(sites: Site[], coast: Pt[]): Cell[] {
  return sites.map((s, i) => {
    let poly: LPoly = { pts: coast, labels: coast.map(() => -1) };
    const si: Pt = [s.x, s.y];
    // Nearest sites first keeps the polygon small, so later clips are cheap.
    const order = sites.map((t, j) => ({ j, d: (t.x - s.x) ** 2 + (t.y - s.y) ** 2 })).filter(o => o.j !== i).sort((a, b) => a.d - b.d);
    for (const { j } of order) {
      if (!poly.pts.length) break;
      poly = clip(poly, si, [sites[j].x, sites[j].y], j);
    }
    return { site: s, pts: poly.pts, labels: poly.labels, centroid: centroid(poly.pts, si) };
  });
}

function centroid(pts: Pt[], fallback: Pt): Pt {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[(k + 1) % pts.length];
    const f = x0 * y1 - x1 * y0;
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f;
  }
  if (Math.abs(a) < 1e-6) return fallback;
  return [cx / (3 * a), cy / (3 * a)];
}

export const pathOf = (pts: Pt[]) => pts.length ? 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z' : '';

/** Border lines by kind: between nations, between regions, between districts. */
export function borders(cells: Cell[]): { nation: string; region: string; district: string } {
  const out = { nation: '', region: '', district: '' };
  cells.forEach((c, i) => {
    const n = c.pts.length;
    for (let k = 0; k < n; k++) {
      const j = c.labels[k];
      if (j < 0 || j < i) continue; // sea edges are drawn by the coastline; each shared edge once
      const o = cells[j]?.site;
      if (!o) continue;
      const a = c.pts[k], b = c.pts[(k + 1) % n];
      const seg = `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`;
      if (o.nation !== c.site.nation) out.nation += seg;
      else if (o.region !== c.site.region) out.region += seg;
      else out.district += seg;
    }
  });
  return out;
}

/** Bounding box of some sites, padded and stretched to the map's shape. */
export function viewBoxFor(sites: { x: number; y: number }[], pad = 90): [number, number, number, number] {
  if (!sites.length) return [0, 0, MAP_W, MAP_H];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of sites) { x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y); }
  x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
  let w = x1 - x0, h = y1 - y0;
  const aspect = MAP_W / MAP_H;
  if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / aspect; y0 -= (nh - h) / 2; h = nh; }
  return [x0, y0, w, h];
}

/** A short plain-words label for a party platform (axes 0..100, as in party platforms). */
export function ideologyOf(p: Record<string, number> | undefined): string {
  if (!p) return '';
  const econ = ((p.labour ?? 50) - (p.taxation ?? 50)) / 2;
  const parts: string[] = [];
  parts.push(econ > 18 ? 'Left' : econ < -18 ? 'Free-market' : 'Centre');
  if ((p.stability ?? 50) >= 72) parts.push('law and order');
  else if ((p.stability ?? 50) <= 40) parts.push('liberal');
  if ((p.trade ?? 50) >= 78) parts.push('free trade');
  else if ((p.trade ?? 50) <= 40) parts.push('protectionist');
  return parts.join(' · ');
}

/** Each nation's perimeter (its coast plus its land borders), for the coloured edge band. */
export function nationOutlines(cells: Cell[]): Record<string, string> {
  const out: Record<string, string> = {};
  cells.forEach(c => {
    const n = c.pts.length;
    for (let k = 0; k < n; k++) {
      const j = c.labels[k];
      if (j >= 0 && cells[j]?.site.nation === c.site.nation) continue;
      const a = c.pts[k], b = c.pts[(k + 1) % n];
      out[c.site.nation] = (out[c.site.nation] ?? '') + `M${a[0].toFixed(1)},${a[1].toFixed(1)}L${b[0].toFixed(1)},${b[1].toFixed(1)}`;
    }
  });
  return out;
}

/** Each nation's land as one compound path (for clipping and tinting). */
export function nationShapes(cells: Cell[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of cells) out[c.site.nation] = (out[c.site.nation] ?? '') + pathOf(c.pts);
  return out;
}
