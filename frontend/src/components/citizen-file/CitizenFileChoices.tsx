'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface CitizenFileChoicesProps {
  currentStep: number;
  formData: any;
  onUpdate: (key: string, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

const STATES = [
  { id: 'Drennport State', desc: 'Capital politics, royal institutions, bureaucracy, universities, finance, and national media.' },
  { id: 'Ironvale State', desc: 'Industrial workers, factories, unions, manufacturing, and labour politics.' },
  { id: 'Greenmere State', desc: 'Rural farmers, local councils, religious/community power, and agriculture.' },
  { id: 'Westport State', desc: 'Business, ports, trade, companies, stock market, finance, and exporters.' }
];

const HOUSEHOLDS = [
  { id: 'Struggling Household', chips: ['Credibility ↑', 'Charisma ↑', 'Resources ↓', 'Family Pressure'] },
  { id: 'Stable Middle-Class Household', chips: ['Credibility ↑', 'Resources ↑', 'Limited Network'] },
  { id: 'Business Household', chips: ['Influence ↑', 'Resources ↑', 'Business Obligation'] },
  { id: 'Civil Service Household', chips: ['Credibility ↑', 'Influence ↑', 'Institutional Loyalty'] },
  { id: 'Military Household', chips: ['Credibility ↑', 'Influence ↑', 'Rigid Image'] },
  { id: 'Political Household', chips: ['Influence ↑', 'Resources ↑', 'Nepotism Risk'] }
];

const REPUTATIONS = [
  { id: 'School Representative', chips: ['Credibility ↑', 'Charisma ↑', 'Influence ↑'] },
  { id: 'Debate Winner', chips: ['Credibility ↑', 'Charisma ↑↑'] },
  { id: 'Community Helper', chips: ['Credibility ↑↑', 'Influence ↑'] },
  { id: 'Young Hustler', chips: ['Resources ↑↑', 'Charisma ↑'] },
  { id: 'Top Student', chips: ['Credibility ↑↑'] },
  { id: 'Cadet / Youth Corps', chips: ['Credibility ↑', 'Influence ↑'] },
  { id: 'Online Creator', chips: ['Charisma ↑↑', 'Controversy Risk'] }
];

const SUPPORTERS = [
  { id: 'Teacher Mentor', chips: ['Credibility ↑'] },
  { id: 'Local Councillor', chips: ['Influence ↑', 'Political Favor'] },
  { id: 'Business Patron', chips: ['Resources ↑', 'Business Patron'] },
  { id: 'Union Organizer', chips: ['Influence ↑', 'Labour Network'] },
  { id: 'Journalist Contact', chips: ['Charisma ↑', 'Media Exposure'] },
  { id: 'Military Officer', chips: ['Credibility ↑', 'Influence ↑'] },
  { id: 'Religious / Community Elder', chips: ['Credibility ↑', 'Influence ↑'] }
];

const BURDENS = [
  { id: 'Family Debt', chips: ['Resources ↓↓', 'Money Pressure'] },
  { id: 'Sick Parent / Family Care', chips: ['Credibility ↑', 'Resources ↓', 'High Expenses'] },
  { id: 'Public Embarrassment', chips: ['Credibility ↓', 'Charisma ↓'] },
  { id: 'Scholarship Pressure', chips: ['Credibility ↑', 'Academic Pressure'] },
  { id: 'No Major Burden', chips: ['Resources ↑'] }
];

export default function CitizenFileChoices({ currentStep, formData, onUpdate, onNext, onPrev }: CitizenFileChoicesProps) {
  
  const renderChips = (chips: string[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {chips.map(chip => {
          let color = theme.colors.text.textSecondary;
          let bg = 'rgba(255,255,255,0.06)';
          let border = '1px solid rgba(255,255,255,0.1)';
          
          if (chip.includes('↑')) {
            color = theme.colors.accents.emerald;
            bg = 'rgba(63,143,104,0.1)';
            border = '1px solid rgba(63,143,104,0.3)';
          } else if (chip.includes('↓') || chip.includes('Risk') || chip.includes('Pressure') || chip.includes('Debt') || chip.includes('Vulnerability') || chip.includes('Expenses') || chip.includes('Embarrassment')) {
            color = theme.colors.accents.dangerRed;
            bg = 'rgba(189,61,61,0.1)';
            border = '1px solid rgba(189,61,61,0.3)';
          } else if (chip.includes('Obligation') || chip.includes('Network') || chip.includes('Favor') || chip.includes('Patron')) {
            color = theme.colors.accents.gold;
            bg = 'rgba(214,179,95,0.1)';
            border = '1px solid rgba(214,179,95,0.3)';
          }

          return (
            <span 
              key={chip} 
              style={{
                fontSize: '11px',
                padding: '4px 8px',
                borderRadius: '6px',
                background: bg,
                border: border,
                color: color,
                fontWeight: '500'
              }}
            >
              {chip}
            </span>
          );
        })}
      </div>
    );
  };

  const renderChoiceCard = (key: string, id: string, desc?: string, chips?: string[]) => {
    const isSelected = formData[key] === id;
    
    return (
      <div
        key={id}
        onClick={() => onUpdate(key, id)}
        className="cursor-pointer transition-all duration-200"
        style={{
          minHeight: '100px',
          padding: '18px',
          borderRadius: '20px',
          background: isSelected ? 'rgba(214,179,95,0.10)' : 'rgba(255,255,255,0.035)',
          border: isSelected ? '1px solid rgba(214,179,95,0.44)' : '1px solid rgba(139,164,155,0.16)',
          transform: isSelected ? 'translateY(-2px)' : 'none',
          boxShadow: isSelected ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
        }}
        onMouseOver={(e) => {
          if (!isSelected) e.currentTarget.style.borderColor = 'rgba(214,179,95,0.32)';
        }}
        onMouseOut={(e) => {
          if (!isSelected) e.currentTarget.style.borderColor = 'rgba(139,164,155,0.16)';
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: desc ? '6px' : '0' }}>
          {id}
        </div>
        {desc && (
          <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.5 }}>
            {desc}
          </div>
        )}
        {chips && renderChips(chips)}
      </div>
    );
  };

  return (
    <div 
      className="w-full flex flex-col h-full"
      style={{
        padding: '28px',
        borderRadius: '24px',
        background: 'linear-gradient(145deg, rgba(20,35,29,0.96), rgba(9,19,15,0.96))',
        border: '1px solid rgba(139,164,155,0.16)',
      }}
    >
      {/* STEP 1 */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Basic Identity
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '32px' }}>
            Enter your official registry name. Age is locked to 18 as you begin your adult journey. Motherland is pre-selected as Drennia.
          </p>

          <div className="space-y-6">
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: theme.colors.text.textSecondary, marginBottom: '8px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onUpdate('name', e.target.value)}
                placeholder="e.g. Arthur Vance"
                className="w-full transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  color: theme.colors.text.textPrimary,
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = theme.colors.accents.gold}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: theme.colors.text.textSecondary, marginBottom: '8px' }}>
                  Age
                </label>
                <div 
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    color: theme.colors.text.textMuted,
                    fontSize: '16px',
                  }}
                >
                  18
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: theme.colors.text.textSecondary, marginBottom: '8px' }}>
                  Motherland
                </label>
                <div 
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    color: theme.colors.text.textMuted,
                    fontSize: '16px',
                  }}
                >
                  Drennia
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Home State
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            Where did you grow up? This shapes your early familiarity with different types of power networks.
          </p>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4">
            {STATES.map(s => renderChoiceCard('homeState', s.id, s.desc))}
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {currentStep === 3 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Household Background
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            What was your family's situation? This dictates your starting resources and early obligations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {HOUSEHOLDS.map(h => renderChoiceCard('householdBackground', h.id, undefined, h.chips))}
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {currentStep === 4 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Pre-18 Reputation
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            How were you known before adulthood? This affects your starting credibility and charisma.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {REPUTATIONS.map(r => renderChoiceCard('pre18Reputation', r.id, undefined, r.chips))}
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {currentStep === 5 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            First Supporter
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            Who believed in you early on? This provides your first NPC contact in the world.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {SUPPORTERS.map(s => renderChoiceCard('firstSupporter', s.id, undefined, s.chips))}
          </div>
        </div>
      )}

      {/* STEP 6 */}
      {currentStep === 6 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Early Burden
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            No one rises without weight. What holds you back as you start?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {BURDENS.map(b => renderChoiceCard('earlyBurden', b.id, undefined, b.chips))}
          </div>
        </div>
      )}

      {/* Footer Nav */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
        <button
          onClick={onPrev}
          disabled={currentStep === 1}
          style={{
            padding: '12px 24px',
            color: currentStep === 1 ? theme.colors.text.textMuted : theme.colors.text.textSecondary,
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600'
          }}
        >
          Back
        </button>
        
        {currentStep < 6 && (
          <button
            onClick={onNext}
            disabled={currentStep === 1 && !formData.name.trim()}
            style={{
              padding: '12px 28px',
              background: 'rgba(255,255,255,0.1)',
              color: theme.colors.text.textPrimary,
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: '600',
              opacity: (currentStep === 1 && !formData.name.trim()) ? 0.5 : 1,
              cursor: (currentStep === 1 && !formData.name.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
