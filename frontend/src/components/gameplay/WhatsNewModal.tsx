'use client';
// Release notes for the current build. Shown once per build (key from build.json), in-game only,
// and only to RETURNING players: a brand-new player already gets the First Day guide, and stacking
// two modals on their first screen is the worst possible first impression.
import React, { useEffect, useRef, useState } from 'react';
import { X, Landmark, Handshake, Globe2, Map, Gauge } from 'lucide-react';
import { BUILD, buildLabel } from '../../lib/design/tokens';
import { FIRST_DAY_MODAL_KEY } from './FirstDayModal';

const STORAGE_KEY = `worldr_seen_build_${BUILD.version}`;

const NOTES: { icon: React.ReactNode; title: string; desc: string }[] = [
  { icon: <Landmark size={18} />, title: 'The Floor: politics rebuilt', desc: 'One Desk with three decisions a month, individual votes on every bill, and a race for your own district. Seats are shared out by vote in each district.' },
  { icon: <Handshake size={18} />, title: 'Coalitions and deals', desc: 'After an election, any leader with seats can offer a coalition. Deals promise ministries and laws, and coalition unity decides how reliably partners vote with you.' },
  { icon: <Globe2 size={18} />, title: 'Three nations, one world', desc: 'Drennia, Westmark and Eryndor each have their own government, laws and economy. Relations, treaties and trade link them. The World tab compares them side by side.' },
  { icon: <Gauge size={18} />, title: 'An economy voters feel', desc: 'Jobs, growth and debt now move approval, and approval moves the election. Budgets and tariffs change who works where.' },
  { icon: <Map size={18} />, title: 'One clock, a new look', desc: 'Business and politics now turn the same month. Every screen uses one design system, with clearer text, focus outlines for keyboard players and less motion if you ask your device for it.' },
];

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
      // First session: the First Day guide covers it. Mark this build as seen.
      if (!localStorage.getItem(FIRST_DAY_MODAL_KEY)) { localStorage.setItem(STORAGE_KEY, '1'); return; }
    } catch { return; }
    const t = setTimeout(() => setOpen(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode: show again next time */ }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-fade-in-up" role="dialog" aria-modal="true" aria-labelledby="whats-new-title">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface shadow-pop">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
        <header className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 sm:px-8 sm:pt-8">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />{buildLabel}
            </div>
            <h2 id="whats-new-title" className="font-display text-2xl font-semibold tracking-wide text-ink">What&apos;s new</h2>
          </div>
          <button ref={closeRef} onClick={dismiss} aria-label="Close" className="-mr-2 -mt-1 rounded-full p-2 text-ink-faint transition-colors hover:bg-raised hover:text-ink">
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-6 sm:px-8">
          {NOTES.map(n => (
            <div key={n.title} className="flex items-start gap-4 rounded-2xl border border-line bg-raised/50 p-4">
              <div className="flex-shrink-0 rounded-xl bg-accent/10 p-2.5 text-accent">{n.icon}</div>
              <div>
                <h3 className="mb-1 text-sm font-semibold text-ink">{n.title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-dim">{n.desc}</p>
              </div>
            </div>
          ))}
          <p className="pt-1 text-[12px] leading-relaxed text-ink-faint">
            This is a closed alpha: numbers will be rebalanced and the world may be reset. Report anything odd on{' '}
            <a href={BUILD.discord} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">Discord</a>.
          </p>
        </div>
        <footer className="flex justify-end border-t border-line px-6 py-4 sm:px-8">
          <button onClick={dismiss} className="btn-primary">Got it</button>
        </footer>
      </div>
    </div>
  );
}
