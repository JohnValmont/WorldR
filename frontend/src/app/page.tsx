'use client';
import Link from 'next/link';

const DISCORD_URL = 'https://discord.gg/K64Ff8fN';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.25 10.5h17.5m-17.5 4h17.5M12 3.25a9.75 9.75 0 110 19.5 9.75 9.75 0 010-19.5z" />
      </svg>
    ),
    title: 'Living World',
    text: 'A constitutional monarchy with royal NPCs, active political parties, state governments, and deep public records.',
    color: '#f59e0b',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: 'Political Rise',
    text: 'Join parties, compete for nominations, contest districts, and rise from assembly member to prime minister.',
    color: '#6366f1',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: 'Business Power',
    text: 'Build companies, invest through the exchange, lobby politics, and become a true economic power.',
    color: '#22c55e',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    title: 'NPC Institutions',
    text: 'Compete against NPC politicians, business elites, judges, and royal figures who already hold power.',
    color: '#a855f7',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Public Records & Consequences',
    text: 'Opportunities, relationships, and actions are permanent. Every decision shapes your public narrative.',
    color: '#f43f5e',
  },
  {
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
    title: 'Pre-Alpha Access',
    text: 'Access is limited to testers. A pre-alpha code is required to enter Drennia while the world is constructed.',
    color: '#94a3b8',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#050508] text-zinc-300 overflow-x-hidden font-sans relative selection:bg-amber-500/20 selection:text-amber-400">

      {/* ── Background ─── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Ambient glows */}
        <div className="absolute top-[-15%] left-[10%] w-[700px] h-[700px] rounded-full bg-indigo-950/20 blur-[180px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full bg-amber-950/10 blur-[140px]" />
        <div className="absolute bottom-[0%] left-[30%] w-[400px] h-[400px] rounded-full bg-indigo-950/10 blur-[120px]" />
        {/* Subtle world grid */}
        <div className="absolute inset-0 opacity-[0.018]" style={{
          backgroundImage: 'linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }} />
      </div>

      {/* ── Header Navbar ─── */}
      <header className="relative z-50 border-b border-white/[0.04] bg-black/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-sm shrink-0">
              <span className="text-black font-black text-base leading-none">W</span>
            </div>
            <div>
              <div className="text-zinc-100 font-extrabold text-sm tracking-[0.2em] leading-none">WORLDr</div>
              <div className="text-amber-500/60 font-mono text-[8px] tracking-[0.2em] uppercase leading-none mt-0.5">Pre-Alpha</div>
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-indigo-300 hover:text-indigo-200 border border-indigo-800/60 hover:border-indigo-600/80 bg-indigo-950/30 hover:bg-indigo-950/50 px-3 py-1.5 rounded-sm transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
              </svg>
              Discord
            </a>
            <Link
              href="/login"
              className="text-[10px] font-semibold tracking-wider text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 px-3 sm:px-4 py-1.5 rounded-sm transition-all duration-200"
            >
              Log In
            </Link>
            <Link
              href="/pre-alpha-access"
              className="text-[10px] font-bold tracking-wider text-black bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_28px_rgba(245,158,11,0.5)] px-4 py-1.5 rounded-sm transition-all duration-200"
            >
              Pre-Alpha Access
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        {/* Pre-badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 border border-amber-500/25 bg-amber-500/5 text-amber-400/80 font-mono text-[9px] uppercase tracking-[0.3em] px-4 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse" />
            Pre-alpha in development
          </span>
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[1.0] tracking-tight mb-6 max-w-5xl mx-auto">
          WORLDr
        </h1>

        {/* Subheadline */}
        <h2 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent mb-6 max-w-3xl mx-auto">
          A living multiplayer world of politics, business, power, and legacy.
        </h2>

        {/* Supporting text */}
        <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-3xl mx-auto mb-10">
          Begin as a citizen of a living nation. Build reputation, wealth, relationships, and influence. Join parties, start companies, compete with NPCs and real players, and rise through the institutions of Drennia.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            href="/register"
            className="group relative inline-flex items-center gap-2.5 px-8 py-3.5 text-sm font-bold tracking-wide text-black overflow-hidden rounded-sm shadow-[0_0_30px_rgba(245,158,11,0.25)]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out"
              style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)' }} />
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Account
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold tracking-wide text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 bg-zinc-900/40 hover:bg-zinc-900/70 rounded-sm transition-all duration-200"
          >
            Login
          </Link>

          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold tracking-wide text-indigo-300 hover:text-indigo-200 border border-indigo-700/50 hover:border-indigo-500/70 bg-indigo-950/30 hover:bg-indigo-950/50 rounded-sm transition-all duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
            </svg>
            Join Discord
          </a>
        </div>
      </section>

      {/* ── Divider ─── */}
      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)' }} />
      </div>

      {/* ── Feature Cards ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-[10px] font-mono text-amber-500/60 uppercase tracking-[0.3em] mb-3">What Awaits You</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">The Nation of Drennia</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-sm p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'rgba(10,10,20,0.7)',
                border: '1px solid rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="absolute top-0 inset-x-0 h-px rounded-t-sm" style={{ background: `linear-gradient(90deg, transparent, ${f.color}40, transparent)` }} />
              <div className="absolute inset-0 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ boxShadow: `inset 0 0 24px ${f.color}08` }} />

              <div className="mb-4 p-2.5 rounded-sm w-fit" style={{ background: `${f.color}12`, color: f.color, border: `1px solid ${f.color}25` }}>
                {f.icon}
              </div>
              <h3 className="text-zinc-100 font-bold text-sm mb-2">{f.title}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── World Tagline Banner ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-16">
        <div
          className="rounded-sm px-8 py-10 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(15,15,35,0.9), rgba(6,6,12,0.95))',
            border: '1px solid rgba(245,158,11,0.1)',
            boxShadow: 'inset 0 0 80px rgba(245,158,11,0.02)',
          }}
        >
          <div className="text-amber-500/50 font-mono text-[10px] uppercase tracking-[0.3em] mb-4">Development Status</div>
          <p className="text-zinc-300 text-lg sm:text-xl leading-relaxed max-w-xl mx-auto font-light">
            First closed testing coming soon.
            <br />
            <span className="text-amber-400 font-medium">Access limited to testers.</span>
          </p>
          <div className="mt-8 flex items-center justify-center gap-6">
            <Link
              href="/pre-alpha-access"
              className="group relative inline-flex items-center gap-2 px-8 py-3 text-sm font-bold tracking-wide text-black overflow-hidden rounded-sm"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 24px rgba(245,158,11,0.2)' }}
            >
              <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-700 ease-in-out"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)' }} />
              Pre-Alpha Access Gate
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center rounded-sm shrink-0">
              <span className="text-black font-black text-[10px] leading-none">W</span>
            </div>
            <span className="text-zinc-600 font-mono text-[10px] uppercase tracking-wider">WORLDr · Living World Simulator</span>
          </div>
          <p className="text-zinc-700 text-[10px] font-mono">
            © {new Date().getFullYear()} WORLDr — All rights reserved
          </p>
        </div>
      </footer>
    </div>
  );
}
