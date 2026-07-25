import { useState } from 'react'
import { CO_FOUNDERS } from '../../data/gameData'
import type { PartyState } from '../PartyCreation'

type Props = {
  party: PartyState
  updateParty?: (u: Partial<PartyState>) => void
  advance: (u?: Partial<PartyState>) => void
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{value}</span>
      </div>
      <div style={{ height: '2px', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, backgroundColor: color, borderRadius: '1px', transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

export default function PhaseFounders({ party, updateParty: _u, advance }: Props) {
  const [selected, setSelected] = useState<string[]>(party.founders || [])
  const [showSecret, setShowSecret] = useState<string | null>(null)

  const MAX = 2

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      setSelected(s => s.filter(x => x !== id))
    } else if (selected.length < MAX) {
      setSelected(s => [...s, id])
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#080810',
      padding: 'clamp(40px, 6vw, 80px) clamp(20px, 5vw, 80px)',
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
          color: '#00a8a8',
          marginBottom: '16px',
        }}>
          Phase 03 — The Inner Circle
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 'clamp(36px, 6vw, 60px)',
          fontWeight: 900,
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: '#fff',
          marginBottom: '16px',
        }}>
          Choose Your<br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Co-Founders</span>
        </div>
        <div style={{
          fontFamily: "'Barlow', sans-serif",
          fontSize: '15px',
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 300,
          lineHeight: 1.6,
          maxWidth: '540px',
        }}>
          These people will shape your party from day one.
          Each brings power — and complications. Choose{' '}
          <span style={{ color: '#00a8a8', fontWeight: 500 }}>up to {MAX}</span>.
          Every demand is real. Every secret will matter.
        </div>
      </div>

      {/* Founders grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px',
        marginBottom: '40px',
      }}>
        {CO_FOUNDERS.map(f => {
          const isSelected = selected.includes(f.id)
          const isBlocked = !isSelected && selected.length >= MAX

          return (
            <div
              key={f.id}
              style={{
                background: isSelected
                  ? `rgba(${f.accent === '#c8102e' ? '200,16,46' : f.accent === '#00a8a8' ? '0,168,168' : f.accent === '#c9a84c' ? '201,168,76' : f.accent === '#059669' ? '5,150,105' : '124,58,237'},0.1)`
                  : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isSelected ? f.accent : 'rgba(255,255,255,0.07)'}`,
                borderRadius: '2px',
                padding: '20px',
                opacity: isBlocked ? 0.35 : 1,
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
                  backgroundColor: f.accent,
                }} />
              )}

              {/* Top row */}
              <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
                {/* Avatar */}
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '2px',
                  backgroundColor: `${f.accent}20`,
                  border: `1px solid ${f.accent}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: f.accent,
                  flexShrink: 0,
                }}>
                  {f.portrait}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#fff',
                    letterSpacing: '0.02em',
                    marginBottom: '2px',
                  }}>
                    {f.name}
                  </div>
                  <div style={{
                    fontFamily: "'Barlow', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.4)',
                    fontWeight: 300,
                  }}>
                    {f.title}
                  </div>
                </div>

                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: f.accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  alignSelf: 'flex-start',
                  flexShrink: 0,
                }}>
                  {f.trait}
                </div>
              </div>

              {/* Trait desc */}
              <div style={{
                fontFamily: "'Barlow', sans-serif",
                fontSize: '13px',
                color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.6,
                marginBottom: '16px',
              }}>
                {f.traitDesc}
              </div>

              {/* Stats */}
              <StatBar label="Loyalty" value={f.loyalty} color={f.accent} />
              <StatBar label="Influence" value={f.influence} color={f.accent} />
              <StatBar label="Ambition" value={f.ambition} color={f.accent} />

              {/* Demand */}
              <div style={{
                marginTop: '14px',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: '2px',
              }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: '4px' }}>Their Demand</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{f.demand}</div>
              </div>

              {/* Secret */}
              <div style={{ marginTop: '8px' }}>
                {showSecret === f.id ? (
                  <div style={{
                    padding: '10px 12px',
                    background: 'rgba(200,16,46,0.08)',
                    border: '1px solid rgba(200,16,46,0.25)',
                    borderRadius: '2px',
                  }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c8102e', marginBottom: '4px' }}>⚠ Intelligence Dossier</div>
                    <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>{f.secret}</div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSecret(f.id)}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(200,16,46,0.2)',
                      borderRadius: '2px',
                      color: 'rgba(200,16,46,0.5)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    View Intelligence Dossier
                  </button>
                )}
              </div>

              {/* Select button */}
              <button
                onClick={() => toggle(f.id)}
                disabled={isBlocked}
                style={{
                  marginTop: '16px',
                  width: '100%',
                  background: isSelected ? f.accent : 'transparent',
                  border: `1px solid ${isSelected ? f.accent : 'rgba(255,255,255,0.12)'}`,
                  color: isSelected ? '#080810' : 'rgba(255,255,255,0.5)',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 700,
                  fontSize: '12px',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '10px',
                  borderRadius: '2px',
                  cursor: isBlocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {isSelected ? '✓ Co-Founder' : 'Recruit'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Selected summary */}
      {selected.length > 0 && (
        <div style={{
          background: 'rgba(0,168,168,0.06)',
          border: '1px solid rgba(0,168,168,0.15)',
          borderRadius: '2px',
          padding: '16px 20px',
          marginBottom: '32px',
          fontFamily: "'Barlow', sans-serif",
          fontSize: '14px',
          color: 'rgba(255,255,255,0.6)',
        }}>
          <span style={{ color: '#00a8a8', fontWeight: 600 }}>
            {selected.map(id => CO_FOUNDERS.find(f => f.id === id)?.name).join(' & ')}
          </span>
          {' '}will co-found the movement with you. Their demands stand. Their secrets are yours to keep — or exploit.
        </div>
      )}

      <button
        onClick={() => advance({ founders: selected })}
        style={{
          background: '#00a8a8',
          border: '1px solid #00a8a8',
          color: '#080810',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '13px',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          padding: '14px 40px',
          borderRadius: '2px',
          cursor: 'pointer',
        }}
      >
        {selected.length === 0 ? 'Go It Alone →' : `Form the Inner Circle →`}
      </button>
    </div>
  )
}
