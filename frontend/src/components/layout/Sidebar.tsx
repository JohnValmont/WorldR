'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Overview',    icon: '▣',  group: 'GOVERNANCE' },
  { href: '/economy',    label: 'Economy',     icon: '↗',  group: 'GOVERNANCE' },
  { href: '/budget',     label: 'Budget',      icon: '◈',  group: 'GOVERNANCE' },
  { href: '/inflation',  label: 'Inflation',   icon: '⌇',  group: 'GOVERNANCE' },
  { href: '/laws',       label: 'Laws',        icon: '⚖',  group: 'GOVERNANCE' },
  { href: '/parliament', label: 'Parliament',  icon: '🏛',  group: 'POLITICS' },
  { href: '/politics',   label: 'Politics',    icon: '⬡',  group: 'POLITICS' },
  { href: '/elections',  label: 'Elections',   icon: '🗳',  group: 'POLITICS' },
  { href: '/party',      label: 'My Party',    icon: '◎',  group: 'POLITICS' },
  { href: '/population', label: 'Population',  icon: '◉',  group: 'SOCIETY' },
  { href: '/reports',    label: 'Reports',     icon: '≡',  group: 'INTEL' },
  { href: '/notifications', label: 'Alerts',   icon: '◆',  group: 'INTEL' },
  { href: '/settings',   label: 'Settings',    icon: '◈',  group: 'SYSTEM' },
];

const GROUPS = ['GOVERNANCE', 'POLITICS', 'SOCIETY', 'INTEL', 'SYSTEM'];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-44 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-3 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-amber-500 flex items-center justify-center shrink-0">
            <span className="text-black font-black text-[10px]">W</span>
          </div>
          <div>
            <div className="text-amber-400 font-black text-sm tracking-widest">WORLDR</div>
            <div className="text-zinc-700 text-[7px] uppercase tracking-widest">Alpha v0.1</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1">
        {GROUPS.map((group) => {
          const items = NAV_ITEMS.filter(i => i.group === group);
          return (
            <div key={group} className="mb-1">
              <div className="px-3 pt-2 pb-0.5">
                <span className="text-[7px] text-zinc-700 uppercase tracking-widest font-bold">{group}</span>
              </div>
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono transition-colors duration-100 ${
                      isActive
                        ? 'bg-amber-500/10 text-amber-400 border-r-2 border-amber-500'
                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
                    }`}
                  >
                    <span className="w-3 text-center shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-3 py-2">
        <div className="text-[7px] text-zinc-800 uppercase tracking-widest">Sim Engine v1.0</div>
        <div className="text-[7px] text-zinc-800 tracking-widest mt-0.5">KELDORIA · 850 AE</div>
      </div>
    </aside>
  );
}
