'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface NationSelectionBoardProps {
  selectedNation: string | null;
  onSelectNation: (nation: string) => void;
}

export default function NationSelectionBoard({ selectedNation, onSelectNation }: NationSelectionBoardProps) {
  const isDrenniaSelected = selectedNation === 'Drennia';

  return (
    <div className="w-full flex flex-col">
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
        SELECT MOTHERLAND
      </div>
      
      <div 
        style={{
          fontSize: '13px',
          color: theme.colors.text.textSecondary,
          marginBottom: '20px',
          lineHeight: 1.5
        }}
      >
        Your motherland determines your first state, society, NPC contacts, political system, economic world, and early opportunities.
      </div>

      {/* DRENNIA ACTIVE CARD */}
      <div 
        onClick={() => onSelectNation('Drennia')}
        className={`w-full flex flex-col transition-all duration-300 ease-out cursor-pointer group ${isDrenniaSelected ? '-translate-y-[3px]' : 'hover:-translate-y-[2px]'}`}
        style={{
          minHeight: '240px',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, rgba(20,35,29,0.96), rgba(9,19,15,0.96))',
          border: '1px solid rgba(214,179,95,0.34)',
          padding: '22px',
          boxShadow: isDrenniaSelected 
            ? '0 0 0 1px rgba(214,179,95,0.22), 0 20px 60px rgba(0,0,0,0.34)'
            : '0 10px 30px rgba(0,0,0,0.2)'
        }}
      >
        {/* Top Row */}
        <div className="flex items-start justify-between w-full mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="flex items-center justify-center font-serif text-lg font-bold text-[#09130F]"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '8px',
                background: theme.colors.accents.gold,
                boxShadow: '0 2px 10px rgba(214,179,95,0.3)'
              }}
            >
              Dr
            </div>
            <div>
              <h3 
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: theme.colors.text.textPrimary,
                  letterSpacing: '-0.02em'
                }}
              >
                Drennia
              </h3>
              <div style={{ fontSize: '12px', color: theme.colors.text.textSecondary }}>
                Varelia Continent
              </div>
            </div>
          </div>
          
          <div 
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: theme.colors.accents.emerald,
              background: 'rgba(63,143,104,0.12)',
              border: '1px solid rgba(63,143,104,0.2)',
              borderRadius: '999px',
              padding: '4px 10px',
              fontWeight: 'bold'
            }}
          >
            ACTIVE PRE-ALPHA
          </div>
        </div>

        {/* Middle Stats Grid */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-6">
          <div>
            <div style={{ fontSize: '11px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>Capital</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary, fontWeight: '500' }}>Drennport</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>Government</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary, fontWeight: '500' }}>Constitutional Monarchy</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>Playable Paths</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary, fontWeight: '500' }}>Politician, Businessman</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>States</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary, fontWeight: '500' }}>Drennport, Ironvale, Greenmere, Westport</div>
          </div>
        </div>

        {/* Bottom Text */}
        <p 
          style={{
            fontSize: '13px',
            color: theme.colors.text.textSecondary,
            lineHeight: 1.6,
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.06)'
          }}
        >
          Drennia is the first active WORLDr nation — a small constitutional monarchy where NPC parties, royal figures, companies, and state institutions already hold power before players arrive.
        </p>
      </div>

      <div className="w-full flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
        <span className="text-[11px] text-zinc-600 font-mono uppercase tracking-widest">Future Nations</span>
        <div className="flex-1 h-px bg-[rgba(255,255,255,0.06)]" />
      </div>

      {/* LOCKED NATIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {['Greyport', 'Keldoria', 'Valdoria'].map(nation => (
          <div 
            key={nation}
            onClick={() => onSelectNation(nation)}
            className="flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.04)]"
            style={{
              minHeight: '120px',
              opacity: 0.55,
              border: '1px dashed rgba(139,164,155,0.18)',
              background: 'rgba(255,255,255,0.025)',
              borderRadius: '16px'
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: '600', color: theme.colors.text.textMuted, marginBottom: '6px' }}>
              {nation}
            </div>
            <div 
              style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: theme.colors.text.textFaint,
                background: 'rgba(0,0,0,0.3)',
                padding: '2px 8px',
                borderRadius: '4px'
              }}
            >
              FUTURE NATION
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
