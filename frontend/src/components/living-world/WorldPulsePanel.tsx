'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

const PULSE_ITEMS = [
  { text: 'Civic Order Party dominates Drennport politics.', color: theme.colors.accents.gold },
  { text: 'Workers’ Renewal Front prepares for Ironvale organizing.', color: theme.colors.accents.steelBlue },
  { text: 'Faith & Rural Union remains influential in Greenmere communities.', color: theme.colors.accents.emerald },
  { text: 'Free Commerce Alliance expands Westport business networks.', color: theme.colors.accents.gold },
  { text: 'Royal Household prepares the next parliamentary ceremony.', color: theme.colors.accents.steelBlue }
];

const NPC_TEASERS = [
  { name: 'Dara Venn', desc: 'NPC Politician · Civic Order Party' },
  { name: 'Marek Solven', desc: 'NPC Business Patron · Westport' },
  { name: 'Lina Sael', desc: 'NPC Journalist · Drennport' }
];

export default function WorldPulsePanel() {
  return (
    <div 
      className="w-full flex flex-col"
      style={{
        width: '100%',
        minHeight: '360px',
        padding: '20px',
        borderRadius: theme.effects.radiusLarge,
        background: 'rgba(11,22,18,0.90)',
        border: `1px solid ${theme.colors.borders.borderMuted}`,
        boxShadow: theme.effects.shadowPanel
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
        DRENNIA TODAY
      </div>
      
      <div 
        style={{
          fontSize: '13px',
          color: theme.colors.text.textSecondary,
          marginBottom: '16px'
        }}
      >
        The country is already moving.
      </div>

      <div className="flex flex-col mb-6">
        {PULSE_ITEMS.map((item, idx) => (
          <div 
            key={idx} 
            className="flex gap-3"
            style={{
              padding: '12px 0',
              borderBottom: idx < PULSE_ITEMS.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'
            }}
          >
            <div 
              style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: item.color,
                marginTop: '5px',
                flexShrink: 0,
                boxShadow: `0 0 14px ${item.color}40`
              }}
            />
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary, lineHeight: 1.4 }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div 
          style={{
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: theme.colors.text.textMuted,
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '12px'
          }}
        >
          POWER HOLDERS NEAR YOU
        </div>

        <div className="flex flex-col gap-2">
          {NPC_TEASERS.map((npc, idx) => (
            <div 
              key={idx}
              style={{
                padding: '10px',
                background: 'rgba(255,255,255,0.035)',
                border: `1px solid ${theme.colors.borders.borderCool}`,
                borderRadius: '14px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '600', color: theme.colors.text.textPrimary, marginBottom: '2px' }}>
                {npc.name}
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.text.textMuted }}>
                {npc.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  );
}
