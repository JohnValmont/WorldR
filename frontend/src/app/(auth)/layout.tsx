'use client';
import { useEffect, useRef } from 'react';

function AnimatedGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.003;
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const r = Math.min(W, H) * 0.36;

      // Outer glow
      const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.5);
      outerGlow.addColorStop(0, 'rgba(99,102,241,0.06)');
      outerGlow.addColorStop(0.5, 'rgba(245,158,11,0.03)');
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.fillRect(0, 0, W, H);

      // Globe base
      const globeGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
      globeGrad.addColorStop(0, 'rgba(20,20,40,0.9)');
      globeGrad.addColorStop(0.6, 'rgba(10,10,25,0.95)');
      globeGrad.addColorStop(1, 'rgba(5,5,15,0.98)');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = globeGrad;
      ctx.fill();

      // Latitude lines
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const latLines = 9;
      for (let i = 1; i < latLines; i++) {
        const lat = (i / latLines) * Math.PI - Math.PI / 2;
        const cosLat = Math.cos(lat);
        const sinLat = Math.sin(lat);
        const ry = r * cosLat;
        const py = cy + r * sinLat;
        if (ry < 2) continue;
        ctx.beginPath();
        ctx.ellipse(cx, py, ry, ry * 0.18, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(99,102,241,${i === 5 ? 0.25 : 0.08})`;
        ctx.lineWidth = i === 5 ? 0.8 : 0.4;
        ctx.stroke();
      }

      // Longitude lines
      const lonLines = 12;
      for (let i = 0; i < lonLines; i++) {
        const lon = (i / lonLines) * Math.PI + time;
        const cosLon = Math.cos(lon);
        ctx.beginPath();
        for (let j = 0; j <= 60; j++) {
          const lat2 = (j / 60) * Math.PI - Math.PI / 2;
          const x2 = cx + r * Math.cos(lat2) * cosLon;
          const y2 = cy + r * Math.sin(lat2);
          if (j === 0) ctx.moveTo(x2, y2);
          else ctx.lineTo(x2, y2);
        }
        ctx.strokeStyle = `rgba(99,102,241,0.06)`;
        ctx.lineWidth = 0.4;
        ctx.stroke();
      }

      // Animated glowing dots (nations)
      const nodes = [
        { lat: 0.3, lon: 0.8 },
        { lat: -0.5, lon: 2.1 },
        { lat: 0.8, lon: -0.5 },
        { lat: 1.1, lon: 1.5 },
        { lat: -0.2, lon: -1.2 },
        { lat: 0.5, lon: 3.0 },
        { lat: -0.8, lon: 0.3 },
        { lat: 0.1, lon: -2.5 },
      ];

      nodes.forEach((node, idx) => {
        const lon2 = node.lon + time * 0.5;
        const cosLon2 = Math.cos(lon2);
        if (cosLon2 < 0) return; // back face
        const x2 = cx + r * Math.cos(node.lat) * cosLon2;
        const y2 = cy + r * Math.sin(node.lat);
        const pulse = Math.sin(time * 2 + idx * 0.8) * 0.5 + 0.5;
        const dotR = 2 + pulse * 1.5;
        const glow = ctx.createRadialGradient(x2, y2, 0, x2, y2, dotR * 4);
        const color = idx % 2 === 0 ? '245,158,11' : '99,102,241';
        glow.addColorStop(0, `rgba(${color},0.9)`);
        glow.addColorStop(0.3, `rgba(${color},0.4)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x2, y2, dotR * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, dotR, 0, Math.PI * 2);
        ctx.fillStyle = idx % 2 === 0 ? '#f59e0b' : '#818cf8';
        ctx.fill();
      });

      // Globe border glow
      ctx.restore();
      const borderGlow = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.05);
      borderGlow.addColorStop(0, 'rgba(99,102,241,0.3)');
      borderGlow.addColorStop(0.5, 'rgba(245,158,11,0.1)');
      borderGlow.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(99,102,241,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Highlight
      const highlight = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 0, cx - r * 0.3, cy - r * 0.3, r * 0.6);
      highlight.addColorStop(0, 'rgba(255,255,255,0.06)');
      highlight.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = highlight;
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

const PILLARS = [
  { icon: '🏛️', text: 'Politics & Government' },
  { icon: '📈', text: 'Business & Economy' },
  { icon: '⚔️', text: 'Military & Defense' },
  { icon: '🌍', text: 'Society & Culture' },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#050508]">
      {/* ── Left Hero Panel ─── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/60 via-[#050508] to-amber-950/20" />

        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        {/* Globe canvas */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full max-w-lg max-h-lg">
            <AnimatedGlobe />
          </div>
        </div>

        {/* Top brand */}
        <div className="relative z-10 p-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-sm shrink-0">
              <span className="text-black font-black text-lg leading-none">W</span>
            </div>
            <div>
              <div className="text-zinc-100 font-extrabold text-xl tracking-[0.2em] leading-none">WORLDr</div>
              <div className="text-amber-500/60 font-mono text-[9px] tracking-[0.25em] uppercase leading-none mt-1">Life Simulator</div>
            </div>
          </div>
        </div>

        {/* Bottom text */}
        <div className="relative z-10 mt-auto p-8 pb-10">
          <div className="max-w-xs">
            <div className="text-[10px] text-amber-500/50 font-mono uppercase tracking-[0.25em] mb-3">Return to Your Life</div>
            <h2 className="text-2xl font-bold text-zinc-100 leading-tight mb-3">
              Welcome Back to<br />
              <span className="text-amber-400">WORLDr</span>
            </h2>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Continue your political, economic, and social journey in a living world where your decisions shape your legacy.
            </p>

            {/* Game pillars */}
            <div className="grid grid-cols-2 gap-2">
              {PILLARS.map((p) => (
                <div
                  key={p.text}
                  className="flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] text-zinc-400"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
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

      {/* ── Right Form Panel ─── */}
      <div className="flex flex-col w-full lg:w-[420px] xl:w-[460px] relative overflow-y-auto overflow-x-hidden">
        {/* Panel background */}
        <div className="absolute inset-0 bg-[#080810] border-l border-white/[0.04]" />

        {/* Top gradient stripe */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

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
