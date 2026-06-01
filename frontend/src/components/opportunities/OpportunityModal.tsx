'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import { Opportunity } from '../../lib/opportunityEngine';

interface Props {
  opportunity: Opportunity;
  onClose: () => void;
  onResolve: () => void;
}

export default function OpportunityModal({ opportunity, onClose, onResolve }: Props) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div 
        className="w-full max-w-[620px] flex flex-col"
        style={{
          background: '#07100D',
          border: `1px solid ${theme.colors.accents.gold}80`,
          borderRadius: '24px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(214,179,95,0.15)',
          padding: '32px',
          position: 'relative'
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '8px' }}>
          Take Opportunity?
        </h2>
        
        <h3 style={{ fontSize: '18px', color: theme.colors.text.textSecondary, marginBottom: '16px' }}>
          {opportunity.title}
        </h3>

        <div 
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px'
          }}
        >
          <p style={{ fontSize: '14px', color: theme.colors.text.textPrimary, lineHeight: 1.6, marginBottom: '16px' }}>
            {opportunity.story}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, marginBottom: '4px' }}>Main Factors Tested</div>
              <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>
                {opportunity.mainFactors.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, marginBottom: '4px' }}>Possible Gains</div>
              <div style={{ fontSize: '13px', color: theme.colors.accents.emerald }}>
                {Object.entries(opportunity.rewards).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`).join(', ')}
              </div>
            </div>
            <div className="col-span-2">
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: theme.colors.text.textMuted, marginBottom: '4px' }}>Risks</div>
              <div style={{ fontSize: '13px', color: theme.colors.accents.dangerRed }}>
                {Object.entries(opportunity.risks).length > 0 
                  ? Object.entries(opportunity.risks).map(([k, v]) => typeof v === 'number' ? `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}` : v).join(', ')
                  : 'Minimal'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: theme.colors.text.textMuted, fontStyle: 'italic', marginBottom: '24px' }}>
          Note: In pre-alpha v1, this opportunity resolves immediately. Later, opportunities may include deadlines, NPC competitors, and real player competition.
        </div>

        <div className="flex gap-4 justify-end mt-auto">
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.1)',
              color: theme.colors.text.textSecondary,
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            onClick={onResolve}
            style={{
              padding: '12px 24px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #B9853D, #D6B35F)',
              color: '#09130F',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: '0 4px 14px rgba(214,179,95,0.25)'
            }}
          >
            Resolve Opportunity
          </button>
        </div>
      </div>
    </div>
  );
}
