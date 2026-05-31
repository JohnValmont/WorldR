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
      // Future integration points for character data
      const charV2 = localStorage.getItem('worldr_character_v2');
      const originV1 = localStorage.getItem('worldr_character_origin_v1');
      const motherland = localStorage.getItem('worldr_selected_motherland');

      if (charV2 || originV1 || motherland) {
        // Parse if available, otherwise use fallbacks. We keep fallbacks for now.
        // let parsedChar = charV2 ? JSON.parse(charV2) : {};
        // let parsedOrigin = originV1 ? JSON.parse(originV1) : {};
      }
    } catch (e) {
      console.warn("Failed to load character data", e);
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
