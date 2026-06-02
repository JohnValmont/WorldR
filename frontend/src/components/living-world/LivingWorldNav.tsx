'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

// ─── Active Chronicle Navigation ──────────────────────────────────────────────
// Business-First path tabs.
// FROZEN: Government, Elections, Party, Parliament, Ministries (later Politics module).

const TABS = [
  { name: 'Chronicle', path: '/drennia/chronicle' },
  { name: 'Records',   path: '/drennia/records' },
  { name: 'Network',   path: '/drennia/network' },
  { name: 'Business',  path: '/drennia/business' },
  { name: 'World',     path: '/drennia/world' },
];

export default function LivingWorldNav() {
  const pathname = usePathname();

  return (
    <div
      className="w-full flex items-center overflow-x-auto overflow-y-hidden scrollbar-hide z-20"
      style={{ height: '48px', marginBottom: '22px', gap: '4px' }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || pathname?.startsWith(`${tab.path}/`);

        return (
          <Link
            key={tab.name}
            href={tab.path}
            className="flex items-center justify-center whitespace-nowrap transition-all duration-200"
            style={{
              height: '42px',
              padding: '0 16px',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: isActive ? '600' : '500',
              color: isActive ? theme.colors.accents.gold : theme.colors.text.textMuted,
              background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: `1px solid ${isActive ? theme.colors.borders.borderStrong : 'transparent'}`,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                e.currentTarget.style.color = theme.colors.text.textSecondary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.colors.text.textMuted;
              }
            }}
          >
            {tab.name}
          </Link>
        );
      })}
    </div>
  );
}
