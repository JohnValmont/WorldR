'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

// ─── Active Chronicle Navigation ──────────────────────────────────────────────
// Business-First path tabs.
// FROZEN: Government, Elections, Party, Parliament, Ministries (later Politics module).

export default function LivingWorldNav() {
  const pathname = usePathname();
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const companies = JSON.parse(localStorage.getItem('worldr_companies_v1') || '[]');
      const fileStr = localStorage.getItem('worldr_citizen_file_v1');
      if (fileStr) {
        const cf = JSON.parse(fileStr);
        const playerCharacterId = typeof cf.name === 'object' ? `${cf.name.first} ${cf.name.last}` : cf.name;
        // Simple check for now: any company in array is ours or we just check if companies > 0 and assume we own one if we created it.
        // Actually, we can just check if any company has our name as ownerCharacterId, or simply if we've registered one.
        const ownsCompany = companies.some((c: any) => c.ownerCharacterId === cf.name);
        setHasCompany(ownsCompany);
      }
    }
  }, [pathname]); // Re-check on nav

  const TABS = [
    { name: 'Chronicle', path: '/drennia/chronicle', locked: false },
    { name: 'Company',   path: '/drennia/company',   locked: !hasCompany },
    { name: 'Contracts', path: '/drennia/contracts', locked: !hasCompany },
    { name: 'Registry',  path: '/drennia/registry',  locked: false },
    { name: 'Market',    path: '/drennia/market',    locked: false, placeholder: true },
    { name: 'Records',   path: '/drennia/records',   locked: false },
    { name: 'Network',   path: '/drennia/network',   locked: false },
    { name: 'World',     path: '/drennia/world',     locked: false },
  ];

  return (
    <div
      className="w-full flex items-center overflow-x-auto overflow-y-hidden scrollbar-hide z-20"
      style={{ height: '48px', marginBottom: '22px', gap: '4px' }}
    >
      {TABS.map((tab) => {
        const isActive = pathname === tab.path || pathname?.startsWith(`${tab.path}/`);

        if (tab.locked) {
          return (
            <div
              key={tab.name}
              className="flex items-center justify-center whitespace-nowrap cursor-not-allowed"
              style={{
                height: '42px',
                padding: '0 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.2)',
                background: 'transparent',
                border: '1px solid transparent',
              }}
              title="Register a Sole Trader company to unlock"
            >
              {tab.name} 🔒
            </div>
          );
        }

        if ((tab as any).placeholder) {
          return (
            <div
              key={tab.name}
              className="flex items-center justify-center whitespace-nowrap cursor-not-allowed"
              style={{
                height: '42px',
                padding: '0 16px',
                borderRadius: '999px',
                fontSize: '13px',
                fontWeight: '500',
                color: 'rgba(255,255,255,0.4)',
                background: 'transparent',
                border: '1px solid transparent',
              }}
              title="Coming Soon"
            >
              {tab.name}
            </div>
          );
        }

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
