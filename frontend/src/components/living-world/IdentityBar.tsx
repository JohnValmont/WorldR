'use client';
import { useState, useEffect } from 'react';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

export default function IdentityBar() {
  const [charData, setCharData] = useState({
    name: 'New Citizen',
    age: 18,
    status: 'New Citizen',
    homeState: 'Drennport State',
    motherland: 'Drennia',
    capital: 'Drennport',
    cash: '$1,200',
  });

  useEffect(() => {
    try {
      const citizenFile = localStorage.getItem('worldr_citizen_file_v1');
      if (citizenFile) {
        const parsed = JSON.parse(citizenFile);
        // name may be { first, last } object or legacy string
        let displayName = 'New Citizen';
        if (parsed.name && typeof parsed.name === 'object') {
          displayName = [parsed.name.first as string, parsed.name.last as string].filter(Boolean).join(' ') || 'New Citizen';
        } else if (typeof parsed.name === 'string' && parsed.name) {
          displayName = parsed.name;
        }
        const money = parsed.personalMoney ?? parsed.money;
        setCharData(prev => ({
          ...prev,
          name: displayName,
          age: (parsed.age as number) || prev.age,
          homeState: (parsed.homeState as string) || (parsed.origin as any)?.state || prev.homeState,
          motherland: (parsed.motherland as string) || prev.motherland,
          capital: (parsed.capital as string) || prev.capital,
          cash: money !== undefined ? `$${Number(money).toLocaleString()}` : prev.cash,
        }));
      }
    } catch (e) {
      console.warn('Failed to load character data', e);
    }
  }, []);

  return (
    <div 
      className="flex flex-col sm:flex-row sm:items-center justify-between w-full z-20 backdrop-blur-md"
      style={{
        background: 'rgba(16, 28, 23, 0.82)',
        border: `1px solid ${theme.colors.borders.borderMuted}`,
        borderRadius: theme.effects.radiusLarge,
        padding: '14px 18px',
        marginBottom: '18px',
        boxShadow: theme.effects.shadowPanel,
        gap: '16px'
      }}
    >
      {/* Left Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div 
          className="font-serif font-bold uppercase tracking-widest text-sm"
          style={{ color: theme.colors.text.textPrimary }}
        >
          <span style={{ fontSize: '1.2em' }}>W</span>ORLDr
        </div>
        
        {/* Divider hidden on mobile */}
        <div className="hidden sm:block w-px h-6" style={{ background: theme.colors.borders.borderMuted }}></div>
        
        <div className="flex flex-col">
          <div className="font-semibold text-base" style={{ color: theme.colors.text.textPrimary }}>
            {charData.name}
          </div>
          <div className="text-xs mt-0.5" style={{ color: theme.colors.text.textSecondary }}>
            Age {charData.age} · {charData.status} · {charData.homeState}
          </div>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-wrap items-center gap-2">
        <div 
          className="flex items-center justify-center whitespace-nowrap"
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            border: `1px solid ${theme.colors.borders.borderMuted}`,
            background: 'rgba(214,179,95,0.06)',
            fontSize: '12px',
            color: theme.colors.text.textSecondary
          }}
        >
          <span className="opacity-70 mr-1.5">Motherland:</span> {charData.motherland}
        </div>
        
        <div 
          className="flex items-center justify-center whitespace-nowrap"
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            border: `1px solid ${theme.colors.borders.borderMuted}`,
            background: 'rgba(214,179,95,0.06)',
            fontSize: '12px',
            color: theme.colors.text.textSecondary
          }}
        >
          <span className="opacity-70 mr-1.5">Capital:</span> {charData.capital}
        </div>
        
        <div 
          className="flex items-center justify-center whitespace-nowrap"
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            border: `1px solid ${theme.colors.borders.borderMuted}`,
            background: 'rgba(214,179,95,0.06)',
            fontSize: '12px',
            color: theme.colors.accents.emerald,
            fontWeight: '600'
          }}
        >
          Cash: {charData.cash}
        </div>
      </div>
    </div>
  );
}
