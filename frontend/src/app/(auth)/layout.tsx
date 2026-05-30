'use client';
import Image from 'next/image';

// ── WorldMapGlobe — real map image scrolling inside a sphere ──────────────────
//
// Strategy: use the actual dark WORLDr map PNG as the texture.
// Two copies scroll horizontally inside a circular clipped container.
// A radial shading overlay creates the 3D globe illusion.
// This preserves the exact country shapes from the reference map.

function WorldMapGlobe() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">

      {/* CSS keyframe injected inline */}
      <style>{`
        @keyframes worldScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .globe-map-scroll {
          animation: worldScroll 80s linear infinite;
        }
      `}</style>

      {/* Soft outer ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'clamp(240px, 62%, 370px)',
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle, rgba(18,65,210,0.14) 0%, transparent 68%)',
          transform: 'scale(1.5)',
        }}
      />

      {/* ── Globe circle ── */}
      <div
        className="relative rounded-full overflow-hidden shrink-0"
        style={{
          width:  'clamp(240px, 62%, 370px)',
          aspectRatio: '1 / 1',
        }}
      >
        {/* Scrolling map — two copies for seamless horizontal loop */}
        <div
          className="globe-map-scroll"
          style={{
            display: 'flex',
            width: '200%',
            height: '100%',
          }}
        >
          {([0, 1] as const).map((idx) => (
            <div key={idx} style={{ width: '50%', height: '100%', position: 'relative', flexShrink: 0 }}>
              <Image
                src="/worldr-map.png"
                alt="Aethon world map"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center' }}
                priority={idx === 0}
              />
            </div>
          ))}
        </div>

        {/* ── Sphere edge shading — darkens the rim to create 3D globe feel ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(circle at 40% 38%,',
              '  transparent 18%,',
              '  rgba(1,4,18,0.22) 45%,',
              '  rgba(1,3,14,0.60) 68%,',
              '  rgba(0,2,10,0.92) 88%,',
              '  rgba(0,1,8,1) 100%)',
            ].join(' '),
          }}
        />

        {/* ── Fixed grid lines (latitude) — non-scrolling, adds globe feel ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ opacity: 0.12 }}
        >
          {[16.7, 33.3, 50, 66.7, 83.3].map((pct) => (
            <div
              key={pct}
              className="absolute w-full"
              style={{
                top: `${pct}%`,
                height: '1px',
                background: 'rgba(55, 130, 250, 1)',
              }}
            />
          ))}
        </div>

        {/* ── Specular highlight (top-left glint) ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '7%', left: '9%',
            width: '40%', height: '40%',
            background: 'radial-gradient(circle at 38% 38%, rgba(255,255,255,0.06) 0%, transparent 65%)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* ── Globe rim border ── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width:  'clamp(240px, 62%, 370px)',
          aspectRatio: '1 / 1',
          border: '1.5px solid rgba(55,125,245,0.40)',
          boxShadow: '0 0 32px rgba(20,80,230,0.20), inset 0 0 32px rgba(8,40,180,0.06)',
        }}
      />
    </div>
  );
}

// ── Game pillars ────────────────────────────────────────────────────────────────

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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[#050508] to-[#050508]" />

        {/* Subtle gold grid */}
        <div
          className="absolute inset-0 opacity-[0.016]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(245,158,11,1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Globe — centred in the panel */}
        <div className="absolute inset-0 flex items-center justify-center">
          <WorldMapGlobe />
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
