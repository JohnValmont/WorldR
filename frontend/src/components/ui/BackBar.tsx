'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Briefcase, Landmark, Globe, Home, BookOpen } from 'lucide-react';
import GuideModal from '../gameplay/GuideModal';
import { useAuthStore } from '../../store/auth.store';

/**
 * BackBar — a slim, sticky global navigation bar for the in-game (/drennia) shell.
 *
 * Guarantees a "Back" affordance on every game screen so the player can always
 * return to the previous thing they were looking at, and can never accidentally
 * be dropped outside the game world.
 *
 * Behaviour:
 * - Tracks in-app navigation depth in sessionStorage so router.back() only fires
 *   when there is real in-game history; otherwise it falls back to the Chronicle hub.
 * - Hides the Back button on the Chronicle hub (top level of the game).
 * - Renders nothing on /drennia/business, which already ships its own full header
 *   with an integrated back link (avoids a duplicate bar).
 */

const HUB = '/drennia/chronicle';
const NAV_DEPTH_KEY = 'worldr_nav_depth_v1';

const SECTION_LABELS: Record<string, string> = {
  chronicle: 'Chronicle',
  business: 'Business Desk',
  politics: 'Political Desk',
  market: 'Market',
  world: 'World Map',
  career: 'Career',
  family: 'Family',
  network: 'Network',
  records: 'Records',
  registry: 'Registry',
  money: 'Money',
  contracts: 'Contracts',
  opportunities: 'Opportunities',
  rooms: 'Rooms',
  company: 'Company',
};

export default function BackBar() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const segments = pathname.split('/').filter(Boolean); // e.g. ['drennia', 'market']
  const section = segments[1] || 'chronicle';
  const isHub = section === 'chronicle';
  const [showGuide, setShowGuide] = useState(false);
  const { user } = useAuthStore();
  const isSuperAdmin = user?.email?.toLowerCase() === 'kyxplayss@gmail.com';

  // Track in-app navigation depth so Back never leaves the game world.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) || '0');
    sessionStorage.setItem(NAV_DEPTH_KEY, String(depth + 1));
  }, [pathname]);

  // The Business Desk owns its own header + back link — don't double up.
  if (section === 'business') return null;

  const goBack = () => {
    if (typeof window === 'undefined') return;
    const depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) || '0');
    if (depth > 1) {
      sessionStorage.setItem(NAV_DEPTH_KEY, String(depth - 1));
      router.back();
    } else {
      router.push(HUB);
    }
  };

  const label =
    SECTION_LABELS[section] || section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 md:px-6 h-11 border-b border-[#23232b] bg-[#0c0d13]/95 backdrop-blur-sm shrink-0">
      {!isHub ? (
        <button
          onClick={goBack}
          aria-label="Go back to the previous screen"
          className="flex items-center gap-1.5 -ml-1.5 rounded-sm px-1.5 py-1 text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:text-terminal-amber focus:outline-none focus:ring-1 focus:ring-terminal-amber/40"
        >
          <ArrowLeft size={12} /> Back
        </button>
      ) : (
        <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.12em] text-zinc-600">
          <LayoutGrid size={12} /> Hub
        </span>
      )}

      <span className="h-4 w-px bg-[#23232b]" />

      <Link
        href={HUB}
        className="text-[10px] font-mono font-black tracking-[0.25em] text-terminal-amber amber-glow transition-colors hover:text-amber-300"
      >
        WORLDr
      </Link>

      <span className="h-4 w-px bg-[#23232b]" />

      <span className="truncate text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-400 flex items-center gap-2">
        {label}
        <button
          onClick={() => setShowGuide(true)}
          title="Game Guide"
          className="ml-2 flex items-center gap-1.5 rounded bg-terminal-amber/10 px-2 py-0.5 text-[9px] font-mono uppercase tracking-[0.12em] text-terminal-amber transition-colors hover:bg-terminal-amber/20 focus:outline-none"
        >
          <BookOpen size={10} /> Guide
        </button>
      </span>

      {showGuide && <GuideModal onDismiss={() => setShowGuide(false)} />}

      <div className="flex-1" />

      {/* Quick-jump nav */}
      <nav className="flex items-center gap-1">
        <Link href="/drennia/chronicle" title="Chronicle Hub" className={`p-1.5 rounded transition-colors ${section === 'chronicle' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
          <Home size={14} />
        </Link>
        <Link href="/drennia/business" title="Business Desk" className="p-1.5 rounded transition-colors text-zinc-500 hover:text-zinc-300 hover:bg-white/5">
          <Briefcase size={14} />
        </Link>
        {isSuperAdmin ? (
          <Link href="/drennia/politics" title="Politics Desk" className={`p-1.5 rounded transition-colors ${section === 'politics' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
            <Landmark size={14} />
          </Link>
        ) : (
          <a href="#" onClick={(e) => { e.preventDefault(); alert('Political desk will be available on 09 July 2026.'); }} title="Politics Desk" className={`p-1.5 rounded transition-colors ${section === 'politics' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
            <Landmark size={14} />
          </a>
        )}
        <Link href="/drennia/world" title="World Feed" className={`p-1.5 rounded transition-colors ${section === 'world' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
          <Globe size={14} />
        </Link>
      </nav>
    </header>
  );
}
