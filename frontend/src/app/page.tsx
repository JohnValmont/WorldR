'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BOOT_LINES = [
  '> WORLDR SIM ENGINE v1.0.0 LOADING...',
  '> INITIALIZING ECONOMY MODULE.............. [OK]',
  '> INITIALIZING POLITICS ENGINE............. [OK]',
  '> INITIALIZING INFLATION SYSTEM............ [OK]',
  '> INITIALIZING CRISIS DETECTOR............. [OK]',
  '> CONNECTING TO KELDORIA DATABASE.......... [OK]',
  '> NATION STATE LOADED: KELDORIA',
  '> CURRENT TICK: MONTH 0 // AWAITING GOVERNMENT',
  '> GOVERNANCE TERMINAL READY.',
];

const FEATURES = [
  { icon: '📈', title: 'Live Economy', desc: 'Manage GDP, sectors, inflation, and fiscal policy in real time.' },
  { icon: '⚖️', title: 'Law System', desc: 'Propose, debate, and pass legislation with real simulation effects.' },
  { icon: '🗳️', title: 'Elections', desc: 'Compete for parliament seats using D\'Hondt proportional representation.' },
  { icon: '🏛️', title: 'Political Parties', desc: 'Create or join ideological parties with real manifesto positions.' },
  { icon: '💰', title: 'Budget Control', desc: 'Balance revenue and spending across healthcare, welfare, education, and more.' },
  { icon: '⚡', title: 'Crisis Events', desc: 'Recessions, protests, banking crises, and strikes emerge from your decisions.' },
];

export default function LandingPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        const line = BOOT_LINES[i];
        setLines(prev => [...prev, line].filter(Boolean));
        i++;
      }
      if (i >= BOOT_LINES.length) {
        clearInterval(interval);
        setTimeout(() => setDone(true), 400);
      }
    }, 160);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full bg-black overflow-y-auto relative">
      {/* Scanlines overlay */}
      <div className="pointer-events-none fixed inset-0 z-0" style={{
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.05) 2px,rgba(0,0,0,0.05) 4px)'
      }} />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-500 flex items-center justify-center">
              <span className="text-black font-black text-xl">W</span>
            </div>
            <div>
              <h1 className="text-3xl font-black text-amber-400 tracking-widest">WORLDR</h1>
              <p className="text-zinc-600 text-xs uppercase tracking-widest">Political Simulation Alpha</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-100 mb-3 leading-tight">
              Govern a nation.<br />
              <span className="text-amber-400">Shape its future.</span>
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              WORLDr is a realistic political and economic simulation. Take control of a nation's
              economy, legislation, and political parties. Every decision has consequences. The
              simulation doesn't forgive bad governance.
            </p>

            <div className="flex gap-3">
              <Link href="/register" className="btn-primary inline-block">
                Start Playing
              </Link>
              <Link href="/login" className="btn-secondary inline-block">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Boot terminal */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 mb-16 max-w-2xl">
          <div className="flex items-center gap-2 mb-3 border-b border-zinc-800 pb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">SYSTEM BOOT LOG</span>
          </div>
          <div className="space-y-0.5">
            {lines.map((line, i) => {
              if (!line) return null;
              return (
                <div key={i} className={`text-xs font-mono ${
                  line.includes('[OK]') ? 'text-emerald-400' :
                  line.includes('WAITING') ? 'text-amber-400' :
                  line.startsWith('>') ? 'text-zinc-300' : 'text-zinc-500'
                }`}>
                  {line}
                </div>
              );
            })}
            {!done && <div className="text-amber-500 text-xs font-mono cursor-blink" />}
          </div>
        </div>

        {/* Features grid */}
        <div className="mb-16">
          <div className="section-header mb-6">Core Systems</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="terminal-card p-4 hover:border-zinc-700 transition-colors">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">{f.title}</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alpha notice */}
        <div className="border border-amber-900/40 bg-amber-950/10 p-4 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">⚠ ALPHA v0.1</span>
          </div>
          <p className="text-zinc-500 text-xs">
            This is the first public alpha of WORLDr. One nation (Keldoria) is available for governance.
            Create a party, run for parliament, and shape national policy.
          </p>
        </div>

        <div className="text-center text-zinc-700 text-[10px] uppercase tracking-widest">
          WORLDr Alpha v0.1 · Political Simulation · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
