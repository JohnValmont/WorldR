'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const BOOT_LINES = [
  '> WORLDR SIM ENGINE v1.0.0 LOADING...',
  '> INITIALIZING ECONOMY ENGINE.............. [OK]',
  '> INITIALIZING POLITICS KERNEL............. [OK]',
  '> BOOTING MULTIPLAYER LOBBY NETWORK........ [OK]',
  '> SYNCING REGULATORY COMPLIANCE SYSTEM..... [OK]',
  '> NATION STATE LOADED: KELDORIA (ACTIVE)',
  '> CURRENT TICK: MONTH 6 // AWAITING SESSION',
  '> GEOPOLITICAL TERMINAL READY FOR ACTION.',
];

const BLOC_NAMES: Record<string, string> = {
  industrial_workers: 'Industrial Workers',
  union_members: 'Union Members',
  middle_class_professionals: 'Middle Class Professionals',
  pensioners_elderly: 'Pensioners & Elderly',
  rural_conservatives: 'Rural Conservatives',
  large_business_executives: 'Large Business & Executives',
  industrial_conglomerates: 'Industrial Conglomerates',
};

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
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-950/5 blur-[150px]" />
        
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
              <span className="text-amber-500/70 font-mono text-[8px] tracking-[0.25em] block uppercase">Alpha v0.1</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[10px] font-mono uppercase tracking-wider text-zinc-500">
            <a href="#parliament" className="hover:text-amber-400 transition-colors">Parliament</a>
            <a href="#laws" className="hover:text-amber-400 transition-colors">Legislation</a>
            <a href="#economy" className="hover:text-amber-400 transition-colors">Economy</a>
            <a href="#terminal" className="hover:text-amber-400 transition-colors">System Log</a>
          </nav>

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
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center lg:text-left grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
        <div className="lg:col-span-3 space-y-6">
          <span className="inline-flex items-center gap-2 border border-amber-500/30 bg-amber-500/[0.05] px-3 py-1 rounded-sm text-[9px] font-mono text-amber-500 tracking-[0.15em] uppercase animate-pulse mx-auto lg:mx-0">
            🏛️ Multiplayer Geopolitical Simulator
          </span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-100 leading-none">
            Govern a nation. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(245,158,11,0.15)]">Shape its future.</span>
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed max-w-xl mx-auto lg:mx-0">
            WORLDr is a realistic political simulation. Form a political party, win democratic elections,
            negotiate coalition ministries, and draft legislation. Every tax rate, public budget, and diplomatic
            trade deal is voted on by real players in real-time.
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
            <Link href="/register" className="text-[10px] font-mono font-bold tracking-wider text-black bg-amber-500 hover:bg-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] px-6 py-2.5 rounded-sm transition-all uppercase">
              Sign Up for Alpha
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
              <span className="text-amber-500 text-[9px] font-bold uppercase tracking-widest font-mono">Sim System Kernel</span>
            </div>
            <span className="text-[8px] font-mono text-zinc-600">LOBBY_ID: VALD_08</span>
          </div>
          <div className="space-y-1 font-mono">
            {lines.map((line, i) => (
              <div key={i} className={`text-[10px] ${
                line.includes('[OK]') ? 'text-emerald-400' :
                line.includes('ACTIVE') ? 'text-amber-400' :
                line.startsWith('>') ? 'text-zinc-400' : 'text-zinc-500'
              }`}>
                {line}
              </div>
            ))}
            {!done && <div className="inline-block w-1.5 h-3 bg-amber-500 animate-pulse ml-0.5" />}
          </div>
        </div>
      </section>

      {/* ── Main Gameplay Features Cockpits ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-16 space-y-20">
        <div className="text-center space-y-2">
          <h2 className="text-[10px] font-mono text-amber-500 uppercase tracking-[0.3em]">CORE GAMEPLAY DYNAMICS</h2>
          <p className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-widest">Interactive Geopolitical Cockpits</p>
        </div>

        {/* 1. PARLIAMENT SYSTEM MOCKUP */}
        <div id="parliament" className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center border-t border-zinc-900 pt-10">
          <div className="lg:col-span-2 space-y-4 text-left">
            <span className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Playable System</span>
            <h3 className="text-lg font-black font-mono text-zinc-100 uppercase tracking-wider">Coalition & Parliament Chamber</h3>
            <p className="text-zinc-500 text-xs leading-relaxed font-mono">
              Create a political party, draft ideological agendas, and campaign to secure seats in parliament. 
              No single party ever secures an absolute majority; players must negotiate coalition ministries, 
              divide department portfolios, and govern the nation cooperatively.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border border-zinc-900 bg-zinc-950/30 p-2.5 rounded-sm">
                <span className="text-[10px] text-zinc-600 block uppercase font-mono tracking-wider">Seat Math</span>
                <span className="text-xs text-zinc-300 font-bold font-mono">D'Hondt Proportional Representation</span>
              </div>
              <div className="border border-zinc-900 bg-zinc-950/30 p-2.5 rounded-sm">
                <span className="text-[10px] text-zinc-600 block uppercase font-mono tracking-wider">Coalitions</span>
                <span className="text-xs text-zinc-300 font-bold font-mono">Divide Ministries & Control Votes</span>
              </div>
            </div>
          </div>

          {/* HTML Mockup of Chamber demographics */}
          <div className="lg:col-span-3 border border-zinc-800 bg-zinc-950/40 p-5 rounded-sm relative shadow-2xl">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4 font-mono">
              <div>
                <h4 className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Bundestag Demographics</h4>
                <p className="text-[8px] text-zinc-600 uppercase">Live Seat Distribution · Keldoria Legislative</p>
              </div>
              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold animate-pulse uppercase">
                Governing Majority (248/450)
              </span>
            </div>

            <div className="space-y-3 font-mono">
              {[
                { name: 'Social Democratic Party (SPD)', seats: 138, color: '#f87171', alliance: 'Governing Coalition' },
                { name: 'Free Democratic Party (FDP)', seats: 110, color: '#facc15', alliance: 'Governing Coalition' },
                { name: 'Christian Democratic Union (CDU)', seats: 90, color: '#3b82f6', alliance: 'Opposition' },
                { name: 'Green Party (GRE)', seats: 65, color: '#10b981', alliance: 'Opposition' },
                { name: 'Nationalist Coalition (NAT)', seats: 47, color: '#f97316', alliance: 'Opposition' },
              ].map(party => (
                <div key={party.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: party.color }} />
                      <span className="text-zinc-200 font-bold">{party.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 font-bold">{party.seats} seats</span>
                      <span className={`text-[7px] border px-1 py-0.2 uppercase font-black ${
                        party.alliance === 'Governing Coalition' 
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400' 
                          : 'bg-zinc-900/20 border-zinc-800/40 text-zinc-500'
                      }`}>{party.alliance === 'Governing' ? 'Gov' : party.alliance.split(' ')[0]}</span>
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900/50 h-1.5 border border-zinc-800/60 rounded-sm overflow-hidden">
                    <div className="h-full" style={{ width: `${(party.seats / 450) * 100}%`, backgroundColor: party.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. LEGISLATIVE SYSTEM MOCKUP */}
        <div id="laws" className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center border-t border-zinc-900 pt-10">
          {/* HTML Mockup of Propose Modal/Bill */}
          <div className="lg:col-span-3 order-last lg:order-first border border-zinc-800 bg-zinc-950/40 p-5 rounded-sm relative shadow-2xl">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
            <div className="flex justify-between items-start border-b border-zinc-900 pb-3 mb-4 font-mono">
              <div>
                <h4 className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Active Proposed Bill</h4>
                <p className="text-[8px] text-zinc-600 uppercase">Debated in Committee · Voting Active</p>
              </div>
              <span className="text-[8px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                DRAFT ARTICLE
              </span>
            </div>

            <div className="space-y-4 font-mono">
              <div>
                <h5 className="text-[11px] font-bold text-zinc-200 uppercase tracking-wider">Progressive Taxation & Public Welfare Act</h5>
                <p className="text-[9px] text-zinc-500 leading-relaxed mt-1">
                  Adjusts the income tax structure to tax top earners progressivly, directly transferring surplus revenues to expand state healthcare and public education allocations.
                </p>
              </div>

              {/* Stat targets bubble list */}
              <div className="space-y-2">
                <span className="text-[8px] text-zinc-600 uppercase tracking-wider block">STAT TARGET IMPACTS</span>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[8px] border border-zinc-800 bg-emerald-950/10 text-emerald-400 px-2 py-0.5 rounded-sm">
                    GDP Growth → +1.8% (moderate)
                  </span>
                  <span className="text-[8px] border border-zinc-800 bg-emerald-950/10 text-emerald-400 px-2 py-0.5 rounded-sm">
                    Inequality → -3.2% (major)
                  </span>
                  <span className="text-[8px] border border-zinc-800 bg-rose-950/10 text-rose-400 px-2 py-0.5 rounded-sm">
                    Inflation → +0.4% (minor)
                  </span>
                  <span className="text-[8px] border border-zinc-800 bg-emerald-950/10 text-emerald-400 px-2 py-0.5 rounded-sm">
                    Income Tax Rate → 35% (primary)
                  </span>
                </div>
              </div>

              {/* Voter bloc standings list */}
              <div className="space-y-2">
                <span className="text-[8px] text-zinc-600 uppercase tracking-wider block">VOTER BLOC STANDING MODIFIERS</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {[
                    { name: 'Industrial Workers', val: 3 },
                    { name: 'Union Members', val: 4 },
                    { name: 'Large Business & Executives', val: -4 },
                    { name: 'Industrial Conglomerates', val: -3 },
                  ].map(b => (
                    <div key={b.name} className={`text-[8px] flex justify-between ${b.val >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span>{b.name}</span>
                      <span className="font-bold">{b.val >= 0 ? '+' : ''}{b.val}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4 text-left">
            <span className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Playable System</span>
            <h3 className="text-lg font-black font-mono text-zinc-100 uppercase tracking-wider">Legislative Bill Drafting</h3>
            <p className="text-zinc-500 text-xs leading-relaxed font-mono">
              Formulate deep economic and social bills. Unlike direct slider updates, any shifts in tax structures 
              or ministry allocations must be packaged into a bill and submitted to the parliament committee. 
              Draft bills go through a live 2-tick debate and vote before they are enacted or discarded.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border border-zinc-900 bg-zinc-950/30 p-2.5 rounded-sm">
                <span className="text-[10px] text-zinc-600 block uppercase font-mono tracking-wider">2-Tick Debates</span>
                <span className="text-xs text-zinc-300 font-bold font-mono">Vote, Amend or Expire Bills</span>
              </div>
              <div className="border border-zinc-900 bg-zinc-950/30 p-2.5 rounded-sm">
                <span className="text-[10px] text-zinc-600 block uppercase font-mono tracking-wider">Demographics</span>
                <span className="text-xs text-zinc-300 font-bold font-mono">Affinities & Turnout Modifiers</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. MACRO-ECONOMY SYSTEM MOCKUP */}
        <div id="economy" className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center border-t border-zinc-900 pt-10">
          <div className="lg:col-span-2 space-y-4 text-left">
            <span className="bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">Playable System</span>
            <h3 className="text-lg font-black font-mono text-zinc-100 uppercase tracking-wider">Live Macro-Economic Engine</h3>
            <p className="text-zinc-500 text-xs leading-relaxed font-mono">
              Manage GDP growth, sector labor supplies, CPI inflation, and state debt ratios. 
              Subsidize key industries (Agriculture, Industry, Services), manage corporate tax evasion, 
              and build a robust national treasury. Keep your deficits balanced to secure AAA credit ratings.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="border border-zinc-900 bg-zinc-950/30 p-2.5 rounded-sm">
                <span className="text-[10px] text-zinc-600 block uppercase font-mono tracking-wider">Taxation</span>
                <span className="text-xs text-zinc-300 font-bold font-mono">Sales, Property & Tariffs</span>
              </div>
              <div className="border border-zinc-900 bg-zinc-950/30 p-2.5 rounded-sm">
                <span className="text-[10px] text-zinc-600 block uppercase font-mono tracking-wider">Budget Balance</span>
                <span className="text-xs text-zinc-300 font-bold font-mono">Administration, Welfare & Health</span>
              </div>
            </div>
          </div>

          {/* HTML Mockup of Budget cockpit */}
          <div className="lg:col-span-3 border border-zinc-800 bg-zinc-950/40 p-5 rounded-sm relative shadow-2xl">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3 mb-4 font-mono">
              <div>
                <h4 className="text-[10px] text-zinc-300 font-bold uppercase tracking-wider">Fiscal Balance Sheet</h4>
                <p className="text-[8px] text-zinc-600 uppercase">Live Cockpit View · Annual Projections</p>
              </div>
              <span className="text-[8px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-black tracking-widest uppercase">
                Deficit Forecast
              </span>
            </div>

            {/* mini stat cards */}
            <div className="grid grid-cols-3 gap-2 mb-4 font-mono text-center">
              <div className="border border-zinc-900 bg-zinc-950/50 p-2">
                <span className="text-[8px] text-zinc-600 block uppercase tracking-wider">Total Rev</span>
                <span className="text-xs text-emerald-400 font-bold">$112M</span>
              </div>
              <div className="border border-zinc-900 bg-zinc-950/50 p-2">
                <span className="text-[8px] text-zinc-600 block uppercase tracking-wider">Total Spending</span>
                <span className="text-xs text-amber-500 font-bold">$1.15B</span>
              </div>
              <div className="border border-zinc-900 bg-zinc-950/50 p-2">
                <span className="text-[8px] text-zinc-600 block uppercase tracking-wider">Treasury Balance</span>
                <span className="text-xs text-emerald-400 font-bold">$2.02B</span>
              </div>
            </div>

            <div className="space-y-3 font-mono">
              <span className="text-[8px] text-zinc-600 uppercase tracking-wider block">TAX STRUCTURE GAUGES</span>
              {[
                { name: 'Corporate Tax', rate: 19, revenue: '27M', proposed: 10, color: 'bg-blue-500' },
                { name: 'Income Tax', rate: 32, revenue: '46M', proposed: 35, color: 'bg-amber-500' },
                { name: 'Sales Tax', rate: 19, revenue: '27M', proposed: 19, color: 'bg-purple-500' },
              ].map(tax => (
                <div key={tax.name} className="space-y-1">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-zinc-200 font-bold uppercase">{tax.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 text-[8px]">Rev: ${tax.revenue}</span>
                      <span className="text-zinc-300 font-bold">{tax.rate.toFixed(1)}%</span>
                      {tax.proposed !== tax.rate && (
                        <span className="text-amber-400 text-[8px] bg-amber-950/20 px-1 py-0.2 animate-pulse border border-amber-900/30">
                          🏛️ → {tax.proposed.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-zinc-900 h-1 border border-zinc-800/40 overflow-hidden">
                    <div className={`h-full ${tax.color}`} style={{ width: `${(tax.rate / 60) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Alpha Warning Box ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-12">
        <div className="border border-amber-500/20 bg-amber-500/[0.03] p-5 rounded-sm text-left relative overflow-hidden font-mono">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <h4 className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest mb-1.5 flex items-center gap-2">
            ⚠️ ALPHA DEPLOYMENT NOTICE
          </h4>
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            WORLDr is currently in active v0.1 Alpha. Core multiplayer capabilities, including Bundestag party formations, 
            coalition deal wagers, live budget proposing, and 2-tick parliament voting are fully integrated. 
            Create your character, join an ideological faction, and participate in direct democratic calculations.
          </p>
        </div>
      </section>

      {/* ── Footer ─── */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950/80 py-8 font-mono text-[9px] uppercase tracking-wider text-zinc-700">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © {new Date().getFullYear()} WORLDR Geopolitical Simulation · All Rights Reserved
          </div>
          <div className="flex gap-4">
            <span className="hover:text-zinc-500 cursor-pointer">LOBBY STATUS: ONLINE</span>
            <span className="hover:text-zinc-500 cursor-pointer">v0.1.0-alpha</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
