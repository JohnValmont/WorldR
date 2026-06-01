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

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  const max = 20;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color }}>{label}</span>
        <span className="text-[11px] font-bold font-mono" style={{ color }}>{value}</span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, (value / max) * 100)}%`, background: color }}
        />
      </div>
    </div>
  );
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

  const handleGoBack = () => {
    router.push('/start/character');
  };

  if (!authorized || !citizenFile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07100D' }}>
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const name = citizenFile.name || {};
  const factors = citizenFile.factors || {};
  const initials = getInitials(name.first || '', name.last || '');
  const fullName = buildFullName(name.first || '', name.last || '');

  return (
    <div
      className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-all duration-500"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, rgba(30,30,60,0.5) 0%, #07100D 60%)',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(14px)',
      }}
    >
      <div className="max-w-xl mx-auto flex flex-col items-center mb-8">
        <div className="text-[10px] font-mono text-amber-500/50 uppercase tracking-[0.3em] mb-3">Citizen File Confirmed</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2 text-center">Your Life Is Filed</h1>
        <p className="text-zinc-500 text-sm text-center">Drennia now has a record of who you are.</p>
      </div>

      <div className="max-w-xl mx-auto space-y-4">

        {/* Name + avatar block */}
        <div className="rounded-sm overflow-hidden" style={{ background: 'rgba(10,10,20,0.85)', border: '1px solid rgba(245,158,11,0.22)', boxShadow: '0 0 50px rgba(245,158,11,0.06), 0 12px 50px rgba(0,0,0,0.7)' }}>
          <div className="px-6 py-4 flex items-center gap-2 border-b border-white/[0.05]" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.07), transparent)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-[0.28em]">Official Record · Pre-Alpha</span>
          </div>

          <div className="p-6">
            <div className="flex items-center gap-5 mb-5">
              <div className="relative shrink-0">
                <div
                  className="w-16 h-16 rounded-sm flex items-center justify-center text-xl font-bold font-mono"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))', border: '1.5px solid rgba(245,158,11,0.35)', color: '#f59e0b', letterSpacing: '-0.04em' }}
                >
                  {initials}
                </div>
                <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-500/50" />
                <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-500/50" />
                <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-500/50" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-500/50" />
              </div>
              <div>
                <div className="text-white font-bold text-xl leading-tight mb-1">{fullName}</div>
                <div className="text-zinc-500 text-xs font-mono">Age {citizenFile.age} · {citizenFile.motherland} · {citizenFile.homeState}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-widest">New Citizen · WORLDr</span>
                </div>
              </div>
            </div>

            <div className="h-px mb-5" style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.2), rgba(255,255,255,0.03), transparent)' }} />

            {/* Summary paragraph */}
            {citizenFile.summaryParagraph && (
              <p className="text-zinc-400 text-sm leading-relaxed italic mb-5" style={{ borderLeft: '2px solid rgba(245,158,11,0.3)', paddingLeft: '12px' }}>
                {citizenFile.summaryParagraph}
              </p>
            )}

            {/* Life details grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs mb-5">
              {[
                { label: 'Home State',     value: citizenFile.homeState },
                { label: 'Background',     value: citizenFile.householdBackground },
                { label: 'Known For',      value: citizenFile.childhoodMark },
                { label: 'First Contact',  value: citizenFile.firstNpcContactName },
                { label: 'Early Burden',   value: citizenFile.earlyBurden },
                { label: 'Ambition',       value: citizenFile.firstAmbition },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-0.5">{f.label}</div>
                  <div className="text-zinc-200 font-medium leading-snug">{f.value || '—'}</div>
                </div>
              ))}
            </div>

            <div className="h-px mb-5 bg-white/[0.04]" />

            {/* Factor bars */}
            <div className="space-y-3">
              <FactorBar label="Credibility" value={factors.Credibility || 0} color="#818cf8" />
              <FactorBar label="Charisma"    value={factors.Charisma    || 0} color="#34d399" />
              <FactorBar label="Influence"   value={factors.Influence   || 0} color="#f59e0b" />
              <FactorBar label="Resources"   value={factors.Resources   || 0} color="#60a5fa" />
            </div>

            {/* Obligation / Contact */}
            {(citizenFile.obligation || citizenFile.contact?.name) && (
              <>
                <div className="h-px mt-5 mb-4 bg-white/[0.04]" />
                <div className="grid grid-cols-2 gap-4">
                  {citizenFile.contact?.name && (
                    <div className="p-3 rounded-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-[0.18em] mb-1">First Contact</div>
                      <div className="text-zinc-200 text-xs font-semibold">{citizenFile.contact.name}</div>
                      <div className="text-zinc-500 text-[10px]">{citizenFile.contact.role}</div>
                    </div>
                  )}
                  {citizenFile.obligation && (
                    <div className="p-3 rounded-sm" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)' }}>
                      <div className="text-[9px] font-mono text-amber-600 uppercase tracking-[0.18em] mb-1">Obligation</div>
                      <div className="text-amber-200 text-xs font-semibold">{citizenFile.obligation.description}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="h-px mt-5 mb-5 bg-white/[0.04]" />

            {/* Starting money */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">Starting Funds</span>
              <span className="text-emerald-400 text-sm font-bold font-mono">${(citizenFile.money || 0).toLocaleString()}</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleGoBack}
                className="px-5 py-2.5 text-xs font-semibold uppercase tracking-widest rounded-sm transition-all duration-150"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
              >
                ← Edit
              </button>
              <button
                type="button"
                onClick={handleEnterWorld}
                className="group relative flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-bold uppercase tracking-[0.15em] rounded-sm overflow-hidden transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#000', boxShadow: '0 4px 20px rgba(245,158,11,0.2)' }}
              >
                <span className="absolute inset-0 translate-x-[-110%] group-hover:translate-x-[110%] transition-transform duration-500 ease-in-out" style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }} />
                Enter Drennia
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-[10px] font-mono uppercase tracking-widest pb-4">
          WORLDr · Pre-Alpha · All data stored locally
        </p>
      </div>
    </div>
  );
}
