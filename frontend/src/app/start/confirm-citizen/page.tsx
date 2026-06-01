'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function getInitials(first: string, last: string): string {
  const parts = [first, last].filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.map((p) => p.charAt(0).toUpperCase()).join('').slice(0, 3);
}

function buildFullName(first: string, last: string): string {
  return [first, last].filter(Boolean).join(' ') || '—';
}

export default function ConfirmCitizenPage() {
  const router = useRouter();
  const [citizenFile, setCitizenFile] = useState<any>(null);
  const [revealed, setRevealed] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
      if (!granted) {
        router.replace('/pre-alpha-access');
        return;
      }
      setAuthorized(true);

      const raw = localStorage.getItem('worldr_citizen_file_v1');
      if (raw) {
        setCitizenFile(JSON.parse(raw));
      } else {
        router.replace('/start/character');
      }
    }
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, [router]);

  const handleEnterWorld = () => {
    localStorage.setItem('worldr_living_world_entry_v1', 'true');
    router.push('/drennia/home');
  };

  if (!authorized || !citizenFile) {
    return <div className="min-h-screen bg-[#07100D] flex items-center justify-center"><div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" /></div>;
  }

  const initials = getInitials(citizenFile.name.first, citizenFile.name.last);
  const fullName = buildFullName(citizenFile.name.first, citizenFile.name.last);

  return (
    <div className="min-h-screen bg-[#07100D] py-12 px-4 sm:px-6 lg:px-8 transition-all duration-500" style={{ opacity: revealed ? 1 : 0, transform: revealed ? 'translateY(0)' : 'translateY(14px)' }}>
      <div className="max-w-2xl mx-auto flex flex-col items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 text-center">Citizen File Created</h1>
        <p className="text-zinc-500 text-sm text-center">Your public life has officially begun.</p>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="rounded-sm overflow-hidden" style={{ background: 'rgba(10,10,20,0.85)', border: '1px solid rgba(245,158,11,0.22)', boxShadow: '0 0 50px rgba(245,158,11,0.06), 0 12px 50px rgba(0,0,0,0.7)' }}>
          <div className="px-6 py-4 flex items-center gap-2 border-b border-white/[0.05]" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.07), transparent)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-[0.28em]">Official Record · Active</span>
          </div>

          <div className="p-6 flex flex-col gap-6">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-sm flex items-center justify-center text-2xl font-bold font-mono" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))', border: '1.5px solid rgba(245,158,11,0.35)', color: '#f59e0b', letterSpacing: '-0.04em' }}>
                  {initials}
                </div>
              </div>
              <div>
                <div className="text-white font-bold text-xl leading-tight mb-1">{fullName}</div>
                <div className="text-zinc-500 text-xs font-mono">{citizenFile.origin.nation} · {citizenFile.origin.state}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">Age: {citizenFile.age} · New Citizen</span>
                </div>
              </div>
            </div>

            <div className="h-px" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(255,255,255,0.03), transparent)' }} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-1">Generated Contact</div>
                <div className="text-zinc-200 text-xs font-semibold">{citizenFile.contact.name}</div>
                <div className="text-zinc-500 text-[10px]">{citizenFile.contact.role}</div>
              </div>
              {citizenFile.obligation && (
                <div>
                  <div className="text-[9px] font-mono text-amber-600 uppercase tracking-[0.18em] mb-1">Obligation</div>
                  <div className="text-amber-200 text-xs font-semibold">{citizenFile.obligation.description}</div>
                  <div className="text-amber-500/70 text-[10px]">Must be managed</div>
                </div>
              )}
              {citizenFile.vulnerability && (
                <div>
                  <div className="text-[9px] font-mono text-red-500/70 uppercase tracking-[0.18em] mb-1">Vulnerability</div>
                  <div className="text-red-300 text-xs font-semibold">{citizenFile.vulnerability.description}</div>
                </div>
              )}
              <div>
                <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-1">Starting Funds</div>
                <div className="text-emerald-400 text-xs font-semibold font-mono">${citizenFile.money.toLocaleString()}</div>
              </div>
            </div>

            <div className="h-px bg-white/[0.04]" />

            <div>
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-3 block">Final Factors</span>
              <div className="grid grid-cols-4 gap-3">
                <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 text-center">Cred</div>
                  <div className="text-lg font-bold text-white text-center">{citizenFile.factors.Credibility}</div>
                </div>
                <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 text-center">Char</div>
                  <div className="text-lg font-bold text-white text-center">{citizenFile.factors.Charisma}</div>
                </div>
                <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 text-center">Infl</div>
                  <div className="text-lg font-bold text-white text-center">{citizenFile.factors.Influence}</div>
                </div>
                <div className="p-2 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1 text-center">Rsrc</div>
                  <div className="text-lg font-bold text-white text-center">{citizenFile.factors.Resources}</div>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/[0.04]" />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleEnterWorld}
                className="group relative flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', boxShadow: '0 4px 20px rgba(245,158,11,0.2)' }}
              >
                <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }} />
                Enter {citizenFile.origin.nation}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
