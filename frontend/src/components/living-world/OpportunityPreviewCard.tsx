'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface OpportunityPreviewCardProps {
  type: string;
  location: string;
  text: string;
  gain: string;
  risk: string;
}

export default function OpportunityPreviewCard({ type, location, text, gain, risk }: OpportunityPreviewCardProps) {
  return (
    <div 
      className="flex flex-col group relative transition-transform duration-150 ease-out hover:-translate-y-0.5"
      style={{
        minHeight: '168px',
        padding: '16px',
        borderRadius: '18px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
        border: `1px solid ${theme.colors.borders.borderCool}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = theme.colors.borders.borderStrong;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = theme.colors.borders.borderCool;
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div 
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: theme.colors.accents.gold,
            background: 'rgba(214,179,95,0.10)',
            border: '1px solid rgba(214,179,95,0.18)',
            borderRadius: '999px',
            padding: '4px 8px',
            fontWeight: '600'
          }}
        >
          {type}
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.text.textMuted }}>
          {location}
        </div>
      </div>
      
      <div 
        style={{
          fontSize: '13px',
          lineHeight: 1.5,
          color: theme.colors.text.textSecondary,
          marginBottom: '16px',
          flexGrow: 1
        }}
      >
        {text}
      </div>
      
      <div className="flex flex-col gap-1.5 mb-4">
        <div className="flex items-start gap-1.5">
          <div style={{ fontSize: '12px', color: theme.colors.text.textMuted, width: '90px' }}>Possible gain:</div>
          <div style={{ fontSize: '12px', color: theme.colors.accents.emerald }}>{gain}</div>
        </div>
        <div className="flex items-start gap-1.5">
          <div style={{ fontSize: '12px', color: theme.colors.text.textMuted, width: '90px' }}>Risk:</div>
          <div style={{ fontSize: '12px', color: theme.colors.accents.warningAmber }}>{risk}</div>
        </div>
      </div>
      
      <button 
        disabled
        className="w-full transition-colors duration-150"
        style={{
          height: '34px',
          borderRadius: '999px',
          border: `1px solid ${theme.colors.borders.borderMuted}`,
          color: theme.colors.text.textSecondary,
          background: 'transparent',
          fontSize: '12px',
          fontWeight: '500',
          cursor: 'default'
        }}
      >
        View Later
      </button>
    </div>
  );
}
