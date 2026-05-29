'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const TAGLINES = [
  'Every leader, citizen, tycoon, officer,',
  'and revolutionary begins somewhere.',
];

export default function StartLifePage() {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 120);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">

      {/* Cinematic vignette ring */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 120px rgba(0,0,0,0.85)' }} />

      {/* Top badge */}
      <div
        className="mb-10 transition-all duration-700"
        style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(12px)' }}
      >
        <span className="inline-flex items-center gap-2 border border-amber-500/25 bg-amber-500/5 text-amber-400/80 font-mono text-[10px] uppercase tracking-[0.3em] px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse" />
          World Simulator — Aethon
        </span>
      </div>

      {/* Main headline */}
      <div
        className="transition-all duration-700 delay-150"
        style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(16px)' }}
      >
        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.9] tracking-tight mb-2">
          WORLDr
        </h1>
        <div className="w-24 h-px mx-auto my-5"
          style={{ background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
        <p className="text-zinc-300 text-lg md:text-xl font-light tracking-wide leading-relaxed max-w-lg mx-auto">
          Begin a life.{' '}
          <span className="text-amber-400 font-medium">Shape a nation.</span>{' '}
          Leave a legacy.
        </p>
      </div>

      {/* CTA */}
      <div
        className="mt-12 transition-all duration-700 delay-300"
        style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(20px)' }}
      >
        <button
          id="start-new-life-btn"
          onClick={() => router.push('/onboarding/create-character')}
          className="group relative inline-flex items-center gap-3 px-10 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-black overflow-hidden rounded-sm"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 0 30px rgba(245,158,11,0.25), 0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          {/* Shine sweep */}
          <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out"
            style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }} />
          <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728.707.707M3 12h1m16 0h1M4.927 19.073l.707-.707M18.364 5.636l.707-.707" />
          </svg>
          Start New Life
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </button>
      </div>

      {/* Atmospheric tagline */}
      <div
        className="mt-8 transition-all duration-700 delay-500"
        style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(12px)' }}
      >
        <p className="text-zinc-600 text-xs font-mono tracking-widest max-w-xs mx-auto leading-relaxed">
          {TAGLINES[0]}<br />{TAGLINES[1]}
        </p>
      </div>

      {/* Bottom decorative stats */}
      <div
        className="mt-20 grid grid-cols-3 gap-px max-w-sm w-full transition-all duration-700 delay-700"
        style={{ opacity: revealed ? 0.5 : 0 }}
      >
        {[
          { label: 'Continents', value: '4' },
          { label: 'World Era', value: 'Modern' },
          { label: 'Status', value: 'Alpha' },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center gap-1 border border-white/[0.04] py-3 px-4 bg-white/[0.01]">
            <span className="text-amber-400 font-bold text-base font-mono">{s.value}</span>
            <span className="text-zinc-700 font-mono text-[9px] uppercase tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
