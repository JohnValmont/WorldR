'use client';
import { useState, useEffect } from 'react';
import FactorMeter from './FactorMeter';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

export default function PersonalDossierPanel() {
  const [charData, setCharData] = useState({
    name: 'New Citizen',
    age: 18,
    status: 'New Citizen',
    homeState: 'Drennport State',
    motherland: 'Drennia',
    factors: {
      credibility: 40,
      charisma: 40,
      influence: 25,
      resources: 20
    }
  });

  useEffect(() => {
    try {
      const charV2 = localStorage.getItem('worldr_character_v2');
      const originV1 = localStorage.getItem('worldr_character_origin_v1');
      const motherland = localStorage.getItem('worldr_selected_motherland');
      // Logic for fallback handled mostly by initial state.
    } catch (e) {
      console.warn("Error reading dossier data", e);
    }
  }, []);

  return (
    <div 
      className="w-full flex flex-col"
      style={{
        width: '100%',
        minHeight: '560px',
        padding: '20px',
        borderRadius: theme.effects.radiusLarge,
        background: 'linear-gradient(180deg, rgba(20,35,29,0.96), rgba(9,19,15,0.96))',
        border: `1px solid ${theme.colors.borders.borderMuted}`,
        boxShadow: theme.effects.shadowPanel
      }}
    >
      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: theme.colors.accents.gold,
          textTransform: 'uppercase',
          fontWeight: 'bold'
        }}
      >
        Personal Dossier
      </div>

      <h2 
        className="tracking-tight"
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: theme.colors.text.textPrimary,
          marginTop: '12px'
        }}
      >
        {charData.name}
      </h2>

      <div 
        style={{
          fontSize: '13px',
          color: theme.colors.text.textSecondary,
          lineHeight: 1.6,
          marginTop: '4px'
        }}
      >
        Age {charData.age} · {charData.status}<br/>
        Home State: {charData.homeState}<br/>
        Motherland: {charData.motherland}
      </div>

      <div 
        style={{
          margin: '18px 0',
          borderTop: `1px solid ${theme.colors.borders.borderMuted}`
        }}
      />

      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.1em',
          color: theme.colors.text.textMuted,
          textTransform: 'uppercase',
          fontWeight: '600',
          marginBottom: '8px'
        }}
      >
        Visible Power Factors
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <FactorMeter label="Credibility" value={charData.factors.credibility} />
        <FactorMeter label="Charisma" value={charData.factors.charisma} />
        <FactorMeter label="Influence" value={charData.factors.influence} />
        <FactorMeter label="Resources" value={charData.factors.resources} />
      </div>

      <div 
        className="mt-auto"
        style={{
          marginTop: '18px',
          padding: '14px',
          borderRadius: theme.effects.radiusMedium,
          background: 'rgba(255,255,255,0.035)',
          border: `1px solid ${theme.colors.borders.borderCool}`
        }}
      >
        <div className="flex flex-col gap-3">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              First Contact
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
              Teacher Mentor
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              First Obligation
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
              Family Debt
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              First Vulnerability
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
              Low Resources
            </div>
          </div>
        </div>
      </div>

      <div 
        className="mt-4 text-center leading-relaxed"
        style={{
          fontSize: '12px',
          color: theme.colors.text.textMuted
        }}
      >
        Power in WORLDr is earned through opportunities, relationships, money, records, and institutions.
      </div>
    </div>
  );
}
