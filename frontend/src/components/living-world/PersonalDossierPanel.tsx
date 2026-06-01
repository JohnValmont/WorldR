'use client';
import { useState, useEffect } from 'react';
import FactorMeter from './FactorMeter';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

export default function PersonalDossierPanel() {
  const [charData, setCharData] = useState<any>({
    name: { first: 'New', last: 'Citizen' },
    age: 18,
    status: 'New Citizen',
    origin: { state: 'Drennport State', nation: 'Drennia' },
    factors: {
      Credibility: 40,
      Charisma: 40,
      Influence: 25,
      Resources: 20
    },
    contact: { name: 'Pending...', role: 'Pending...' },
    obligation: null,
    vulnerability: null
  });

  useEffect(() => {
    try {
      const citizenFile = localStorage.getItem('worldr_citizen_file_v1');
      if (citizenFile) {
        const parsed = JSON.parse(citizenFile);
        // Support both old nested origin and new flat structure
        const state = parsed.homeState || parsed.origin?.state || 'Drennport State';
        const nation = parsed.motherland || parsed.origin?.nation || 'Drennia';
        setCharData({
          name: parsed.name || { first: 'New', last: 'Citizen' },
          age: parsed.age || 18,
          status: 'New Citizen',
          origin: { state, nation },
          factors: parsed.factors || {
            Credibility: 0,
            Charisma: 0,
            Influence: 0,
            Resources: 0
          },
          contact: parsed.contact || { name: 'Pending...', role: 'Pending...' },
          obligation: parsed.obligation || null,
          vulnerability: parsed.vulnerability || null
        });
      }
    } catch (e) {
      console.warn("Error reading dossier data", e);
    }
  }, []);

  const fullName = [charData.name.first, charData.name.last].filter(Boolean).join(' ') || 'New Citizen';

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
      <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.accents.gold, textTransform: 'uppercase', fontWeight: 'bold' }}>
        Personal Dossier
      </div>

      <h2 className="tracking-tight" style={{ fontSize: '24px', fontWeight: 700, color: theme.colors.text.textPrimary, marginTop: '12px' }}>
        {fullName}
      </h2>

      <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.6, marginTop: '4px' }}>
        Age {charData.age} · {charData.status}<br/>
        Home State: {charData.origin.state}<br/>
        Motherland: {charData.origin.nation}
      </div>

      <div style={{ margin: '18px 0', borderTop: `1px solid ${theme.colors.borders.borderMuted}` }} />

      <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: '600', marginBottom: '8px' }}>
        Visible Power Factors
      </div>

      <div className="flex flex-col gap-1 mb-2">
        <FactorMeter label="Credibility" value={charData.factors.Credibility || charData.factors.credibility || 0} />
        <FactorMeter label="Charisma" value={charData.factors.Charisma || charData.factors.charisma || 0} />
        <FactorMeter label="Influence" value={charData.factors.Influence || charData.factors.influence || 0} />
        <FactorMeter label="Resources" value={charData.factors.Resources || charData.factors.resources || 0} />
      </div>

      <div className="mt-auto" style={{ marginTop: '18px', padding: '14px', borderRadius: theme.effects.radiusMedium, background: 'rgba(255,255,255,0.035)', border: `1px solid ${theme.colors.borders.borderCool}` }}>
        <div className="flex flex-col gap-3">
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              First Contact
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
              {charData.contact?.name || 'Pending...'}
            </div>
            {charData.contact?.role && (
              <div style={{ fontSize: '11px', color: theme.colors.text.textSecondary }}>
                {charData.contact.role}
              </div>
            )}
          </div>
          
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              Active Obligations
            </div>
            <div className="flex flex-col gap-1">
              {charData.obligation ? (
                <div style={{ fontSize: '13px', color: theme.colors.accents.gold }}>
                  {charData.obligation.description}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
                  None
                </div>
              )}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, fontWeight: '600', marginBottom: '2px' }}>
              Vulnerabilities
            </div>
            <div className="flex flex-col gap-1">
              {charData.vulnerability ? (
                <div style={{ fontSize: '13px', color: theme.colors.accents.dangerRed }}>
                  {charData.vulnerability.description}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
                  None
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center leading-relaxed" style={{ fontSize: '12px', color: theme.colors.text.textMuted }}>
        Power in WORLDr is earned through opportunities, relationships, money, records, and institutions.
      </div>
    </div>
  );
}
