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
  { id: 'Ironvale State', desc: 'Factories, unions, industrial towns, manufacturing, and labour politics.' },
  { id: 'Greenmere State', desc: 'Rural communities, farms, local councils, religion, agriculture, and family networks.' },
  { id: 'Westport State', desc: 'Ports, trade, companies, stock market, finance, exporters, and business patrons.' }
];

const HOUSEHOLDS = [
  { id: 'Struggling Household', chips: ['Credibility ↑', 'Charisma ↑', 'Resources ↓', 'Family pressure'] },
  { id: 'Stable Middle-Class Household', chips: ['Balanced start', 'Credibility ↑', 'Resources slight ↑'] },
  { id: 'Business Household', chips: ['Resources ↑', 'Influence ↑', 'Business obligation risk'] },
  { id: 'Civil Service Household', chips: ['Credibility ↑', 'Influence ↑', 'Insider reputation risk'] },
  { id: 'Military Household', chips: ['Credibility ↑', 'Influence ↑', 'Security establishment tie'] },
  { id: 'Political Household', chips: ['Influence ↑↑', 'Resources ↑', 'Nepotism attack risk'] }
];

const CHILDHOOD_MARKS = [
  { id: 'Always Watching Adults Talk Power', desc: 'You learned early that decisions are made behind closed doors.', chips: ['Influence leaning', 'Political awareness'] },
  { id: 'Had to Earn Money Early', desc: 'You understood cost, debt, and survival before adulthood.', chips: ['Resources leaning', 'Family pressure'] },
  { id: 'Protected Younger Family Members', desc: 'Responsibility arrived early.', chips: ['Credibility leaning', 'Obligation'] },
  { id: 'Moved Between Towns', desc: 'You learned to adapt quickly but never felt fully rooted.', chips: ['Charisma leaning', 'Lower home familiarity'] },
  { id: 'Lived Near Institutions', desc: 'Courts, ministries, universities, or offices shaped your imagination.', chips: ['Credibility leaning', 'Influence leaning'] }
];

const REPUTATIONS = [
  { id: 'School Representative', chips: ['Credibility ↑', 'Charisma ↑', 'Influence ↑'] },
  { id: 'Debate Winner', chips: ['Charisma ↑↑', 'Credibility ↑'] },
  { id: 'Community Helper', chips: ['Credibility ↑↑', 'Influence ↑'] },
  { id: 'Young Hustler', chips: ['Resources ↑', 'Charisma ↑', 'Credibility slight ↓'] },
  { id: 'Top Student', chips: ['Credibility ↑↑', 'Charisma slight ↓'] },
  { id: 'Cadet / Youth Corps', chips: ['Credibility ↑', 'Influence ↑', 'Security leaning'] },
  { id: 'Online Creator', chips: ['Charisma ↑↑', 'Influence ↑', 'Public controversy risk'] }
];

const SUPPORTERS = [
  { id: 'Teacher Mentor', chips: ['Credibility ↑', 'First Contact'] },
  { id: 'Local Councillor', chips: ['Influence ↑', 'Political favor obligation'] },
  { id: 'Business Patron', chips: ['Resources ↑', 'Influence ↑', 'Business obligation'] },
  { id: 'Union Organizer', chips: ['Influence ↑', 'Charisma ↑', 'Labour obligation'] },
  { id: 'Journalist Contact', chips: ['Charisma ↑', 'Influence ↑', 'Media exposure risk'] },
  { id: 'Military Officer', chips: ['Credibility ↑', 'Influence ↑', 'First Contact'] },
  { id: 'Religious / Community Elder', chips: ['Credibility ↑', 'Influence ↑', 'Community expectation'] }
];

const BURDENS = [
  { id: 'Family Debt', chips: ['Resources ↓', 'Obligation: Family debt', 'Vulnerability: Money pressure'] },
  { id: 'Sick Parent / Family Care', chips: ['Credibility ↑', 'Resources ↓', 'Obligation: Family care'] },
  { id: 'Public Embarrassment', chips: ['Credibility ↓', 'Charisma ↓', 'Vulnerability: Public embarrassment'] },
  { id: 'Scholarship Pressure', chips: ['Credibility ↑', 'Resources slight ↓', 'Obligation: Academic pressure'] },
  { id: 'No Major Burden', chips: ['Resources slight ↑', 'No major vulnerability'] }
];

