'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

const CONTINENTS = [
  { id: 'Varelia', name: 'Varelia', status: 'Pre-Alpha Available', active: true },
  { id: 'Azhara', name: 'Azhara', status: 'Future Continent', active: false },
  { id: 'Norvane', name: 'Norvane', status: 'Future Continent', active: false },
  { id: 'Solkar', name: 'Solkar', status: 'Future Continent', active: false }
];

export default function ContinentRegistryPanel() {
  return (
    <div 
      className="w-full flex flex-col"
      style={{
        minHeight: '580px',
        padding: '18px',
        borderRadius: '24px',
        background: 'rgba(11,22,18,0.88)',
        border: '1px solid rgba(219,191,128,0.14)',
      }}
    >
      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: theme.colors.text.textMuted,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          marginBottom: '4px'
        }}
      >
        CONTINENTS
      </div>
      
      <div 
        style={{
          fontSize: '13px',
          color: theme.colors.text.textSecondary,
          marginBottom: '20px'
        }}
      >
        Four continental theatres of WORLDr.
      </div>

      <div className="flex flex-col">
        {CONTINENTS.map((cont) => {
          const isActive = cont.active;
          
          return (
            <button
              key={cont.id}
              disabled={!isActive}
              className="flex flex-col text-left transition-all duration-200 w-full"
              style={{
                height: '78px',
                borderRadius: '18px',
                marginBottom: '12px',
                padding: '14px',
                background: isActive ? 'rgba(214,179,95,0.11)' : 'rgba(255,255,255,0.025)',
                border: isActive ? '1px solid rgba(214,179,95,0.34)' : '1px solid rgba(139,164,155,0.12)',
                cursor: isActive ? 'default' : 'not-allowed', // Varelia is selected automatically for now
              }}
            >
              <div 
                style={{
                  fontSize: '17px',
                  fontWeight: '600',
                  color: isActive ? theme.colors.text.textPrimary : theme.colors.text.textMuted
                }}
              >
                {cont.name}
              </div>
              <div 
                className="mt-1"
                style={{
                  fontSize: '12px',
                  color: isActive ? theme.colors.accents.gold : theme.colors.text.textFaint
                }}
              >
                {cont.status}
                {!isActive && ' · Nations in development'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
