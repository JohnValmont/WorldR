'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BOOT_LINES = [
  '> WORLDR CORE SYSTEM GATEWAY v1.0.0 LOADING...',
  '> SYNCING SECURITY MIDDLEWARE KEYS......... [OK]',
  '> ESTABLISHING SUPABASE POSTGRESQL POOL... [OK]',
  '> SECURING JSON WEB TOKEN EXCHANGE LAYER... [OK]',
  '> RE-VERIFYING BREVO EMAIL API TRANSCEIVER. [OK]',
  '> SYSTEM CHECK: NO REGISTERED DRIFTS DETECTED',
  '> ALL DIRECTORIES OPERATING WITHIN PARAMETERS',
  '> SECURE AUTH GATEWAY INTERFACE IS NOW ONLINE.',
];

export default function LandingPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < BOOT_LINES.length) {
        setLines(prev => [...prev, BOOT_LINES[i]].filter(Boolean));
        i++;
      }
      if (i >= BOOT_LINES.length) {
        clearInterval(interval);
        setTimeout(() => setDone(true), 400);
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen w-full bg-[#050508] text-zinc-300 overflow-y-auto overflow-x-hidden font-sans relative selection:bg-amber-500/20 selection:text-amber-400">
      
      {/* ── Background Gradients & Grids ─── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Glowing ambient nodes */}
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-950/10 blur-[150px]" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-950/5 blur-[120px]" />
        
        {/* Cyber grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />

        {/* Scanlines overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px)'
        }} />
      </div>

      {/* ── Header Navbar ─── */}
      <header className="relative z-50 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded-sm">
              <span className="text-black font-black text-base">W</span>
            </div>
            <div>
              <span className="text-zinc-100 font-extrabold text-sm tracking-[0.2em] uppercase">WORLDR</span>
              <span className="text-amber-500/70 font-mono text-[8px] tracking-[0.25em] block uppercase">System Gateway</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 px-4 py-1.5 transition-all">
              LOGIN
            </Link>
            <Link href="/register" className="text-[10px] font-mono font-bold tracking-widest text-black bg-amber-500 hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.35)] hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] px-4 py-1.5 transition-all">
              SIGN UP
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-24 pb-12 text-center lg:text-left grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
        <div className="lg:col-span-3 space-y-6">
          <span className="inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/[0.05] px-3 py-1 rounded-sm text-[9px] font-mono text-amber-500 tracking-[0.15em] uppercase animate-pulse mx-auto lg:mx-0">
            🔒 Secure Authorization Core
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-none">
            Secure Auth Gateway. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.15)]">Robust Identity Layer.</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto lg:mx-0 font-mono">
            Welcome to the WORLDr centralized authentication node. Built with a Supabase PostgreSQL backend, JWT access/refresh token rotation, password hashing, and secure email OTP verification via the Brevo HTTPS API.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
            <Link href="/register" className="text-[10px] font-mono font-bold tracking-wider text-black bg-amber-500 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] px-6 py-2.5 rounded-sm transition-all uppercase">
              Establish Faction Account
            </Link>
            <Link href="/login" className="text-[10px] font-mono font-bold tracking-wider text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 px-6 py-2.5 rounded-sm transition-all uppercase">
              Enter the Terminal
            </Link>
          </div>
        </div>

        {/* Console Box */}
        <div id="terminal" className="lg:col-span-2 border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-sm p-4 rounded-sm shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-amber-500 text-[9px] font-bold uppercase tracking-widest font-mono">System Core Kernel</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-600">SYS_ID: WORLDR_NODE_1</span>
          </div>
          <div className="space-y-1.5 font-mono">
            {lines.map((line, i) => (
              <div key={i} className={`text-[10px] text-left leading-relaxed ${
                line.includes('[OK]') ? 'text-emerald-400' :
                line.startsWith('>') ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                {line}
              </div>
            ))}
            {!done && <div className="inline-block w-1.5 h-3 bg-amber-500 animate-pulse ml-0.5" />}
          </div>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer className="absolute bottom-6 inset-x-0 text-center relative z-10">
        <p className="text-zinc-700 text-[10px] font-mono">
          &copy; {new Date().getFullYear()} WORLDr &mdash; Secure Identity System Core
        </p>
      </footer>
    </div>
  );
}