const AMBITIONS = [
  { id: 'To Be Respected', chips: ['Leans Credibility'] },
  { id: 'To Be Heard', chips: ['Leans Charisma'] },
  { id: 'To Know Powerful People', chips: ['Leans Influence'] },
  { id: 'To Never Be Poor Again', chips: ['Leans Resources'] },
  { id: 'To Build Something Own', chips: ['Leans Business path'] },
  { id: 'To Change the Country', chips: ['Leans Politics path'] }
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
          } else if (chip.includes('Obligation') || chip.includes('Network') || chip.includes('favor') || chip.includes('patron')) {
            color = theme.colors.accents.gold;
            bg = 'rgba(201,162,74,0.1)';
            border = '1px solid rgba(201,162,74,0.3)';
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
          minHeight: '110px',
          padding: '18px 20px',
          borderRadius: '22px',
          background: isSelected ? 'rgba(201,162,74,0.11)' : 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
          border: isSelected ? '1px solid rgba(201,162,74,0.48)' : '1px solid rgba(139,164,155,0.16)',
          transform: isSelected ? 'translateY(-2px)' : 'none',
          boxShadow: isSelected ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
        }}
        onMouseOver={(e) => {
          if (!isSelected) e.currentTarget.style.borderColor = 'rgba(201,162,74,0.34)';
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
        borderRadius: '28px',
        background: 'rgba(11,22,18,0.88)',
        border: '1px solid rgba(219,191,128,0.16)',
        minHeight: '640px'
      }}
    >
      {/* STEP 1 */}
      {currentStep === 1 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 01</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Who enters WORLDr?
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '32px' }}>
            Every rise begins as a file in the world.
          </p>

          <div className="space-y-6">
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: theme.colors.text.textSecondary, marginBottom: '8px' }}>
                Character Name
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
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {currentStep === 2 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 02</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Motherland Confirmation
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', marginBottom: '24px' }}>
            You chose Drennia as your motherland. Your first contacts, politics, economy, and public record will begin here.
          </p>
          <div className="p-6 rounded-[22px]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))', border: '1px solid rgba(139,164,155,0.16)' }}>
             <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.colors.text.textPrimary }}>Drennia</div>
             <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, marginTop: '8px' }}>Capital: Drennport</div>
             <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, marginTop: '4px' }}>Continent: Varelia</div>
             <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, marginTop: '4px' }}>System: Constitutional Monarchy</div>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {currentStep === 3 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 03</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Home State
          </h2>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4">
            {STATES.map(s => renderChoiceCard('homeState', s.id, s.desc))}
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {currentStep === 4 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 04</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Household Background
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {HOUSEHOLDS.map(h => renderChoiceCard('householdBackground', h.id, undefined, h.chips))}
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {currentStep === 5 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 05</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            What shaped your early character before anyone knew your name?
          </h2>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto pr-2 pb-4">
            {CHILDHOOD_MARKS.map(c => renderChoiceCard('childhoodMark', c.id, c.desc, c.chips))}
          </div>
        </div>
      )}

      {/* STEP 6 */}
      {currentStep === 6 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 06</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Pre-18 Public Reputation
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {REPUTATIONS.map(r => renderChoiceCard('pre18Reputation', r.id, undefined, r.chips))}
          </div>
        </div>
      )}

      {/* STEP 7 */}
      {currentStep === 7 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 07</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            First Supporter
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {SUPPORTERS.map(s => renderChoiceCard('firstSupporter', s.id, undefined, s.chips))}
          </div>
        </div>
      )}

      {/* STEP 8 */}
      {currentStep === 8 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 08</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            Early Burden
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {BURDENS.map(b => renderChoiceCard('earlyBurden', b.id, undefined, b.chips))}
          </div>
        </div>
      )}

      {/* STEP 9 */}
      {currentStep === 9 && (
        <div className="flex-1 flex flex-col animate-fade-in">
          <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px' }}>CHAPTER 09</div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '12px' }}>
            What did you secretly want before adult life began?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
            {AMBITIONS.map(a => renderChoiceCard('firstAmbition', a.id, undefined, a.chips))}
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
        
        {currentStep < 9 && (
          <button
            onClick={onNext}
            disabled={
              (currentStep === 1 && !formData.name.trim()) ||
              (currentStep === 3 && !formData.homeState) ||
              (currentStep === 4 && !formData.householdBackground) ||
              (currentStep === 5 && !formData.childhoodMark) ||
              (currentStep === 6 && !formData.pre18Reputation) ||
              (currentStep === 7 && !formData.firstSupporter) ||
              (currentStep === 8 && !formData.earlyBurden)
            }
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
            {currentStep === 2 ? 'Confirm Motherland' : 'Continue'}
          </button>
        )}
      </div>
    </div>
  );
}
