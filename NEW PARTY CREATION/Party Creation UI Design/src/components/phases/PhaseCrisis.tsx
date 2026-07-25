import { useState } from 'react'
import { CRISES } from '../../data/gameData'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
  updateParty?: (u: Partial<PartyState>) => void
  advance: (u?: Partial<PartyState>) => void
}

export default function PhaseCrisis({ party, updateParty: _u, advance }: Props) {
  const [selected, setSelected] = useState(party.crisis || '')
  const [hovered, setHovered] = useState('')

  const crisis = CRISES.find(c => c.id === selected)

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px)',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#c8102e',
          marginBottom: '16px',
        }}>
          Phase 01 — The Spark
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(36px, 6vw, 64px)',
          fontWeight: 900,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: '#fff',
          letterSpacing: '-0.01em',
          marginBottom: '16px',
        }}>
          {party.leaderName},<br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>What broke your silence?</span>
        </div>
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '15px',
          color: 'rgba(255,255,255,0.45)',
          fontWeight: 300,
          maxWidth: '520px',
          lineHeight: 1.6,
        }}>
          Every movement begins with outrage. Choose the crisis that drove you to act.
          This moment becomes your founding story — told for decades.
        </div>
      </div>

      {/* Crisis cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '12px',
        marginBottom: '40px',
      }}>
        {CRISES.map(c => {
          const isSelected = selected === c.id
          const isHovered = hovered === c.id
          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered('')}
              style={{
                background: isSelected
                  ? 'rgba(200,16,46,0.12)'
                  : isHovered
                  ? 'rgba(255,255,255,0.04)'
                  : 'rgba(255,255,255,0.02)',
                border: isSelected
                  ? '1px solid #c8102e'
                  : isHovered
                  ? '1px solid rgba(255,255,255,0.2)'
                  : '1px solid rgba(255,255,255,0.07)',
                borderRadius: '2px',
                padding: '24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#c8102e',
                }} />
              )}
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{c.icon}</div>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '18px',
                fontWeight: 700,
                color: isSelected ? '#fff' : 'rgba(255,255,255,0.85)',
                textTransform: 'uppercase',
                letterSpacing: '0.02em',
                lineHeight: 1.2,
                marginBottom: '8px',
              }}>
                {c.headline}
              </div>
              <div style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
                fontWeight: 300,
              }}>
                {c.subtext}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected crisis detail */}
      {crisis && (
        <div style={{
          background: 'rgba(200,16,46,0.06)',
          border: '1px solid rgba(200,16,46,0.2)',
          borderRadius: '2px',
          padding: '24px 28px',
          marginBottom: '40px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '24px',
        }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Opportunity</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{crisis.opportunity}</div>
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Risk</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{crisis.risk}</div>
          </div>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Starting Voter Bonus</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#c8102e', lineHeight: 1.6 }}>{crisis.voterGroupBonus}</div>
          </div>
        </div>
      )}

      {/* Warning if nothing selected */}
      {!selected && (
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '13px',
          color: 'rgba(255,255,255,0.25)',
          fontStyle: 'italic',
          marginBottom: '40px',
        }}>
          Select a crisis to reveal its strategic consequences.
        </div>
      )}

      {/* Continue */}
      <div>
        <button
          onClick={() => { if (selected) advance({ crisis: selected }) }}
          disabled={!selected}
          style={{
            background: selected ? '#c8102e' : 'transparent',
            border: `1px solid ${selected ? '#c8102e' : 'rgba(255,255,255,0.12)'}`,
            color: selected ? '#fff' : 'rgba(255,255,255,0.25)',
            fontFamily: "'Barlow Condensed', sans-serif",
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            padding: '14px 40px',
            borderRadius: '2px',
            cursor: selected ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          This Is My Fight →
        </button>
      </div>
    </div>
  )
}
