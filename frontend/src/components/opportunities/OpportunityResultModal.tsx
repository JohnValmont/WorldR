'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import { OpportunityResult } from '../../lib/opportunityEngine';

interface Props {
  result: OpportunityResult;
  onClose: () => void;
}

export default function OpportunityResultModal({ result, onClose }: Props) {
  
  let title = 'Result';
  let titleColor = theme.colors.text.textPrimary;
  
  if (result.resultType === 'success') {
    title = 'Strong Result';
    titleColor = theme.colors.accents.emerald;
  } else if (result.resultType === 'mixed') {
    title = 'Mixed Result';
    titleColor = theme.colors.accents.gold;
  } else if (result.resultType === 'failure') {
    title = 'Difficult Result';
    titleColor = theme.colors.accents.dangerRed;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div 
        className="w-full max-w-[560px] flex flex-col items-center text-center"
        style={{
          background: 'linear-gradient(180deg, rgba(20,35,29,0.96), rgba(9,19,15,0.96))',
          border: `1px solid ${titleColor}80`,
          borderRadius: '24px',
          boxShadow: `0 10px 40px rgba(0,0,0,0.5), 0 0 30px ${titleColor}20`,
          padding: '40px 32px'
        }}
      >
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: titleColor, marginBottom: '16px' }}>
          {title}
        </h2>
        
        <p style={{ fontSize: '16px', color: theme.colors.text.textPrimary, lineHeight: 1.6, marginBottom: '24px' }}>
          {result.recordCreated.summary}
        </p>

        <div className="w-full grid grid-cols-2 gap-4 mb-8">
          {Object.keys(result.factorChanges).length > 0 && (
            <div 
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, marginBottom: '8px' }}>Gained Factors</div>
              <div className="flex flex-col gap-1">
                {Object.entries(result.factorChanges).map(([k, v]) => (
                  <div key={k} style={{ fontSize: '14px', color: (v as number) > 0 ? theme.colors.accents.emerald : theme.colors.accents.dangerRed, fontWeight: 'bold' }}>
                    {(v as number) > 0 ? '+' : ''}{v} {k.charAt(0).toUpperCase() + k.slice(1)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {(result.moneyChange !== 0 || result.newObligation || result.newVulnerability) && (
            <div 
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, marginBottom: '8px' }}>Other Effects</div>
              <div className="flex flex-col gap-1">
                {result.moneyChange !== 0 && (
                  <div style={{ fontSize: '14px', color: result.moneyChange > 0 ? theme.colors.accents.emerald : theme.colors.accents.dangerRed, fontWeight: 'bold' }}>
                    {result.moneyChange > 0 ? '+' : ''}${result.moneyChange} Money
                  </div>
                )}
                {result.newObligation && (
                  <div style={{ fontSize: '13px', color: theme.colors.accents.gold }}>
                    Obligation: {result.newObligation}
                  </div>
                )}
                {result.newVulnerability && (
                  <div style={{ fontSize: '13px', color: theme.colors.accents.dangerRed }}>
                    Vulnerability: {result.newVulnerability}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div 
          className="w-full text-left"
          style={{
            padding: '16px',
            borderLeft: `3px solid ${theme.colors.accents.gold}`,
            background: 'rgba(214,179,95,0.05)',
            marginBottom: '32px'
          }}
        >
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, marginBottom: '4px' }}>
            {result.recordCreated.visibility} Record Created
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary, fontWeight: '500' }}>
            {result.recordCreated.title} — {title}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            padding: '14px 40px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.1)',
            color: theme.colors.text.textPrimary,
            fontSize: '15px',
            fontWeight: 'bold',
            border: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          Return to Board
        </button>
      </div>
    </div>
  );
}
