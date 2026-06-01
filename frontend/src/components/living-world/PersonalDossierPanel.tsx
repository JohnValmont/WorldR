'use client';
import { useState, useEffect } from 'react';
import FactorMeter from './FactorMeter';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

export default function PersonalDossierPanel() {
  const [charData, setCharData] = useState<any>({
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
    },
    obligations: [],
    vulnerabilities: [],
    story: {
      firstNpcContact: 'Pending...',
      firstObligation: 'Pending...',
      firstVulnerability: 'Pending...'
    }
  });

  useEffect(() => {
    try {
      const citizenFile = localStorage.getItem('worldr_citizen_file_v1');
      if (citizenFile) {
        const parsed = JSON.parse(citizenFile);
        setCharData({
          name: parsed.name || 'New Citizen',
          age: parsed.age || 18,
          status: 'New Citizen',
          homeState: parsed.homeState || 'Drennport State',
          motherland: parsed.motherland || 'Drennia',
          factors: parsed.factors || {
            credibility: 35,
            charisma: 35,
            influence: 20,
            resources: 15
          },
          obligations: parsed.obligations || [],
          vulnerabilities: parsed.vulnerabilities || [],
          story: {
            firstNpcContact: parsed.story?.firstNpcContact || parsed.firstNpcContact || 'Pending selection',
            firstObligation: parsed.story?.firstObligation || parsed.firstObligation || 'Pending selection',
            firstVulnerability: parsed.story?.firstVulnerability || parsed.firstVulnerability || 'Pending selection',
          }
        });
      }
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
              {(charData as any).story?.firstNpcContact || 'Pending...'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              Active Obligations
            </div>
            <div className="flex flex-col gap-1">
              {((charData as any).obligations && (charData as any).obligations.length > 0) ? (charData as any).obligations.map((o: any, idx: number) => (
                <div key={idx} style={{ fontSize: '13px', color: theme.colors.accents.gold }}>
                  {o.label} <span style={{color: theme.colors.text.textFaint, fontSize: '11px'}}>from {o.source}</span>
                </div>
              )) : (
                <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
                  {(charData as any).story?.firstObligation || 'None'}
                </div>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              Vulnerabilities
            </div>
            <div className="flex flex-col gap-1">
              {((charData as any).vulnerabilities && (charData as any).vulnerabilities.length > 0) ? (charData as any).vulnerabilities.map((v: any, idx: number) => (
                <div key={idx} style={{ fontSize: '13px', color: theme.colors.accents.dangerRed }}>
                  {v.label} <span style={{color: theme.colors.text.textFaint, fontSize: '11px'}}>from {v.source}</span>
                </div>
              )) : (
                <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
                  {(charData as any).story?.firstVulnerability || 'None'}
                </div>
              )}
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
