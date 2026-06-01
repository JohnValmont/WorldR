'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import { CitizenFile } from '../../lib/opportunityEngine';
import FactorMeter from '../living-world/FactorMeter';

interface Props {
  citizenFile: CitizenFile;
}

export default function OpportunityCitizenSnapshot({ citizenFile }: Props) {
  return (
    <div 
      className="w-full flex flex-col"
      style={{
        borderRadius: '22px',
        padding: '18px',
        background: 'rgba(16,28,23,0.86)',
        border: '1px solid rgba(219,191,128,0.14)',
        minHeight: '400px'
      }}
    >
      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: theme.colors.accents.gold,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          marginBottom: '12px'
        }}
      >
        CITIZEN SNAPSHOT
      </div>

      <div className="mb-4">
        <div style={{ fontSize: '18px', fontWeight: 'bold', color: theme.colors.text.textPrimary }}>
          {citizenFile.name}
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.text.textSecondary, marginTop: '2px' }}>
          Age {citizenFile.age} · {citizenFile.homeState}
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.text.textSecondary }}>
          Motherland: {citizenFile.motherland}
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.text.textMuted, marginTop: '4px' }}>
          Status: New Citizen
        </div>
      </div>

      <div style={{ margin: '14px 0', borderTop: `1px solid ${theme.colors.borders.borderMuted}` }} />

      <div className="flex flex-col gap-1 mb-4">
        <FactorMeter label="Credibility" value={citizenFile.factors.credibility} />
        <FactorMeter label="Charisma" value={citizenFile.factors.charisma} />
        <FactorMeter label="Influence" value={citizenFile.factors.influence} />
        <FactorMeter label="Resources" value={citizenFile.factors.resources} />
      </div>

      <div 
        className="mt-2"
        style={{
          padding: '12px',
          borderRadius: theme.effects.radiusMedium,
          background: 'rgba(255,255,255,0.035)',
          border: `1px solid ${theme.colors.borders.borderCool}`,
          fontSize: '12px'
        }}
      >
        <div className="flex flex-col gap-2">
          <div>
            <span style={{ color: theme.colors.text.textMuted, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>First Contact</span>
            <span style={{ color: theme.colors.text.textPrimary }}>{citizenFile.story?.firstNpcContact || 'None'}</span>
          </div>
          <div>
            <span style={{ color: theme.colors.text.textMuted, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>First Obligation</span>
            <span style={{ color: theme.colors.text.textPrimary }}>{citizenFile.story?.firstObligation || 'None'}</span>
          </div>
          <div>
            <span style={{ color: theme.colors.text.textMuted, textTransform: 'uppercase', fontSize: '10px', display: 'block' }}>First Vulnerability</span>
            <span style={{ color: theme.colors.text.textPrimary }}>{citizenFile.story?.firstVulnerability || 'None'}</span>
          </div>
        </div>
      </div>

      <div 
        className="mt-6 text-center leading-relaxed"
        style={{
          fontSize: '11px',
          color: theme.colors.text.textMuted
        }}
      >
        Opportunities use your visible factors and your origin context. Outcomes create life records.
      </div>
    </div>
  );
}
