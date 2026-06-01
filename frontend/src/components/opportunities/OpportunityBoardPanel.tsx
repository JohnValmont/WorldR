'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import { Opportunity } from '../../lib/opportunityEngine';

interface Props {
  opportunities: Opportunity[];
  citizenFile: any;
  featuredOppId?: string | null;
  onSelectFeatured?: (id: string) => void;
  onTakeOpportunity: (opp: Opportunity) => void;
  onRefresh: () => void;
}

export default function OpportunityBoardPanel({ 
  opportunities, 
  citizenFile, 
  featuredOppId,
  onSelectFeatured,
  onTakeOpportunity, 
  onRefresh 
}: Props) {
  
  if (opportunities.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl h-full" style={{ background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ color: theme.colors.text.textMuted, fontSize: '15px' }}>No active leads in your area.</div>
        <button 
          onClick={onRefresh}
          style={{ color: theme.colors.accents.gold, marginTop: '12px', fontSize: '14px' }}
        >
          Check Networks
        </button>
      </div>
    );
  }

  const featured = opportunities.find(o => o.id === featuredOppId) || opportunities[0];
  const leads = opportunities.filter(o => o.id !== featured.id);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'survival': return theme.colors.accents.steelBlue;
      case 'reputation': return theme.colors.accents.gold;
      case 'network': return theme.colors.accents.emerald;
      case 'politics': return theme.colors.accents.warningAmber;
      case 'business': return '#4CAF50';
      default: return theme.colors.text.textSecondary;
    }
  };

  const hasRequirements = featured.requirements && Object.keys(featured.requirements).length > 0;
  let unmetRequirements = false;
  let requirementText = '';

  if (hasRequirements && featured.requirements) {
    const reqs = featured.requirements;
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
    <div className="w-full flex flex-col xl:flex-row gap-5 h-full">
      {/* Featured Scene */}
      <div className="flex-1 flex flex-col relative"
        style={{
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(20,35,29,0.95), rgba(9,19,15,0.98))',
          border: '1px solid rgba(219,191,128,0.22)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '32px' }}>
          <div className="flex items-center justify-between mb-6">
            <div 
              style={{
                padding: '4px 14px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: getTypeColor(featured.type),
                background: 'rgba(255,255,255,0.06)'
              }}
            >
              {featured.type} Situation
            </div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textMuted, letterSpacing: '0.05em' }}>
              Risk Level: {featured.riskLevel}
            </div>
          </div>

          <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '8px', lineHeight: 1.1 }}>
            {featured.title}
          </h2>
          
          <div style={{ fontSize: '14px', color: theme.colors.accents.gold, marginBottom: '24px', opacity: 0.8 }}>
            Location: {featured.state}
          </div>

          <div style={{ fontSize: '16px', color: theme.colors.text.textSecondary, lineHeight: 1.6, marginBottom: '32px', minHeight: '120px' }}>
            {featured.story}
          </div>

          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '4px', height: '100%', background: theme.colors.text.textMuted, borderRadius: '2px' }} />
              <div>
                <div style={{ fontSize: '11px', color: theme.colors.text.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Tested Factors</div>
                <div style={{ fontSize: '14px', color: theme.colors.text.textPrimary, fontWeight: '500' }}>
                  {featured.mainFactors.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
                </div>
              </div>
            </div>

            {(Object.keys(featured.rewards).length > 0 || Object.keys(featured.risks).length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {Object.keys(featured.rewards).length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(63,143,104,0.08)', border: '1px solid rgba(63,143,104,0.2)' }}>
                    <div style={{ fontSize: '11px', color: theme.colors.accents.emerald, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Potential Upside</div>
                    {Object.entries(featured.rewards).map(([k, v]) => (
                      <div key={k} style={{ fontSize: '13px', color: theme.colors.text.textPrimary, marginBottom: '2px' }}>
                        + {v} {k.charAt(0).toUpperCase() + k.slice(1)}
                      </div>
                    ))}
                  </div>
                )}
                {Object.keys(featured.risks).length > 0 && (
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(189,61,61,0.08)', border: '1px solid rgba(189,61,61,0.2)' }}>
                    <div style={{ fontSize: '11px', color: theme.colors.accents.dangerRed, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Known Risks</div>
                    {Object.entries(featured.risks).map(([k, v]) => (
                      <div key={k} style={{ fontSize: '13px', color: theme.colors.text.textPrimary, marginBottom: '2px' }}>
                        {typeof v === 'number' ? `- ${v} ${k.charAt(0).toUpperCase() + k.slice(1)}` : v}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-white/5" style={{ background: 'rgba(0,0,0,0.1)' }}>
          <button
            onClick={unmetRequirements ? undefined : () => onTakeOpportunity(featured)}
            disabled={unmetRequirements}
            className="w-full transition-all duration-200 flex items-center justify-center gap-2"
            style={{
              height: '54px',
              borderRadius: '16px',
              background: unmetRequirements ? 'rgba(255,255,255,0.05)' : 'linear-gradient(90deg, #B9853D, #D6B35F)',
              color: unmetRequirements ? theme.colors.text.textMuted : '#09130F',
              fontWeight: 800,
              fontSize: '15px',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              boxShadow: unmetRequirements ? 'none' : '0 4px 20px rgba(214,179,95,0.3)',
              cursor: unmetRequirements ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => {
              if (!unmetRequirements) e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseOut={(e) => {
              if (!unmetRequirements) e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            {unmetRequirements ? requirementText : 'Enter Scene'}
            {!unmetRequirements && <span>→</span>}
          </button>
        </div>
      </div>

      {/* Leads Rail */}
      <div className="w-full xl:w-[280px] flex flex-col gap-4 shrink-0">
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>
          Other Local Leads
        </div>
        
        {leads.length === 0 ? (
          <div style={{ fontSize: '13px', color: theme.colors.text.textMuted, fontStyle: 'italic', padding: '12px 0' }}>
            No other active leads.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {leads.slice(0, 4).map(opp => (
              <div
                key={opp.id}
                onClick={() => onSelectFeatured?.(opp.id)}
                className="cursor-pointer transition-all duration-200"
                style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.borderColor = 'rgba(214,179,95,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                <div style={{ fontSize: '10px', color: getTypeColor(opp.type), textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '6px' }}>
                  {opp.type}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '4px', lineHeight: 1.2 }}>
                  {opp.title}
                </div>
                <div style={{ fontSize: '12px', color: theme.colors.text.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {opp.story.substring(0, 50)}...
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
          <span style={{ fontSize: '12px', color: theme.colors.text.textMuted }}>Need new leads?</span>
          <button
            onClick={onRefresh}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              color: theme.colors.text.textSecondary,
              fontSize: '11px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
