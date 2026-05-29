'use client';
import { useEffect, useRef } from 'react';

// ── Aethon World Map Data ──────────────────────────────────────────────────────
// Polygons defined as [longitude, latitude] pairs (equirectangular)

type LatLon = [number, number];

// Major continent landmasses
const LANDMASSES: { fill: string; stroke: string; poly: LatLon[] }[] = [
  {
    // Varelia – western continent (Keldoria, Eryndor, Arkenfall, Valdoria, Norhaven…)
    fill: 'rgba(22, 48, 118, 0.84)',
    stroke: 'rgba(88, 148, 240, 0.75)',
    poly: [
      [-165, 75], [-148, 80], [-128, 76], [-105, 73],
      [-82, 66], [-75, 54], [-76, 44], [-83, 30],
      [-93, 18], [-106, 8], [-122, 2], [-138, 2],
      [-155, 10], [-164, 22], [-170, 40], [-170, 58],
      [-168, 68], [-165, 75],
    ],
  },
  {
    // Azhara – central continent (Novara, Astralis, Drakoria, Altaria, Solmere…)
    fill: 'rgba(19, 42, 112, 0.84)',
    stroke: 'rgba(82, 140, 232, 0.75)',
    poly: [
      [-96, 50], [-70, 54], [-42, 54], [-15, 50],
      [8, 46], [36, 42], [44, 26], [41, 8],
      [28, -6], [12, -30], [-5, -42],
      [-32, -44], [-60, -40], [-80, -30],
      [-96, -15], [-99, 8], [-97, 28], [-96, 50],
    ],
  },
  {
    // Solkar – southern continent (Vastara, Kaelvar, Aurelia, Korvath, Tyralis…)
    fill: 'rgba(16, 38, 102, 0.84)',
    stroke: 'rgba(78, 134, 225, 0.75)',
    poly: [
      [-80, -28], [-50, -24], [-15, -24],
      [12, -26], [38, -30], [53, -40],
      [56, -56], [40, -70], [15, -78],
      [-18, -80], [-52, -76], [-75, -64],
      [-84, -48], [-80, -28],
    ],
  },
  {
    // Norvane – eastern continent (Norvane Federation, Zorathia, Dravenor, Rethoria…)
    fill: 'rgba(20, 45, 115, 0.84)',
    stroke: 'rgba(85, 144, 236, 0.75)',
    poly: [
      [58, 70], [72, 76], [98, 72], [118, 65],
      [126, 50], [128, 30], [122, 12],
      [118, -4], [108, -28], [98, -52],
      [74, -64], [56, -50], [50, -24],
      [52, 2], [54, 28], [56, 50], [58, 70],
    ],
  },
];

// Small islands
const ISLANDS: LatLon[][] = [
  // Frostholm (north center)
  [[3, 83], [12, 85], [22, 83], [18, 80], [8, 80], [3, 83]],
  // Zahara Isles (southwest)
  [[-155, -42], [-148, -39], [-144, -43], [-150, -47], [-156, -45], [-155, -42]],
  // Veloria (NE, near Norvane)
  [[116, 62], [121, 64], [123, 61], [119, 59], [116, 62]],
  [[108, 56], [113, 58], [115, 55], [111, 54], [108, 56]],
  // Belvar (east mid)
  [[115, 12], [120, 14], [122, 11], [118, 10], [115, 12]],
];

// Internal nation/country borders — each as a pair of LatLon endpoints
const BORDERS: Array<[LatLon, LatLon]> = [
  // Varelia internal borders
  [[-152, 68], [-130, 70]], [[-130, 70], [-112, 66]],
  [[-112, 66], [-95, 62]],  [[-95, 62],  [-80, 52]],
  [[-140, 52], [-125, 50]], [[-125, 50], [-115, 45]],
  [[-125, 50], [-130, 40]], [[-130, 35], [-118, 30]],
  [[-118, 30], [-115, 28]], [[-130, 22], [-118, 18]],
  [[-118, 18], [-110, 12]], [[-148, 22], [-138, 18]],
  [[-160, 45], [-152, 48]],
  // Azhara internal borders
  [[-70, 45], [-55, 42]],  [[-55, 42], [-40, 38]],
  [[-40, 38], [-25, 32]],  [[-25, 32], [-12, 24]],
  [[-12, 24], [0, 18]],    [[0, 18],   [12, 12]],
  [[12, 12],  [25, 8]],    [[-50, 32], [-42, 18]],
  [[-42, 18], [-35, 6]],   [[-35, 6],  [-22, -2]],
  [[-22, -2], [-10, -8]],  [[-65, 20], [-55, 10]],
  [[-55, 10], [-48, 2]],   [[-70, -5], [-55, -12]],
  [[-55,-12], [-40,-20]],  [[18, 30],  [28, 18]],
  [[28, 18],  [35, 8]],
  // Solkar internal borders
  [[-40, -32], [-28, -40]], [[-28, -40], [-18, -50]],
  [[-55, -48], [-42, -56]], [[-42, -56], [-30, -60]],
  [[8, -32],   [18, -44]],  [[18, -44],  [25, -56]],
  [[-12, -38], [-5, -50]],  [[-5, -50],  [5, -60]],
  [[-20, -60], [-8, -65]],
  // Norvane internal borders
  [[72, 58],  [88, 52]],   [[88, 52],  [100, 42]],
  [[100, 42], [108, 28]],  [[85, 30],  [92, 18]],
  [[92, 18],  [100, 8]],   [[96, -5],  [105, -18]],
  [[105,-18], [108,-32]],  [[80, -38], [92, -50]],
  [[68, -20], [80, -30]],  [[62, 45],  [70, 32]],
];

