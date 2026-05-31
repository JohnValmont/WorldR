'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface CitizenFileProgressProps {
  currentStep: number;
  formData: any;
}

const STEPS = [
  { id: 1, label: 'Basic Identity', key: 'name' },
  { id: 2, label: 'Home State', key: 'homeState' },
  { id: 3, label: 'Household Background', key: 'householdBackground' },
  { id: 4, label: 'Pre-18 Reputation', key: 'pre18Reputation' },
  { id: 5, label: 'First Supporter', key: 'firstSupporter' },
  { id: 6, label: 'Early Burden', key: 'earlyBurden' },
];

export default function CitizenFileProgress({ currentStep, formData }: CitizenFileProgressProps) {
  return (
    <div 
      className="w-full flex flex-col"
      style={{
        padding: '22px',
        borderRadius: '24px',
        background: 'rgba(16, 28, 23, 0.88)',
        border: '1px solid rgba(219,191,128,0.16)',
      }}
    >
      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: theme.colors.text.textMuted,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}
      >
        ASSEMBLY PROGRESS
      </div>

      <div className="flex flex-col gap-5">
        {STEPS.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isPast = step.id < currentStep;
          const isComplete = !!formData[step.key];

          return (
            <div key={step.id} className="flex items-start gap-4">
              <div className="relative flex flex-col items-center">
                <div 
                  className="flex items-center justify-center font-bold"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    fontSize: '12px',
                    background: isActive ? theme.colors.accents.gold : (isPast || isComplete) ? 'rgba(214,179,95,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#09130F' : (isPast || isComplete) ? theme.colors.accents.gold : theme.colors.text.textMuted,
                    boxShadow: isActive ? '0 0 10px rgba(214,179,95,0.4)' : 'none',
                    border: (isPast || isComplete) && !isActive ? `1px solid ${theme.colors.accents.gold}` : 'none'
                  }}
                >
                  {(isPast || isComplete) && !isActive ? '✓' : step.id}
                </div>
                {idx !== STEPS.length - 1 && (
                  <div 
                    style={{
                      width: '2px',
                      height: '32px',
                      background: (isPast || isComplete) ? 'rgba(214,179,95,0.3)' : 'rgba(255,255,255,0.05)',
                      marginTop: '4px'
                    }}
                  />
                )}
              </div>
              
              <div className="flex flex-col pt-1">
                <div 
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? theme.colors.text.textPrimary : (isPast || isComplete) ? theme.colors.text.textSecondary : theme.colors.text.textMuted
                  }}
                >
                  {step.label}
                </div>
                {(isPast || isComplete) && (
                  <div 
                    style={{ 
                      fontSize: '12px', 
                      color: theme.colors.text.textSecondary,
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '180px'
                    }}
                  >
                    {formData[step.key] || 'Selected'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
