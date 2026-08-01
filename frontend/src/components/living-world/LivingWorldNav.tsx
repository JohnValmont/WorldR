'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { authApi } from '../../lib/api';

// ─── WORLDr Active Navigation ──────────────────────────────────────────────────
// Active top-level tabs: Chronicle, Business, Market, Records, Network, World.
// Politics is locked for all players except admins.

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
  { name: 'Politics',  path: '/drennia/politics'  },
  { name: 'Network [v0.2]',   path: '#'   },
  { name: 'World [v0.2]',     path: '#'     },
];

export default function LivingWorldNav() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const [isAdminDynamic, setIsAdminDynamic] = useState(false);

  const isSuperAdminEmail = user?.email && (
    user.email.toLowerCase() === 'kyxplayss@gmail.com' ||
    user.email.toLowerCase() === 'infoforbiddengaming@gmail.com'
  );
  const isAdmin = user?.role === 'admin' || isSuperAdminEmail || isAdminDynamic;

  useEffect(() => {
    authApi.me().then(res => setIsAdminDynamic(res.data.isAdmin)).catch(() => {});
  }, []);

  return (
    <nav
      className="w-full flex items-center overflow-x-auto scrollbar-hide"
      style={{ height: '48px', marginBottom: '20px', gap: '2px', borderBottom: '1px solid rgba(201,162,74,0.08)' }}
    >
      {TABS.map((tab) => {
        const isPolitics = tab.name === 'Politics';
        const isLocked = isPolitics && !isAdmin;
        const isActive = pathname === tab.path || pathname?.startsWith(`${tab.path}/`);

        return (
          <Link
            key={tab.name}
            href={isLocked ? '#' : tab.path}
            onClick={isLocked ? (e) => {
              e.preventDefault();
              alert('Political Desk is currently locked for pre-release testing. Only administrators have access.');
            } : undefined}
            className="flex items-center justify-center whitespace-nowrap transition-all duration-150"
            style={{
              height: '42px',
              padding: '0 18px',
              fontSize: '12px',
              fontWeight: isActive ? '700' : '500',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive ? GOLD : (isLocked ? '#6B7280' : MUTED),
              background: isActive ? GOLD_BG : 'transparent',
              borderBottom: isActive ? `2px solid ${GOLD}` : '2px solid transparent',
              borderRadius: '0',
              cursor: isLocked ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (!isActive && !isLocked) {
                e.currentTarget.style.color = '#F4EBD6';
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive && !isLocked) {
                e.currentTarget.style.color = MUTED;
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {isLocked && <Lock size={12} className="mr-1.5 opacity-60 text-amber-500/70" />}
            {tab.name}
          </Link>
        );
      })}
    </nav>
  );
}
