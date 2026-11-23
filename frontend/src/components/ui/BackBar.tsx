'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Home, Landmark, Briefcase, Wallet, Globe2, BookOpen } from 'lucide-react';
import GuideModal from '../gameplay/GuideModal';
import { BUILD, buildLabel } from '../../lib/design/tokens';

/**
 * The game's top bar, on every /drennia screen.
 *
 * - Labelled destinations (Home, Politics, Business, Money, World): players should never have
 *   to guess what an icon means. Below md only the active label shows.
 * - A Back button that never leaves the game: in-app depth is tracked in sessionStorage, so
 *   router.back() only fires when there is real in-game history; otherwise it goes Home.
 * - The build badge (from public/design/build.json), Discord and the Guide live here and nowhere
 *   else, so nothing floats over page content.
 */

const HUB = '/drennia/chronicle';
const NAV_DEPTH_KEY = 'worldr_nav_depth_v1';

const DESTINATIONS: { href: string; label: string; icon: React.ElementType; sections: string[] }[] = [
  { href: HUB, label: 'Home', icon: Home, sections: ['chronicle', 'home'] },
  { href: '/drennia/politics', label: 'Politics', icon: Landmark, sections: ['politics'] },
  { href: '/drennia/business', label: 'Business', icon: Briefcase, sections: ['business', 'company', 'market', 'contracts', 'registry'] },
  { href: '/drennia/money', label: 'Money', icon: Wallet, sections: ['money', 'investments', 'exchange'] },
  { href: '/drennia/world', label: 'World', icon: Globe2, sections: ['world', 'network', 'records', 'career', 'family'] },
];

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.007.128 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.031-.029ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.332-.946 2.418-2.157 2.418Z" />
    </svg>
  );
}

export default function BackBar() {
  const router = useRouter();
  const pathname = usePathname() || '';
  const section = pathname.split('/').filter(Boolean)[1] || 'chronicle';
  const isHub = section === 'chronicle' || section === 'home';
  const [showGuide, setShowGuide] = useState(false);

  // Track in-app navigation depth so Back never leaves the game world.
  useEffect(() => {
    try {
      const depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) || '0');
      sessionStorage.setItem(NAV_DEPTH_KEY, String(depth + 1));
    } catch { /* storage blocked: Back falls back to Home */ }
  }, [pathname]);

  const goBack = () => {
    let depth = 0;
    try { depth = Number(sessionStorage.getItem(NAV_DEPTH_KEY) || '0'); } catch { /* ignore */ }
    if (depth > 1) {
      try { sessionStorage.setItem(NAV_DEPTH_KEY, String(depth - 1)); } catch { /* ignore */ }
      router.back();
    } else {
      router.push(HUB);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md select-none">
      <div className="mx-auto flex h-12 max-w-[1720px] items-center gap-1 px-2 sm:gap-2 sm:px-4">
        {!isHub && (
          <button onClick={goBack} aria-label="Go back" title="Go back"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink">
            <ArrowLeft size={17} />
          </button>
        )}

        <Link href={HUB} aria-label="WORLDr home" className="mr-1 hidden items-baseline rounded-md px-1.5 py-1 font-display text-[15px] font-bold text-ink sm:flex">
          <span className="tracking-[0.18em]">WORLD</span><span className="-ml-[0.1em] text-[0.8em] text-accent">r</span>
        </Link>
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />

        <nav aria-label="Main" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide">
          {DESTINATIONS.map(d => {
            const active = d.sections.includes(section);
            const Icon = d.icon;
            return (
              <Link key={d.href} href={d.href} aria-current={active ? 'page' : undefined} title={d.label}
                className={`relative flex h-9 shrink-0 items-center gap-2 rounded-[10px] px-2.5 text-[13px] font-medium transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-ink-dim hover:bg-white/5 hover:text-ink'}`}>
                <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
                <span className={active ? 'inline' : 'hidden md:inline'}>{d.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => setShowGuide(true)} title="How to play" aria-label="How to play"
            className="flex h-9 items-center gap-2 rounded-[10px] px-2.5 text-[13px] text-ink-dim transition-colors hover:bg-white/5 hover:text-ink">
            <BookOpen size={16} /><span className="hidden lg:inline">Guide</span>
          </button>
          <a href={BUILD.discord} target="_blank" rel="noopener noreferrer" title="Join the Discord" aria-label="Join the Discord"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-ink-dim transition-colors hover:bg-[#5865F2]/15 hover:text-[#8A93F7]">
            <DiscordIcon />
          </a>
          <span title="This is a closed alpha: expect rebalancing and resets."
            className="ml-1 hidden items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />{buildLabel}
          </span>
        </div>
      </div>
      {showGuide && <GuideModal onDismiss={() => setShowGuide(false)} />}
    </header>
  );
}
