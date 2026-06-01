'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import { Opportunity, CitizenFile } from '../../lib/opportunityEngine';

interface Props {
  opportunity: Opportunity;
  citizenFile: CitizenFile;
  onTake: () => void;
}

export default function OpportunityCard({ opportunity, citizenFile, onTake }: Props) {
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'survival': return theme.colors.accents.steelBlue;
      case 'reputation': return theme.colors.accents.gold;
      case 'network': return theme.colors.accents.emerald;
      case 'politics': return theme.colors.accents.warningAmber;
      case 'business': return '#4CAF50'; // muted green
      default: return theme.colors.text.textSecondary;
    }
  };

  const hasRequirements = opportunity.requirements && Object.keys(opportunity.requirements).length > 0;
  let unmetRequirements = false;
  let requirementText = '';

  if (hasRequirements && opportunity.requirements) {
    const reqs = opportunity.requirements;
    const reqStrings: string[] = [];
    if (reqs.credibility && citizenFile.factors.credibility < reqs.credibility) { unmetRequirements = true; reqStrings.push(`Credibility ${reqs.credibility}`); }
    if (reqs.charisma && citizenFile.factors.charisma < reqs.charisma) { unmetRequirements = true; reqStrings.push(`Charisma ${reqs.charisma}`); }
    if (reqs.influence && citizenFile.factors.influence < reqs.influence) { unmetRequirements = true; reqStrings.push(`Influence ${reqs.influence}`); }
    if (reqs.resources && citizenFile.factors.resources < reqs.resources) { unmetRequirements = true; reqStrings.push(`Resources ${reqs.resources}`); }
    if (unmetRequirements) {
      requirementText = `Needs: ${reqStrings.join(', ')}`;
    }
  }

  return (
    <div 
      className="w-full flex flex-col justify-between transition-all duration-150 group"
      style={{
        borderRadius: '20px',
        padding: '18px',
        minHeight: '250px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
        border: '1px solid rgba(139,164,155,0.16)',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'rgba(214,179,95,0.34)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(139,164,155,0.16)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <div 
            style={{
              padding: '2px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: getTypeColor(opportunity.type),
              background: 'rgba(255,255,255,0.06)'
            }}
          >
            {opportunity.type}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.text.textMuted, letterSpacing: '0.05em' }}>
            {opportunity.timeCost} · Risk: {opportunity.riskLevel}
          </div>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '4px' }}>
          {opportunity.title}
        </h3>
        
        <div style={{ fontSize: '12px', color: theme.colors.text.textSecondary, marginBottom: '12px' }}>
          {opportunity.state}
        </div>

        <p style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.5, marginBottom: '14px' }}>
          {opportunity.story}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap gap-2 mb-4">
          <div style={{ fontSize: '11px', color: theme.colors.text.textMuted }}>
            <strong>Main Factors:</strong> {opportunity.mainFactors.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
          </div>
          {Object.keys(opportunity.rewards).length > 0 && (
            <div style={{ fontSize: '11px', color: theme.colors.accents.emerald }}>
              <strong>Potential:</strong> {Object.entries(opportunity.rewards).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)} +${v}`).join(', ')}
            </div>
          )}
          {Object.keys(opportunity.risks).length > 0 && (
            <div style={{ fontSize: '11px', color: theme.colors.accents.dangerRed }}>
              <strong>Risk:</strong> {
                Object.entries(opportunity.risks).map(([k, v]) => {
                  if (typeof v === 'number') return `${k.charAt(0).toUpperCase() + k.slice(1)} ${v}`;
                  return v;
                }).join(', ')
              }
            </div>
          )}
        </div>

        <button
          onClick={unmetRequirements ? undefined : onTake}
          disabled={unmetRequirements}
          className="w-full transition-colors duration-200"
          style={{
            height: '40px',
            borderRadius: '999px',
            background: unmetRequirements ? 'rgba(255,255,255,0.05)' : 'rgba(214,179,95,0.06)',
            border: unmetRequirements ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(214,179,95,0.34)',
            color: unmetRequirements ? theme.colors.text.textMuted : theme.colors.accents.gold,
            fontWeight: '600',
            fontSize: '13px',
            cursor: unmetRequirements ? 'not-allowed' : 'pointer'
          }}
          onMouseOver={(e) => {
            if (!unmetRequirements) {
              e.currentTarget.style.background = 'rgba(214,179,95,0.16)';
            }
          }}
          onMouseOut={(e) => {
            if (!unmetRequirements) {
              e.currentTarget.style.background = 'rgba(214,179,95,0.06)';
            }
          }}
        >
          {unmetRequirements ? requirementText : 'Take Opportunity'}
        </button>
      </div>
    </div>
  );
}
