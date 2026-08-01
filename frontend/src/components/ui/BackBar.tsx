'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Briefcase, Landmark, Globe, Home, BookOpen, Lock } from 'lucide-react';
import GuideModal from '../gameplay/GuideModal';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../lib/api';

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
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);
  const { user } = useAuthStore();
  const isSuperAdmin = user?.email?.toLowerCase() === 'kyxplayss@gmail.com' || user?.email?.toLowerCase() === 'infoforbiddengaming@gmail.com';
  const isAdmin = user?.role === 'admin' || isSuperAdmin || isAdminDynamic;

  useEffect(() => {
    authApi.me().then(res => setIsAdminDynamic(res.data.isAdmin)).catch(() => {});
  }, []);

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

  return (
    <header className="sticky top-0 z-30 flex items-center h-10 px-4 bg-[#090A0F]/90 backdrop-blur-md border-b border-zinc-900/60 select-none">
      {/* Back button */}
      {!isHub ? (
        <button
          onClick={goBack}
          title="Go back"
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-100 hover:bg-white/5 rounded transition-colors -ml-1"
        >
          <ArrowLeft size={13} />
          <span>BACK</span>
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-zinc-600 text-xs font-mono">
          <LayoutGrid size={13} />
          <span>HUB</span>
        </div>
      )}

      {/* Breadcrumb separator */}
      <span className="mx-2 text-zinc-700 text-xs">/</span>

      {/* Current section label */}
      <span className="text-xs font-mono font-medium text-zinc-300 capitalize">
        {SECTION_LABELS[section] || section}
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
        {isAdmin ? (
          <Link href="/drennia/politics" title="Politics Desk" className={`p-1.5 rounded transition-colors ${section === 'politics' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
            <Landmark size={14} />
          </Link>
        ) : (
          <a href="#" onClick={(e) => { e.preventDefault(); alert('Political Desk is currently locked for pre-release testing. Only administrators have access.'); }} title="Politics Desk (Locked for testing)" className={`p-1.5 rounded transition-colors ${section === 'politics' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5 flex items-center justify-center cursor-not-allowed'}`}>
            <Lock size={14} className="opacity-70 text-amber-500/70" />
          </a>
        )}
        <Link href="/drennia/world" title="World Feed" className={`p-1.5 rounded transition-colors ${section === 'world' ? 'text-terminal-amber bg-terminal-amber/10' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
          <Globe size={14} />
        </Link>

      </nav>
    </header>
  );
}
