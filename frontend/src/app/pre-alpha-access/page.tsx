'use client';
// Temporary frontend-only pre-alpha gate. Move to server-side invite/access control before wider release.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFlowRedirectPath } from '../../lib/flow';

export default function PreAlphaAccessPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If already granted, skip directly to /start
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1');
      if (granted === 'true') {
        router.replace(getFlowRedirectPath());
      }
    }
  }, [router]);

  const handleAccess = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode === 'ROSE1551' || cleanCode === 'WORLDR-ALPHA-01') {
      setLoading(true);
      localStorage.setItem('worldr_pre_alpha_access_granted_v1', 'true');
      localStorage.setItem('worldr_pre_alpha_access_granted_at', new Date().toISOString());
      
      // Artificial delay for feel
      setTimeout(() => {
        router.push(getFlowRedirectPath());
      }, 800);
    } else {
      setError('Invalid pre-alpha access code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#111311] text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-amber-900/50">
      
      {/* LEFT PANEL - MAIN HERO & ACCESS CARD */}
      <div className="w-full md:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative z-10 border-r border-white/[0.03]">
        <div className="max-w-md w-full mx-auto md:mr-0 md:ml-auto flex flex-col items-start relative">
          
          <div className="mb-8 inline-flex items-center gap-2 border border-amber-600/30 bg-amber-500/5 text-amber-500/80 font-mono text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 rounded-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
            Restricted Entry
          </div>

          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            WORLDr is entering<br />
            <span className="text-amber-500/90 italic">Pre-Alpha</span>
          </h1>
          
          <p className="text-lg text-zinc-300 font-light mb-4">
            A living multiplayer life-to-power world is being built.
          </p>

          <p className="text-sm text-zinc-500 leading-relaxed mb-10 pb-10 border-b border-white/[0.05]">
            WORLDr is a living country simulator. In this <strong>Pre-Alpha v0.1</strong>, you have access to the Business, Equity, and Politics modules. Rise through wealth, institutions, business, elections, and the stock exchange. Access is limited to pre-alpha testers.
          </p>

          {/* ACCESS CARD */}
          <div className="w-full bg-[#161a15] border border-[#272f25] p-6 rounded-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-900 opacity-50" />
            
            <h2 className="text-base font-semibold text-zinc-200 tracking-wide mb-4">Pre-Alpha Tester Access</h2>
            
            <form onSubmit={handleAccess} className="flex flex-col gap-3">
              <input 
                type="text" 
                placeholder="Enter access code"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="bg-[#0f120e] border border-[#2c3629] text-zinc-200 px-4 py-3 rounded-sm focus:outline-none focus:border-amber-700/60 transition-colors font-mono tracking-widest text-sm uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-600"
                disabled={loading}
              />
              {error && (
                <div className="text-red-400 text-xs font-mono bg-red-950/20 border border-red-900/30 px-3 py-2 rounded-sm flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                  {error}
                </div>
              )}
              <button 
                type="submit"
                disabled={loading || !code.trim()}
                className="bg-amber-600 hover:bg-amber-500 text-black font-semibold uppercase tracking-[0.15em] text-xs px-6 py-3.5 rounded-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex justify-center items-center gap-2"
              >
                {loading ? 'Verifying...' : 'Enter WORLDr'}
              </button>
            </form>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <span className="text-zinc-600 text-xs font-mono uppercase tracking-widest">No code?</span>
            <a 
              href="https://discord.gg/K64Ff8fN" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-amber-500/70 hover:text-amber-400 text-xs font-semibold tracking-wider transition-colors flex items-center gap-1.5"
            >
              Join Discord
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>

        </div>
      </div>

      {/* RIGHT PANEL - FEATURE PREVIEW */}
      <div className="w-full md:w-1/2 bg-[#0c0e0b] relative flex flex-col justify-center p-8 md:p-16 lg:p-24 overflow-y-auto">
        
        {/* Subtle decorative grid/texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" 
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="max-w-md w-full mx-auto md:ml-0 md:mr-auto relative z-10 space-y-12 py-12">
          
          {[
            { 
              title: "Living Drennia", 
              desc: "A constitutional monarchy with royal NPCs, parties, companies, state governments, and public records.",
              icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
            },
            { 
              title: "Rise Through Power", 
              desc: "Start as a person, earn Credibility, Charisma, Influence, and Resources, then build your path.",
              icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            },
            { 
              title: "Politician Path", 
              desc: "Join NPC/player parties, compete for nomination, contest districts, and rise from assembly member to prime minister.",
              icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            },
            { 
              title: "Businessman Path", 
              desc: "Build companies, invest through the Drennport Exchange, lobby politics, and become an economic power.",
              icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            },
            { 
              title: "NPC World", 
              desc: "NPC politicians, business elites, civil servants, judges, royal figures, and institutions already hold power.",
              icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            },
            { 
              title: "Opportunity Board", 
              desc: "Progress through meaningful opportunities, relationships, obligations, and public consequences instead of tap farming.",
              icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            }
          ].map((feature, i) => (
            <div key={i} className="flex gap-4 group">
              <div className="shrink-0 mt-1 flex items-center justify-center w-10 h-10 rounded-sm bg-[#1a2118] border border-[#2b3a27] text-amber-500/70 group-hover:text-amber-400 group-hover:border-amber-900/50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                </svg>
              </div>
              <div>
                <h3 className="text-zinc-200 font-semibold mb-1 text-sm">{feature.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}

          <div className="pt-12 border-t border-white/[0.03]">
            <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-700">
              Pre-alpha systems are under active development. Access may reset during testing.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
