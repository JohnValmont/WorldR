'use client';
// Game shell for every /drennia/* screen.
// Access is decided by the SERVER (does this account have a character?), not by
// localStorage — see lib/session.ts. Children render only once that is known.
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BackBar from '../../components/ui/BackBar';
import GameChat from '../../components/chat/GameChat';
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090A0F' }}>
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  if (gate === 'offline') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center', background: '#090A0F', color: '#A79D8C', padding: 16, textAlign: 'center' }}>
        <p>Can&apos;t reach the WORLDr servers right now.</p>
        <button
          onClick={check}
          className="px-4 py-2 rounded border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090A0F', width: '100%' }}>
      <BackBar />
      {children}
      <GameChat />
    </div>
  );
}