// ── Globe math utilities ────────────────────────────────────────────────────────

function latlonTo3D(lon: number, lat: number): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  return [
    Math.cos(phi) * Math.cos(lam),
    Math.sin(phi),
    Math.cos(phi) * Math.sin(lam),
  ];
}

function rotateY(
  p: [number, number, number],
  angle: number
): [number, number, number] {
  return [
    p[0] * Math.cos(angle) - p[2] * Math.sin(angle),
    p[1],
    p[0] * Math.sin(angle) + p[2] * Math.cos(angle),
  ];
}

function projectPt(
  lon: number,
  lat: number,
  rot: number,
  cx: number,
  cy: number,
  r: number
): { sx: number; sy: number; z: number } {
  const rp = rotateY(latlonTo3D(lon, lat), rot);
  return { sx: cx + r * rp[0], sy: cy - r * rp[1], z: rp[2] };
}

function drawLandmass(
  ctx: CanvasRenderingContext2D,
  poly: LatLon[],
  rot: number,
  cx: number,
  cy: number,
  r: number,
  fill: string,
  stroke: string
) {
  const pts = poly.map(([lon, lat]) => projectPt(lon, lat, rot, cx, cy, r));
  // Skip if centroid is on the back of the globe
  const zAvg = pts.reduce((s, p) => s + p.z, 0) / pts.length;
  if (zAvg <= -0.05) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.9;
  ctx.stroke();
}

function drawBorderSeg(
  ctx: CanvasRenderingContext2D,
  seg: [LatLon, LatLon],
  rot: number,
  cx: number,
  cy: number,
  r: number
) {
  const a = projectPt(seg[0][0], seg[0][1], rot, cx, cy, r);
  const b = projectPt(seg[1][0], seg[1][1], rot, cx, cy, r);
  // Only draw if both endpoints face the camera
  if (a.z <= 0.06 || b.z <= 0.06) return;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(b.sx, b.sy);
  ctx.strokeStyle = 'rgba(105, 170, 255, 0.42)';
  ctx.lineWidth = 0.65;
  ctx.stroke();
}

// ── WorldMapGlobe component ────────────────────────────────────────────────────

function WorldMapGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let rot = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      rot += 0.0022;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const r  = Math.min(W, H) * 0.36;

      // Outer ambient glow
      const ambient = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 1.65);
      ambient.addColorStop(0, 'rgba(12, 45, 160, 0.07)');
      ambient.addColorStop(1, 'transparent');
      ctx.fillStyle = ambient;
      ctx.fillRect(0, 0, W, H);

      // Ocean base sphere
      const ocean = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, 0, cx, cy, r);
      ocean.addColorStop(0,    'rgba(8, 18, 58, 0.96)');
      ocean.addColorStop(0.55, 'rgba(4, 10, 38, 0.98)');
      ocean.addColorStop(1,    'rgba(2,  5, 20, 1.00)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = ocean;
      ctx.fill();

      // Clip all interior drawing to the globe circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      // Latitude / longitude grid (very subtle)
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = 'rgba(28, 68, 165, 1)';
      ctx.lineWidth   = 0.4;

      const LAT_LINES = [-60, -30, 0, 30, 60];
      for (const lat of LAT_LINES) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = projectPt(lon, lat, rot, cx, cy, r);
          if (p.z > 0) {
            if (first) { ctx.moveTo(p.sx, p.sy); first = false; }
            else ctx.lineTo(p.sx, p.sy);
          } else if (!first) {
            ctx.stroke();
            ctx.beginPath();
            first = true;
          }
        }
        ctx.stroke();
      }

      for (let lon = -150; lon <= 180; lon += 30) {
        ctx.beginPath();
        let first = true;
        for (let lat = -88; lat <= 88; lat += 4) {
          const p = projectPt(lon, lat, rot, cx, cy, r);
          if (p.z > 0) {
            if (first) { ctx.moveTo(p.sx, p.sy); first = false; }
            else ctx.lineTo(p.sx, p.sy);
          } else if (!first) {
            ctx.stroke();
            ctx.beginPath();
            first = true;
          }
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Draw continent landmasses
      for (const lm of LANDMASSES) {
        drawLandmass(ctx, lm.poly, rot, cx, cy, r, lm.fill, lm.stroke);
      }

      // Draw islands
      for (const isle of ISLANDS) {
        drawLandmass(ctx, isle, rot, cx, cy, r,
          'rgba(22, 48, 118, 0.80)',
          'rgba(84, 142, 230, 0.68)'
        );
      }

      // Draw internal nation borders
      for (const seg of BORDERS) {
        drawBorderSeg(ctx, seg, rot, cx, cy, r);
      }

      ctx.restore(); // end clip

      // Globe rim line
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(48, 110, 225, 0.40)';
      ctx.lineWidth   = 1.3;
      ctx.stroke();

      // Atmospheric halo ring
      const halo = ctx.createRadialGradient(cx, cy, r * 0.88, cx, cy, r * 1.08);
      halo.addColorStop(0,   'transparent');
      halo.addColorStop(0.7, 'rgba(22, 65, 200, 0.07)');
      halo.addColorStop(1,   'rgba(15, 50, 185, 0.14)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      // Specular highlight (top-left glint)
      const spec = ctx.createRadialGradient(
        cx - r * 0.30, cy - r * 0.30, 0,
        cx - r * 0.20, cy - r * 0.20, r * 0.50
      );
      spec.addColorStop(0, 'rgba(255, 255, 255, 0.058)');
      spec.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = spec;
      ctx.fill();

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// ── Game pillars (shown below the globe copy) ──────────────────────────────────

const PILLARS = [
  { icon: '🏛️', text: 'Politics & Government' },
  { icon: '📈', text: 'Business & Economy' },
  { icon: '⚔️', text: 'Military & Defense' },
  { icon: '🌍', text: 'Society & Culture' },
];

// ── Auth layout ────────────────────────────────────────────────────────────────

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#050508]">

      {/* ── Left hero panel ─── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-[#050508] to-[#050508]" />

        {/* Subtle gold grid */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Globe canvas — fills the entire panel */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full">
            <WorldMapGlobe />
          </div>
        </div>

        {/* Top brand */}
        <div className="relative z-10 p-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.28)] rounded-sm shrink-0">
              <span className="text-black font-black text-lg leading-none">W</span>
            </div>
            <div>
              <div className="text-zinc-100 font-extrabold text-xl tracking-[0.2em] leading-none">WORLDr</div>
              <div className="text-amber-500/60 font-mono text-[9px] tracking-[0.25em] uppercase leading-none mt-1">
                Life Simulator
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10 mt-auto p-8 pb-10">
          <div className="max-w-xs">
            <div className="text-[10px] text-amber-500/45 font-mono uppercase tracking-[0.25em] mb-3">
              Return to Your Life
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 leading-tight mb-3">
              Welcome Back to<br />
              <span className="text-amber-400">WORLDr</span>
            </h2>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Continue your political, economic, and social journey in a living world
              where your decisions shape your legacy.
            </p>

            {/* Game pillars */}
            <div className="grid grid-cols-2 gap-2">
              {PILLARS.map((p) => (
                <div
                  key={p.text}
                  className="flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] text-zinc-400"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span>{p.icon}</span>
                  <span className="font-mono tracking-wide">{p.text}</span>
                </div>
              ))}
            </div>

            <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest mt-6">
              One life. One origin. Many paths.
            </p>
          </div>
        </div>

        {/* Version badge */}
        <div className="absolute top-8 right-8 z-10">
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest border border-zinc-800 px-2 py-1 rounded-sm">
            v0.1 Alpha
          </span>
        </div>
      </div>

      {/* ── Right form panel ─── */}
      <div className="flex flex-col w-full lg:w-[420px] xl:w-[460px] relative overflow-y-auto overflow-x-hidden">
        {/* Panel background */}
        <div className="absolute inset-0 bg-[#080810] border-l border-white/[0.04]" />

        {/* Top gradient stripe */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

        {/* Mobile logo */}
        <div className="relative z-10 flex lg:hidden items-center gap-3 p-6 pb-0">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center rounded-sm shrink-0">
            <span className="text-black font-black text-base leading-none">W</span>
          </div>
          <div className="text-zinc-100 font-extrabold text-base tracking-[0.2em]">WORLDr</div>
        </div>

        <div className="relative z-10 flex flex-col flex-1 justify-center p-6 lg:p-8 xl:p-10">
          {children}
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 px-6 lg:px-8 pb-4 pt-2">
          <p className="text-zinc-700 text-[10px] font-mono text-center">
            © {new Date().getFullYear()} WORLDr · Political Life Simulator
          </p>
        </div>
      </div>
    </div>
  );
}
