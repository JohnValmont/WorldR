'use client';
import Image from 'next/image';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { getFlowRedirectPath } from '../../lib/flow';
import { Landmark, Factory, Handshake, Globe2 } from 'lucide-react';
import { buildLabel } from '../../lib/design/tokens';
import { REAL_HOURS_PER_GAME_MONTH } from '../../lib/gameTime';

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
          animation: worldScroll 25s linear infinite;
        }
      `}</style>

      {/* Soft outer ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'clamp(240px, 62%, 370px)',
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle, rgba(232,184,75,0.10) 0%, transparent 68%)',
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
                background: 'rgba(232, 184, 75, 1)',
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
          border: '1px solid rgba(232,184,75,0.38)',
          boxShadow: '0 0 40px rgba(232,184,75,0.12), inset 0 0 32px rgba(232,184,75,0.05)',
        }}
      />
    </div>
  );
}

// ── Game pillars ────────────────────────────────────────────────────────────────

// Only what a player can actually do in this build.
const PILLARS = [
  { icon: Landmark, text: 'Win a seat in Parliament' },
  { icon: Factory, text: 'Build a car company' },
  { icon: Handshake, text: 'Form coalitions, pass laws' },
  { icon: Globe2, text: 'Three rival nations' },
];

// ── Auth layout ────────────────────────────────────────────────────────────────

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Redirect already-authenticated users away from auth pages
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(getFlowRedirectPath());
    }
  }, [isAuthenticated, router]);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#0B0D12]">

      {/* ── Left hero panel ─── */}
      <aside aria-label="About WORLDr" className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_30%_20%,rgba(232,184,75,0.07),transparent_60%)]" />

        {/* Subtle gold grid */}
        <div
          className="absolute inset-0 opacity-[0.016]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(232,184,75,1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(232,184,75,1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Globe — centred in the panel with enhanced glow */}
        {/* Globe sits in the upper part of the panel so it never runs under the copy below. */}
        <div className="absolute inset-x-0 top-[6%] h-[50%] flex items-center justify-center">
          {/* Background glow halo */}
          <div className="absolute w-96 h-96 rounded-full bg-amber-500/[0.06] blur-3xl -z-10" />
          <WorldMapGlobe />
        </div>

        {/* Top brand */}
        <div className="relative z-10 p-8">
          <a href="/landing/index.html" className="inline-flex items-center gap-3" aria-label="WORLDr home">
            <span className="text-accent text-xl drop-shadow-[0_0_10px_rgba(232,184,75,0.5)]" aria-hidden>✦</span>
            <span>
              <span className="block font-display text-xl font-bold text-ink leading-none"><span className="tracking-[0.2em]">WORLD</span><span className="-ml-[0.1em] text-accent text-[0.8em]">r</span></span>
              <span className="block text-[11px] tracking-[0.14em] uppercase text-ink-faint leading-none mt-1.5">Politics &amp; business simulation</span>
            </span>
          </a>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10 mt-auto p-8 pb-10">
          <div className="max-w-xs">
            <div className="text-[11px] text-accent font-semibold uppercase tracking-[0.18em] mb-3">
              The world of Aethan
            </div>
            <h2 className="font-display text-[26px] font-semibold text-ink leading-tight mb-3">
              Build a company. Fund a party. Write the laws.
            </h2>
            <p className="text-ink-dim text-sm leading-relaxed mb-6">
              A persistent multiplayer world where your rivals live under the laws you pass.
              The month turns every {REAL_HOURS_PER_GAME_MONTH} hours, whether you are online or not.
            </p>

            {/* Game pillars */}
            <div className="grid grid-cols-2 gap-2">
              {PILLARS.map((p) => (
                <div key={p.text} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border border-line bg-white/[0.02] text-[13px] text-ink-dim">
                  <p.icon size={15} className="text-accent shrink-0" />
                  <span>{p.text}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Version badge */}
        <div className="absolute top-8 right-8 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />{buildLabel}
          </span>
        </div>
      </aside>

      {/* ── Right form panel ─── */}
      <div className="flex flex-col w-full lg:w-[440px] xl:w-[480px] relative overflow-y-auto overflow-x-hidden">
        {/* Panel background with gradient */}
        <div className="absolute inset-0 bg-surface/40 border-l border-line" />

        {/* Subtle animated background pattern */}
        <div
          className="absolute inset-0 opacity-[0.008]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, rgba(232,184,75,1) 0px, transparent 50px),' +
              'radial-gradient(circle at 80% 80%, rgba(232,184,75,1) 0px, transparent 50px)',
            pointerEvents: 'none',
          }}
        />

        {/* Top gradient stripe */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

        {/* Mobile logo */}
        <header className="relative z-10 flex lg:hidden items-center gap-3 p-6 pb-0">
          <span className="text-accent text-lg" aria-hidden>✦</span>
          <span className="font-display text-base font-bold text-ink"><span className="tracking-[0.2em]">WORLD</span><span className="-ml-[0.1em] text-accent text-[0.8em]">r</span></span>
          <span className="ml-auto rounded-full border border-accent/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">{buildLabel}</span>
        </header>

        <main id="main" className="relative z-10 flex flex-col flex-1 justify-center p-6 lg:p-8 xl:p-10">
          {children}
        </main>

        {/* Bottom footer */}
        <footer className="relative z-10 px-6 lg:px-8 pb-4 pt-2">
          <p className="text-ink-faint text-[11px] text-center">
            {`© ${new Date().getFullYear()} WORLDr · Politics & business simulation`}
          </p>
        </footer>
      </div>
    </div>
  );
}
