'use client';
// Game shell for every /drennia/* screen.
// Access is decided by the SERVER (does this account have a character?), not by
// localStorage — see lib/session.ts. Children render only once that is known.
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BackBar from '../../components/ui/BackBar';
import GameChat from '../../components/chat/GameChat';
import WhatsNewModal from '../../components/gameplay/WhatsNewModal';
import { resolveSession, LOGIN_PATH, CREATE_CHARACTER_PATH } from '../../lib/session';

type Gate = 'checking' | 'ready' | 'offline';

export default function DrenniaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>('checking');

  const check = useCallback(async () => {
    setGate('checking');
    const session = await resolveSession();
    switch (session.kind) {
      case 'ready':
        setGate('ready');
        break;
      case 'no_character':
        window.location.href = CREATE_CHARACTER_PATH; // static onboarding page, outside the Next router
        break;
      case 'signed_out':
        window.location.href = LOGIN_PATH;
        break;
      case 'offline':
        // Server unreachable: let returning players in on their cached file
        // (pages will show their own load errors); new players get a retry.
        setGate(session.hasCache ? 'ready' : 'offline');
        break;
    }
  }, []);

  useEffect(() => {
    check();
  }, [check, router]);

  if (gate === 'checking') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg" role="status" aria-live="polite">
        <span className="font-display text-xl font-bold text-ink"><span className="tracking-[0.2em]">WORLD</span><span className="-ml-[0.1em] text-accent text-[0.8em]">r</span></span>
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-line">
          <div className="h-full w-1/3 animate-[loadbar_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
        </div>
        <span className="sr-only">Loading your world</span>
      </div>
    );
  }

  if (gate === 'offline') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-4 text-center" role="alert">
        <span className="font-display text-xl font-bold text-ink"><span className="tracking-[0.2em]">WORLD</span><span className="-ml-[0.1em] text-accent text-[0.8em]">r</span></span>
        <p className="max-w-sm text-ink-dim">Can&apos;t reach the WORLDr servers right now. Check your connection, or try again in a minute.</p>
        <button onClick={check} className="btn-secondary">Try again</button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-bg">
      <BackBar />
      <main id="main" className="flex w-full flex-1 flex-col">{children}</main>
      <GameChat />
      <WhatsNewModal />
    </div>
  );
}
