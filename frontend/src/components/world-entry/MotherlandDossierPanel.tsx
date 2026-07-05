'use client';
import { useRouter } from 'next/navigation';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface MotherlandDossierPanelProps {
  selectedNation: string | null;
}

export default function MotherlandDossierPanel({ selectedNation }: MotherlandDossierPanelProps) {
  const router = useRouter();

  const handleBeginLife = () => {
    localStorage.setItem('worldr_selected_continent', 'Varelia');
    localStorage.setItem('worldr_selected_motherland', 'Drennia');
    router.push('/start/citizen-file');
  };

  return (
    <div 
      className="w-full flex flex-col"
      style={{
        minHeight: '580px',
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
        MOTHERLAND DOSSIER
      </div>

      {!selectedNation && (
        <div className="flex-1 flex items-center justify-center text-center">
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', maxWidth: '80%', lineHeight: 1.6 }}>
            Select a motherland to view its institutions, power structure, and first-life possibilities.
          </p>
        </div>
      )}

      {selectedNation && selectedNation !== 'Drennia' && (
        <div className="flex-1 flex flex-col">
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '8px' }}>
            {selectedNation}
          </h2>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: theme.colors.text.textMuted,
              background: 'rgba(255,255,255,0.05)',
              padding: '4px 10px',
              borderRadius: '999px',
              marginBottom: '16px',
              width: 'fit-content'
            }}
          >
            Future Nation
          </div>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: 'auto' }}>
            This nation exists in the WORLDr atlas but is not active in pre-alpha. More nations will unlock after Drennia's first full simulation is stable.
          </p>
        </div>
      )}

      {selectedNation === 'Drennia' && (
        <div className="flex-1 flex flex-col">
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: theme.colors.text.textPrimary, marginBottom: '6px' }}>
            Drennia
          </h2>
          <p style={{ color: theme.colors.text.textSecondary, fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            A Varelian constitutional monarchy built around state politics, business power, royal institutions, and public records.
          </p>

          <div className="space-y-6 flex-1">
            {/* 1. Country File */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.accents.gold, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Country File
              </h4>
              <ul className="space-y-2">
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}><span className="text-zinc-400 mr-2">Capital:</span> Drennport</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}><span className="text-zinc-400 mr-2">System:</span> Constitutional Monarchy</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}><span className="text-zinc-400 mr-2">Legislature:</span> Drennia House</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}><span className="text-zinc-400 mr-2">First Active Stage:</span> Pre-Alpha</li>
              </ul>
            </div>

            {/* 2. State Structure */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.accents.gold, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. State Structure
              </h4>
              <ul className="space-y-2.5">
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.4 }}>
                  <strong className="text-zinc-300 font-medium block">Drennport State</strong>
                  capital, royal institutions, bureaucracy, universities, finance
                </li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.4 }}>
                  <strong className="text-zinc-300 font-medium block">Ironvale State</strong>
                  industry, unions, manufacturing, labour politics
                </li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.4 }}>
                  <strong className="text-zinc-300 font-medium block">Greenmere State</strong>
                  rural communities, farms, local councils, agriculture
                </li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary, lineHeight: 1.4 }}>
                  <strong className="text-zinc-300 font-medium block">Westport State</strong>
                  ports, trade, companies, stock market, exporters
                </li>
              </ul>
            </div>

            {/* 3. Power Already Exists */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.accents.gold, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                3. Power Already Exists
              </h4>
              <ul className="space-y-2 pl-4" style={{ listStyleType: 'circle' }}>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>NPC parties dominate early politics</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>NPC companies operate across states</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>Royal NPCs formalize government</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>Elections will be staggered</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>Public records will follow every rise and fall</li>
              </ul>
            </div>

            {/* 4. First Playable Paths */}
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.accents.gold, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                4. First Playable Paths
              </h4>
              <ul className="space-y-2 pl-4" style={{ listStyleType: 'circle' }}>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>Politician Path</li>
                <li style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>Businessman Path</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleBeginLife}
            className="w-full transition-all duration-200 mt-6"
            style={{
              height: '48px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #B9853D, #D6B35F)',
              color: '#09130F',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontSize: '14px',
              boxShadow: '0 4px 14px rgba(214,179,95,0.25)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
            }}
          >
            Begin Life in Drennia
          </button>
        </div>
      )}
    </div>
  );
}
