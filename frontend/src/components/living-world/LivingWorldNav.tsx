'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ─── WORLDr Active Navigation ──────────────────────────────────────────────────
// FROZEN: Government, Elections, Party, Parliament, Ministries (later Politics module).
// Active top-level tabs: Chronicle, Business, Market, Records, Network, World.
// Company / Contracts / Registry now live INSIDE the Business tab.

const GOLD = '#C9A24A';
const GOLD_BG = 'rgba(201,162,74,0.10)';
const GOLD_BORDER = 'rgba(201,162,74,0.30)';
const MUTED = '#A79D8C';

const TABS = [
  { name: 'Chronicle', path: '/drennia/chronicle' },
  { name: 'Family [v0.2]',    path: '#'    },
  { name: 'Career [v0.2]',    path: '#'    },
  { name: 'Business',  path: '/drennia/business'  },
  { name: 'Exchange',  path: '/drennia/exchange'  },
  { name: 'Market [v0.2]',    path: '#'    },
  { name: 'Records [v0.2]',   path: '#'   },
  { name: 'Politics [v0.2]',  path: '#'  },
  { name: 'Network [v0.2]',   path: '#'   },
  { name: 'World [v0.2]',     path: '#'     },
];

export default function LivingWorldNav() {
  const pathname = usePathname();

  return (
    <nav
      className="w-full flex items-center overflow-x-auto scrollbar-hide"
      style={{ height: '48px', marginBottom: '20px', gap: '2px', borderBottom: '1px solid rgba(201,162,74,0.08)' }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || pathname?.startsWith(`${tab.path}/`);
        return (
          <Link
            key={tab.name}
            href={tab.path}
            className="flex items-center justify-center whitespace-nowrap transition-all duration-150"
            style={{
              height: '42px',
              padding: '0 18px',
              fontSize: '12px',
              fontWeight: isActive ? '700' : '500',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive ? GOLD : MUTED,
              background: isActive ? GOLD_BG : 'transparent',
              borderBottom: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
              borderRadius: '0',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = '#F4EBD6';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = MUTED;
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
